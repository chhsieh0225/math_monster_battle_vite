import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runPvpAttackAnimation,
  showPvpEffectivenessMessage,
} from './pvpAnimationOrchestrator.ts';

test('showPvpEffectivenessMessage emits crit message and schedules clear', () => {
  const calls = [];
  let scheduled = null;

  showPvpEffectivenessMessage({
    strike: { isCrit: true, eff: 1 },
    setEffMsg: (value) => { calls.push(value); },
    scheduleClear: (fn) => { scheduled = fn; },
  });

  assert.deepEqual(calls, [{ text: '💥 Critical!', color: '#ff6b00' }]);
  assert.equal(typeof scheduled, 'function');
  scheduled();
  assert.deepEqual(calls, [
    { text: '💥 Critical!', color: '#ff6b00' },
    null,
  ]);
});

test('runPvpAttackAnimation dispatches correct lunge pipeline by turn', () => {
  const calls = [];
  let onStrikeP1 = null;
  let onStrikeP2 = null;

  runPvpAttackAnimation({
    turn: 'p1',
    safeTo: () => {},
    setPhase: (value) => { calls.push(`phase:${value}`); },
    setPAnim: () => {},
    setEAnim: () => {},
    onStrike: () => {},
    orchestratorApi: {
      runPlayerLunge: ({ onReady }) => {
        calls.push('playerLunge');
        onStrikeP1 = onReady || null;
      },
      runEnemyLunge: () => { calls.push('enemyLunge'); },
    },
  });

  runPvpAttackAnimation({
    turn: 'p2',
    safeTo: () => {},
    setPhase: (value) => { calls.push(`phase:${value}`); },
    setPAnim: () => {},
    setEAnim: () => {},
    onStrike: () => {},
    orchestratorApi: {
      runPlayerLunge: () => { calls.push('playerLunge'); },
      runEnemyLunge: ({ onStrike }) => {
        calls.push('enemyLunge');
        onStrikeP2 = onStrike || null;
      },
    },
  });

  assert.deepEqual(calls, ['phase:playerAtk', 'playerLunge', 'phase:playerAtk', 'enemyLunge']);
  assert.equal(typeof onStrikeP1, 'function');
  assert.equal(typeof onStrikeP2, 'function');
});
