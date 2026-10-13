import assert from 'node:assert/strict';
import test from 'node:test';
import { drawSignatureSkill } from './signatureSkillMotion.ts';
import { getSignatureArt } from './signatureSkillArt.ts';
import { advanceBattleEffectClock, getBattleTidalLayout, getPaintedFrame, getTidalLayout } from './skillEffectModel.ts';
import { resolveBattleSpriteClip } from '../screens/battle/battleSpriteMotion.ts';
import { getSignatureCastAnimation } from '../../utils/effectTiming.ts';

const skills = ['fire:2', 'wolf:0', 'wolf:1', 'wolf:2', 'boss_sword_god:3'];
const clock = (skillId, age, outcome = 'hit', lvl = 5) => {
  const effect = { skillId, type: 'steel', idx: Number(skillId.split(':')[1]), lvl, flightMs: 500,
    ...(outcome ? { impact: { outcome, at: 0 } } : {}) };
  const c = advanceBattleEffectClock(null, effect, 0, false);
  return advanceBattleEffectClock(c, effect, age, false);
};
const render = (c, layout) => {
  const calls = [];
  assert.equal(drawSignatureSkill(c, layout, (...args) => calls.push(args)), true);
  return calls;
};

test('only commissioned skills opt into signature art and named actor clips', () => {
  assert.equal(getSignatureArt('fire:1'), null);
  assert.equal(getSignatureArt('wolf:3'), null);
  assert.equal(getSignatureArt('boss_sword_god:2'), null);
  for (const skill of skills) {
    assert.ok(getSignatureArt(skill));
    for (const timing of ['early', 'late', 'immediate']) {
      assert.equal(resolveBattleSpriteClip(`${getSignatureCastAnimation(skill, timing)} 1.1s ease`).clip, 'attack');
    }
  }
});

test('mobile and desktop, both directions and mastery tiers stay under the shared 48-sprite pool', () => {
  for (const skill of skills) for (const width of [320, 390, 768, 1280]) {
    for (const reversed of [false, true]) for (const level of [1, 3, 5]) {
      const layout = getTidalLayout(width, width < 400 ? 290 : 480, reversed);
      for (const age of [0, 30, 65, 120, 240, 390, 499]) {
        const calls = render(clock(skill, age, 'hit', level), layout);
        assert.ok(calls.length <= 32, `${skill}: ${calls.length}`);
        for (const [tile, x, y, w, h, rotation = 0, alpha = 1, flip = 1] of calls) {
          assert.ok(Number.isInteger(tile) && tile >= 0 && tile < 8);
          assert.ok([x, y, w, h, rotation, alpha, flip].every(Number.isFinite));
          assert.ok(w >= 0 && h >= 0 && alpha >= 0 && alpha <= 1);
          assert.ok(w <= width && h <= layout.height);
        }
      }
    }
  }
});

test('miss/block/expired casts emit no paint; contact settles before the enemy 540ms clear', () => {
  for (const skill of skills) {
    const layout = getTidalLayout(390, 420);
    for (const outcome of ['miss', 'blocked']) assert.equal(render(clock(skill, 90, outcome), layout).length, 0);
    const ended = clock(skill, 500);
    assert.equal(getPaintedFrame(ended).done, true);
    assert.equal(render(ended, layout).length, 0);
    const flight = render(clock(skill, 490, null), layout);
    assert.ok(!flight.some(([tile]) => tile === 7), 'No hit fragments before real contact');
  }
});

test('keyframe shapes change across impact and respect paused clocks', () => {
  const layout = getTidalLayout(390, 420);
  for (const skill of skills) {
    const c = clock(skill, 70);
    const first = render(c, layout);
    advanceBattleEffectClock(c, c.effect, 170, true);
    const paused = render(c, layout);
    assert.notDeepEqual(first, paused);
    advanceBattleEffectClock(c, c.effect, 3170, false);
    assert.deepEqual(render(c, layout), paused);
  }
});

test('co-op immediate hits use the physical diagonal target without adding flight', () => {
  const base = getTidalLayout(320, 380);
  const source = { ...base.source, cx: 82, cy: 270, size: 90 };
  const target = { ...base.target, cx: 234, cy: 142, size: 112 };
  const layout = getBattleTidalLayout(source, target, { width: 320, height: 380 });
  const calls = render(clock('wolf:1', 60), layout);
  assert.ok(calls.some(([tile, x]) => tile < 5 && x === target.cx));
});
