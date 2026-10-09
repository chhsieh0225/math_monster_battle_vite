import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { PLAYTEST_SCHEMA, addFrame, buildPlaytestReport, createFrameStats, summarizeFrames, trackPlaytestScreen } from './playtestLog.ts';
import { appendEvent } from './eventLogger.ts';

let previousStorage;
beforeEach(() => {
  previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
});
afterEach(() => { globalThis.localStorage = previousStorage; });

test('frame stats report smoothness the way a child feels it', () => {
  const stats = createFrameStats();
  for (let i = 0; i < 95; i += 1) addFrame(stats, 16.7);
  for (let i = 0; i < 4; i += 1) addFrame(stats, 60);
  addFrame(stats, 400);
  addFrame(stats, Number.NaN);
  const summary = summarizeFrames(stats);
  assert.equal(summary.frames, 100);
  assert.equal(summary.p50FrameMs, 17);
  assert.equal(summary.p95FrameMs, 17);
  assert.equal(summary.p99FrameMs, 60);
  assert.equal(summary.slowFrames, 5);
  assert.equal(summary.hitches, 1);
  assert.equal(summary.worstFrameMs, 250, 'very long frames are capped in the last bucket');
  assert.ok(summary.avgFps > 30 && summary.avgFps < 60);
});

test('the report bundles screens, progress and events without a browser', () => {
  trackPlaytestScreen('worldmap');
  trackPlaytestScreen('battle');
  appendEvent('route_chosen', { floor: 2 });
  const report = buildPlaytestReport();
  assert.equal(report.schema, PLAYTEST_SCHEMA);
  assert.equal(report.app.platform, 'web');
  assert.equal(report.screens.current, 'battle');
  assert.ok('worldmap' in report.screens.timeMsByScreen);
  assert.ok(Array.isArray(report.sessions));
  assert.ok(Array.isArray(report.events));
  assert.equal(report.player.profile, null);
  assert.doesNotThrow(() => JSON.stringify(report));
});
