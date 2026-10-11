import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, Suspense } from 'react';
import { renderToString } from 'react-dom/server';
import { createScreenResource, screenResources } from './screenPreload.ts';

test('screen resources share one import and render synchronously after warmup', async () => {
  let calls = 0;
  const resource = createScreenResource(async () => {
    calls++;
    return { default: ({ text }) => createElement('div', null, text) };
  });
  assert.equal(resource.isReady(), false);
  const first = resource.load();
  assert.equal(resource.load(), first);
  await first;
  assert.equal(calls, 1);
  assert.equal(resource.isReady(), true);
  const html = renderToString(createElement(Suspense, { fallback: 'Unwanted loading frame' },
    createElement(resource.Screen, { text: 'Prepared screen' })));
  assert.match(html, /Prepared screen/);
  assert.doesNotMatch(html, /Unwanted loading frame/);
});

test('a failed screen import is retryable rather than cached forever', async () => {
  let calls = 0;
  const resource = createScreenResource(async () => {
    if (++calls === 1) throw Error('offline');
    return { default: () => null };
  });
  await assert.rejects(resource.load(), /offline/);
  assert.equal(resource.isReady(), false);
  await resource.load();
  assert.equal(calls, 2);
  assert.equal(resource.isReady(), true);
});

test('every non-eager application screen has a preparation resource', () => {
  assert.deepEqual(Object.keys(screenResources).sort(), ['battle', 'worldmap', 'evolve', 'leaderboard',
    'gameover', 'achievements', 'encyclopedia', 'dashboard', 'settings', 'pvp_result', 'daily_challenge',
    'howto', 'placement', 'spring'].sort());
});
