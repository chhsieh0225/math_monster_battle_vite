import assert from 'node:assert/strict';
import test from 'node:test';
import { effectOrchestrator } from './effectOrchestrator.ts';

test('playBattleIntro sets intro anims and schedules clear', () => {
  const enemyAnim = [];
  const playerAnim = [];
  const delays = [];

  effectOrchestrator.playBattleIntro({
    safeTo: (fn, ms) => {
      delays.push(ms);
      fn();
    },
    setEAnim: (value) => { enemyAnim.push(value); },
    setPAnim: (value) => { playerAnim.push(value); },
  });

  assert.deepEqual(enemyAnim, ['slideInBattle 0.6s ease', '']);
  assert.deepEqual(playerAnim, ['slideInPlayer 0.6s ease', '']);
  assert.deepEqual(delays, [700]);
});

test('runEnemyLunge uses default strike delay and invokes onStrike', () => {
  const enemyAnim = [];
  const delays = [];
  let strikeCalls = 0;

  effectOrchestrator.runEnemyLunge({
    safeTo: (fn, ms) => {
      delays.push(ms);
      fn();
    },
    setEAnim: (value) => { enemyAnim.push(value); },
    onStrike: () => { strikeCalls += 1; },
  });

  assert.deepEqual(enemyAnim, ['enemyAttackLunge 0.6s ease', '']);
  assert.deepEqual(delays, [500]);
  assert.equal(strikeCalls, 1);
});

test('runPlayerLunge schedules start and settle with custom delays', () => {
  const playerAnim = [];
  const delays = [];
  let readyCalls = 0;

  effectOrchestrator.runPlayerLunge({
    safeTo: (fn, ms) => {
      delays.push(ms);
      fn();
    },
    setPAnim: (value) => { playerAnim.push(value); },
    onReady: () => { readyCalls += 1; },
    startDelay: 120,
    settleDelay: 280,
  });

  assert.deepEqual(delays, [120, 280]);
  assert.deepEqual(playerAnim, ['attackLunge 0.6s ease', '']);
  assert.equal(readyCalls, 1);
});

test('runAttackEffectTimeline only schedules provided callbacks', () => {
  const calls = [];
  const delays = [];

  effectOrchestrator.runAttackEffectTimeline({
    safeTo: (fn, ms) => {
      delays.push(ms);
      fn();
    },
    onHit: () => { calls.push('hit'); },
    onClear: undefined,
    onNext: () => { calls.push('next'); },
    hitDelay: 100,
    clearDelay: 200,
    nextDelay: 300,
  });

  assert.deepEqual(calls, ['hit', 'next']);
  assert.deepEqual(delays, [100, 300]);
});
