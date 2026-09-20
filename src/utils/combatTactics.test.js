import test from 'node:test';
import assert from 'node:assert/strict';
import { getFireTactic, planFireTactic, planElementTactic, getShadowWard, hitShadowWard, getBossSealPool } from './combatTactics.ts';
import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import { validateBalanceConfigSchema } from '../data/balanceConfigSchema.ts';

test('fire tactics are limited to the fire starter, four valid moves and PvE', () => {
  assert.deepEqual([0, 1, 2, 3].map(i => getFireTactic('fire', 'single', i)), ['kindle', 'breach', 'detonate', 'finisher']);
  for (const mode of ['single', 'coop', 'double']) assert.equal(getFireTactic('fire', mode, 1), 'breach');
  for (const [id, mode, index] of [['fire', 'pvp', 1], ['water', 'single', 1], ['fire', 'single', -1], ['fire', 'single', 4]]) {
    assert.equal(getFireTactic(id, mode, index), null);
  }
});

test('kindle builds capped burn; breach creates an opening without consuming its new opening', () => {
  assert.equal(planFireTactic('kindle', 0).nextBurn, 2);
  assert.equal(planFireTactic('kindle', 4).nextBurn, 5);
  const breach = planFireTactic('breach', 2);
  assert.equal(breach.nextBurn, 3);
  assert.equal(breach.nextExposed, true);
  assert.equal(breach.damageScale, 1);
  assert.equal(breach.wardBreak, 2);
});

test('explosions consume existing stacks once; zero stacks never lock a move', () => {
  assert.equal(planFireTactic('detonate', 3).bonusDamage, 18);
  assert.equal(planFireTactic('finisher', 3).bonusDamage, 27);
  assert.equal(planFireTactic('detonate', 3).nextBurn, 0);
  assert.equal(planFireTactic('detonate', 0).bonusDamage, 0);
  const partner = planFireTactic(null, 3, true);
  assert.equal(partner.damageScale, 1.2);
  assert.equal(partner.nextExposed, false);
  assert.equal(partner.nextBurn, 3);
});

test('basic attacks deterministically open wards; an opening is consumed once and reforms', () => {
  for (const [hp, expected] of [[100, 2], [60, 3], [30, 3]]) {
    let layers;
    for (let i = expected; i > 0; i--) {
      const ward = getShadowWard('boss', 'single', layers, hp, 100);
      assert.equal(ward.layers, i);
      assert.equal(ward.damageScale, .6);
      layers = hitShadowWard(ward);
    }
    const opening = getShadowWard('boss', 'single', layers, hp, 100);
    assert.equal(opening.open, true);
    assert.equal(opening.damageScale, 1.35);
    assert.equal(hitShadowWard(opening), expected);
  }
});

test('rush removes two layers, legacy counters recover, and PvP/dead/non-boss targets have no ward', () => {
  assert.equal(hitShadowWard(getShadowWard('boss', 'coop', 2, 100, 100), 2), 0);
  for (const remaining of [undefined, -1, NaN, Infinity]) {
    assert.equal(getShadowWard('boss', 'single', remaining, 100, 100).layers, 2);
  }
  assert.equal(getShadowWard('boss', 'pvp', 2, 100, 100), null);
  assert.equal(getShadowWard('slime', 'single', 2, 100, 100), null);
  assert.equal(getShadowWard('boss', 'single', 2, 0, 100), null);
  assert.deepEqual(getBossSealPool('boss'), [1, 2]);
  assert.deepEqual(getBossSealPool('boss_sword_god'), [0, 1, 2]);
});

test('tactical balance rejects invisible/infinite shield and damage settings', () => {
  for (const [key, value] of [['guardedScale', 0], ['openingScale', Infinity], ['layers', 1.5], ['enragedLayers', 4]]) {
    const config = structuredClone(BALANCE_CONFIG);
    config.tactics.shadowWard[key] = value;
    assert.throws(() => validateBalanceConfigSchema(config), /tactics.shadowWard/);
  }
});

test('water builders cap tide and the faster builder trades direct power for preparation', () => {
  assert.equal(planElementTactic('water', 'single', 0).next, 1);
  const surge = planElementTactic('water', 'coop', 1, 2);
  assert.equal(surge.next, 3);
  assert.equal(surge.powerScale, .85);
  assert.equal(surge.spent, 0);
});

test('full tide offers burst and ward breaking OR a smaller burst with guaranteed freeze', () => {
  const tsunami = planElementTactic('water', 'single', 2, 3);
  const vortex = planElementTactic('water', 'single', 3, 3);
  assert.equal(tsunami.bonusDamage, 24);
  assert.equal(tsunami.wardBreak, 2);
  assert.equal(tsunami.guaranteedFreeze, false);
  assert.equal(vortex.bonusDamage, 15);
  assert.equal(vortex.guaranteedFreeze, true);
  for (const plan of [tsunami, vortex]) { assert.equal(plan.spent, 3); assert.equal(plan.next, 0); }
  assert.equal(planElementTactic('water', 'single', 2, 2).wardBreak, 1);
  assert.equal(planElementTactic('water', 'single', 3, 2).guaranteedFreeze, false);
});

test('electric builders auto-discharge once; spenders never also trigger passive discharge', () => {
  for (const [idx, before] of [[0, 2], [2, 1], [2, 2]]) {
    const plan = planElementTactic('electric', 'double', idx, 0, before);
    assert.equal(plan.next, 0);
    assert.equal(plan.dischargeDamage, 12);
    assert.equal(plan.spent, 0);
  }
  const pulse = planElementTactic('electric', 'single', 1, 0, 2);
  assert.equal(pulse.spent, 1);
  assert.equal(pulse.next, 1);
  assert.equal(pulse.bonusDamage, 10);
  const chain = planElementTactic('electric', 'single', 3, 0, 2);
  assert.equal(chain.spent, 2);
  assert.equal(chain.next, 0);
  assert.equal(chain.bonusDamage, 24);
  assert.equal(chain.wardBreak, 2);
  assert.equal(pulse.dischargeDamage + chain.dischargeDamage, 0);
});

test('new tactics reject invalid slots, ignore PvP/other actors and bound malformed resources', () => {
  for (const id of ['water', 'electric']) {
    for (const index of [-1, 4, 1.5, NaN]) assert.equal(planElementTactic(id, 'single', index), null);
    assert.equal(planElementTactic(id, 'pvp', 0), null);
    for (const bad of [undefined, NaN, Infinity, -10]) {
      const plan = planElementTactic(id, 'single', 3, bad, bad);
      assert.equal(plan.spent, 0);
      assert.equal(plan.guaranteedFreeze, false);
      assert.equal(plan.wardBreak, 1);
    }
    const bounded = planElementTactic(id, 'single', 3, 999, 999);
    assert.equal(bounded.before, 3);
  }
  for (const id of [undefined, 'fire', 'tiger', 'grass']) assert.equal(planElementTactic(id, 'single', 0), null);
});

test('new resource balance validates integer capacities, power bounds and reachable thresholds', () => {
  for (const [kind, key, value] of [['water', 'maxTide', 0], ['water', 'surgeStacks', 1.5],
    ['water', 'surgeDamageScale', 2], ['electric', 'pulseBonus', Infinity], ['electric', 'finisherWardAt', 4]]) {
    const config = structuredClone(BALANCE_CONFIG);
    config.tactics[kind][key] = value;
    assert.throws(() => validateBalanceConfigSchema(config), /tactics/);
  }
});
