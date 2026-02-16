import assert from 'node:assert/strict';
import test from 'node:test';
import {
  beginDailyChallengeRun,
  loadDailyChallengeProgress,
  markDailyChallengeCleared,
  markDailyChallengeFailed,
} from './challengeProgress.ts';

function createStorageMock() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

function createPlan(dateKey = '2026-02-16') {
  return {
    dateKey,
    challengeId: `daily-${dateKey}`,
    battles: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }],
  };
}

test('markDailyChallengeFailed persists failed run result', () => {
  globalThis.localStorage = createStorageMock();
  const plan = createPlan();
  beginDailyChallengeRun(plan, 1000);
  markDailyChallengeFailed(plan, 1, 2000);

  const progress = loadDailyChallengeProgress();
  const run = progress.runs[plan.dateKey];
  assert.equal(run.status, 'failed');
  assert.equal(run.battlesCleared, 1);
  assert.equal(run.attempts, 1);
});

test('markDailyChallengeFailed does not override already cleared run', () => {
  globalThis.localStorage = createStorageMock();
  const plan = createPlan();
  beginDailyChallengeRun(plan, 1000);
  markDailyChallengeCleared(plan, 3, 2000);
  markDailyChallengeFailed(plan, 1, 2500);

  const progress = loadDailyChallengeProgress();
  const run = progress.runs[plan.dateKey];
  assert.equal(run.status, 'cleared');
  assert.equal(run.battlesCleared, 3);
  assert.equal(progress.totalClears, 1);
});
