import assert from 'node:assert/strict';
import test from 'node:test';

import { BALANCE_CONFIG } from './balanceConfig.ts';
import { getDualEff, getEff } from './typeEffectiveness.ts';

test('steel attacker has configured effectiveness table', () => {
  assert.equal(getEff('steel', 'rock'), 1.5);
  assert.equal(getEff('steel', 'ghost'), 1.5);
  assert.equal(getEff('steel', 'fire'), 0.6);
  assert.equal(getEff('steel', 'water'), 0.6);
  assert.equal(getEff('steel', 'electric'), 0.6);
  assert.equal(getEff('steel', 'steel'), 0.6);
  assert.equal(getEff('steel', 'grass'), 1.0);
});

test('dual effectiveness still respects global cap', () => {
  assert.equal(getDualEff('steel', 'rock', 'ghost'), BALANCE_CONFIG.dualTypeEffCap);
});

test('ice attacker and defender have configured effectiveness values', () => {
  assert.equal(getEff('ice', 'grass'), 1.5);
  assert.equal(getEff('ice', 'fire'), 0.6);
  assert.equal(getEff('fire', 'ice'), 1.5);
  assert.equal(getEff('water', 'ice'), 0.6);
});

test('unknown attacker type stays neutral', () => {
  assert.equal(getEff('unknown_type', 'fire'), 1.0);
});
