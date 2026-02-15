import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OPS,
  buildDashboardInsights,
  buildPracticeRecommendations,
  buildWeaknessSuggestions,
  buildWeeklyReport,
  computeOverviewStats,
} from './dashboardInsights.js';

function makeOpStats(overrides = {}) {
  const stats = {};
  for (const op of OPS) {
    stats[op] = { attempted: 0, correct: 0, totalMs: 0 };
  }
  for (const [op, value] of Object.entries(overrides)) {
    stats[op] = {
      attempted: Number(value.attempted) || 0,
      correct: Number(value.correct) || 0,
      totalMs: Number(value.totalMs) || 0,
    };
  }
  return stats;
}

function makeSession({ id, daysAgo, tC, tW, opStats, now }) {
  const startTime = now - daysAgo * 24 * 60 * 60 * 1000;
  return {
    id,
    startTime,
    tC,
    tW,
    opStats,
  };
}

test('computeOverviewStats aggregates totals and op stats', () => {
  const now = Date.parse('2026-02-15T12:00:00.000Z');
  const sessions = [
    makeSession({
      id: 's1',
      daysAgo: 1,
      tC: 8,
      tW: 2,
      now,
      opStats: makeOpStats({
        '+': { attempted: 6, correct: 4, totalMs: 36000 },
        '×': { attempted: 4, correct: 4, totalMs: 18000 },
      }),
    }),
  ];

  const stats = computeOverviewStats(sessions);
  assert.equal(stats.totalSessions, 1);
  assert.equal(stats.totalQ, 10);
  assert.equal(stats.overallAcc, 80);
  assert.equal(stats.opData['+'].acc, 67);
  assert.equal(stats.opData['×'].avgTime, '4.5');
});

test('buildWeaknessSuggestions identifies low-accuracy group', () => {
  const overview = computeOverviewStats([
    {
      id: 's1',
      startTime: 1,
      tC: 5,
      tW: 7,
      opStats: makeOpStats({
        '+': { attempted: 12, correct: 5, totalMs: 120000 },
      }),
    },
  ]);

  const weak = buildWeaknessSuggestions(overview);
  assert.equal(weak[0].groupId, 'add');
  assert.match(weak[0].title, /需加強/);
});

test('buildWeeklyReport computes delta against previous week', () => {
  const now = Date.parse('2026-02-15T12:00:00.000Z');
  const sessions = [
    makeSession({
      id: 'cur-1',
      daysAgo: 2,
      tC: 9,
      tW: 1,
      now,
      opStats: makeOpStats({
        '+': { attempted: 10, correct: 9, totalMs: 42000 },
      }),
    }),
    makeSession({
      id: 'prev-1',
      daysAgo: 10,
      tC: 4,
      tW: 6,
      now,
      opStats: makeOpStats({
        '+': { attempted: 10, correct: 4, totalMs: 62000 },
      }),
    }),
  ];

  const report = buildWeeklyReport(sessions, { now });
  assert.equal(report.current.sessions, 1);
  assert.equal(report.previous.sessions, 1);
  assert.equal(report.current.acc, 90);
  assert.equal(report.previous.acc, 40);
  assert.equal(report.delta.acc, 50);
});

test('buildPracticeRecommendations returns 3 actionable tasks', () => {
  const now = Date.parse('2026-02-15T12:00:00.000Z');
  const sessions = [
    makeSession({
      id: 's1',
      daysAgo: 1,
      tC: 8,
      tW: 6,
      now,
      opStats: makeOpStats({
        unknown1: { attempted: 14, correct: 8, totalMs: 170000 },
      }),
    }),
    makeSession({
      id: 's2',
      daysAgo: 3,
      tC: 10,
      tW: 4,
      now,
      opStats: makeOpStats({
        mixed4: { attempted: 14, correct: 10, totalMs: 150000 },
      }),
    }),
  ];

  const overview = computeOverviewStats(sessions);
  const weak = buildWeaknessSuggestions(overview);
  const weekly = buildWeeklyReport(sessions, { now });
  const tasks = buildPracticeRecommendations(overview, weekly, weak, { maxItems: 3 });

  assert.equal(tasks.length, 3);
  assert.ok(tasks.some((t) => t.id.startsWith('task-fix-')));
  assert.ok(tasks.some((t) => t.id === 'task-consistency' || t.id === 'task-volume' || t.id === 'task-maintain'));
});

test('buildDashboardInsights provides bootstrap guidance for empty data', () => {
  const insights = buildDashboardInsights([], { now: Date.parse('2026-02-15T12:00:00.000Z') });

  assert.equal(insights.overview.totalSessions, 0);
  assert.equal(insights.weakSuggestions[0].groupId, 'warmup');
  assert.equal(insights.practiceTasks.length, 3);
});
