import test from 'node:test';
import assert from 'node:assert/strict';
import { createImagePreloader } from './imagePreload.ts';
import { getBattleBackground, getRequiredSceneArt, getSceneKey, getEvolutionPortrait, getRoutePreloadPlan, getEnemyPortrait, getWorldMapImages, WORLD_MAP_SRC } from './scenePreload.ts';
import { BG_IMGS, BG_IMGS_LOW } from '../data/sprites.ts';
import { STARTERS } from '../data/starters.ts';
import { EXPEDITIONS } from '../data/worldMap.ts';
import { WORLD_SIDE_ROUTES } from '../data/worldSideRoutes.ts';
import { getEncounterBackground } from '../data/encounterBackgrounds.ts';
import { getSpriteAnimationAsset } from '../data/spriteAnimationAssets.ts';
import { buildExpeditionPlan, buildExpeditionLanes } from './expeditionPlanner.ts';
import { createExpeditionRun, nextExpeditionFloor, isSpringOption } from './expeditionRun.ts';

test('background warmup uses the same quality and encounter overrides as the battlefield', () => {
  for (const [key, src] of Object.entries(BG_IMGS)) {
    assert.equal(getBattleBackground({ mType: key }), src);
    assert.equal(getBattleBackground({ mType: key }, true), BG_IMGS_LOW[key]);
  }
  assert.equal(getBattleBackground({ mType: 'light' }), BG_IMGS.heaven);
  assert.equal(getBattleBackground({ mType: 'unknown' }), BG_IMGS.grass);
  assert.equal(getBattleBackground(null), BG_IMGS.grass);
  assert.equal(getBattleBackground({ mType: 'ice', sceneMType: 'water' }), BG_IMGS.water);
  for (const id of ['wild_starter_tiger', 'venom_mantis', 'mire_toad', 'night_bat', 'chain_wraith', 'algebra_knight', 'limit_knight', 'topology_knight']) {
    assert.equal(getBattleBackground({ id, mType: 'grass' }), getEncounterBackground(id));
  }
});

test('scene cache accepts portraits/backgrounds and keeps decoded memory bounded by pixels', async () => {
  let created = 0;
  const cache = createImagePreloader({ maxReady: 10, maxPixels: 2 * 1024 * 1024, createImage: () => {
    created++;
    return { naturalWidth: 1024, naturalHeight: 1024, decode: async () => {} };
  } });
  await cache.load('/a'); await cache.load('/b');
  const unpin = cache.subscribe('/a', () => {});
  await cache.load('/c');
  assert.equal(cache.isReady('/a'), true);
  assert.equal(cache.isReady('/b'), false);
  assert.equal(cache.isReady('/c'), true);
  assert.equal(created, 3);
  assert.equal(await cache.load('/a'), true);
  assert.equal(created, 3, 'mounted scene and warmup share the decoded image');
  unpin();
});

test('failed background decode is retryable instead of permanently marked preloaded', async () => {
  let fail = true;
  const cache = createImagePreloader({ createImage: () => ({
    naturalWidth: 1200, naturalHeight: 800, decode: () => fail ? Promise.reject(new Error('offline')) : Promise.resolve(),
  }) });
  assert.equal(await cache.load('/scene'), false);
  assert.equal(cache.isReady('/scene'), false);
  fail = false;
  assert.equal(await cache.load('/scene'), true);
});

test('map warmup covers the base painting and all four guardian thumbnails, not map tiles or full atlases', () => {
  const sources = getWorldMapImages();
  assert.equal(sources[0], WORLD_MAP_SRC);
  assert.equal(sources.length, 5);
  assert.ok(sources.slice(1).every((src) => src.includes('/portraits/')));
});

test('changing selected route reprioritizes queued images without cancelling shared downloads', async () => {
  const images = [];
  const cache = createImagePreloader({ maxConcurrent: 1, createImage: () => {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    const image = { naturalWidth: 200, naturalHeight: 200, decode: () => promise, resolve };
    images.push(image);
    return image;
  } });
  cache.preload(['/a', '/b', '/c']);
  cache.preload(['/c', '/a', '/b']);
  assert.equal(images.length, 1);
  const first = cache.load('/a');
  images[0].resolve();
  await first;
  assert.equal(images[1].src, '/c');
  cache.preload([]);
});

test('route preload includes third-lane art, selected route first, not unseen floors', () => {
  const expedition = EXPEDITIONS[0];
  const pick = () => 0;
  const plan = buildExpeditionPlan(expedition, pick, [], WORLD_SIDE_ROUTES.map((route) => route.secret));
  const lanes = buildExpeditionLanes(plan, expedition, pick);
  const starter = STARTERS[0];
  const run = createExpeditionRun(plan, lanes);
  for (let floor = 0; floor < plan.floors.length; floor++) {
    const atMap = { ...run, atMap: true, path: Array.from({ length: floor }, () => 0) };
    assert.equal(nextExpeditionFloor(atMap), floor);
    const options = plan.floors[floor].options;
    for (let selected = 0; selected < options.length; selected++) {
      const preload = getRoutePreloadPlan(atMap, starter, 0, selected);
      const limited = getRoutePreloadPlan(atMap, starter, 0, selected, false, true);
      assert.ok(preload.sprites.length <= 5);
      if (isSpringOption(options[selected])) {
        assert.deepEqual(limited.images, []);
        assert.equal(limited.sprites.length, 1);
        continue;
      }
      const enemy = lanes[selected][floor];
      assert.equal(preload.images[0], getBattleBackground(enemy));
      assert.ok(preload.images.includes(getEnemyPortrait(enemy)));
      const art = getSpriteAnimationAsset(enemy.activeSpriteKey || enemy.spriteKey);
      assert.ok(limited.sprites.includes(art.src));
      assert.equal(limited.images.length, 2);
      assert.ok(limited.sprites.length <= 3, 'one selected enemy plus player and possible boss phase 2');
    }
  }
});

test('missing routes and preview-only maps do not warm unrelated enemies', () => {
  assert.deepEqual(getRoutePreloadPlan(null, null, 0, 0), { images: [], sprites: [] });
  assert.equal(getEnemyPortrait(null), null);
  const plan = buildExpeditionPlan(EXPEDITIONS[0], () => 0);
  const run = createExpeditionRun(plan, buildExpeditionLanes(plan, EXPEDITIONS[0], () => 0));
  assert.deepEqual(getRoutePreloadPlan({ ...run, atMap: false }, null, 0, 0), { images: [], sprites: [] });
});

test('scene handoff separates essential art from later portraits and never gates active questions', () => {
  const state = { screen: 'battle', phase: 'text', battleMode: 'single', enemy: { id: 'ghost', spriteKey: 'ghostSVG', maxHp: 100 },
    enemySub: null, starter: STARTERS[0], pStg: 0, round: 1, eHp: 100, bossPhase: 1 };
  const plan = getRequiredSceneArt(state);
  assert.deepEqual(plan.images, [getBattleBackground(state.enemy)]);
  assert.equal(plan.sprites.length, 2);
  assert.ok(getRequiredSceneArt({ ...state, phase: 'bossIntro' }).images.includes(getEnemyPortrait(state.enemy)));
  for (const phase of ['question', 'playerAtk', 'enemyAtk', 'menu']) {
    assert.deepEqual(getRequiredSceneArt({ ...state, phase }), { images: [], sprites: [] });
    assert.equal(getSceneKey({ ...state, phase, eHp: 10, bossPhase: 2 }), getSceneKey(state));
  }
  assert.notEqual(getSceneKey({ ...state, round: 2 }), getSceneKey(state));
  assert.deepEqual(getRequiredSceneArt({ ...state, screen: 'evolve', pStg: 1 }).images, [getEvolutionPortrait(STARTERS[0], 1)]);
  assert.equal(getRequiredSceneArt({ ...state, screen: 'worldmap' }).images[0], WORLD_MAP_SRC);
});
