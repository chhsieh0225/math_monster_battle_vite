import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getSkillMastery, getSkillImpactSize, getEnemySkillEffect, getSkillActorKeys, getCharacterSkillId } from './skillPresentation.ts';
import { SkillStrikeEffect } from '../components/effects/SkillStrikeEffect.tsx';
import { CHARACTER_SKILL_RECIPES, getSkillRecipe } from '../components/effects/skillRecipes.ts';
import { PVP_SELECTABLE_ROSTER } from '../data/pvpRoster.ts';
import { MONSTER_CONFIGS, SLIME_VARIANT_CONFIGS, EVOLVED_SLIME_VARIANT_CONFIGS } from '../data/monsterConfigs.ts';

test('practice levels have three deterministic visual milestones and bounded sizes', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((lvl) => getSkillMastery(lvl).tier), [1, 1, 2, 2, 3, 3]);
  assert.deepEqual([1, 3, 5].map((lvl) => getSkillMastery(lvl).nextLevel), [3, 5, null]);
  for (const lvl of [NaN, Infinity, -10]) assert.equal(getSkillMastery(lvl).tier, 1);
  assert.equal(getSkillMastery(999).lvl, 6);
  assert.ok(getSkillImpactSize(5, 0) > getSkillImpactSize(1, 0));
  assert.equal(getSkillImpactSize(999, 999, true), getSkillImpactSize(6, 3, true));
});

test('enemy presentation uses its level and boss phase, without changing combat stats', () => {
  const weak = getEnemySkillEffect({ id: 'slime', mType: 'water', lvl: 1 });
  const strong = getEnemySkillEffect({ id: 'slime', mType: 'water', lvl: 16 });
  assert.ok(strong.lvl > weak.lvl);
  assert.equal(weak.signature, undefined);
  for (const id of ['boss', 'boss_hydra', 'boss_crazy_dragon', 'boss_sword_god']) {
    const first = getEnemySkillEffect({ id, mType: 'dark' }, 1);
    const final = getEnemySkillEffect({ id, mType: 'dark' }, 3, true);
    assert.equal(final.idx, 3);
    assert.equal(final.signature, id);
    assert.ok(final.lvl > first.lvl);
    if (id === 'boss_sword_god') assert.equal(final.type, 'steel');
  }
});

test('effect routing preserves physical main/sub identities for both attack directions', () => {
  for (const sourceSlot of ['main', 'sub']) for (const targetSlot of ['main', 'sub']) {
    const incoming = getSkillActorKeys({ targetSide: 'player', sourceSlot, targetSlot });
    assert.equal(incoming.source, sourceSlot === 'sub' ? 'enemySub' : 'enemyMain');
    assert.equal(incoming.target, targetSlot === 'sub' ? 'playerSub' : 'playerMain');
    const outgoing = getSkillActorKeys({ targetSide: 'enemy', sourceSlot });
    assert.equal(outgoing.source, sourceSlot === 'sub' ? 'playerSub' : 'playerMain');
    assert.equal(outgoing.target, 'enemyMain');
  }
});

const target = (x, y) => ({ cx: x, cy: y, top: `${y}px`, right: `${390 - x}px`, flyRight: 0, flyTop: 0 });
const render = (effect, lowPerf = false, props = {}) => renderToStaticMarkup(createElement(SkillStrikeEffect, {
  effect: { type: 'fire', idx: 0, lvl: 1, ...effect }, source: target(75, 300), target: target(290, 180),
  arena: { width: 390, height: 464 }, lowPerf, ...props,
}));

test('launch has no contact, miss has no explosion, and blocked is a shield only', () => {
  assert.ok(!render({}).includes('class="skill-contact"'));
  assert.equal(render({ impact: { outcome: 'miss', at: 0 } }), '');
  const blocked = render({ impact: { outcome: 'blocked', at: 0 } });
  assert.match(blocked, /class="skill-block"/);
  assert.ok(!blocked.includes('skill-shard'));
  assert.ok(!blocked.includes('skill-crest'));
});

test('all eight elements have distinct silhouettes and bounded markup at extreme levels', () => {
  const shapes = new Set();
  for (const type of ['fire', 'water', 'grass', 'electric', 'dark', 'light', 'steel', 'ice']) {
    const html = render({ type, lvl: 999, idx: 3, signature: 'boss', impact: { outcome: 'hit', at: 1 } });
    assert.match(html, /data-source="75,300" data-target="290,180"/);
    assert.match(html, /viewBox="0 0 390 464"/);
    assert.ok((html.match(/<(?:svg|g|circle|path)\b/g) || []).length < 48);
    assert.ok(!html.includes('feTurbulence'));
    assert.ok(!html.includes('NaN'));
    shapes.add(html.match(/class="skill-stream-body" d="([^"]+)"/)[1]);
  }
  assert.equal(shapes.size, 8);
  const lite = render({ lvl: 6, idx: 3, impact: { outcome: 'hit', at: 1 } }, true);
  assert.ok(!lite.includes('skill-shard'));
  assert.ok(!lite.includes('skill-seal'));
  assert.ok((lite.match(/<(?:svg|g|circle|path)\b/g) || []).length <= 12);
});

test('mastery adds chained trails and a finisher sigil without inventing extra hits', () => {
  const impact = { outcome: 'hit', at: 1 };
  const first = render({ lvl: 1, impact });
  const final = render({ lvl: 5, impact });
  assert.equal((first.match(/class="skill-stream-body"/g) || []).length, 1);
  assert.equal((final.match(/class="skill-stream-body"/g) || []).length, 3);
  assert.ok(!first.includes('skill-seal'));
  assert.ok(final.includes('skill-seal'));
  assert.equal((final.match(/class="skill-contact"/g) || []).length, 1);
});

test('every playable catalog slot has its own silhouette, including the four PvP bosses', () => {
  const marks = new Set();
  assert.deepEqual(Object.keys(CHARACTER_SKILL_RECIPES).sort(), PVP_SELECTABLE_ROSTER.map(s => s.id).sort());
  for (const actor of PVP_SELECTABLE_ROSTER) {
    assert.equal(actor.moves.length, 4);
    const motions = new Set();
    actor.moves.forEach((move, idx) => {
      const skillId = getCharacterSkillId(actor.id, idx);
      const recipe = getSkillRecipe(skillId);
      assert.ok(recipe, `${actor.id} / ${move.name}`);
      assert.ok(!marks.has(recipe.mark), `duplicate silhouette: ${skillId}`);
      marks.add(recipe.mark);
      motions.add(recipe.motion);
      for (const lvl of [1, 3, 5]) for (const low of [false, true]) {
        const effect = { type: move.type, skillId, idx, lvl, impact: { outcome: 'hit', at: 1 } };
        const html = render(effect, low);
        assert.ok(html.includes(`data-skill-id="${skillId}"`));
        assert.ok(html.includes(`data-skill-motion="${recipe.motion}"`));
        assert.ok(html.includes(`data-choreography="${recipe.motion}:${recipe.motif}"`), 'the named mechanism survives low quality');
        assert.equal((html.match(/class="skill-contact(?: |")/g) || []).length, 1);
        assert.ok((html.match(/<[a-zA-Z]/g) || []).length <= (low ? 36 : 64), skillId);
        assert.equal(render({ ...effect, impact: { outcome: 'miss', at: 2 } }, low), '');
        assert.ok(!render({ ...effect, impact: { outcome: 'blocked', at: 2 } }, low).includes('data-choreography'));
      }
    });
    assert.ok(motions.size >= 2, `${actor.id} needs more than one choreography`);
  }
  assert.equal(marks.size, 44);
});

test('all monster forms and wild starters resolve a recipe; boss releases differ from normal attacks', () => {
  for (const monster of [...MONSTER_CONFIGS, ...SLIME_VARIANT_CONFIGS, ...EVOLVED_SLIME_VARIANT_CONFIGS]) {
    for (const phase of [1, 2, 3]) {
      const normal = getEnemySkillEffect(monster, phase);
      assert.ok(getSkillRecipe(normal.skillId), monster.id);
      if (normal.signature) {
        const release = getEnemySkillEffect(monster, phase, true);
        assert.notEqual(getSkillRecipe(normal.skillId).mark, getSkillRecipe(release.skillId).mark);
        assert.equal(release.skillId, `${monster.id}:3`);
      }
    }
  }
  for (const id of ['fire', 'water', 'grass', 'electric', 'lion', 'wolf', 'tiger']) {
    for (const lvl of [1, 8]) {
      const effect = getEnemySkillEffect({ id: `wild_starter_${id}`, lvl });
      assert.equal(effect.skillId, `${id}:${lvl < 6 ? 0 : 1}`);
      assert.ok(getSkillRecipe(effect.skillId));
    }
  }
});

test('unknown or malformed skill identities safely retain the elemental fallback', () => {
  for (const id of [undefined, 'future:0', 'wolf:', 'wolf:-1', 'wolf:4', 'wolf:NaN', 'wolf:1:extra', 'monster:toString']) {
    assert.equal(getSkillRecipe(id), undefined);
    assert.ok(!render({ skillId: id }).includes('data-skill-id='));
  }
  for (const idx of [-1, 4, NaN, .5]) assert.equal(getCharacterSkillId('wolf', idx), undefined);
});

test('boss contacts fit small partners and clip both HUD corners without weakening the recipe', () => {
  const effect = { skillId: 'boss_hydra:3', lvl: 6, idx: 3, signature: 'boss_hydra', impact: { outcome: 'hit', at: 1 } };
  const props = { target: { ...target(208, 331), size: 44 }, arena: {
    width: 390, height: 464, enemyHudRight: 210, enemyHudBottom: 110, playerHudLeft: 180, playerHudInset: 100,
  } };
  for (const lite of [false, true]) {
    const html = render(effect, lite, props);
    assert.ok(Math.abs(Number(html.match(/data-impact-radius="([^"]+)"/)[1]) - 30.8) < .001);
    assert.match(html, /clip-path="url\(#skill-[^)]+-arena\)"/);
    assert.match(html, /M0 0H390V464H0Z M0 0H210V110H0Z M180 364H390V464H180Z/);
    assert.match(html, /clip-rule="evenodd"/);
    assert.match(html, /data-choreography="field:serpent"/);
  }
  const full = render(effect, false, { target: { ...target(208, 230), size: 250 } });
  assert.match(full, /data-impact-radius="107"/);
});

test('named launches retain real mechanisms at low detail instead of shared route lines', () => {
  for (const actor of PVP_SELECTABLE_ROSTER) for (let idx = 0; idx < 4; idx++) {
    const skillId = `${actor.id}:${idx}`;
    for (const low of [false, true]) {
      const html = render({ skillId, idx, lvl: 6 }, low);
      assert.match(html, /data-choreography=/, skillId);
      assert.ok(!html.includes('skill-route') && !html.includes('skill-stream'), skillId);
      assert.ok(!html.includes('skill-contact'), 'launch must not create a damage contact');
      assert.ok((html.match(/<[a-zA-Z]/g) || []).length <= (low ? 36 : 64), skillId);
      assert.ok(!html.includes('NaN') && !html.includes('feGaussianBlur'), skillId);
    }
  }
});

test('skill names select tidal walls, lightning, nine heads, parallel cuts and divine sword rain', () => {
  const hit = (skillId, idx, low = false) => render({ skillId, idx, lvl: 1, impact: { outcome: 'hit', at: 1 } }, low);
  const count = (html, token) => html.split(token).length - 1;
  assert.equal(count(hit('water:2', 2), 'class="sc-surge"'), 3);
  assert.match(hit('water:3', 3), /sc-vortex-collapse/);
  assert.match(hit('electric:1', 1), /sc-thunder/);
  assert.match(hit('electric:3', 3), /sc-chain/);
  assert.equal(count(hit('boss_hydra:2', 2), 'class="sc-serpent"'), 9);
  assert.equal(count(hit('boss_hydra:2', 2, true), 'class="sc-serpent"'), 3);
  assert.match(hit('boss_hydra:2', 2, true), /rotate\(120\)/);
  assert.match(hit('boss_hydra:2', 2, true), /rotate\(240\)/);
  assert.equal(count(hit('wolf:1', 1), 'rotate(-18)'), 2);
  assert.match(hit('wolf:2', 2), /rotate\(66\)/);
  assert.match(hit('lion:3', 3), /sc-eclipse-release/);
  assert.match(hit('tiger:1', 1), /data-choreography="orbit:mirror"/);
  assert.equal(count(hit('boss_sword_god:3', 3), 'class="sc-fall-strike"'), 3);
  assert.match(hit('boss_sword_god:2', 2), /class="sc-rift"/);
});

test('practice increases bounded geometry while PvP and low detail keep the essential mechanism', () => {
  const count = html => html.split('class="sc-fall-strike"').length - 1;
  const effect = { skillId: 'boss_sword_god:3', idx: 3, impact: { outcome: 'hit', at: 1 } };
  assert.deepEqual([1, 3, 5].map(lvl => count(render({ ...effect, lvl }))), [3, 4, 5]);
  assert.equal(count(render({ ...effect, lvl: 999 }, true)), 1);
  const source = target(310, 170), victim = { ...target(140, 350), size: 100 };
  const html = render({ skillId: 'water:2', idx: 2 }, true, { source, target: victim });
  assert.match(html, /--skill-dx:-170px;--skill-dy:180px/);
  assert.match(html, /data-source="310,170" data-target="140,350"/);
});
