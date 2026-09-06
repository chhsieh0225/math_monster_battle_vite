import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getSkillMastery, getSkillImpactSize, getEnemySkillEffect, getSkillActorKeys } from './skillPresentation.ts';
import { SkillStrikeEffect } from '../components/effects/SkillStrikeEffect.tsx';

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
const render = (effect, lowPerf = false) => renderToStaticMarkup(createElement(SkillStrikeEffect, {
  effect: { type: 'fire', idx: 0, lvl: 1, ...effect }, source: target(75, 300), target: target(290, 180),
  arena: { width: 390, height: 464 }, lowPerf,
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
