import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { getExpedition } from '../data/worldMap.ts';
import { STARTERS } from '../data/starters.ts';
import { buildExpeditionLanes, buildExpeditionPlan } from './expeditionPlanner.ts';
import {
  ROUTE_TUNING, arriveAtMap, chooseExpeditionRoute, chosenOption, createExpeditionRun, expeditionBonusDrops,
  expeditionRoster, expeditionXpMult, isSerialExpeditionRun, nextExpeditionFloor, routeEventHpDelta,
} from './expeditionRun.ts';
import { buildSaveSnapshot, loadSave, writeSave } from './savegame.ts';
import { battleReducer, createInitialBattleState } from '../hooks/battle/battleReducer.ts';
import { getLevelMaxHp } from './playerHp.ts';

function seeded(seed) {
  let state = seed >>> 0;
  return (length) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return length > 0 ? state % length : 0;
  };
}

function makeRun(id = 'hydra', seed = 9) {
  const expedition = getExpedition(id);
  const plan = buildExpeditionPlan(expedition, seeded(seed));
  return createExpeditionRun(plan, buildExpeditionLanes(plan, expedition, seeded(seed + 1)));
}

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

test('a run walks the map one chosen route per floor and its roster follows the path', () => {
  let run = makeRun();
  assert.deepEqual(run.path, [0]);
  assert.equal(nextExpeditionFloor(run), 1);
  assert.equal(chooseExpeditionRoute(run, 1), null, 'routes can only be chosen from the map');
  run = arriveAtMap(run);
  assert.equal(chooseExpeditionRoute(run, 2), null, 'only offered lanes are valid');
  run = chooseExpeditionRoute(run, 1);
  assert.deepEqual(run.path, [0, 1]);
  assert.equal(run.atMap, false);
  assert.equal(expeditionRoster(run)[1], run.lanes[1][1]);
  assert.equal(chosenOption(run, 1), run.plan.floors[1].options[1]);
  for (let floor = 2; floor < 10; floor += 1) {
    run = chooseExpeditionRoute(arriveAtMap(run), floor === 9 ? 0 : floor % 2);
    assert.ok(run, `floor ${floor}`);
  }
  assert.equal(run.path.length, 10);
  assert.equal(chooseExpeditionRoute(arriveAtMap(run), 0), null, 'nothing after the boss');
  assert.equal(expeditionRoster(run)[9].id, 'boss_hydra');
});

test('route events heal, shield or ambush without knocking the player out', () => {
  assert.equal(routeEventHpDelta('healing_spring', 40, 100), Math.round(100 * ROUTE_TUNING.healingSpringPct));
  assert.equal(routeEventHpDelta('healing_spring', 95, 100), 5, 'healing never overfills');
  assert.equal(routeEventHpDelta('hazard_ambush', 100, 100), -Math.round(100 * ROUTE_TUNING.ambushPct));
  assert.equal(routeEventHpDelta('hazard_ambush', 3, 100), -2, 'ambush leaves at least 1 HP');
  assert.equal(routeEventHpDelta('focus_surge', 50, 100), 0);

  const base = { ...createInitialBattleState(), pLvl: 4, pStg: 1 };
  const maxHp = getLevelMaxHp(4, 1);
  const healed = battleReducer({ ...base, pHp: 10 }, { type: 'route_event', event: 'healing_spring' });
  assert.equal(healed.pHp, 10 + Math.round(maxHp * ROUTE_TUNING.healingSpringPct));
  const shielded = battleReducer({ ...base, pHp: 10 }, { type: 'route_event', event: 'focus_surge' });
  assert.equal(shielded.specDef, true);
  const ambushed = battleReducer({ ...base, pHp: 1 }, { type: 'route_event', event: 'hazard_ambush' });
  assert.equal(ambushed.pHp, 1);
});

test('only expedition elites and ambushes pay extra', () => {
  assert.equal(expeditionXpMult({ campaignRegion: 'rock', campaignTier: 'elite' }), ROUTE_TUNING.eliteXpMult);
  assert.equal(expeditionXpMult({ campaignTier: 'elite' }), 1, 'old campaign elites keep their rewards');
  assert.equal(expeditionBonusDrops({ campaignRegion: 'rock', campaignTier: 'elite', campaignEventTag: 'hazard_ambush' }), 2);
  assert.equal(expeditionBonusDrops({ campaignRegion: 'rock', campaignTier: 'normal', campaignEventTag: 'healing_spring' }), 0);
  assert.equal(expeditionBonusDrops({ campaignTier: 'elite', campaignEventTag: 'hazard_ambush' }), 0);
});

test('expedition saves resume on the map or mid-battle with every route intact', () => {
  const starter = STARTERS[0];
  const battle = { ...createInitialBattleState(), pLvl: 3, pHp: 50 };
  const atMap = arriveAtMap(chooseExpeditionRoute(arriveAtMap(makeRun('sword_god', 4)), 1));
  const save = (run, nextRound) => buildSaveSnapshot({
    battleMode: 'single', timedMode: true, nextRound, starter, allySub: null, coopActiveSlot: 'main',
    battle, enemies: expeditionRoster(run), expedition: run,
  });

  assert.equal(writeSave(save(atMap, 2)), true);
  const loaded = loadSave();
  assert.ok(loaded?.expedition);
  assert.equal(loaded.expedition.atMap, true);
  assert.deepEqual(loaded.expedition.path, [0, 1]);
  assert.deepEqual(loaded.expedition.plan, atMap.plan);
  loaded.expedition.lanes.forEach((lane, laneIndex) => lane.forEach((enemy, floor) => {
    const original = atMap.lanes[laneIndex][floor];
    assert.equal(enemy.id, original.id);
    assert.equal(enemy.campaignRegion, original.campaignRegion);
    assert.equal(enemy.svgFn(), original.svgFn());
  }));

  const midBattle = chooseExpeditionRoute(atMap, 0);
  assert.equal(writeSave(save(midBattle, 2)), true);
  assert.equal(loadSave()?.expedition?.atMap, false);

  assert.equal(writeSave(save(atMap, 1)), true);
  assert.equal(loadSave(), null, 'round and path must agree');
  const broken = save(atMap, 2);
  broken.expedition.path = [0, 5];
  assert.equal(writeSave(broken), true);
  assert.equal(loadSave(), null, 'unknown lanes are rejected');
  assert.equal(isSerialExpeditionRun({ ...save(atMap, 2).expedition, expeditionId: 'moon' }), false);
});
