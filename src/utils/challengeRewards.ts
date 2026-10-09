/**
 * Real rewards for the daily challenge and the streak tower.
 *
 * - Honor points add up; every 200 points pays out a potion.
 * - Each badge is a permanent damage bonus (+2%, capped at +10%).
 * - Each title adds HP recovered after every victory (+4, capped at +12).
 * - Item rewards ('resource' with an item id) go straight into the bag.
 *
 * Grants are idempotent per grant key (one claim per daily challenge per day,
 * one per tower floor per run), so replays cannot farm the same reward.
 */
import { BATTLE_ITEM_ORDER } from '../data/itemCatalog.ts';
import type { ChallengeReward } from '../types/challenges.ts';
import type { InventoryData, ItemId } from '../types/game';
import { applyItemGrants, loadInventory, saveInventory } from './inventoryStore.ts';
import { readJson, writeJson } from './storage.ts';

const STORAGE_KEY = 'mathMonsterBattle_honor_v1';
const MAX_GRANT_KEYS = 400;

export const CHALLENGE_REWARD_TUNING = {
  badgeDamageBonus: 0.02,
  maxBadgeDamageBonus: 0.1,
  titleVictoryHeal: 4,
  maxTitleVictoryHeal: 12,
  honorPerPotion: 200,
} as const;

export type ChallengeRewardState = {
  version: 1;
  honor: number;
  badges: string[];
  titles: string[];
  grants: string[];
};

export type ChallengePerks = {
  damageBonus: number;
  victoryHeal: number;
  honor: number;
  badges: string[];
  titles: string[];
  /** Honor still needed for the next potion. */
  honorToNextPotion: number;
};

export type GrantedReward =
  | { kind: 'honor'; amount: number }
  | { kind: 'badge'; key: string; isNew: boolean }
  | { kind: 'title'; key: string; isNew: boolean }
  | { kind: 'item'; item: ItemId; amount: number; fromHonor: boolean };

export type ChallengeClaim = {
  state: ChallengeRewardState;
  inventory: InventoryData;
  granted: GrantedReward[];
  alreadyClaimed: boolean;
  perks: ChallengePerks;
};

export function createChallengeRewardState(): ChallengeRewardState {
  return { version: 1, honor: 0, badges: [], titles: [], grants: [] };
}

function uniqueStrings(value: unknown, limit = 200): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length <= 120))]
    .slice(-limit);
}

export function normalizeChallengeRewardState(raw: unknown): ChallengeRewardState {
  if (typeof raw !== 'object' || raw === null || (raw as { version?: unknown }).version !== 1) {
    return createChallengeRewardState();
  }
  const record = raw as Record<string, unknown>;
  const honor = typeof record.honor === 'number' && Number.isSafeInteger(record.honor) && record.honor > 0 ? record.honor : 0;
  return {
    version: 1,
    honor,
    badges: uniqueStrings(record.badges),
    titles: uniqueStrings(record.titles),
    grants: uniqueStrings(record.grants, MAX_GRANT_KEYS),
  };
}

export function loadChallengeRewards(): ChallengeRewardState {
  return normalizeChallengeRewardState(readJson<unknown>(STORAGE_KEY, null));
}

export function getChallengePerks(state: ChallengeRewardState = loadChallengeRewards()): ChallengePerks {
  const tuning = CHALLENGE_REWARD_TUNING;
  return {
    damageBonus: Math.min(tuning.maxBadgeDamageBonus, state.badges.length * tuning.badgeDamageBonus),
    victoryHeal: Math.min(tuning.maxTitleVictoryHeal, state.titles.length * tuning.titleVictoryHeal),
    honor: state.honor,
    badges: [...state.badges],
    titles: [...state.titles],
    honorToNextPotion: tuning.honorPerPotion - (state.honor % tuning.honorPerPotion),
  };
}

function isItemId(value: string): value is ItemId {
  return (BATTLE_ITEM_ORDER as readonly string[]).includes(value);
}

/** Pure: apply earned rewards to the honor state and bag. */
export function applyChallengeRewards(
  state: ChallengeRewardState,
  inventory: InventoryData,
  rewards: readonly ChallengeReward[],
  grantKey: string,
): ChallengeClaim {
  if (!grantKey || state.grants.includes(grantKey)) {
    return { state, inventory, granted: [], alreadyClaimed: Boolean(grantKey), perks: getChallengePerks(state) };
  }
  const next: ChallengeRewardState = {
    ...state,
    badges: [...state.badges],
    titles: [...state.titles],
    grants: [...state.grants, grantKey].slice(-MAX_GRANT_KEYS),
  };
  const granted: GrantedReward[] = [];
  const itemGrants: { item: ItemId; amount: number; fromHonor: boolean }[] = [];

  for (const reward of rewards) {
    const amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
    if (reward.type === 'achievement_point' && amount > 0) {
      next.honor += amount;
      granted.push({ kind: 'honor', amount });
    } else if (reward.type === 'badge') {
      const isNew = !next.badges.includes(reward.key);
      if (isNew) next.badges.push(reward.key);
      granted.push({ kind: 'badge', key: reward.key, isNew });
    } else if (reward.type === 'title') {
      const isNew = !next.titles.includes(reward.key);
      if (isNew) next.titles.push(reward.key);
      granted.push({ kind: 'title', key: reward.key, isNew });
    } else if (reward.type === 'resource' && isItemId(reward.key) && amount > 0) {
      itemGrants.push({ item: reward.key, amount, fromHonor: false });
    }
  }

  const per = CHALLENGE_REWARD_TUNING.honorPerPotion;
  const honorPotions = Math.floor(next.honor / per) - Math.floor(state.honor / per);
  if (honorPotions > 0) itemGrants.push({ item: 'potion', amount: honorPotions, fromHonor: true });

  let bag = inventory;
  for (const grant of itemGrants) {
    const result = applyItemGrants(bag, { [grant.item]: grant.amount });
    bag = result.inventory;
    const received = result.grants.reduce((sum, item) => sum + item.amount, 0);
    // A full bag still shows the reward, with what actually fit.
    granted.push({ kind: 'item', item: grant.item, amount: received, fromHonor: grant.fromHonor });
  }

  return { state: next, inventory: bag, granted, alreadyClaimed: false, perks: getChallengePerks(next) };
}

/** Claim rewards against storage: honor state and bag are saved together. */
export function claimChallengeRewards(rewards: readonly ChallengeReward[], grantKey: string): ChallengeClaim {
  const claim = applyChallengeRewards(loadChallengeRewards(), loadInventory(), rewards, grantKey);
  if (!claim.alreadyClaimed) {
    writeJson(STORAGE_KEY, claim.state);
    saveInventory(claim.inventory);
  }
  return claim;
}
