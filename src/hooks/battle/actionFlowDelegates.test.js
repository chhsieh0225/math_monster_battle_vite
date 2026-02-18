import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runStartGameWithContext,
  runSelectMoveWithContext,
  runAnswerWithContext,
  runContinueWithContext,
  runAdvanceWithContext,
} from './actionFlowDelegates.ts';

test('runStartGameWithContext injects overrides into adapter args', () => {
  let received = null;
  const runner = (args) => { received = args; };
  const base = {
    setDailyChallengeFeedback: () => {},
    setTowerChallengeFeedback: () => {},
    queuedChallenge: null,
    activeChallenge: null,
    buildNewRoster: () => [],
    startGameOrchestratorArgs: {},
    activateQueuedChallenge: () => {},
  };

  runStartGameWithContext(base, { id: 'fire' }, 'pvp', { id: 'water' }, runner);

  assert.equal(received?.starterOverride?.id, 'fire');
  assert.equal(received?.modeOverride, 'pvp');
  assert.equal(received?.allyOverride?.id, 'water');
  assert.equal(received?.buildNewRoster, base.buildNewRoster);
});

test('runSelectMoveWithContext forwards index through selectMoveInput', () => {
  let received = null;
  const runner = (args) => { received = args; };
  const baseInput = {
    sr: { current: {} },
    runtime: { timedMode: false },
    ui: {},
    battleFields: {},
  };

  runSelectMoveWithContext(baseInput, 3, runner);
  assert.equal(received?.selectMoveInput?.index, 3);
  assert.equal(received?.selectMoveInput?.runtime, baseInput.runtime);
});

test('runAnswerWithContext forwards choice and preserves base args', () => {
  let received = null;
  const runner = (args) => { received = args; };
  const base = {
    answered: false,
    setAnswered: () => {},
    clearTimer: () => {},
    pvpAnswerDepsInput: {},
    playerDepsArgs: {},
    answerControllerArgsInput: {},
  };

  runAnswerWithContext(base, 42, runner);
  assert.equal(received?.choice, 42);
  assert.equal(received?.answered, false);
});

test('runContinueWithContext and runAdvanceWithContext proxy args unchanged', () => {
  let continueReceived = null;
  let advanceReceived = null;
  const continueArgs = { continueFromVictoryInput: { sr: { current: {} } } };
  const advanceArgs = { phase: 'text', sr: { current: {} }, setPhase: () => {}, setBText: () => {}, continueFromVictory: () => {} };

  runContinueWithContext(continueArgs, (args) => { continueReceived = args; });
  runAdvanceWithContext(advanceArgs, (args) => { advanceReceived = args; });

  assert.equal(continueReceived, continueArgs);
  assert.equal(advanceReceived, advanceArgs);
});
