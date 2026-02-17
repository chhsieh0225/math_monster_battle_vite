import { readJson, writeJson } from './storage.ts';

/**
 * collectionStore.ts — Persistent drop collection tracking.
 *
 * Stores a Record<emoji, count> in localStorage so players can
 * see everything they've collected across sessions.
 */

const COLLECTION_KEY = 'mathMonsterBattle_collection';

export type CollectionData = Record<string, number>;

export function loadCollection(): CollectionData {
  return readJson<CollectionData>(COLLECTION_KEY, {});
}

export function saveCollection(data: CollectionData): void {
  writeJson(COLLECTION_KEY, data);
}

/** Add one or more items to the collection. Returns the updated record. */
export function addToCollection(items: string[]): CollectionData {
  const data = loadCollection();
  for (const item of items) {
    if (!item) continue;
    data[item] = (data[item] || 0) + 1;
  }
  saveCollection(data);
  return data;
}
