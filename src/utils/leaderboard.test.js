import assert from 'node:assert/strict';
import test from 'node:test';
import { calcScore, loadScores, saveScore } from './leaderboard.ts';

function createStorageMock() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    clear() { map.clear(); },
  };
}

test('loadScores returns empty array when no data', () => {
  globalThis.localStorage = createStorageMock();
  assert.deepEqual(loadScores(), []);
});

test('saveScore stores entry and returns rank', () => {
  globalThis.localStorage = createStorageMock();
  const rank = saveScore({ name: 'Alice', score: 500, date: Date.now() });
  assert.equal(rank, 0);
  const rank2 = saveScore({ name: 'Bob', score: 800, date: Date.now() });
  assert.equal(rank2, 0);
  const scores = loadScores();
  assert.equal(scores.length, 2);
  assert.ok(scores[0].score >= scores[1].score);
});

test('saveScore caps at 10 entries', () => {
  globalThis.localStorage = createStorageMock();
  for (let i = 0; i < 12; i++) {
    saveScore({ name: `P${i}`, score: i * 100, date: Date.now() });
  }
  assert.equal(loadScores().length, 10);
});

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
