import assert from 'node:assert/strict';
import test from 'node:test';
import { runHandleFreezeController } from './gameLifecycleController.ts';

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
