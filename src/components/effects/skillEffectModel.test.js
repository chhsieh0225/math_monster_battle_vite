import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { advanceBattleEffectClock, getBattleTidalLayout, getBattleTidalTime, getEffectLighting, getPaintedFrame, getTidalFrame, hasPaintedEffect, isNewEffectCast, isTidalEffect, TIDAL_TIMING } from './skillEffectModel.ts';
import { BattleSkillEffect } from './BattleSkillEffect.tsx';
import { getSkillActorKeys } from '../../utils/skillPresentation.ts';
import { getSkillRecipe, SKILL_RECIPE_IDS } from './skillRecipes.ts';
import { paintedPalette } from './paintedSkillArt.ts';

const launch = (props = {}) => ({ type: 'water', idx: 2, lvl: 5, skillId: 'water:2', flightMs: 320, ...props });
const hit = (effect, at, outcome = 'hit') => ({ ...effect, impact: { outcome, at } });
const source = { cx: 60, cy: 300, size: 110, top: '300px', right: '260px', flyRight: 81, flyTop: 60 };
const target = { ...source, cx: 245, cy: 140, size: 160 };

test('production begins at release, never assumes contact, and respects alternate flight delays', () => {
  for (const flightMs of [320, 500, undefined]) {
    const effect = launch({ flightMs });
    let clock = advanceBattleEffectClock(null, effect, 100, false);
    assert.equal(getBattleTidalTime(clock), TIDAL_TIMING.release);
    clock = advanceBattleEffectClock(clock, effect, 200, false);
    assert.ok(getBattleTidalTime(clock) > TIDAL_TIMING.release);
    assert.ok(getBattleTidalTime(clock) < TIDAL_TIMING.hit);
    clock = advanceBattleEffectClock(clock, effect, 10000, false);
    assert.equal(getTidalFrame(getBattleTidalTime(clock)).contact, false);
    clock = advanceBattleEffectClock(clock, hit(effect, 10005), 10005, false);
    assert.equal(getBattleTidalTime(clock), TIDAL_TIMING.hit);
  }
});

test('impact is authoritative, including immediate support hits and late React commits', () => {
  const effect = hit(launch({ sourceSlot: 'sub' }), 200);
  const clock = advanceBattleEffectClock(null, effect, 225, false);
  assert.equal(getBattleTidalTime(clock), TIDAL_TIMING.hit + 25);
  advanceBattleEffectClock(clock, effect, 3000, false);
  assert.equal(getBattleTidalTime(clock), TIDAL_TIMING.end);
});

test('pause freezes flight and contact while hidden-tab time catches up rather than replaying', () => {
  const effect = launch();
  let clock = advanceBattleEffectClock(null, effect, 0, false);
  advanceBattleEffectClock(clock, effect, 100, true);
  const paused = getBattleTidalTime(clock);
  advanceBattleEffectClock(clock, effect, 1100, true);
  assert.equal(getBattleTidalTime(clock), paused);
  advanceBattleEffectClock(clock, effect, 2100, false);
  assert.equal(getBattleTidalTime(clock), paused);
  const contact = hit(effect, 2200);
  clock = advanceBattleEffectClock(clock, contact, 2200, false);
  advanceBattleEffectClock(clock, contact, 2250, true);
  advanceBattleEffectClock(clock, contact, 3250, false);
  assert.equal(getBattleTidalTime(clock), TIDAL_TIMING.hit + 50);
  advanceBattleEffectClock(clock, contact, 6000, false);
  assert.equal(getBattleTidalTime(clock), TIDAL_TIMING.end);
});

test('miss/block cannot produce water contact and a copied impact does not restart the cast', () => {
  const effect = launch();
  assert.equal(isNewEffectCast(effect, hit(effect, 300)), false);
  assert.equal(isNewEffectCast(effect, launch()), true);
  assert.equal(isNewEffectCast(effect, null), true);
  const first = hit(effect, 300);
  assert.equal(isNewEffectCast(first, hit(effect, 600)), true);
  for (const outcome of ['miss', 'blocked']) {
    const clock = advanceBattleEffectClock(null, hit(effect, 300, outcome), 300, false);
    assert.equal(getBattleTidalTime(clock), 0);
  }
});

test('Tidal Impact keeps its own water model; actor ownership is unchanged for co-op and reverse PvP', () => {
  assert.equal(isTidalEffect(launch()), true);
  for (const skillId of [undefined, 'water:0', 'water:1', 'water:3', 'monster:slime_pressure']) {
    assert.equal(isTidalEffect(launch({ skillId })), false);
  }
  assert.deepEqual(getSkillActorKeys(launch({ sourceSlot: 'sub' })), { source: 'playerSub', target: 'enemyMain' });
  assert.deepEqual(getSkillActorKeys(launch({ targetSide: 'player', targetSlot: 'sub' })), { source: 'enemyMain', target: 'playerSub' });
});

test('battle layout preserves measured diagonal anchors and bounds mobile wave size', () => {
  for (const width of [320, 390, 430, 768]) {
    const arena = { width, height: 400 };
    const layout = getBattleTidalLayout(source, target, arena);
    assert.deepEqual(layout.source, source);
    assert.deepEqual(layout.target, target);
    assert.ok(layout.waveSize <= target.size && layout.waveSize <= arena.height * .42);
    const reverse = getBattleTidalLayout(target, source, arena);
    assert.equal(reverse.direction, -1);
    assert.equal(reverse.target.cy, source.cy);
  }
});

test('SSR and GPU-not-ready use the original effect without blocking battle or requiring WebGL', () => {
  const props = { source, target, arena: { width: 320, height: 400 }, warmSkillId: 'water:2', paused: false, lowPerf: false };
  const render = (effect) => renderToStaticMarkup(createElement(BattleSkillEffect, { ...props, effect }));
  assert.match(render(null), /data-painted-status="warming"/);
  assert.match(render(launch()), /class="skill-fx/);
  assert.match(render(launch({ skillId: 'water:1' })), /class="skill-fx/);
  assert.ok(!render(launch({ skillId: 'unknown:0' })).includes('class="skill-fx'));
  assert.ok(!render(hit(launch(), 0, 'miss')).includes('class="skill-fx'));
});

test('every existing recipe has painted support and a valid mineral palette', () => {
  assert.equal(new Set(SKILL_RECIPE_IDS).size, SKILL_RECIPE_IDS.length);
  for (const skillId of SKILL_RECIPE_IDS) {
    assert.equal(hasPaintedEffect(launch({ skillId })), true, skillId);
    for (const color of Object.values(paintedPalette(getSkillRecipe(skillId), 'water'))) {
      assert.match(color, /^#[0-9a-f]{6}$/i, skillId);
    }
  }
  assert.equal(hasPaintedEffect(null), false);
  assert.equal(hasPaintedEffect(launch({ skillId: 'missing' })), false);
});

test('all painted skills wait for authoritative impact, stop on miss/block, and finish contact', () => {
  for (const skillId of SKILL_RECIPE_IDS) {
    const effect = launch({ skillId });
    const clock = advanceBattleEffectClock(null, effect, 100, false);
    advanceBattleEffectClock(clock, effect, 10000, false);
    assert.equal(getPaintedFrame(clock).contact, false, skillId);
    for (const outcome of ['miss', 'blocked', 'hit']) {
      const contact = advanceBattleEffectClock(null, hit(effect, 10000, outcome), 10000, false);
      assert.equal(getPaintedFrame(contact).visible, outcome === 'hit', skillId);
      advanceBattleEffectClock(contact, contact.effect, 11000, false);
      assert.equal(getPaintedFrame(contact).done, true, skillId);
    }
  }
});

test('lighting follows the scene and impact retains a readable peak before fading', () => {
  assert.equal(getEffectLighting('rock'), 'sunlit');
  assert.equal(getEffectLighting('dark'), 'night');
  assert.equal(getEffectLighting('unknown'), 'neutral');
  const effect = hit(launch({ skillId: 'fire:2' }), 0);
  const clock = advanceBattleEffectClock(null, effect, 100, false);
  assert.equal(getPaintedFrame(clock).fade, 1);
  advanceBattleEffectClock(clock, effect, 400, false);
  assert.ok(getPaintedFrame(clock).fade > 0 && getPaintedFrame(clock).fade < 1);
  advanceBattleEffectClock(clock, effect, 1000, false);
  assert.equal(getPaintedFrame(clock).fade, 0);
});
