import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers';
import { createBattleSpritePreloader, getBattleSpritePreloadSources, getStarterSpriteSource } from './battleSpritePreload.ts';
import { STARTERS } from '../data/starters.ts';
import { PVP_SELECTABLE_ROSTER } from '../data/pvpRoster.ts';
import { PROFILES } from '../data/spriteProfiles.ts';
import { getSpriteAnimationAsset } from '../data/spriteAnimationAssets.ts';
import * as sprites from '../data/sprites.ts';

const source = (key) => getSpriteAnimationAsset(key).src;
const starter = (id) => STARTERS.find((unit) => unit.id === id);
const enemy = (key = 'ghostSVG', id = 'ghost') => ({
  id, spriteKey: key, activeSpriteKey: key, svgFn: sprites[key], maxHp: 100,
});
const state = (overrides = {}) => ({
  screen: 'battle', battleMode: 'single', starter: starter('fire'), pStg: 0, allySub: null,
  enemy: enemy(), enemySub: null, enemies: [], round: 0, eHp: 100, eHpSub: 100, bossPhase: 1,
  ...overrides,
});

test('selection preloads the chosen stage by factory identity, including every PvP boss', () => {
  for (const unit of PVP_SELECTABLE_ROSTER) {
    for (let index = 0; index < unit.stages.length; index++) {
      const selected = { ...unit, selectedStageIdx: index };
      assert.equal(getStarterSpriteSource(selected), source(sprites.getSpriteProfileKey(unit.stages[index].svgFn)));
    }
  }
  assert.equal(getStarterSpriteSource(null), null);
  assert.equal(getStarterSpriteSource(starter('fire'), 99), source('playerfire0SVG'));
});

test('all active monster variants use their current identity instead of downloading the base art', () => {
  for (const key of Object.keys(PROFILES)) {
    const unit = { ...enemy(), activeSpriteKey: key };
    assert.ok(getBattleSpritePreloadSources(state({ enemy: unit }), true).includes(source(key)), key);
  }
});

test('solo looks one encounter ahead and includes next evolution, not the whole roster', () => {
  const sources = getBattleSpritePreloadSources(state({ enemies: [enemy(), enemy('dragonEvolvedSVG'), enemy('slimeSVG')] }));
  assert.deepEqual(sources, [source('playerfire0SVG'), source('ghostSVG'), source('dragonEvolvedSVG'), source('playerfire1SVG')]);
});

test('team lookahead includes both next enemies after paired and promoted-secondary rounds', () => {
  for (const battleMode of ['coop', 'double']) {
    const roster = [enemy('slimeSVG'), enemy(), enemy('dragonSVG'), enemy('bossHydraSVG', 'boss_hydra')];
    const current = state({ battleMode, enemy: roster[0], enemySub: roster[1], enemies: roster,
      allySub: { ...starter('wolf'), selectedStageIdx: 2 } });
    for (const args of [current, { ...current, round: 1, enemy: roster[1], enemySub: null }]) {
      const sources = getBattleSpritePreloadSources(args);
      assert.ok(sources.includes(source('dragonSVG')));
      assert.ok(sources.includes(source('bossHydraSVG')));
      assert.ok(sources.includes(source('playerwolf2SVG')));
      assert.ok(!sources.includes(source('playerwolf0SVG')));
      assert.ok(sources.length <= 8);
    }
  }
});

test('boss transformation is ready ahead of damage thresholds, even in conserve mode and the sub slot', () => {
  const boss = enemy('darkLordSVG', 'boss');
  for (const conserve of [false, true]) {
    for (const overrides of [{ enemy: boss }, { battleMode: 'coop', enemySub: boss }]) {
      const sources = getBattleSpritePreloadSources(state(overrides), conserve);
      assert.ok(sources.includes(source('darkLordSVG')));
      assert.ok(sources.includes(source('bossDarkPhase2SVG')));
    }
  }
  const transformed = getBattleSpritePreloadSources(state({ enemy: boss, eHp: 59 }), true);
  assert.ok(transformed.indexOf(source('bossDarkPhase2SVG')) < transformed.indexOf(source('darkLordSVG')));
  const upcoming = getBattleSpritePreloadSources(state({ enemies: [enemy(), boss] }));
  assert.ok(upcoming.includes(source('bossDarkPhase2SVG')));
});

test('constrained connections skip speculation; PvP does not preload PvE evolution or phase overrides', () => {
  const args = state({ enemies: [enemy(), enemy('bossHydraSVG', 'boss_hydra')] });
  assert.deepEqual(getBattleSpritePreloadSources(args, true), [source('playerfire0SVG'), source('ghostSVG')]);
  assert.deepEqual(getBattleSpritePreloadSources({ ...args, battleMode: 'pvp', enemy: enemy('darkLordSVG', 'boss') }),
    [source('playerfire0SVG'), source('darkLordSVG')]);
  for (const screen of ['title', 'selection', 'settings', 'gameover']) {
    assert.deepEqual(getBattleSpritePreloadSources({ ...args, screen }), []);
  }
  assert.ok(getBattleSpritePreloadSources({ ...args, screen: 'evolve', pStg: 1 }).includes(source('playerfire1SVG')));
});

function deferredImages(options = {}) {
  const images = [];
  const createImage = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    const image = { naturalWidth: 2048, naturalHeight: 768, decode: () => promise, resolve, reject };
    images.push(image);
    return image;
  };
  return { images, loader: createBattleSpritePreloader({ createImage, ...options }) };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('preload and mounted actors share one in-flight decode and an immediately queryable ready cache', async () => {
  const { images, loader } = deferredImages();
  loader.preload(['/one']);
  const first = loader.load('/one');
  assert.equal(first, loader.load('/one'));
  assert.equal(images.length, 1);
  assert.equal(images[0].fetchPriority, 'high');
  assert.equal(images[0].decoding, 'async');
  assert.equal(loader.isReady('/one'), false);
  images[0].resolve();
  assert.equal(await first, true);
  assert.equal(loader.isReady('/one'), true);
  assert.equal(await loader.load('/one'), true);
  assert.equal(images.length, 1);
});

test('at most two decodes run at once and visible requests jump ahead of speculative work', async () => {
  const { images, loader } = deferredImages();
  loader.preload(['/a', '/b', '/c', '/d']);
  assert.deepEqual(images.map((image) => image.src), ['/a', '/b']);
  const visible = loader.load('/d');
  images[0].resolve();
  await flush();
  assert.equal(images[2].src, '/d');
  assert.equal(images[2].fetchPriority, 'high');
  images[1].resolve();
  await flush();
  assert.equal(images[3].src, '/c');
  images[2].resolve(); images[3].resolve();
  assert.equal(await visible, true);
  await flush();
});

test('new plans cancel obsolete queued and in-flight speculation, but preserve visible actors', async () => {
  const { images, loader } = deferredImages();
  loader.preload(['/old', '/keep', '/never-start']);
  const keep = loader.load('/keep');
  loader.preload(['/new']);
  assert.equal(images[0].src, '');
  assert.equal(images[1].src, '/keep');
  assert.equal(images[2].src, '/new');
  assert.equal(images.length, 3);
  images[0].resolve();
  images[1].resolve(); images[2].resolve();
  assert.equal(await keep, true);
  await flush();
  assert.equal(loader.isReady('/old'), false, 'late cancelled callbacks must not repopulate cache');
  assert.equal(loader.isReady('/new'), true);
});

test('cache has an LRU capacity and does not evict a mounted actor before unused images', async () => {
  let created = 0;
  const loader = createBattleSpritePreloader({ maxReady: 2, createImage: () => {
    created++;
    return { naturalWidth: 2048, naturalHeight: 768, decode: async () => {} };
  } });
  await loader.load('/a'); await loader.load('/b'); await loader.load('/a'); await loader.load('/c');
  assert.equal(loader.isReady('/a'), true);
  assert.equal(loader.isReady('/b'), false);
  assert.equal(created, 3);
  const unsubscribe = loader.subscribe('/a', () => {});
  await loader.load('/b');
  assert.equal(loader.isReady('/a'), true);
  assert.equal(loader.isReady('/c'), false);
  unsubscribe();
  await loader.load('/d');
  assert.equal(loader.isReady('/a'), false);
});

test('timeouts release the queue, allow retry and ignore late success from an abandoned image', async () => {
  const { images, loader } = deferredImages({ maxConcurrent: 1, timeoutMs: 30 });
  const hung = loader.load('/hung');
  const next = loader.load('/next');
  assert.equal(await hung, false);
  assert.equal(images[0].src, '');
  assert.equal(images[1].src, '/next');
  images[1].resolve();
  assert.equal(await next, true);
  const retry = loader.load('/hung');
  images[0].resolve();
  await flush();
  assert.equal(loader.isReady('/hung'), false);
  images[2].resolve();
  assert.equal(await retry, true);
});

test('offline, malformed and unsupported images fail safely and can be retried', async () => {
  const { images, loader } = deferredImages();
  const failed = loader.load('/retry');
  images[0].reject(new Error('offline'));
  assert.equal(await failed, false);
  const malformed = loader.load('/retry');
  images[1].naturalWidth = 1024;
  images[1].resolve();
  assert.equal(await malformed, false);
  let notified = 0;
  const stop = loader.subscribe('/retry', () => { notified++; });
  const good = loader.load('/retry');
  images[2].resolve();
  assert.equal(await good, true);
  assert.equal(notified, 1);
  stop();
  const unsupported = createBattleSpritePreloader({ createImage: () => { throw new Error('unsupported'); } });
  assert.equal(await unsupported.load('/anything'), false);
  assert.equal(await loader.load(''), false);
});
