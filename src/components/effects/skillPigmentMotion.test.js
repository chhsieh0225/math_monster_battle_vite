import assert from 'node:assert/strict';
import test from 'node:test';
import { CHOREOGRAPHED_SKILL_IDS, getSkillChoreography, getMetalFinish, METAL_SKILL_IDS } from './skillChoreography.ts';
import { ENEMY_SKILLS } from '../../data/enemySkills.ts';
import { GUARDIAN_ENCOUNTERS } from '../../data/guardianEncounters.ts';
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

test('metal finish covers steel families and physical divine blades without recoloring other materials', () => {
  const steel = [
    ...[0, 1, 2, 3].map(i => `wolf:${i}`),
    ...['slime_steel', 'dragon'].flatMap(id => ENEMY_SKILLS[id].map(skill => skill.skillId)),
    ...GUARDIAN_ENCOUNTERS.topology_knight.skills.map((_, i) => `topology_knight:${i}`),
  ];
  assert.equal(steel.length, 11);
  const gilded = ['boss_sword_god:0', 'boss_sword_god:1', 'boss_sword_god:3'];
  assert.deepEqual(new Set(METAL_SKILL_IDS), new Set([...steel, ...gilded]));
  for (const id of [...steel, ...gilded]) {
    const finish = steel.includes(id) ? 'steel' : 'gilded';
    assert.equal(getMetalFinish(id), finish, id);
    assert.ok(SKILL_RECIPE_IDS.includes(id));
    const plan = getSkillChoreography(id);
    if (plan) assert.equal(plan.finish, finish, id);
    else assert.ok(getSignatureArt(id), id);
  }
  for (const id of SKILL_RECIPE_IDS.filter(id => !METAL_SKILL_IDS.includes(id))) {
    assert.equal(getMetalFinish(id), undefined, id);
    assert.equal(getSkillChoreography(id)?.finish, undefined, id);
  }
  for (const id of [undefined, 'constructor', '__proto__']) assert.equal(getMetalFinish(id), undefined);
});

test('steel orbit uses three centered rings and titanium claws extend beyond the target silhouette', () => {
  for (const reverse of [false, true]) {
    const layout = getTidalLayout(390, 430, reverse);
    const rings = render(clock('topology_knight:2', 40), layout).filter(([tile]) => tile < 4);
    assert.equal(rings.length, 6, 'three rings, each with two blended contour frames');
    for (const [, x, y] of rings) {
      assert.equal(x, layout.target.cx);
      assert.equal(y, layout.target.cy);
    }
    const titanium = render(clock('monster:dragon', 120), layout).find(([tile]) => tile < 4);
    const ordinary = render(clock('lion:0', 120), layout).find(([tile]) => tile < 4);
    assert.ok(titanium[3] > ordinary[3] && titanium[4] > ordinary[4]);
    assert.ok((titanium[1] - layout.target.cx) * layout.direction < 0, 'claws extend toward the attacking side');
    assert.ok(titanium[2] < layout.target.cy);
    const blades = render(clock('boss_sword_god:1', 120), layout).filter(([tile]) => tile < 4);
    assert.equal(blades.length, 12, 'six orbiting blades at the highest mastery tier');
    assert.ok(blades.some(([, x]) => Math.abs(x - layout.target.cx) > layout.target.size * .3));
  }
});

test('ice mirrors turn as two or three thick panels instead of a stack of eight badges', () => {
  const layout = getTidalLayout(390, 430);
  for (const [level, count] of [[1, 2], [3, 3], [5, 3]]) {
    const early = render(clock('tiger:1', 160, null, level), layout).filter(([tile]) => tile < 4);
    const late = render(clock('tiger:1', 280, null, level), layout).filter(([tile]) => tile < 4);
    assert.equal(early.length, count * 2);
    assert.equal(late.length, count * 2);
    assert.notEqual(early[0][3], late[0][3], 'turning changes apparent thickness');
  }
  assert.equal(render(clock('tiger:1', 220), layout).filter(([tile]) => tile < 4).length, 0,
    'intact mirrors shatter after contact rather than continuing to orbit');
});

test('lion has its own solar material without changing fire, moon or metal families', () => {
  const ids = CHOREOGRAPHED_SKILL_IDS.filter(id => getSkillChoreography(id).pigment === 'solar');
  assert.deepEqual(ids, ['lion:0', 'lion:1', 'lion:2', 'lion:3']);
  assert.equal(getSkillChoreography('fire:1').pigment, 'ember');
  assert.equal(getSkillChoreography('blue_butterfly:0').pigment, 'moon');
  assert.equal(getSkillChoreography('monster:dragon').finish, 'steel');
  assert.equal(getSkillChoreography('lion:2').action, 'surge');
});

test('solar roar leaves the physical mouth anchor with pressure fronts perpendicular to travel', () => {
  for (const reverse of [false, true]) {
    const base = getTidalLayout(390, 430, reverse);
    const source = { ...base.source, cy: reverse ? 170 : 295, size: 98 };
    const target = { ...base.target, cy: reverse ? 295 : 170, size: 148 };
    const layout = getBattleTidalLayout(source, target, base);
    const sx = source.cx + layout.direction * source.size * .22, sy = source.cy - source.size * .06;
    const angle = Math.atan2(target.cy - sy, target.cx - sx);
    const early = render(clock('lion:1', 100, null), layout).filter(([tile]) => tile < 4);
    const late = render(clock('lion:1', 280, null), layout).filter(([tile]) => tile < 4);
    assert.ok(early.length && late.length > early.length);
    assert.ok((late[0][1] - early[0][1]) * layout.direction > 0);
    for (const [, x, , w, h, rotation] of [...early, ...late]) {
      assert.ok((x - sx) * layout.direction >= 0);
      assert.ok(w < h);
      assert.equal(rotation, angle);
    }
    assert.ok(render(clock('lion:0', 200, null), layout).every(([tile]) => tile === 7), 'a pounce winds up at the caster, not on the victim');
  }
});

test('solar mastery grows without overflowing the shared pool or clipping the eclipse corona', () => {
  for (const id of ['lion:0', 'lion:1', 'lion:2', 'lion:3']) {
    for (const reverse of [false, true]) for (const [w, h] of [[320, 260], [390, 450], [667, 200], [1280, 700]]) {
      const layout = getTidalLayout(w, h, reverse);
      for (const lvl of [1, 3, 5]) for (let age = 0; age <= 500; age += 4) {
        for (const outcome of [null, 'hit']) {
          const calls = render(clock(id, age, outcome, lvl), layout);
          assert.ok(calls.length <= 22, `${id}: ${calls.length} sprites`);
          if (id === 'lion:3') for (const [tile, x, y, width, height] of calls) {
            if (tile >= 4) continue;
            assert.ok(x - width * .45 >= 0 && x + width * .45 <= w);
            assert.ok(y - height * .45 >= 0 && y + height * .45 <= h);
          }
        }
      }
    }
  }
  const arena = getTidalLayout(390, 430);
  const small = render(clock('lion:0', 100, 'hit', 1), arena).find(([tile]) => tile < 4);
  const mastered = render(clock('lion:0', 100, 'hit', 5), arena).find(([tile]) => tile < 4);
  assert.ok(mastered[3] > small[3]);
});

test('ice claws land on three staggered beats and all ice debris waits for real contact', () => {
  const layout = getTidalLayout(390, 430);
  for (const [age, cuts] of [[0, 1], [29, 2], [58, 3]]) {
    const forms = render(clock('tiger:2', age), layout).filter(([tile]) => tile < 4);
    assert.equal(forms.length, cuts * 2);
    assert.ok(forms.every(([, x]) => x < layout.target.cx));
  }
  for (const id of ['tiger:0', 'tiger:1', 'tiger:2', 'tiger:3']) {
    for (const reverse of [false, true]) for (const [w, h] of [[320, 260], [390, 450], [667, 200], [1280, 700]]) {
      const arena = getTidalLayout(w, h, reverse);
      for (let age = 0; age <= 500; age += 4) {
        for (const outcome of [null, 'hit']) {
          const calls = render(clock(id, age, outcome), arena);
          assert.ok(calls.length <= 23, `${id}: ${calls.length} sprites`);
          if (!outcome) assert.ok(calls.every(([tile]) => tile !== 4 && tile !== 6));
        }
      }
    }
  }
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

test('fire meteors land individually on confirmed contact, rather than teleporting the whole formation', () => {
  const layout = getTidalLayout(390, 430);
  for (const id of ['fire:3', 'monster:fire_rain']) {
    const impacts = age => render(clock(id, age), layout).filter(([tile]) => tile === 6);
    const rocks = age => render(clock(id, age, null), layout).filter(([tile, , , , , , alpha]) => tile < 4 && alpha > .001);
    assert.ok(rocks(100).length <= 2, 'only the leading rock has launched');
    assert.ok(rocks(280)[0][2] > rocks(100)[0][2], 'the leading rock actually falls');
    assert.equal(impacts(0).length, 1);
    assert.equal(impacts(91).length, 1);
    assert.equal(impacts(92).length, 2);
    const landingXs = [0, 92, 184, 276, 368].map(age => impacts(age).at(-1)[1]);
    assert.equal(new Set(landingXs).size, 5, 'successive impacts have distinct positions');
    assert.equal(impacts(499).length, 1, 'only the final embers remain before cleanup');
    assert.ok(!render(clock(id, 2000, null), layout).some(([tile]) => tile === 6), 'a delayed hit cannot trigger an early impact');
  }
});

test('meteor mastery adds visual landings, while glow stays local and the final hit remains bright', () => {
  for (const reverse of [false, true]) {
    const layout = getTidalLayout(320, 360, reverse);
    for (const [lvl, count] of [[1, 3], [3, 4], [5, 5]]) {
      const calls = render(clock('fire:3', (count - 1) * 92, 'hit', lvl), layout);
      const last = calls.filter(([tile]) => tile === 6).at(-1);
      assert.equal(last[6], .92, 'late strikes must not inherit the first strike fade');
      for (const [tile, x, , w, h] of calls.filter(([tile]) => tile === 7)) {
        assert.equal(tile, 7);
        assert.ok(w < layout.width * .55 && h < layout.height * .55);
        assert.ok(Math.abs(x - layout.target.cx) < layout.width * .3);
      }
      assert.equal(render(clock('fire:3', 500, 'hit', lvl), layout).length, 0);
    }
  }
  assert.equal(getSkillChoreography('monster:golumn_crash').pigment, 'stone');
  assert.equal(getSignatureArt('fire:2'), 'eruption');
});

test('dense meteor timeline stays within the existing pool on small, landscape and large arenas', () => {
  for (const [width, height] of [[320, 260], [390, 464], [667, 200], [1280, 700]]) {
    for (const reverse of [false, true]) for (const lvl of [1, 3, 5]) {
      const layout = getTidalLayout(width, height, reverse);
      for (let age = 0; age < 500; age += 4) {
        const calls = render(clock('fire:3', age, 'hit', lvl), layout);
        assert.ok(calls.length <= 20, `meteor pool: ${calls.length}`);
        for (const [, x, y, w, h, , alpha] of calls) {
          assert.ok([x, y, w, h, alpha].every(Number.isFinite));
          assert.ok(w <= width && h <= height && alpha >= 0 && alpha <= 1);
        }
      }
    }
  }
});
