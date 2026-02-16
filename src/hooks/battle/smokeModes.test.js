import assert from 'node:assert/strict';
import test from 'node:test';
import { runPvpStartFlow, runStandardStartFlow } from './startGameFlow.ts';

function createStarter(overrides = {}) {
  return {
    id: 'fire',
    name: '火狐',
    type: 'fire',
    selectedStageIdx: 0,
    ...overrides,
  };
}

test('smoke: single mode can start battle pipeline', () => {
  const dispatchActions = [];
  const setScreenCalls = [];
  const startBattleCalls = [];

  runStandardStartFlow({
    mode: 'single',
    leader: createStarter(),
    partner: null,
    leaderMaxHp: 100,
    leaderStageIdx: 0,
    currentTimedMode: false,
    buildNewRoster: () => [{ id: 'slime' }],
    getStarterMaxHp: () => 77,
    setEnemies: () => {},
    setCoopActiveSlot: () => {},
    resetPvpRuntime: () => {},
    dispatchBattle: (action) => { dispatchActions.push(action); },
    resetRunRuntimeState: () => {},
    appendSessionEvent: () => {},
    initSession: () => {},
    setScreen: (value) => { setScreenCalls.push(value); },
    startBattle: (idx, roster) => { startBattleCalls.push({ idx, roster }); },
  });

  assert.equal(dispatchActions[0].type, 'reset_run');
  assert.equal(dispatchActions[0].patch?.allySub, null);
  assert.deepEqual(setScreenCalls, ['battle']);
  assert.deepEqual(startBattleCalls, [{ idx: 0, roster: [{ id: 'slime' }] }]);
});

test('smoke: timed mode preserves timed session flag at start', () => {
  const sessionArgs = [];
  const events = [];

  runStandardStartFlow({
    mode: 'single',
    leader: createStarter(),
    partner: null,
    leaderMaxHp: 100,
    leaderStageIdx: 0,
    currentTimedMode: true,
    buildNewRoster: () => [{ id: 'wolf' }],
    getStarterMaxHp: () => 70,
    setEnemies: () => {},
    setCoopActiveSlot: () => {},
    resetPvpRuntime: () => {},
    dispatchBattle: () => {},
    resetRunRuntimeState: () => {},
    appendSessionEvent: (name, payload) => { events.push({ name, payload }); },
    initSession: (starter, timed) => { sessionArgs.push({ starter, timed }); },
    setScreen: () => {},
    startBattle: () => {},
  });

  assert.equal(events[0].name, 'starter_selected');
  assert.equal(events[0].payload.timedMode, true);
  assert.equal(sessionArgs[0].timed, true);
});

test('smoke: coop mode keeps partner state on run reset', () => {
  const dispatchActions = [];
  const partner = createStarter({ id: 'water', name: '水靈', type: 'water' });

  runStandardStartFlow({
    mode: 'coop',
    leader: createStarter(),
    partner,
    leaderMaxHp: 120,
    leaderStageIdx: 1,
    currentTimedMode: false,
    buildNewRoster: () => [{ id: 'slime' }, { id: 'bat' }],
    getStarterMaxHp: () => 88,
    setEnemies: () => {},
    setCoopActiveSlot: () => {},
    resetPvpRuntime: () => {},
    dispatchBattle: (action) => { dispatchActions.push(action); },
    resetRunRuntimeState: () => {},
    appendSessionEvent: () => {},
    initSession: () => {},
    setScreen: () => {},
    startBattle: () => {},
  });

  assert.equal(dispatchActions[0].type, 'reset_run');
  assert.equal(dispatchActions[0].patch?.allySub, partner);
  assert.equal(dispatchActions[0].patch?.pHpSub, 88);
});

test('smoke: pvp mode enters battle and sets first turn', () => {
  const turnCalls = [];
  const phaseCalls = [];
  const screenCalls = [];

  runPvpStartFlow({
    leader: createStarter(),
    rival: createStarter({ id: 'water', name: '水靈', type: 'water' }),
    leaderMaxHp: 100,
    leaderStageIdx: 0,
    chance: () => true,
    getStarterMaxHp: () => 90,
    t: undefined,
    setEnemies: () => {},
    setTimedMode: () => {},
    setCoopActiveSlot: () => {},
    dispatchBattle: () => {},
    setPvpStarter2: () => {},
    setPvpHp2: () => {},
    setPvpTurn: (value) => { turnCalls.push(value); },
    resetPvpRuntime: () => {},
    resetRunRuntimeState: () => {},
    appendSessionEvent: () => {},
    initSession: () => {},
    createPvpEnemyFromStarter: () => ({ id: 'enemy' }),
    setPhase: (value) => { phaseCalls.push(value); },
    setBText: () => {},
    setScreen: (value) => { screenCalls.push(value); },
    playBattleIntro: () => {},
  });

  assert.deepEqual(turnCalls, ['p1']);
  assert.deepEqual(phaseCalls, ['text']);
  assert.deepEqual(screenCalls, ['battle']);
});
