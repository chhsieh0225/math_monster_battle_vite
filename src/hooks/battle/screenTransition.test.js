import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runScreenTransition,
  shouldInvalidateAsyncOnScreenChange,
} from './screenTransition.ts';

test('shouldInvalidateAsyncOnScreenChange only invalidates when leaving battle', () => {
  assert.equal(shouldInvalidateAsyncOnScreenChange('battle', 'title'), true);
  assert.equal(shouldInvalidateAsyncOnScreenChange('battle', 'battle'), false);
  assert.equal(shouldInvalidateAsyncOnScreenChange('title', 'battle'), false);
  assert.equal(shouldInvalidateAsyncOnScreenChange(undefined, 'battle'), false);
});

test('runScreenTransition clears timer and invalidates async work when leaving battle', () => {
  const calls = {
    clearTimer: 0,
    invalidateAsyncWork: 0,
    setScreenState: [],
  };

  runScreenTransition({
    prevScreen: 'battle',
    nextScreen: 'title',
    clearTimer: () => { calls.clearTimer += 1; },
    invalidateAsyncWork: () => { calls.invalidateAsyncWork += 1; },
    setScreenState: (next) => { calls.setScreenState.push(next); },
  });

  assert.equal(calls.clearTimer, 1);
  assert.equal(calls.invalidateAsyncWork, 1);
  assert.deepEqual(calls.setScreenState, ['title']);
});

test('runScreenTransition does not clear timer when staying in battle', () => {
  const calls = {
    clearTimer: 0,
    invalidateAsyncWork: 0,
    setScreenState: [],
  };

  runScreenTransition({
    prevScreen: 'battle',
    nextScreen: 'battle',
    clearTimer: () => { calls.clearTimer += 1; },
    invalidateAsyncWork: () => { calls.invalidateAsyncWork += 1; },
    setScreenState: (next) => { calls.setScreenState.push(next); },
  });

  assert.equal(calls.clearTimer, 0);
  assert.equal(calls.invalidateAsyncWork, 0);
  assert.deepEqual(calls.setScreenState, ['battle']);
});
