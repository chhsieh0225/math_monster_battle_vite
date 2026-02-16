import assert from 'node:assert/strict';
import test from 'node:test';
import {
  scheduleIfBattleActive,
  shouldSkipMenuReset,
  tryReturnToMenu,
} from './menuResetGuard.ts';

test('shouldSkipMenuReset blocks when battle already left or resolved', () => {
  assert.equal(shouldSkipMenuReset({ phase: 'menu', screen: 'battle' }), false);
  assert.equal(shouldSkipMenuReset({ phase: 'ko', screen: 'battle' }), true);
  assert.equal(shouldSkipMenuReset({ phase: 'victory', screen: 'battle' }), true);
  assert.equal(shouldSkipMenuReset({ phase: 'text', screen: 'gameover' }), true);
});

test('tryReturnToMenu applies only for active battle states', () => {
  const phaseCalls = [];
  const textCalls = [];
  const state = { phase: 'text', screen: 'battle' };

  const applied = tryReturnToMenu(
    () => state,
    (value) => { phaseCalls.push(value); },
    (value) => { textCalls.push(value); },
  );

  assert.equal(applied, true);
  assert.deepEqual(phaseCalls, ['menu']);
  assert.deepEqual(textCalls, ['']);
});

test('tryReturnToMenu no-ops for stale callbacks', () => {
  const phaseCalls = [];
  const textCalls = [];
  const state = { phase: 'ko', screen: 'gameover' };

  const applied = tryReturnToMenu(
    () => state,
    (value) => { phaseCalls.push(value); },
    (value) => { textCalls.push(value); },
  );

  assert.equal(applied, false);
  assert.deepEqual(phaseCalls, []);
  assert.deepEqual(textCalls, []);
});

test('scheduleIfBattleActive only runs callback for active battle state', () => {
  let calls = 0;
  const queue = [];
  const state = { phase: 'text', screen: 'battle' };

  scheduleIfBattleActive(
    (fn) => { queue.push(fn); },
    () => state,
    () => { calls += 1; },
    300,
  );

  assert.equal(queue.length, 1);
  queue[0]();
  assert.equal(calls, 1);

  state.phase = 'ko';
  scheduleIfBattleActive(
    (fn) => { queue.push(fn); },
    () => state,
    () => { calls += 1; },
    300,
  );

  assert.equal(queue.length, 2);
  queue[1]();
  assert.equal(calls, 1);
});
