import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  createWorldProgress, isExpeditionUnlocked, isRegionDiscovered, loadWorldProgress, normalizeWorldProgress,
  recordExpeditionClear, recordExpeditionFloor, recordRegionVisit, recordRegionWin, saveWorldProgress,
} from './worldProgress.ts';

let previousStorage;
beforeEach(() => {
  previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
});
afterEach(() => { globalThis.localStorage = previousStorage; });

test('expeditions unlock in order, one boss at a time', () => {
  let progress = createWorldProgress();
  assert.equal(isExpeditionUnlocked(progress, 'hydra'), true);
  assert.equal(isExpeditionUnlocked(progress, 'sword_god'), false);
  assert.equal(isExpeditionUnlocked(progress, 'dark_king'), false);
  progress = recordExpeditionFloor(progress, 'hydra', 9);
  assert.equal(isExpeditionUnlocked(progress, 'sword_god'), false, 'reaching the boss is not enough');
  progress = recordExpeditionClear(progress, 'hydra');
  assert.equal(isExpeditionUnlocked(progress, 'sword_god'), true);
  assert.equal(isExpeditionUnlocked(progress, 'crazy_dragon'), false);
  assert.deepEqual(progress.expeditions.hydra, { clears: 1, bestFloor: 10 });
});

test('regions are discovered by visiting and remember wins', () => {
  let progress = createWorldProgress();
  assert.equal(isRegionDiscovered(progress, 'fire'), false);
  progress = recordRegionVisit(progress, 'fire');
  progress = recordRegionWin(recordRegionWin(progress, 'fire'), 'fire');
  assert.equal(isRegionDiscovered(progress, 'fire'), true);
  assert.deepEqual(progress.regions.fire, { visits: 1, wins: 2 });
  assert.equal(recordExpeditionFloor(progress, 'hydra', 3).expeditions.hydra.bestFloor, 3);
  const best = recordExpeditionFloor(progress, 'hydra', 5);
  assert.equal(recordExpeditionFloor(best, 'hydra', 2), best, 'best floor never goes down');
});

test('progress survives storage and ignores corrupt or unknown data', () => {
  let progress = recordExpeditionClear(recordRegionVisit(createWorldProgress(), 'water'), 'hydra');
  assert.equal(saveWorldProgress(progress), true);
  assert.deepEqual(loadWorldProgress(), progress);
  const messy = normalizeWorldProgress({
    version: 1,
    regions: { water: { visits: 2, wins: -4 }, atlantis: { visits: 9, wins: 9 } },
    expeditions: { hydra: { clears: 1.5, bestFloor: 99 }, moon: { clears: 3 } },
  });
  assert.deepEqual(messy.regions, { water: { visits: 2, wins: 0 } });
  assert.deepEqual(messy.expeditions, { hydra: { clears: 0, bestFloor: 10 } });
  assert.deepEqual(normalizeWorldProgress({ version: 2 }), createWorldProgress());
  assert.deepEqual(normalizeWorldProgress('nope'), createWorldProgress());
});
