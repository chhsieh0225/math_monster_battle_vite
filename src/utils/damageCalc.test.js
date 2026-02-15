import assert from 'node:assert/strict';
import test from 'node:test';
import {
  movePower,
  bestAttackType,
  bestEffectiveness,
  calcAttackDamage,
  calcEnemyDamage,
  freezeChance,
} from './damageCalc.js';

function withMockRandom(value, fn) {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

test('movePower respects cap by move index', () => {
  const move = { basePower: 30, growth: 10 };
  assert.equal(movePower(move, 3, 2), 45);
});

test('bestAttackType and bestEffectiveness pick stronger dual type', () => {
  const move = { type: "fire", type2: "water" };
  const enemy = { mType: "fire" };

  assert.equal(bestAttackType(move, enemy), "water");
  assert.equal(bestEffectiveness(move, enemy), 1.5);
});

test('calcAttackDamage follows deterministic formula order', () => {
  const damage = withMockRandom(0, () => calcAttackDamage({
    basePow: 20,
    streak: 5,
    stageBonus: 2,
    effMult: 1.5,
  }));
  assert.equal(damage, 60);
});

test('calcEnemyDamage uses atk variance and effectiveness multiplier', () => {
  const damage = withMockRandom(0.999, () => calcEnemyDamage(50, 1.5));
  assert.equal(damage, 90);
});

test('freezeChance increases with move level', () => {
  assert.equal(freezeChance(1), 0.28);
  assert.equal(freezeChance(6), 0.43);
});
