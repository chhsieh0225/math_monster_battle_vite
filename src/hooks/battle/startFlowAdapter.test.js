import assert from 'node:assert/strict';
import test from 'node:test';
import { runBattleStart, runBattleStartGame } from './startFlowAdapter.ts';

function noop() {}

test('runBattleStart builds shared args and forwards controller payload', () => {
  const sharedArgs = { marker: 'shared' };
  let buildInput = null;
  let controllerInput = null;

  runBattleStart({
    idx: 3,
    roster: [{ id: 'enemy_1' }],
    invalidateAsyncWork: noop,
    clearTimer: noop,
    startBattleSharedArgsInput: {
      sr: { current: { battleMode: 'single', allySub: null } },
      fallbackBattleMode: 'single',
      enemies: [],
      locale: 'zh-TW',
      starter: { id: 'fire' },
      t: undefined,
      sceneNames: {},
      localizeEnemy: (enemy) => enemy,
      localizeSceneName: (sceneName) => sceneName,
      dispatchBattle: noop,
      updateEnc: noop,
      setPhase: noop,
      setBText: noop,
      setScreen: noop,
      finishGame: noop,
      resetFrozen: noop,
      playBattleIntro: noop,
      setCoopActiveSlot: noop,
      pickIndex: () => 0,
      getCampaignNodeMeta: () => null,
    },
    buildStartBattleSharedArgsFn: (input) => {
      buildInput = input;
      return sharedArgs;
    },
    runStartBattleControllerFn: (args) => {
      controllerInput = args;
    },
    runStartBattleFlowFn: noop,
  });

  assert.ok(buildInput);
  assert.equal(controllerInput?.idx, 3);
  assert.equal(controllerInput?.roster?.[0]?.id, 'enemy_1');
  assert.equal(controllerInput?.startBattleSharedArgs, sharedArgs);
  assert.equal(typeof controllerInput?.runStartBattleFlow, 'function');
});

test('runBattleStartGame applies daily challenge seed and roster wrapper', () => {
  const feedbackCalls = {
    daily: [],
    tower: [],
  };
  let activateCalls = 0;
  let orchestratorInput = null;
  const buildNewRosterCalls = [];
  const dailyRosterCalls = [];

  runBattleStartGame({
    starterOverride: { id: 'fire' },
    modeOverride: 'single',
    allyOverride: null,
    setDailyChallengeFeedback: (value) => { feedbackCalls.daily.push(value); },
    setTowerChallengeFeedback: (value) => { feedbackCalls.tower.push(value); },
    queuedChallenge: { kind: 'daily', plan: { id: 'daily-plan' } },
    activeChallenge: null,
    buildNewRoster: (mode) => {
      buildNewRosterCalls.push(mode);
      return [{ id: 'base_enemy' }];
    },
    startGameOrchestratorArgs: {
      invalidateAsyncWork: noop,
      beginRun: noop,
      clearTimer: noop,
      resetCoopRotatePending: noop,
      pvpStartDepsArgs: { runtime: {}, pvp: {}, ui: {}, resetRunRuntimeState: noop },
      standardStartDepsArgs: {
        runtime: {
          getStarterMaxHp: noop,
          setEnemies: noop,
          setCoopActiveSlot: noop,
          dispatchBattle: noop,
          appendSessionEvent: noop,
          initSession: noop,
          setScreen: noop,
          startBattle: noop,
        },
        pvp: { resetPvpRuntime: noop },
        resetRunRuntimeState: noop,
      },
      startGameControllerArgs: {
        sr: { current: {} },
        battleMode: 'single',
        pvpStarter2: null,
        locale: 'zh-TW',
        localizeStarter: (starter) => starter,
        pickPartnerStarter: () => null,
        getStarterStageIdx: () => 0,
        getStageMaxHp: () => 100,
      },
    },
    activateQueuedChallenge: () => { activateCalls += 1; },
    runStartGameOrchestratorFn: (args) => {
      orchestratorInput = args;
    },
    buildDailyChallengeRosterFn: (baseRoster, plan) => {
      dailyRosterCalls.push({ baseRoster, plan });
      return [{ id: 'daily_enemy' }];
    },
    buildTowerChallengeRosterFn: () => [{ id: 'tower_enemy' }],
    getDailyChallengeSeedFn: () => 'daily-seed',
    getTowerChallengeSeedFn: () => 'tower-seed',
  });

  assert.deepEqual(feedbackCalls.daily, [null]);
  assert.deepEqual(feedbackCalls.tower, [null]);
  assert.equal(activateCalls, 1);
  assert.equal(orchestratorInput?.runSeed, 'daily-seed');

  const wrappedBuildRoster = orchestratorInput?.standardStartDepsArgs?.runtime?.buildNewRoster;
  assert.equal(typeof wrappedBuildRoster, 'function');
  const roster = wrappedBuildRoster('single');
  assert.deepEqual(roster, [{ id: 'daily_enemy' }]);
  assert.deepEqual(buildNewRosterCalls, ['single']);
  assert.deepEqual(dailyRosterCalls, [{
    baseRoster: [{ id: 'base_enemy' }],
    plan: { id: 'daily-plan' },
  }]);
});
