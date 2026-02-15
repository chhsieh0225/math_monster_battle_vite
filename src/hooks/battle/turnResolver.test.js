import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveBossTurnState,
  resolveEnemyAssistStrike,
  resolveEnemyPrimaryStrike,
  resolvePlayerStrike,
  resolveRiskySelfDamage,
} from './turnResolver.js';

function withMockRandom(value, fn) {
  const prev = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = prev;
  }
}

test('resolveBossTurnState returns release event when boss is charging', () => {
  const out = resolveBossTurnState({
    enemy: { id: "boss", maxHp: 200 },
    eHp: 120,
    bossTurn: 3,
    bossCharging: true,
    sealedMove: -1,
  });

  assert.equal(out.isBoss, true);
  assert.equal(out.nextBossTurn, 4);
  assert.equal(out.bossEvent, "release");
});

test('resolveEnemyPrimaryStrike applies blaze and berserk branches', () => {
  withMockRandom(0, () => {
    const blaze = resolveEnemyPrimaryStrike({
      enemy: { atk: 20, maxHp: 100, mType: "fire", trait: "blaze" },
      enemyHp: 40,
      starterType: "grass",
      bossPhase: 2,
      chance: () => false,
    });
    assert.equal(blaze.isBlaze, true);
    assert.equal(blaze.isCrit, false);
    assert.ok(blaze.dmg > 0);
  });

  withMockRandom(0, () => {
    const berserk = resolveEnemyPrimaryStrike({
      enemy: { atk: 20, maxHp: 100, mType: "fire", trait: "berserk" },
      enemyHp: 90,
      starterType: "grass",
      bossPhase: 1,
      chance: () => true,
    });
    assert.equal(berserk.isCrit, true);
    assert.ok(berserk.dmg > 0);
  });
});

test('resolvePlayerStrike reflects fortress and curse modifiers', () => {
  withMockRandom(0, () => {
    const base = resolvePlayerStrike({
      move: { basePower: 40, growth: 5, type: "fire" },
      enemy: { trait: "normal", mType: "grass" },
      moveIdx: 0,
      moveLvl: 2,
      didLevel: false,
      maxPower: 80,
      streak: 1,
      stageBonus: 0,
      cursed: false,
      starterType: "fire",
      playerHp: 100,
      bossPhase: 0,
    });

    const nerfed = resolvePlayerStrike({
      move: { basePower: 40, growth: 5, type: "fire" },
      enemy: { trait: "fortress", mType: "grass" },
      moveIdx: 0,
      moveLvl: 2,
      didLevel: false,
      maxPower: 80,
      streak: 1,
      stageBonus: 0,
      cursed: true,
      starterType: "fire",
      playerHp: 100,
      bossPhase: 0,
    });

    assert.ok(base.dmg > nerfed.dmg);
    assert.equal(nerfed.isFortress, true);
    assert.equal(nerfed.wasCursed, true);
  });
});

test('resolveRiskySelfDamage returns a positive backfire value', () => {
  const sd = resolveRiskySelfDamage({
    move: { basePower: 36, growth: 6 },
    moveLvl: 3,
    moveIdx: 1,
  });
  assert.ok(sd > 0);
});

test('resolveEnemyAssistStrike applies cap and effectiveness', () => {
  withMockRandom(0, () => {
    const out = resolveEnemyAssistStrike({
      enemySub: { atk: 100, mType: "fire" },
      starterType: "grass",
      atkScale: 0.7,
      damageCap: 24,
    });
    assert.equal(out.scaledAtk, 70);
    assert.equal(out.defEff, 1.5);
    assert.equal(out.dmg, 24);
  });
});
