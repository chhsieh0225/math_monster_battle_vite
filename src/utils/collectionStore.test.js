import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addToCollection,
  getCollectionPerks,
  loadCollection,
  MAX_COLLECTION_ALL_DAMAGE_BONUS,
  MAX_COLLECTION_TYPE_DAMAGE_BONUS,
} from './collectionStore.ts';

function createStorageMock() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

test('getCollectionPerks resolves damage/title milestones from collection counts', () => {
  const perks = getCollectionPerks({
    '🔥': 10,
    '⚡': 11,
    '👑': 5,
  });

  assert.equal(perks.damageBonusByType.fire, 0.05);
  assert.equal(perks.damageBonusByType.electric, 0.05);
  assert.equal(perks.allDamageBonus, 0);
  assert.equal(perks.unlockedTitles.length, 1);
  assert.equal(perks.unlockedTitles[0]?.id, 'crown_apprentice');
});

test('addToCollection reports newly unlocked milestone ids once', () => {
  globalThis.localStorage = createStorageMock();

  const first = addToCollection(['🔥', '🔥', '🔥', '🔥', '🔥']);
  assert.equal(first.newlyUnlockedMilestoneIds.length, 0);

  const second = addToCollection(['🔥', '🔥', '🔥', '🔥', '🔥']);
  assert.equal(second.newlyUnlockedMilestoneIds.includes('fire_mastery_1'), true);
  assert.equal(second.perks.damageBonusByType.fire, 0.05);

  const third = addToCollection(['🔥']);
  assert.equal(third.newlyUnlockedMilestoneIds.includes('fire_mastery_1'), false);
  assert.equal(loadCollection()['🔥'], 11);
});

test('getCollectionPerks unlocks combo milestone when all requirements are met', () => {
  const perks = getCollectionPerks({
    '🔥': 5,
    '💧': 5,
    '⚡': 5,
    '🌿': 5,
    '🛡️': 5,
  });

  assert.equal(perks.unlockedMilestoneIds.includes('elemental_harmony_1'), true);
  assert.equal(perks.unlockedTitles.some((title) => title.id === 'elemental_harmony'), true);
  assert.equal(perks.allDamageBonus, 0.01);
});

test('getCollectionPerks caps damage bonuses at configured limits', () => {
  const perks = getCollectionPerks({
    '🔥': 999,
    '💧': 999,
    '⚡': 999,
    '⭐': 999,
    '🌿': 999,
    '🛡️': 999,
    '💎': 999,
    '🪨': 999,
    '💀': 999,
    '👻': 999,
    '☠️': 999,
    '🍬': 999,
    '🐉': 999,
    '👑': 999,
    '🏆': 999,
    '⚔️': 999,
  });

  assert.equal(perks.damageBonusByType.fire, MAX_COLLECTION_TYPE_DAMAGE_BONUS);
  assert.equal(perks.damageBonusByType.water, MAX_COLLECTION_TYPE_DAMAGE_BONUS);
  assert.equal(perks.damageBonusByType.electric, MAX_COLLECTION_TYPE_DAMAGE_BONUS);
  assert.equal(perks.damageBonusByType.light, MAX_COLLECTION_TYPE_DAMAGE_BONUS);
  assert.equal(perks.damageBonusByType.grass, MAX_COLLECTION_TYPE_DAMAGE_BONUS);
  assert.equal(perks.damageBonusByType.steel, MAX_COLLECTION_TYPE_DAMAGE_BONUS);
  assert.equal(Math.abs(perks.allDamageBonus - MAX_COLLECTION_ALL_DAMAGE_BONUS) < 1e-9, true);
});
