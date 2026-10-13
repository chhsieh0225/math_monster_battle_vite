import assert from 'node:assert/strict';
import test from 'node:test';
import { CHOREOGRAPHED_SKILL_IDS, getSkillChoreography } from './skillChoreography.ts';
import { SKILL_RECIPE_IDS } from './skillRecipes.ts';
import { getSignatureArt } from './signatureSkillArt.ts';
import { drawChoreographedSkill } from './skillPigmentMotion.ts';
import { advanceBattleEffectClock, getBattleTidalLayout, getPaintedFrame, getTidalLayout } from './skillEffectModel.ts';
import { getPlayerSkillMotion, getSignatureCastAnimation } from '../../utils/effectTiming.ts';
import { resolveBattleSpriteClip } from '../screens/battle/battleSpriteMotion.ts';
import { resolveBattleSpriteAnimations } from '../../utils/battleAnimations.ts';

const clock = (skillId, age, outcome = 'hit', lvl = 5) => {
  const effect = { skillId, type: 'dark', idx: 3, lvl, flightMs: 400,
    ...(outcome ? { impact: { outcome, at: 0 } } : {}) };
  return advanceBattleEffectClock(advanceBattleEffectClock(null, effect, 0, false), effect, age, false);
};
const render = (c, layout) => {
  const calls = [];
  assert.equal(drawChoreographedSkill(c, layout, (...args) => calls.push(args)), true);
  return calls;
};

test('the full catalog has exactly one authored presentation, without silently falling through to generic motion', () => {
  assert.equal(CHOREOGRAPHED_SKILL_IDS.length, 95);
  for (const id of SKILL_RECIPE_IDS) {
    assert.equal(Number(Boolean(getSkillChoreography(id))) + Number(Boolean(getSignatureArt(id))) + Number(id === 'water:2'), 1, id);
  }
  for (const id of CHOREOGRAPHED_SKILL_IDS) assert.ok(SKILL_RECIPE_IDS.includes(id));
  for (const id of [undefined, 'constructor', 'fire:99']) assert.equal(getSkillChoreography(id), undefined);
});

test('all new choreography fits the fixed pool at three mastery tiers and narrow/landscape/desktop layouts', () => {
  for (const id of CHOREOGRAPHED_SKILL_IDS) for (const [width, height] of [[320, 260], [390, 450], [667, 200], [1280, 700]]) {
    for (const reverse of [false, true]) for (const lvl of [1, 3, 5]) for (const outcome of [null, 'hit']) {
      const layout = getTidalLayout(width, height, reverse);
      for (const age of [0, 40, 120, 230, 390, 499]) {
        const calls = render(clock(id, age, outcome, lvl), layout);
        assert.ok(calls.length <= 48, `${id}: ${calls.length}`);
        for (const [tile, x, y, w, h, rotation = 0, alpha = 1, flip = 1] of calls) {
          assert.ok(Number.isInteger(tile) && tile >= 0 && tile < 8, id);
          assert.ok([x, y, w, h, rotation, alpha, flip].every(Number.isFinite), id);
          assert.ok(w >= 0 && h >= 0 && alpha >= 0 && alpha <= 1, id);
          assert.ok(w <= width && h <= height, id);
        }
      }
    }
  }
});

test('no contact debris or return drain before a confirmed hit; misses, blocks and expired effects stop', () => {
  const layout = getTidalLayout(320, 360);
  for (const id of CHOREOGRAPHED_SKILL_IDS) {
    for (const outcome of ['miss', 'blocked']) assert.equal(render(clock(id, 100, outcome), layout).length, 0, id);
    assert.equal(render(clock(id, 500), layout).length, 0, id);
    assert.equal(getPaintedFrame(clock(id, 500)).done, true, id);
    assert.ok(!render(clock(id, 390, null), layout).some(([tile]) => tile === 4 || tile === 6), id);
  }
});

test('new actor clips resolve on early, late and immediate clocks; every playable move has synchronized contact', () => {
  for (const id of CHOREOGRAPHED_SKILL_IDS) for (const timing of ['early', 'late', 'immediate']) {
    assert.equal(resolveBattleSpriteClip(`${getSignatureCastAnimation(id, timing)} .5s ease`).clip, 'attack', id);
  }
  for (const id of SKILL_RECIPE_IDS.filter((id) => !id.startsWith('monster:') && !id.includes('knight') && !id.startsWith('blue_') && id !== 'enemy:basic')) {
    const motion = getPlayerSkillMotion(id);
    assert.ok(motion.releaseMs >= 0, id);
    assert.equal(motion.releaseMs + motion.flightMs, Math.round(motion.durationMs * .36), id);
    assert.equal(getPlayerSkillMotion(id, 'pvp'), null, id);
  }
});

test('physical diagonal targets, pause/resume and reversed casts keep deterministic choreography', () => {
  const base = getTidalLayout(390, 430);
  const a = { ...base.source, cx: 94, cy: 280, size: 100 };
  const b = { ...base.target, cx: 290, cy: 162, size: 155 };
  for (const id of CHOREOGRAPHED_SKILL_IDS) {
    const layout = getBattleTidalLayout(a, b, { width: 390, height: 430 });
    const c = clock(id, 120);
    advanceBattleEffectClock(c, c.effect, 150, true);
    const paused = render(c, layout);
    advanceBattleEffectClock(c, c.effect, 1150, false);
    assert.deepEqual(render(c, layout), paused, id);
    advanceBattleEffectClock(c, c.effect, 1190, false);
    assert.notDeepEqual(render(c, layout), paused, id);
  }
});

test('drain travels back only after contact, and named mechanics remain distinct', () => {
  const layout = getTidalLayout(390, 430);
  const early = render(clock('monster:moon_siphon', 25), layout).filter(([tile]) => tile < 4);
  const late = render(clock('monster:moon_siphon', 260), layout).filter(([tile]) => tile < 4);
  const meanX = (calls) => calls.reduce((sum, call) => sum + call[1], 0) / calls.length;
  assert.ok(meanX(late) < meanX(early));
  for (const [a, b] of [['tiger:1', 'tiger:3'], ['electric:1', 'electric:2'], ['topology_knight:1', 'algebra_knight:1'], ['grass:1', 'grass:3']]) {
    assert.notDeepEqual(render(clock(a, 130), layout), render(clock(b, 130), layout));
  }
});

test('enemy and PvP actors follow through after their late lunge clears, without changing physical ownership or overriding hurt/defeat', () => {
  const base = { eAnim: '', pAnim: '', eSubAnim: '', pSubAnim: '', lowPerfMode: false,
    enemyIsBoss: false, enemyLowHp: false, enemyDefeated: false };
  for (const targetSide of ['player', 'enemy']) for (const sourceSlot of ['main', 'sub']) {
    const attackEffect = { ...clock('electric:2', 0).effect, targetSide, sourceSlot };
    const source = `${targetSide === 'player' ? 'enemy' : 'player'}${sourceSlot === 'sub' ? 'Sub' : 'Main'}`;
    const anims = resolveBattleSpriteAnimations({ ...base, attackEffect, battleMode: 'pvp' });
    for (const slot of ['enemyMain', 'enemySub', 'playerMain', 'playerSub']) {
      assert.equal(anims[slot].startsWith('signatureChannelFollow'), slot === source);
    }
    for (const outcome of ['miss', 'blocked']) {
      assert.ok(!resolveBattleSpriteAnimations({ ...base, attackEffect: { ...attackEffect, impact: { outcome, at: 0 } }, battleMode: 'pvp' })[source].startsWith('signature'));
    }
  }
  const attackEffect = { ...clock('electric:2', 0).effect, targetSide: 'player' };
  assert.match(resolveBattleSpriteAnimations({ ...base, attackEffect, eAnim: 'enemyHit .5s ease' }).enemyMain, /^enemyHit/);
  assert.match(resolveBattleSpriteAnimations({ ...base, attackEffect, enemyDefeated: true }).enemyMain, /^enemyDissolve/);
  assert.equal(resolveBattleSpriteAnimations({ ...base, attackEffect, lowPerfMode: true }).enemyMain, 'none');
  assert.ok(!resolveBattleSpriteAnimations({ ...base, attackEffect: { ...attackEffect, targetSide: 'enemy' }, battleMode: 'single' }).playerMain.startsWith('signature'));
});

test('electric forms charge without a summon hop and the prison uses current rather than metal links', () => {
  for (let i = 0; i < 4; i++) {
    assert.equal(getSkillChoreography(`electric:${i}`).pigment, 'lightning');
    assert.equal(getSignatureCastAnimation(`electric:${i}`), 'signatureChannel');
  }
  assert.equal(getSkillChoreography('monster:shackle_lash').pigment, 'chain');
  assert.equal(getSignatureCastAnimation('boss:3'), 'signatureSummon');
});

test('electric orb leaves its physical caster and stays readable in flight at each actor size', () => {
  for (const reverse of [false, true]) for (const size of [70, 120, 190]) {
    const base = getTidalLayout(390, 430, reverse);
    const layout = { ...base, source: { ...base.source, size } };
    const getOrb = (age) => render(clock('electric:0', age, null, 1), layout)
      .filter(([tile, , , , , , alpha]) => tile === 7 && alpha === .9)[0];
    const start = getOrb(0), middle = getOrb(240), end = getOrb(399);
    assert.ok((middle[1] - start[1]) * layout.direction > 0);
    assert.ok((end[1] - middle[1]) * layout.direction > 0);
    assert.ok(Math.abs(middle[1] - layout.target.cx) > 50);
    assert.ok(middle[3] <= size * .72);
  }
});

test('electric filaments keep their endpoints in shallow arenas and thunder strikes expire instead of forming a fence', () => {
  const layout = getTidalLayout(667, 200);
  const main = render(clock('electric:1', 0), layout).filter(([tile]) => tile < 4);
  const sources = main.filter((_, i) => i % 2 === 0);
  const source = sources[0], target = sources.at(-1);
  const endpoint = (call, direction) => {
    const length = call[4] * (196 * 2.26 / 512);
    const angle = call[5] + Math.PI / 2;
    return [call[1] + direction * Math.cos(angle) * length / 2, call[2] + direction * Math.sin(angle) * length / 2];
  };
  const start = endpoint(source, -1), end = endpoint(target, 1);
  assert.ok(Math.abs(start[0] - (layout.source.cx + layout.source.size * .16)) < .001);
  assert.ok(Math.abs(end[0] - layout.target.cx) < .001);
  assert.ok(Math.abs(end[1] - layout.target.cy) < .001);
  const storm = (age) => render(clock('electric:2', age), getTidalLayout(390, 430)).filter(([tile, , , , , , a]) => tile < 4 && a > .001);
  assert.equal(storm(0).length, 1);
  assert.ok(storm(140).length > storm(0).length);
  assert.equal(storm(499).length, 0);
});
