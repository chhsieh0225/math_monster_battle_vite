import assert from 'node:assert/strict';
import test from 'node:test';
import { EXPEDITIONS, WORLD_REGIONS, getExpedition } from '../data/worldMap.ts';
import { buildExpeditionLanes, buildExpeditionPlan, routeMatchup } from './expeditionPlanner.ts';

function seeded(seed) {
  let state = seed >>> 0;
  return (length) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return length > 0 ? state % length : 0;
  };
}

test('every expedition plan starts in the grassland, offers two routes, and ends at its boss', () => {
  for (const expedition of EXPEDITIONS) {
    for (let seed = 1; seed <= 40; seed += 1) {
      const plan = buildExpeditionPlan(expedition, seeded(seed));
      assert.equal(plan.floors.length, 10);
      assert.deepEqual(plan.floors[0].options, [{ region: 'grass', tier: 'normal', event: null }]);
      assert.deepEqual(plan.floors[9].options, [{ region: expedition.region, tier: 'boss', event: null }]);
      for (const floor of plan.floors.slice(1, 9)) {
        assert.equal(floor.options.length, 2);
        const [a, b] = floor.options;
        assert.notEqual(a.region, b.region, 'the two routes lead to different regions');
        const pool = floor.floor <= 3 ? expedition.stages.early : floor.floor <= 6 ? expedition.stages.mid : expedition.stages.late;
        assert.ok(pool.includes(a.region) && pool.includes(b.region));
      }
      for (const index of [3, 6, 8]) {
        assert.deepEqual(plan.floors[index].options.map((o) => o.tier).sort(), ['elite', 'normal'], 'elite floors pair risk with a safe route');
      }
      for (const index of [2, 5, 7]) {
        assert.equal(plan.floors[index].options.filter((o) => o.event).length, 1, 'event floors pair one event with a plain route');
      }
    }
  }
});

test('route enemies match their region, scale by tier, and the boss is the expedition boss', () => {
  const expedition = getExpedition('crazy_dragon');
  const plan = buildExpeditionPlan(expedition, seeded(7));
  const lanes = buildExpeditionLanes(plan, expedition, seeded(11), ['fire']);
  assert.equal(lanes.length, 2);
  for (const lane of [0, 1]) {
    assert.equal(lanes[lane].length, 10);
    lanes[lane].forEach((enemy, floor) => {
      const option = plan.floors[floor].options[lane] ?? plan.floors[floor].options[0];
      assert.equal(enemy.campaignNodeIndex, floor + 1);
      assert.equal(enemy.campaignTier, option.tier);
      assert.equal(enemy.campaignEventTag, option.event);
      assert.equal(enemy.hp, enemy.maxHp);
      if (option.tier !== 'boss') assert.equal(enemy.sceneMType, WORLD_REGIONS[option.region].scene);
      assert.notEqual(enemy.id, 'wild_starter_fire', 'the player\'s own starter never appears as a wild enemy');
    });
  }
  assert.equal(lanes[0][9].id, 'boss_crazy_dragon');
  assert.equal(lanes[0][9], lanes[1][9], 'single-route floors share one enemy');
  assert.equal(lanes[0][0], lanes[1][0]);
});

test('later expeditions hit harder than the first for the same floor', () => {
  const easy = getExpedition('hydra');
  const hard = getExpedition('dark_king');
  const easyBoss = buildExpeditionLanes(buildExpeditionPlan(easy, seeded(3)), easy, seeded(5))[0][0];
  const hardBoss = buildExpeditionLanes(buildExpeditionPlan(hard, seeded(3)), hard, seeded(5))[0][0];
  assert.ok(hardBoss.maxHp > easyBoss.maxHp);
});

test('matchups tell the child whether a route favours their monster', () => {
  assert.equal(routeMatchup('fire', { mType: 'grass' }).verdict, 'advantage');
  assert.equal(routeMatchup('fire', { mType: 'water' }).verdict, 'disadvantage');
  assert.equal(routeMatchup('fire', { mType: 'electric' }).verdict, 'neutral');
  const dual = routeMatchup('water', { mType: 'poison', mType2: 'dark' });
  assert.equal(dual.attack, 1.5);
  assert.equal(dual.defense, 1.5);
  assert.equal(dual.verdict, 'neutral');
});

test('a region is skipped when its only wild monster is the player\'s own starter', () => {
  const expedition = getExpedition('sword_god');
  for (let seed = 1; seed <= 60; seed += 1) {
    const plan = buildExpeditionPlan(expedition, seeded(seed), ['lion']);
    const regions = plan.floors.flatMap((floor) => floor.options.map((option) => option.region));
    assert.ok(!regions.includes('light'), `seed ${seed}`);
  }
});
