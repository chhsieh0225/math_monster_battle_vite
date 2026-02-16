import assert from 'node:assert/strict';
import test from 'node:test';
import { runStartGameOrchestrator } from './startGameOrchestrator.ts';

function createControllerArgsStub() {
  return {
    sr: { current: {} },
    battleMode: 'single',
    pvpStarter2: null,
    locale: 'zh-TW',
    localizeStarter: (starter) => starter,
    pickPartnerStarter: () => null,
    getStarterStageIdx: () => 0,
    getStageMaxHp: () => 100,
  };
}

test('runStartGameOrchestrator executes preflight and forwards built deps to start controller', () => {
  const calls = [];
  let pvpArgsReceived = null;
  let standardArgsReceived = null;
  let controllerArgsReceived = null;
  const pvpDeps = { pvp: true };
  const standardDeps = { standard: true };

  const pvpStartDepsArgs = { runtime: { marker: 'pvp' }, pvp: {}, ui: {}, resetRunRuntimeState: () => {} };
  const standardStartDepsArgs = { runtime: { marker: 'standard' }, pvp: {}, resetRunRuntimeState: () => {} };
  const startGameControllerArgs = createControllerArgsStub();

  runStartGameOrchestrator({
    starterOverride: { id: 'fire' },
    modeOverride: 'pvp',
    allyOverride: { id: 'water' },
    invalidateAsyncWork: () => { calls.push('invalidate'); },
    beginRun: () => { calls.push('beginRun'); },
    clearTimer: () => { calls.push('clearTimer'); },
    resetCoopRotatePending: () => { calls.push('resetCoopRotatePending'); },
    pvpStartDepsArgs,
    standardStartDepsArgs,
    startGameControllerArgs,
    buildPvpStartDepsFn: (args) => {
      calls.push('buildPvp');
      pvpArgsReceived = args;
      return pvpDeps;
    },
    buildStandardStartDepsFn: (args) => {
      calls.push('buildStandard');
      standardArgsReceived = args;
      return standardDeps;
    },
    runStartGameControllerFn: (args) => {
      calls.push('controller');
      controllerArgsReceived = args;
    },
  });

  assert.deepEqual(calls, [
    'invalidate',
    'beginRun',
    'clearTimer',
    'resetCoopRotatePending',
    'buildPvp',
    'buildStandard',
    'controller',
  ]);
  assert.equal(pvpArgsReceived, pvpStartDepsArgs);
  assert.equal(standardArgsReceived, standardStartDepsArgs);
  assert.equal(controllerArgsReceived?.starterOverride?.id, 'fire');
  assert.equal(controllerArgsReceived?.modeOverride, 'pvp');
  assert.equal(controllerArgsReceived?.allyOverride?.id, 'water');
  assert.equal(controllerArgsReceived?.pvpStartDeps, pvpDeps);
  assert.equal(controllerArgsReceived?.standardStartDeps, standardDeps);
});

test('runStartGameOrchestrator forwards null defaults for mode/ally overrides', () => {
  let controllerArgsReceived = null;

  runStartGameOrchestrator({
    starterOverride: { id: 'electric' },
    invalidateAsyncWork: () => {},
    beginRun: () => {},
    clearTimer: () => {},
    resetCoopRotatePending: () => {},
    pvpStartDepsArgs: { runtime: {}, pvp: {}, ui: {}, resetRunRuntimeState: () => {} },
    standardStartDepsArgs: { runtime: {}, pvp: {}, resetRunRuntimeState: () => {} },
    startGameControllerArgs: createControllerArgsStub(),
    buildPvpStartDepsFn: () => ({}),
    buildStandardStartDepsFn: () => ({}),
    runStartGameControllerFn: (args) => { controllerArgsReceived = args; },
  });

  assert.equal(controllerArgsReceived?.modeOverride, null);
  assert.equal(controllerArgsReceived?.allyOverride, null);
});
