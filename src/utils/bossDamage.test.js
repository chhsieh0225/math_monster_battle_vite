import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBossDamageReduction, isBossTarget } from './bossDamage.ts';

test('isBossTarget recognizes normal and pvp-prefixed boss ids', () => {
  assert.equal(isBossTarget('boss'), true);
  assert.equal(isBossTarget('pvp_boss_hydra'), true);
  assert.equal(isBossTarget('slime'), false);
});

test('applyBossDamageReduction keeps non-boss damage unchanged', () => {
  assert.equal(applyBossDamageReduction(40, 'slime'), 40);
});

test('applyBossDamageReduction applies 25% reduction to bosses by default', () => {
  assert.equal(applyBossDamageReduction(40, 'boss'), 30);
  assert.equal(applyBossDamageReduction(40, 'pvp_boss_sword_god'), 30);
});

test('applyBossDamageReduction keeps minimum damage of 1 for boss targets', () => {
  assert.equal(applyBossDamageReduction(1, 'boss'), 1);
});
