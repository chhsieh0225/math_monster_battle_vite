import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runBattleContinueFromVictory,
  runBattleVictory,
} from './progressionFlowAdapter.ts';

test('runBattleVictory delegates build + flow execution', () => {
  const builtArgs = { marker: 'built-victory' };
  let buildInput = null;
  let flowInput = null;

  runBattleVictory({
    victoryInput: {
      verb: 'defeated',
      sr: { current: {} },
      runtime: {},
      battleFields: {},
      ui: {},
      frozenRef: { current: false },
      pendingEvolveRef: { current: false },
    },
    buildVictoryFlowArgsFn: (input) => {
      buildInput = input;
      return builtArgs;
    },
    runVictoryFlowFn: (args) => {
      flowInput = args;
    },
  });

  assert.ok(buildInput);
  assert.equal(flowInput, builtArgs);
});

test('runBattleContinueFromVictory delegates build + flow execution', () => {
  const builtArgs = { marker: 'built-continue' };
  let buildInput = null;
  let flowInput = null;

  runBattleContinueFromVictory({
    continueFromVictoryInput: {
      sr: { current: {} },
      enemiesLength: 3,
      runtime: {},
      battleFields: {},
      ui: {},
      callbacks: {},
    },
    buildContinueFromVictoryFlowArgsFn: (input) => {
      buildInput = input;
      return builtArgs;
    },
    continueFromVictoryFlowFn: (args) => {
      flowInput = args;
    },
  });

  assert.ok(buildInput);
  assert.equal(flowInput, builtArgs);
});
