import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runEndSessionController,
  runQuitGameController,
  runFinishGameController,
  runHandleFreezeController,
  runToggleCoopActiveController,
} from './gameLifecycleController.ts';

function makeSr(overrides = {}) {
  return { current: { enemy: { id: 'slime', name: 'Slime' }, battleMode: 'normal', phase: 'enemyAtk', screen: 'battle', ...overrides } };
}

test('runEndSessionController calls endSessionOnce with correct args', () => {
  const calls = [];
  const sr = makeSr();
  runEndSessionController({
    sr,
    endSessionOnce: (state, completed, reason) => calls.push({ state, completed, reason }),
    isCompleted: true,
    reasonOverride: 'win',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].completed, true);
  assert.equal(calls[0].reason, 'win');
});

test('runQuitGameController clears timer, appends quit, ends session, sets gameover', () => {
  const log = [];
  runQuitGameController({
    clearTimer: () => log.push('clearTimer'),
    appendQuitEventIfOpen: () => log.push('appendQuit'),
    sr: makeSr(),
    endSession: (completed, reason) => log.push(`end:${completed}:${reason}`),
    setScreen: (screen) => log.push(`screen:${screen}`),
  });
  assert.deepEqual(log, ['clearTimer', 'appendQuit', 'end:false:quit', 'screen:gameover']);
});

test('runFinishGameController applies achievements, ends session, sets gameover', () => {
  const log = [];
  runFinishGameController({
    sr: makeSr(),
    tryUnlock: () => {},
    setEncData: () => {},
    encTotal: 0,
    endSession: (completed) => log.push(`end:${completed}`),
    setScreen: (screen) => log.push(`screen:${screen}`),
  });
  assert.deepEqual(log, ['end:true', 'screen:gameover']);
});

test('runToggleCoopActiveController toggles slot when allowed', () => {
  let slot = 'main';
  runToggleCoopActiveController({
    sr: makeSr({ allySub: { id: 'sub' }, pHpSub: 50 }),
    canSwitchCoopActiveSlot: () => true,
    setCoopActiveSlot: (fn) => { slot = fn(slot); },
  });
  assert.equal(slot, 'sub');
});

test('runToggleCoopActiveController skips when not allowed', () => {
  let slot = 'main';
  runToggleCoopActiveController({
    sr: makeSr(),
    canSwitchCoopActiveSlot: () => false,
    setCoopActiveSlot: (fn) => { slot = fn(slot); },
  });
  assert.equal(slot, 'main');
});

test('runHandleFreezeController clears frozen and returns to menu in active battle', () => {
  const queue = [];
  const state = {
    enemy: { name: '史萊姆' },
    phase: 'enemyAtk',
    screen: 'battle',
  };
  const frozenRef = { current: true };
  const frozenCalls = [];
  const phaseCalls = [];
  const textCalls = [];

  runHandleFreezeController({
    sr: { current: state },
    frozenRef,
    setFrozen: (value) => { frozenCalls.push(value); },
    setBText: (value) => { textCalls.push(value); },
    setPhase: (value) => {
      phaseCalls.push(value);
      state.phase = value;
    },
    safeTo: (fn) => { queue.push(fn); },
    t: undefined,
  });

  assert.equal(frozenRef.current, false);
  assert.deepEqual(frozenCalls, [false]);
  assert.equal(phaseCalls[0], 'text');
  assert.equal(textCalls[0].includes('frozen'), true);
  assert.equal(queue.length, 1);

  queue[0]();
  assert.equal(phaseCalls.includes('menu'), true);
  assert.equal(textCalls[textCalls.length - 1], '');
});

test('runHandleFreezeController ignores stale menu reset after battle ended', () => {
  const queue = [];
  const state = {
    enemy: { name: '史萊姆' },
    phase: 'enemyAtk',
    screen: 'battle',
  };
  const frozenRef = { current: true };
  const phaseCalls = [];
  const textCalls = [];

  runHandleFreezeController({
    sr: { current: state },
    frozenRef,
    setFrozen: () => {},
    setBText: (value) => { textCalls.push(value); },
    setPhase: (value) => {
      phaseCalls.push(value);
      state.phase = value;
    },
    safeTo: (fn) => { queue.push(fn); },
    t: undefined,
  });

  assert.equal(queue.length, 1);
  state.phase = 'ko';
  state.screen = 'gameover';
  queue[0]();

  assert.equal(phaseCalls.includes('menu'), false);
  assert.equal(textCalls[textCalls.length - 1], '❄️ {enemy} is frozen and cannot attack!');
});
