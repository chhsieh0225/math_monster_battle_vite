import assert from 'node:assert/strict';
import test from 'node:test';
import { runStartBattleController } from './startBattleController.ts';
import { noop } from './__testStubs.js';

test('runStartBattleController invalidates async work, clears timer, and starts battle flow', () => {
  const calls = [];
  let flowArgs = null;

  runStartBattleController({
    idx: 2,
    roster: [{ id: 'enemy_a' }],
    invalidateAsyncWork: () => { calls.push('invalidate'); },
    clearTimer: () => { calls.push('clearTimer'); },
    startBattleSharedArgs: {
      battleMode: 'single',
      allySub: null,
      enemies: [{ id: 'enemy_a' }],
      locale: 'zh-TW',
      starter: { id: 'fire' },
      t: undefined,
      sceneNames: [],
      localizeEnemy: (enemy) => enemy,
      localizeSceneName: () => '',
      dispatchBattle: noop,
      updateEnc: noop,
      setPhase: noop,
      setBText: noop,
      setScreen: noop,
      finishGame: noop,
      resetFrozen: noop,
      playBattleIntro: noop,
    },
    runStartBattleFlow: (args) => {
      calls.push('runFlow');
      flowArgs = args;
    },
  });

  assert.deepEqual(calls, ['invalidate', 'clearTimer', 'runFlow']);
  assert.equal(flowArgs?.idx, 2);
  assert.deepEqual(flowArgs?.roster, [{ id: 'enemy_a' }]);
  assert.equal(flowArgs?.battleMode, 'single');
});
