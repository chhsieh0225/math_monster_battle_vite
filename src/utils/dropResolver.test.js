import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBattleDrop, resetDropPityState } from './dropResolver.ts';

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

function fixedRoll(value) {
  return (_min, max) => Math.min(value, max);
}

test('boss legendary pity guarantees drop after threshold misses', () => {
  globalThis.localStorage = createStorageMock();
  resetDropPityState();

  for (let i = 0; i < 5; i += 1) {
    const result = resolveBattleDrop({
      enemyId: 'boss',
      enemyDrops: ['👑', '🏆'],
      randInt: fixedRoll(1),
    });
    assert.equal(result.pityHit, false);
    assert.equal(result.drop, '👑');
  }

  const pityResult = resolveBattleDrop({
    enemyId: 'boss',
    enemyDrops: ['👑', '🏆'],
    randInt: fixedRoll(1),
  });
  assert.equal(pityResult.pityHit, true);
  assert.equal(pityResult.drop, '🏆');
  assert.equal(pityResult.rarity, 'legendary');
});

test('scene weighting shifts fire-table roll outcome', () => {
  globalThis.localStorage = createStorageMock();
  resetDropPityState();

  const baseResult = resolveBattleDrop({
    enemyId: 'fire',
    enemyDrops: ['🔥', '💎'],
    randInt: fixedRoll(80),
  });
  const fireSceneResult = resolveBattleDrop({
    enemyId: 'fire',
    enemyDrops: ['🔥', '💎'],
    sceneType: 'fire',
    randInt: fixedRoll(80),
  });

  assert.equal(baseResult.drop, '💎');
  assert.equal(fireSceneResult.drop, '🔥');
});

test('campaign branch weighting biases left route to fire resources', () => {
  globalThis.localStorage = createStorageMock();
  resetDropPityState();

  const neutral = resolveBattleDrop({
    enemyId: 'fire',
    enemyDrops: ['🔥', '💎'],
    randInt: fixedRoll(80),
  });
  const leftBranch = resolveBattleDrop({
    enemyId: 'fire',
    enemyDrops: ['🔥', '💎'],
    campaignBranch: 'left',
    randInt: fixedRoll(80),
  });

  assert.equal(neutral.drop, '💎');
  assert.equal(leftBranch.drop, '🔥');
});

