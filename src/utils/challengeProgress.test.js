import assert from 'node:assert/strict';
import test from 'node:test';
import {
  beginDailyChallengeRun,
  loadDailyChallengeProgress,
  saveDailyChallengeProgress,
  markDailyChallengeCleared,
  markDailyChallengeFailed,
  loadTowerProgress,
  saveTowerProgress,
  startTowerRun,
  recordTowerFloorClear,
  recordTowerDefeat,
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

test('saveDailyChallengeProgress normalizes and round-trips', () => {
  globalThis.localStorage = createStorageMock();
  const saved = saveDailyChallengeProgress({
    version: 1,
    streakCount: -5,
    totalClears: 2,
    lastClearedDate: '2026-02-15',
    lastPlayedDate: '2026-02-15',
    runs: {},
  });
  assert.equal(saved.streakCount, 0, 'negative streak clamped to 0');
  assert.equal(saved.totalClears, 2);
});

test('loadTowerProgress returns defaults when empty', () => {
  globalThis.localStorage = createStorageMock();
  const tp = loadTowerProgress();
  assert.equal(tp.version, 1);
  assert.equal(tp.currentFloor, 1);
  assert.equal(tp.bestFloor, 0);
  assert.equal(tp.winStreak, 0);
});

test('saveTowerProgress normalizes and persists', () => {
  globalThis.localStorage = createStorageMock();
  const saved = saveTowerProgress({
    version: 1,
    seasonId: 'test',
    currentRunId: null,
    currentFloor: -3,
    bestFloor: 5,
    winStreak: 2,
    totalClears: 1,
    totalRuns: 3,
    lastPlayedAt: null,
  });
  assert.equal(saved.currentFloor, 1, 'negative floor clamped to 1');
  const loaded = loadTowerProgress();
  assert.equal(loaded.bestFloor, 5);
});

test('startTowerRun creates new run and increments totalRuns', () => {
  globalThis.localStorage = createStorageMock();
  const tp = startTowerRun(1, 10000);
  assert.equal(tp.totalRuns, 1);
  assert.ok(tp.currentRunId !== null);
  assert.equal(tp.currentFloor, 1);
  assert.equal(tp.lastPlayedAt, 10000);
});

test('recordTowerFloorClear advances floor and updates best', () => {
  globalThis.localStorage = createStorageMock();
  startTowerRun(1, 10000);
  const tp = recordTowerFloorClear(3, 20000);
  assert.equal(tp.currentFloor, 4);
  assert.equal(tp.bestFloor, 3);
  assert.equal(tp.winStreak, 1);
  assert.equal(tp.totalClears, 1);
});

test('recordTowerDefeat resets winStreak', () => {
  globalThis.localStorage = createStorageMock();
  startTowerRun(1, 10000);
  recordTowerFloorClear(1, 20000);
  recordTowerFloorClear(2, 30000);
  const tp = recordTowerDefeat(40000);
  assert.equal(tp.winStreak, 0);
  assert.equal(tp.bestFloor, 2);
});
