import { readJson, writeJson } from './storage.ts';
import {
  COLLECTION_MILESTONES,
  type CollectionMilestoneDef,
  type CollectionMilestoneRequirement,
  type CollectionTitleReward,
} from '../data/collectionMilestones.ts';

/**
 * collectionStore.ts — Persistent drop collection tracking.
 *
 * Stores a Record<emoji, count> in localStorage so players can
 * see everything they've collected across sessions.
 */

const COLLECTION_KEY = 'mathMonsterBattle_collection';
export const MAX_COLLECTION_TYPE_DAMAGE_BONUS = 0.12;
export const MAX_COLLECTION_ALL_DAMAGE_BONUS = 0.08;

export type CollectionData = Record<string, number>;
export type CollectionTitle = Omit<CollectionTitleReward, 'kind'>;

export type CollectionPerks = {
  unlockedMilestoneIds: string[];
  unlockedTitles: CollectionTitle[];
  damageBonusByType: Record<string, number>;
  allDamageBonus: number;
};

export type CollectionAddResult = {
  data: CollectionData;
  perks: CollectionPerks;
  newlyUnlockedMilestoneIds: string[];
  newlyUnlockedTitles: CollectionTitle[];
};

export function loadCollection(): CollectionData {
  return readJson<CollectionData>(COLLECTION_KEY, {});
}

export function saveCollection(data: CollectionData): void {
  writeJson(COLLECTION_KEY, data);
}

function resolveMilestoneRequirements(
  milestone: CollectionMilestoneDef,
): readonly CollectionMilestoneRequirement[] {
  const requirements = milestone.requirements;
  if (Array.isArray(requirements) && requirements.length > 0) {
    return requirements as readonly CollectionMilestoneRequirement[];
  }
  if (typeof milestone.required === 'number' && Number.isFinite(milestone.required)) {
    return [{ emoji: milestone.emoji, required: milestone.required }];
  }
  return [];
}

function isMilestoneUnlocked(data: CollectionData, milestone: CollectionMilestoneDef): boolean {
  const requirements = resolveMilestoneRequirements(milestone);
  if (requirements.length <= 0) return false;
  return requirements.every((requirement) => (data[requirement.emoji] || 0) >= requirement.required);
}

export function getCollectionPerks(data: CollectionData = loadCollection()): CollectionPerks {
  const unlockedMilestoneIds: string[] = [];
  const unlockedTitles: CollectionTitle[] = [];
  const damageBonusByType: Record<string, number> = {};
  let allDamageBonus = 0;

  for (const milestone of COLLECTION_MILESTONES) {
    if (!isMilestoneUnlocked(data, milestone)) continue;
    unlockedMilestoneIds.push(milestone.id);
    for (const reward of milestone.rewards) {
      if (reward.kind === 'title') {
        unlockedTitles.push({
          id: reward.id,
          nameKey: reward.nameKey,
          nameFallback: reward.nameFallback,
        });
        continue;
      }
      if (reward.damageType === 'all') {
        allDamageBonus = Math.min(MAX_COLLECTION_ALL_DAMAGE_BONUS, allDamageBonus + reward.bonus);
        continue;
      }
      const prevBonus = damageBonusByType[reward.damageType] || 0;
      damageBonusByType[reward.damageType] = Math.min(
        MAX_COLLECTION_TYPE_DAMAGE_BONUS,
        prevBonus + reward.bonus,
      );
    }
  }

  return {
    unlockedMilestoneIds,
    unlockedTitles,
    damageBonusByType,
    allDamageBonus,
  };
}

/** Add one or more items to the collection and resolve unlocked perks. */
export function addToCollection(items: string[]): CollectionAddResult {
  const data = loadCollection();
  const prevPerks = getCollectionPerks(data);
  const prevMilestoneSet = new Set(prevPerks.unlockedMilestoneIds);
  const prevTitleSet = new Set(prevPerks.unlockedTitles.map((title) => title.id));
  for (const item of items) {
    if (!item) continue;
    data[item] = (data[item] || 0) + 1;
  }
  saveCollection(data);
  const perks = getCollectionPerks(data);
  const newlyUnlockedMilestoneIds = perks.unlockedMilestoneIds.filter((id) => !prevMilestoneSet.has(id));
  const newlyUnlockedTitles = perks.unlockedTitles.filter((title) => !prevTitleSet.has(title.id));
  return {
    data,
    perks,
    newlyUnlockedMilestoneIds,
    newlyUnlockedTitles,
  };
}
