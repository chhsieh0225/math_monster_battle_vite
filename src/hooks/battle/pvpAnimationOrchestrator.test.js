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

test('signature PvP casts preserve the original strike time and actor ownership', () => {
  for (const turn of ['p1', 'p2']) {
    const queue = [], animations = [];
    let now = 0, hitAt = -1;
    runPvpAttackAnimation({ turn, skillId: 'boss_sword_god:3',
      safeTo: (fn, ms) => queue.push({ fn, at: now + ms }), setPhase: () => {},
      setPAnim: (value) => animations.push(['p1', value]),
      setEAnim: (value) => animations.push(['p2', value]), onStrike: () => { hitAt = now; } });
    while (queue.length) { queue.sort((a, b) => a.at - b.at); const task = queue.shift(); now = task.at; task.fn(); }
    assert.equal(hitAt, turn === 'p1' ? 400 : 320);
    assert.equal(animations[0][0], turn);
    assert.match(animations[0][1], /signatureHeavenfallFinish/);
  }
});
