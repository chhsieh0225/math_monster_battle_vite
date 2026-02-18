import assert from 'node:assert/strict';
import test from 'node:test';
import { calcScore } from './leaderboard.ts';

test('calcScore dampens early perfect-accuracy exits', () => {
  const earlyExitScore = calcScore(0, 1, 0, 1, false, 1);
  const shortLegitRun = calcScore(2, 8, 2, 2, false, 4);
  assert.ok(earlyExitScore < shortLegitRun);
  assert.ok(earlyExitScore <= 200);
});

test('calcScore rewards higher max streak with same other stats', () => {
  const lowStreak = calcScore(5, 18, 6, 4, false, 2);
  const highStreak = calcScore(5, 18, 6, 4, false, 10);
  assert.ok(highStreak > lowStreak);
});

test('calcScore preserves timed-mode premium', () => {
  const untimed = calcScore(7, 20, 5, 5, false, 8);
  const timed = calcScore(7, 20, 5, 5, true, 8);
  assert.ok(timed > untimed);
});
