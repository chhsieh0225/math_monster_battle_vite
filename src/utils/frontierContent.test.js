import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { EXPEDITIONS } from '../data/worldMap.ts';
import { WORLD_SIDE_ROUTES } from '../data/worldSideRoutes.ts';
import { MONSTER_CONFIGS, BOSS_IDS } from '../data/monsterConfigs.ts';
import { getEnemySkill, canDisruptEnemySkill, resolveEnemySkillImpact } from '../data/enemySkills.ts';
import { getEncounterBackground } from '../data/encounterBackgrounds.ts';
import { getSkillRecipe } from '../components/effects/skillRecipes.ts';
import { buildExpeditionPlan, buildExpeditionLanes } from './expeditionPlanner.ts';
import { createExpeditionRun, arriveAtMap, chooseExpeditionRoute, unlockExpeditionSideRoutes, isSerialExpeditionRun } from './expeditionRun.ts';
import { createWorldProgress, normalizeWorldProgress, recordSideRouteClear, recordSecretFound } from './worldProgress.ts';
import { buildRoster } from './rosterBuilder.ts';
import { getSpriteAnimationAsset } from '../data/spriteAnimationAssets.ts';
import { buildTowerChallengeRoster } from '../hooks/battle/challengeRuntime.ts';
import { runBattleStartGame } from '../hooks/battle/startFlowAdapter.ts';

const ids = ['venom_mantis', 'mire_toad', 'night_bat', 'chain_wraith', 'thunder_raptor', 'crystal_crab', 'dream_weaver'];
const secrets = WORLD_SIDE_ROUTES.map((route) => route.secret);
const seeded = (seed) => {
  let n = seed >>> 0;
  return (length) => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return Math.floor(n / 2 ** 32 * length); };
};

test('seven new species have the approved element mix, distinct registered poses and complete skill chains', () => {
  const counts = {};
  const registration = JSON.parse(readFileSync(new URL('../../public/sprites/visual-pilot/registration-frontier-v1.json', import.meta.url))).assets;
  const recipes = new Set();
  for (const id of ids) {
    const config = MONSTER_CONFIGS.find((entry) => entry.id === id);
    assert.ok(config);
    counts[config.mType] = (counts[config.mType] ?? 0) + 1;
    const art = getSpriteAnimationAsset(config.spriteKey);
    assert.ok(art);
    const record = Object.values(registration).find((r) => r.key === id);
    assert.equal(record.file, art.art.file);
    assert.equal(new Set(record.frames.map((f) => f.rgbaSha256)).size, 8);
    assert.equal(record.quality, 92);
    for (const level of [1, 5, 10]) {
      const actor = { ...config, lvl: level };
      assert.equal(getEnemySkill(actor, 0).kind, 'basic');
      const first = getEnemySkill(actor, 1);
      const second = getEnemySkill(actor, 3);
      assert.equal(first.skillId === second.skillId, level < 5);
      for (const action of [first, second]) {
        assert.ok(getSkillRecipe(action.skillId), action.skillId);
        recipes.add(action.skillId);
        assert.ok(canDisruptEnemySkill(actor, { turn: 1, disrupted: false }, 0, 1, 'single'));
        assert.equal(resolveEnemySkillImpact(action, true, 20, 100, 20, 100).heal, 0);
      }
    }
  }
  assert.deepEqual(counts, { poison: 2, dark: 2, electric: 1, rock: 1, dream: 1 });
  assert.equal(recipes.size, 14);
});

test('unlocked side routes preserve both ordinary choices and lead to their advertised encounters', () => {
  for (const expedition of EXPEDITIONS) {
    const locked = buildExpeditionPlan(expedition, seeded(42));
    const plan = buildExpeditionPlan(expedition, seeded(42), ['fire'], secrets);
    const lanes = buildExpeditionLanes(plan, expedition, seeded(73), ['fire']);
    assert.equal(lanes.length, 3);
    for (const floor of plan.floors) {
      assert.deepEqual(floor.options.slice(0, 2), locked.floors[floor.floor].options);
      if (!floor.options[2]) continue;
      const branch = WORLD_SIDE_ROUTES.find((r) => r.id === floor.options[2].sideRouteId);
      assert.ok(branch.floors.includes(floor.floor));
      assert.equal(lanes[2][floor.floor].id, branch.id === 'frost_cove' ? 'wild_starter_tiger' : branch.monsterId);
      assert.equal(lanes[2][floor.floor].campaignRegion, branch.region);
    }
    assert.equal(plan.floors[4].options.filter((o) => o.kind === 'spring').length, 1);
    assert.equal(lanes[0][9].id, expedition.bossId);
    assert.equal(lanes[0][9], lanes[2][9]);
    assert.ok(isSerialExpeditionRun(createExpeditionRun(plan, lanes)));
  }
});

test('finding a secret mid-run adds only future branches, never rerolls existing enemies', () => {
  const expedition = EXPEDITIONS[0];
  const plan = buildExpeditionPlan(expedition, seeded(9));
  const run = createExpeditionRun(plan, buildExpeditionLanes(plan, expedition, seeded(9)));
  const first = unlockExpeditionSideRoutes(run, ['coral_lagoon'], ['fire'], seeded(10));
  assert.equal(first.lanes[0], run.lanes[0]);
  assert.equal(first.lanes[1], run.lanes[1]);
  assert.equal(unlockExpeditionSideRoutes(first, ['coral_lagoon'], [], seeded(11)), first);
  const next = unlockExpeditionSideRoutes(first, secrets, [], seeded(12));
  assert.equal(next.lanes[2][2], first.lanes[2][2]);
  let advanced = chooseExpeditionRoute(arriveAtMap(next), 0);
  advanced = chooseExpeditionRoute(arriveAtMap(advanced), 2);
  assert.deepEqual(advanced.path, [0, 0, 2]);
  assert.ok(isSerialExpeditionRun(advanced));
  const fromLater = unlockExpeditionSideRoutes({ ...run, path: [0, 0, 0, 0, 0, 0] }, secrets, [], seeded(14));
  assert.equal(fromLater.plan.floors[2].options.length, 2);
  assert.equal(fromLater.plan.floors[5].options.length, 2);
  assert.equal(fromLater.plan.floors[6].options[2].sideRouteId, 'orbital_trial');
  const tiger = buildExpeditionPlan(expedition, seeded(9), ['tiger'], secrets);
  assert.ok(tiger.floors.every((f) => f.options.every((o) => o.sideRouteId !== 'frost_cove')));
});

test('side-route records migrate old saves and invalid branch structures are rejected', () => {
  const old = createWorldProgress();
  assert.deepEqual(normalizeWorldProgress(old), old);
  const progress = recordSideRouteClear(recordSecretFound(old, 'coral_lagoon'), 'frost_cove');
  assert.deepEqual(normalizeWorldProgress(progress), progress);
  assert.equal(recordSideRouteClear(progress, 'frost_cove').sideRoutes.frost_cove.clears, 2);
  assert.deepEqual(normalizeWorldProgress({ ...old, sideRoutes: { frost_cove: { clears: -1 }, bogus: { clears: 20 } } }).sideRoutes, { frost_cove: { clears: 0 } });
  const plan = buildExpeditionPlan(EXPEDITIONS[0], seeded(8), [], secrets);
  const run = createExpeditionRun(plan, buildExpeditionLanes(plan, EXPEDITIONS[0], seeded(8)));
  assert.equal(isSerialExpeditionRun({ ...run, lanes: run.lanes.slice(0, 2) }), false);
  const bad = structuredClone(plan);
  bad.floors[2].options[2].sideRouteId = 'unknown';
  assert.equal(isSerialExpeditionRun({ ...run, plan: bad }), false);
  bad.floors[2].options[2].sideRouteId = 'limit_trial';
  assert.equal(isSerialExpeditionRun({ ...run, plan: bad }), false);
});

test('new habitats are real shipped files and preserve existing guardian overrides', () => {
  for (const id of ['wild_starter_tiger', 'venom_mantis', 'mire_toad', 'night_bat', 'chain_wraith', 'limit_knight']) {
    const path = getEncounterBackground(id);
    assert.ok(existsSync(new URL(`../../public${path}`, import.meta.url)), id);
  }
  assert.equal(getEncounterBackground('missing'), undefined);
  assert.equal(getEncounterBackground('__proto__'), undefined);
});

test('all new species and previously unreachable forms appear on real expedition routes', () => {
  const seen = new Set();
  const enemyIds = new Set();
  for (const expedition of EXPEDITIONS) {
    for (let seed = 1; seed <= 200; seed++) {
      const random = seeded(seed * 7919);
      const plan = buildExpeditionPlan(expedition, random, [], secrets);
      const lanes = buildExpeditionLanes(plan, expedition, random);
      plan.floors.forEach((floor) => floor.options.forEach((option, lane) => {
        if (option.kind === 'spring') return;
        const enemy = lanes[lane][floor.floor];
        enemyIds.add(enemy.id);
        const asset = getSpriteAnimationAsset(enemy.activeSpriteKey ?? enemy.spriteKey);
        seen.add(asset?.profile.imgKey);
      }));
    }
  }
  for (const id of ids) assert.ok(enemyIds.has(id), `${id} cannot appear`);
  for (const key of ['player_grass0', 'player_grass1', 'player_grass2', 'player_tiger0', 'player_tiger1', 'player_tiger2', 'player_lion0', 'slime_electric', 'slime_dark', 'slime_steel', 'slime_evolved', 'slime_water_evolved', 'slime_dark_evolved', 'ghost']) {
    assert.ok(seen.has(key), `${key} still has no encounter route`);
  }
});

test('scene draws keep every pool entry equally reachable instead of rerolling variants', () => {
  for (const [scene, expected] of [['ghost', ['ghost', 'ghost_lantern']], ['rock', ['golumn', 'golumn_mud', 'crystal_crab']]]) {
    const results = expected.map((_, index) => {
      let call = 0;
      return buildRoster((length) => call++ === 0 ? index % length : length - 1, 'single', { singleWaves: [{ sceneType: scene }], disableRandomSwap: true })[0].id;
    });
    assert.deepEqual(results, expected);
  }
});

test('tower gates use actual bosses with tower-only scaling and ordinary floors exclude bosses', () => {
  const base = buildRoster(seeded(5), 'single', { disableRandomSwap: true });
  const makePlan = (floor, enemyTier) => ({ floors: [{ floor, floorSeed: 'test', levelScale: 1.5, atkScale: 1.2, battle: { enemyTier, enemyCount: 1, enemyLevelOffset: 3 } }] });
  for (const floor of [5, 10, 15, 20]) {
    const [boss] = buildTowerChallengeRoster(base, makePlan(floor, 'boss'));
    assert.ok(BOSS_IDS.has(boss.id));
    const config = MONSTER_CONFIGS.find((entry) => entry.id === boss.id);
    assert.equal(boss.maxHp, Math.round(config.hp * 1.5 * 1.28));
    assert.equal(boss.atk, Math.round(config.atk * 1.2 * 1.28));
  }
  for (const floor of [1, 9, 11, 19]) assert.ok(!BOSS_IDS.has(buildTowerChallengeRoster(base, makePlan(floor, 'normal'))[0].id));
  assert.throws(() => buildTowerChallengeRoster(base.filter((enemy) => !BOSS_IDS.has(enemy.id)), makePlan(5, 'boss')), /no boss encounter/);
});

test('start wrapper forwards starter exclusions in normal and challenge runs', () => {
  const noop = () => {};
  for (const queuedChallenge of [null, { kind: 'tower', plan: {} }, { kind: 'daily', plan: {} }]) {
    let captured;
    const options = { excludeStarterIds: ['fire', 'tiger'] };
    runBattleStartGame({
      setDailyChallengeFeedback: noop, setTowerChallengeFeedback: noop, queuedChallenge, activeChallenge: null,
      buildNewRoster: (mode, forwarded) => { captured = { mode, forwarded }; return []; },
      startGameOrchestratorArgs: { standardStartDepsArgs: { runtime: {} } }, activateQueuedChallenge: noop,
      runStartGameOrchestratorFn: (args) => args.standardStartDepsArgs.runtime.buildNewRoster('coop', options),
      buildDailyChallengeRosterFn: (roster) => roster, buildTowerChallengeRosterFn: (roster) => roster,
      getDailyChallengeSeedFn: () => 'daily', getTowerChallengeSeedFn: () => 'tower',
    });
    assert.deepEqual(captured, { mode: 'coop', forwarded: options });
  }
});
