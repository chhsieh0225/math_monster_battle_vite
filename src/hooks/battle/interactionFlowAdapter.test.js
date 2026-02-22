import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runBattleAnswer,
  runBattleAdvance,
} from './interactionFlowAdapter.ts';

function noop() {}

test('runBattleAnswer builds pvp deps and forwards orchestrator payload', () => {
  const builtPvpDeps = { marker: 'pvpDeps' };
  let buildInput = null;
  let orchestratorInput = null;

  const pvpAnswerDepsInput = {
    runtime: { marker: 'runtime' },
    ui: { marker: 'ui' },
    pvp: { marker: 'pvp' },
    battleFields: { marker: 'battleFields' },
  };

  const answerControllerArgsInput = {
    sr: { current: {} },
    getActingStarter: noop,
    logAns: () => 0,
    appendSessionEvent: noop,
    updateAbility: noop,
    markCoopRotatePending: noop,
  };

  runBattleAnswer({
    choice: 2,
    answered: false,
    setAnswered: noop,
    clearTimer: noop,
    pvpAnswerDepsInput,
    playerDepsArgs: {
      runtime: {},
      ui: {},
      battleFields: {},
      callbacks: {},
    },
    answerControllerArgsInput,
    buildPvpAnswerHandlerDepsFn: (args) => {
      buildInput = args;
      return builtPvpDeps;
    },
    runAnswerOrchestratorFn: (args) => {
      orchestratorInput = args;
    },
  });

  assert.equal(buildInput, pvpAnswerDepsInput);
  assert.equal(orchestratorInput?.choice, 2);
  assert.equal(orchestratorInput?.answered, false);
  assert.equal(orchestratorInput?.answerControllerArgs?.sr, answerControllerArgsInput.sr);
  assert.equal(orchestratorInput?.answerControllerArgs?.pvpHandlerDeps, builtPvpDeps);
});

test('runBattleAdvance builds deps and forwards controller payload', () => {
  const builtPvpTurnStartDeps = { marker: 'pvpTurnStartDeps' };
  const builtPendingEvolutionArgs = { marker: 'pendingEvolutionArgs' };
  let pvpBuildInput = null;
  let pendingBuildInput = null;
  let controllerInput = null;

  const advancePvpDepsInput = {
    runtime: { marker: 'runtime' },
    ui: { marker: 'ui' },
    pvp: { marker: 'pvp' },
    battleFields: { marker: 'battleFields' },
  };
  const pendingEvolutionInput = {
    pendingEvolveRef: { current: false },
    battleFields: { marker: 'battleFields' },
    setScreen: noop,
    tryUnlock: noop,
    getStageMaxHp: () => 100,
    getStarterMaxHp: () => 80,
    maxMoveLvl: 10,
  };

  runBattleAdvance({
    phase: 'text',
    sr: { current: {} },
    setPhase: noop,
    setBText: noop,
    continueFromVictory: noop,
    consumePendingTextAdvanceAction: () => null,
    advancePvpDepsInput,
    pendingEvolutionInput,
    buildAdvancePvpTurnStartDepsFn: (args) => {
      pvpBuildInput = args;
      return builtPvpTurnStartDeps;
    },
    buildPendingEvolutionArgsFn: (args) => {
      pendingBuildInput = args;
      return builtPendingEvolutionArgs;
    },
    runAdvanceControllerFn: (args) => {
      controllerInput = args;
    },
  });

  assert.equal(pvpBuildInput, advancePvpDepsInput);
  assert.equal(pendingBuildInput, pendingEvolutionInput);
  assert.equal(controllerInput?.pvpTurnStartHandlerDeps, builtPvpTurnStartDeps);
  assert.equal(controllerInput?.pendingEvolutionArgs, builtPendingEvolutionArgs);
  assert.equal(controllerInput?.phase, 'text');
});
