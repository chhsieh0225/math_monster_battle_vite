import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ENEMY_SKILLS, BOSS_SKILLS, getEnemySkill, createEnemySkillState, canDisruptEnemySkill, resolveEnemySkillImpact, enemySkillNameKey } from './enemySkills.ts';
import { MONSTER_CONFIGS, SLIME_VARIANT_CONFIGS, EVOLVED_SLIME_VARIANT_CONFIGS, BOSS_IDS } from './monsterConfigs.ts';
import { getGuardianEncounter } from './guardianEncounters.ts';
import { getSkillRecipe } from '../components/effects/skillRecipes.ts';
import { SkillStrikeEffect } from '../components/effects/SkillStrikeEffect.tsx';
import { getEnemySkillEffect } from '../utils/skillPresentation.ts';
import zh from '../i18n/locales/zh-TW.ts';
import en from '../i18n/locales/en-US.ts';
import { PVP_SELECTABLE_ROSTER } from './pvpRoster.ts';

test('every ordinary catalog form has a signature; evolved and elite forms get a distinct second skill', () => {
  const elites = new Set(['dragon', 'golumn', 'golumn_mud', 'candy_knight']);
  for (const enemy of [...MONSTER_CONFIGS, ...SLIME_VARIANT_CONFIGS, ...EVOLVED_SLIME_VARIANT_CONFIGS]) {
    if (BOSS_IDS.has(enemy.id) || getGuardianEncounter(enemy.id)) continue;
    assert.equal(getEnemySkill(enemy, 0).kind, 'basic');
    const signature = getEnemySkill(enemy, 1);
    assert.notEqual(signature.kind, 'basic', enemy.id);
    assert.ok(getSkillRecipe(signature.skillId), enemy.id);
    const expanded = enemy.id.endsWith('Evolved') || elites.has(enemy.id);
    assert.equal(getEnemySkill(enemy, 3).skillId !== signature.skillId, expanded, enemy.id);
    if (enemy.evolvedSpriteKey) assert.notEqual(getEnemySkill({ ...enemy, isEvolved: true }, 3).skillId, signature.skillId);
  }
  for (const id of ['fire', 'water', 'grass', 'electric', 'lion', 'wolf', 'tiger']) {
    const enemy = { id: `wild_starter_${id}` };
    assert.equal(getEnemySkill(enemy, 1).skillId, `${id}:0`);
    assert.equal(getEnemySkill({ ...enemy, isEvolved: true }, 3).skillId, `${id}:1`);
  }
});

test('telegraph, localized names and FX remain bound for all skills and quality levels', () => {
  const source = { cx: 300, cy: 150, top: '150px', right: '90px', flyTop: 0, flyRight: 0 };
  const target = { ...source, cx: 70, cy: 310 };
  for (const skill of [...Object.values(ENEMY_SKILLS).flat(), ...Object.values(BOSS_SKILLS).flat()]) {
    const recipe = getSkillRecipe(skill.skillId);
    assert.ok(recipe, skill.skillId);
    assert.equal(zh[enemySkillNameKey(skill)], skill.name);
    assert.equal(en[enemySkillNameKey(skill)], skill.nameEn);
    for (const lowPerf of [true, false]) for (const hit of [false, true]) {
      const html = renderToStaticMarkup(createElement(SkillStrikeEffect, {
        effect: { ...getEnemySkillEffect({ id: 'fire', lvl: 16 }, 1, false, 0, skill),
          sourceSlot: 'sub', targetSlot: 'sub', targetSide: 'player', flightMs: 500,
          impact: hit ? { outcome: 'hit', at: 1 } : undefined },
        source, target, arena: { width: 390, height: 460 }, lowPerf,
      }));
      assert.ok(html.includes(`data-choreography="${recipe.motion}:${recipe.motif}"`), skill.skillId);
      assert.ok(!html.includes('NaN') && !html.includes('skill-stream-body'));
      assert.ok((html.match(/<(?:svg|g|circle|path)\b/g) || []).length < 110, skill.skillId);
    }
  }
  for (const boss of PVP_SELECTABLE_ROSTER.filter(actor => BOSS_IDS.has(actor.id))) {
    assert.equal(getEnemySkill(boss).name, boss.moves[2].name);
    assert.equal(getEnemySkill(boss, 0, true).name, boss.moves[3].name);
  }
});

test('only an eligible selected move can disrupt a prepared skill, never a basic or boss action', () => {
  const enemy = { id: 'fire' }, ready = { turn: 1, disrupted: false };
  assert.equal(canDisruptEnemySkill(enemy, ready, 0, .6), true);
  assert.equal(canDisruptEnemySkill(enemy, ready, 2, 1.5), true);
  assert.equal(canDisruptEnemySkill(enemy, ready, 2, 1), false);
  assert.equal(canDisruptEnemySkill(enemy, { ...ready, disrupted: true }, 0, 1), false);
  assert.equal(canDisruptEnemySkill(enemy, { ...ready, turn: 0 }, 0, 1), false);
  assert.equal(canDisruptEnemySkill(enemy, ready, 0, 1, 'pvp'), false);
  assert.equal(canDisruptEnemySkill({ id: 'boss' }, ready, 0, 1), false);
  assert.equal(getEnemySkill(enemy, Infinity).kind, 'basic');
  const first = createEnemySkillState(), second = createEnemySkillState();
  first.main.turn++;
  assert.equal(first.sub.turn, 0);
  assert.equal(second.main.turn, 0);
});

test('skill damage has a bounded budget and healing uses actual damage with no overheal or resurrection', () => {
  for (const skills of Object.values(ENEMY_SKILLS)) for (const action of skills) {
    const normal = resolveEnemySkillImpact(action, false, 100, 1000, 50, 100);
    const disrupted = resolveEnemySkillImpact(action, true, 100, 1000, 50, 100);
    assert.ok(normal.damage <= 120 && normal.damage >= 85);
    assert.ok(disrupted.damage < normal.damage);
    assert.equal(disrupted.heal, 0);
    assert.ok(normal.heal <= 4);
  }
  const drain = getEnemySkill({ id: 'ghost' }, 1);
  assert.equal(resolveEnemySkillImpact(drain, false, 100, 2, 50, 100).heal, 1);
  assert.equal(resolveEnemySkillImpact(drain, false, 100, 100, 99, 100).heal, 1);
  assert.equal(resolveEnemySkillImpact(drain, false, 0, 100, 50, 100).heal, 0);
  assert.equal(resolveEnemySkillImpact(drain, false, 100, 100, 0, 100).heal, 0);
});
