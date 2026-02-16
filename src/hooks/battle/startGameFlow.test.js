import assert from 'node:assert/strict';
import test from 'node:test';
import { runPvpStartFlow, runStandardStartFlow } from './startGameFlow.ts';

test('runPvpStartFlow initializes pvp battle and announces first turn', () => {
  const calls = {
    setEnemies: [],
    setTimedMode: [],
    setCoopActiveSlot: [],
    dispatchBattle: [],
    setPvpStarter2: [],
    setPvpHp2: [],
    setPvpTurn: [],
    resetPvpRuntime: 0,
    resetRunRuntimeState: 0,
    appendSessionEvent: [],
    initSession: [],
    setPhase: [],
    setBText: [],
    setScreen: [],
    playBattleIntro: 0,
  };

  const leader = { id: 'fire', name: '火狐', type: 'fire', selectedStageIdx: 1 };
  const rival = { id: 'water', name: '水靈', type: 'water', selectedStageIdx: 0 };

  runPvpStartFlow({
    leader,
    rival,
    leaderMaxHp: 120,
    leaderStageIdx: 1,
    chance: () => true,
    getStarterMaxHp: () => 90,
    setEnemies: (value) => { calls.setEnemies.push(value); },
    setTimedMode: (value) => { calls.setTimedMode.push(value); },
    setCoopActiveSlot: (value) => { calls.setCoopActiveSlot.push(value); },
    dispatchBattle: (action) => { calls.dispatchBattle.push(action); },
    setPvpStarter2: (value) => { calls.setPvpStarter2.push(value); },
    setPvpHp2: (value) => { calls.setPvpHp2.push(value); },
    setPvpTurn: (value) => { calls.setPvpTurn.push(value); },
    resetPvpRuntime: () => { calls.resetPvpRuntime += 1; },
    resetRunRuntimeState: () => { calls.resetRunRuntimeState += 1; },
    appendSessionEvent: (name, payload) => { calls.appendSessionEvent.push({ name, payload }); },
    initSession: (starter, timed) => { calls.initSession.push({ starter, timed }); },
    createPvpEnemyFromStarter: () => ({ name: 'PVP Enemy VM' }),
    setPhase: (value) => { calls.setPhase.push(value); },
    setBText: (value) => { calls.setBText.push(value); },
    setScreen: (value) => { calls.setScreen.push(value); },
    playBattleIntro: () => { calls.playBattleIntro += 1; },
  });

  assert.deepEqual(calls.setEnemies, [[]]);
  assert.deepEqual(calls.setTimedMode, [true]);
  assert.deepEqual(calls.setCoopActiveSlot, ['main']);
  assert.equal(calls.dispatchBattle.length, 2);
  assert.equal(calls.dispatchBattle[0].type, 'reset_run');
  assert.equal(calls.dispatchBattle[0].patch.pHp, 120);
  assert.equal(calls.dispatchBattle[1].type, 'start_battle');
  assert.equal(calls.setPvpStarter2[0], rival);
  assert.equal(calls.setPvpHp2[0], 90);
  assert.deepEqual(calls.setPvpTurn, ['p1']);
  assert.equal(calls.resetPvpRuntime, 1);
  assert.equal(calls.resetRunRuntimeState, 1);
  assert.equal(calls.appendSessionEvent[0].name, 'starter_selected');
  assert.equal(calls.initSession[0].starter, leader);
  assert.equal(calls.initSession[0].timed, true);
  assert.deepEqual(calls.setPhase, ['text']);
  assert.equal(calls.setBText[0].includes('PvP start'), true);
  assert.deepEqual(calls.setScreen, ['battle']);
  assert.equal(calls.playBattleIntro, 1);
});

test('runStandardStartFlow initializes coop battle and starts round 0', () => {
  const calls = {
    setEnemies: [],
    setCoopActiveSlot: [],
    resetPvpRuntime: 0,
    dispatchBattle: [],
    resetRunRuntimeState: 0,
    appendSessionEvent: [],
    initSession: [],
    setScreen: [],
    startBattle: [],
  };

  const leader = { id: 'fire', name: '火狐', type: 'fire', selectedStageIdx: 1 };
  const partner = { id: 'water', name: '水靈', type: 'water', selectedStageIdx: 0 };
  const roster = [{ id: 'slime' }, { id: 'wolf' }];

  runStandardStartFlow({
    mode: 'coop',
    leader,
    partner,
    leaderMaxHp: 88,
    leaderStageIdx: 1,
    currentTimedMode: false,
    buildNewRoster: () => roster,
    getStarterMaxHp: () => 77,
    setEnemies: (value) => { calls.setEnemies.push(value); },
    setCoopActiveSlot: (value) => { calls.setCoopActiveSlot.push(value); },
    resetPvpRuntime: () => { calls.resetPvpRuntime += 1; },
    dispatchBattle: (action) => { calls.dispatchBattle.push(action); },
    resetRunRuntimeState: () => { calls.resetRunRuntimeState += 1; },
    appendSessionEvent: (name, payload) => { calls.appendSessionEvent.push({ name, payload }); },
    initSession: (starter, timed) => { calls.initSession.push({ starter, timed }); },
    setScreen: (value) => { calls.setScreen.push(value); },
    startBattle: (idx, passedRoster) => { calls.startBattle.push({ idx, passedRoster }); },
  });

  assert.deepEqual(calls.setEnemies, [roster]);
  assert.deepEqual(calls.setCoopActiveSlot, ['main']);
  assert.equal(calls.resetPvpRuntime, 1);
  assert.equal(calls.dispatchBattle.length, 1);
  assert.equal(calls.dispatchBattle[0].type, 'reset_run');
  assert.equal(calls.dispatchBattle[0].patch.allySub, partner);
  assert.equal(calls.dispatchBattle[0].patch.pHpSub, 77);
  assert.equal(calls.dispatchBattle[0].patch.pHp, 88);
  assert.equal(calls.resetRunRuntimeState, 1);
  assert.equal(calls.appendSessionEvent[0].name, 'starter_selected');
  assert.equal(calls.appendSessionEvent[0].payload.timedMode, false);
  assert.equal(calls.initSession[0].starter, leader);
  assert.equal(calls.initSession[0].timed, false);
  assert.deepEqual(calls.setScreen, ['battle']);
  assert.equal(calls.startBattle.length, 1);
  assert.equal(calls.startBattle[0].idx, 0);
  assert.equal(calls.startBattle[0].passedRoster, roster);
});
