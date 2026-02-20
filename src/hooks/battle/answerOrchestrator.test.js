import assert from 'node:assert/strict';
import test from 'node:test';
import { runAnswerOrchestrator } from './answerOrchestrator.ts';
import { noop, noopNum } from './__testStubs.js';

test('runAnswerOrchestrator builds player deps and forwards to answer controller', () => {
  const calls = [];
  let buildArgsReceived = null;
  let controllerArgsReceived = null;
  const playerHandlerDeps = { built: true };

  const playerDepsArgs = {
    runtime: { marker: 'runtime' },
    ui: { marker: 'ui' },
    battleFields: { marker: 'fields' },
    callbacks: { marker: 'callbacks' },
  };
  const answerControllerArgs = {
    sr: { current: {} },
    pvpHandlerDeps: { pvp: true },
    getActingStarter: () => null,
    logAns: noopNum,
    appendSessionEvent: noop,
    updateAbility: noop,
    markCoopRotatePending: noop,
  };

  runAnswerOrchestrator({
    choice: 2,
    answered: false,
    setAnswered: () => { calls.push('setAnswered'); },
    clearTimer: () => { calls.push('clearTimer'); },
    playerDepsArgs,
    answerControllerArgs,
    buildPlayerAnswerHandlerDepsFn: (args) => {
      calls.push('buildPlayerDeps');
      buildArgsReceived = args;
      return playerHandlerDeps;
    },
    runAnswerControllerFn: (args) => {
      calls.push('runController');
      controllerArgsReceived = args;
    },
  });

  assert.deepEqual(calls, ['buildPlayerDeps', 'runController']);
  assert.equal(buildArgsReceived, playerDepsArgs);
  assert.equal(controllerArgsReceived?.choice, 2);
  assert.equal(controllerArgsReceived?.answered, false);
  assert.equal(controllerArgsReceived?.playerHandlerDeps, playerHandlerDeps);
  assert.equal(controllerArgsReceived?.sr, answerControllerArgs.sr);
  assert.equal(controllerArgsReceived?.pvpHandlerDeps, answerControllerArgs.pvpHandlerDeps);
});

test('runAnswerOrchestrator forwards answered=true without mutating payload', () => {
  let controllerArgsReceived = null;

  runAnswerOrchestrator({
    choice: 1,
    answered: true,
    setAnswered: () => {},
    clearTimer: () => {},
    playerDepsArgs: { runtime: {}, ui: {}, battleFields: {}, callbacks: {} },
    answerControllerArgs: {
      sr: { current: {} },
      pvpHandlerDeps: {},
      getActingStarter: () => null,
      logAns: () => 0,
      appendSessionEvent: () => {},
      updateAbility: () => {},
      markCoopRotatePending: () => {},
    },
    buildPlayerAnswerHandlerDepsFn: () => ({}),
    runAnswerControllerFn: (args) => { controllerArgsReceived = args; },
  });

  assert.equal(controllerArgsReceived?.answered, true);
  assert.equal(controllerArgsReceived?.choice, 1);
});
