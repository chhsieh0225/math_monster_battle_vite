import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBattleResultPayload,
  buildQuitPayload,
  buildSessionFinalizeStats,
  resolveBattleResult,
} from './sessionLifecycleModel.ts';

test('resolveBattleResult maps completed and quit outcomes', () => {
  assert.deepEqual(resolveBattleResult(true, null), { reason: 'clear', result: 'win' });
  assert.deepEqual(resolveBattleResult(false, 'quit'), { reason: 'quit', result: 'quit' });
  assert.deepEqual(resolveBattleResult(false, null), { reason: 'player_ko', result: 'lose' });
});

test('buildBattleResultPayload applies defaults and duration', () => {
  const payload = buildBattleResultPayload({
    state: {
      defeated: 8,
      pLvl: 4,
      maxStreak: 11,
      pHp: 36,
      tC: 20,
      tW: 3,
      timedMode: true,
    },
    isCompleted: false,
    reasonOverride: 'quit',
    durationMs: 12345,
  });

  assert.equal(payload.result, 'quit');
  assert.equal(payload.reason, 'quit');
  assert.equal(payload.defeated, 8);
  assert.equal(payload.finalLevel, 4);
  assert.equal(payload.maxStreak, 11);
  assert.equal(payload.pHp, 36);
  assert.equal(payload.tC, 20);
  assert.equal(payload.tW, 3);
  assert.equal(payload.timedMode, true);
  assert.equal(payload.durationMs, 12345);
});

test('buildSessionFinalizeStats uses fallbacks when fields are missing', () => {
  const stats = buildSessionFinalizeStats({}, false);
  assert.deepEqual(stats, {
    defeated: 0,
    finalLevel: 1,
    maxStreak: 0,
    pHp: 0,
    completed: false,
  });
});

test('buildQuitPayload normalizes nullables and numeric defaults', () => {
  const payload = buildQuitPayload({
    screen: '',
    phase: undefined,
    round: undefined,
    defeated: 5,
    pHp: 42,
  });
  assert.deepEqual(payload, {
    reason: 'quit_button',
    screen: null,
    phase: null,
    round: 0,
    defeated: 5,
    pHp: 42,
  });
});
