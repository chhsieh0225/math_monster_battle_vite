import { readJson, writeJson } from './storage.ts';
import { COLLECTION_MILESTONES, type CollectionTitleReward } from '../data/collectionMilestones.ts';

/**
 * collectionStore.ts — Persistent drop collection tracking.
 *
 * Stores a Record<emoji, count> in localStorage so players can
 * see everything they've collected across sessions.
 */

const COLLECTION_KEY = 'mathMonsterBattle_collection';

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

function isMilestoneUnlocked(data: CollectionData, emoji: string, required: number): boolean {
  return (data[emoji] || 0) >= required;
}

export function getCollectionPerks(data: CollectionData = loadCollection()): CollectionPerks {
  const unlockedMilestoneIds: string[] = [];
  const unlockedTitles: CollectionTitle[] = [];
  const damageBonusByType: Record<string, number> = {};
  let allDamageBonus = 0;

  for (const milestone of COLLECTION_MILESTONES) {
    if (!isMilestoneUnlocked(data, milestone.emoji, milestone.required)) continue;
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
        allDamageBonus += reward.bonus;
        continue;
      }
      damageBonusByType[reward.damageType] = (damageBonusByType[reward.damageType] || 0) + reward.bonus;
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
