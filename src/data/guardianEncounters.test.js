import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUARDIAN_ENCOUNTERS, getGuardianBackground, getGuardianEncounter, getGuardianSkill } from './guardianEncounters.ts';
import { BOSS_IDS, MONSTER_CONFIGS } from './monsterConfigs.ts';
import { MONSTERS_BY_MTYPE, buildRoster } from '../utils/rosterBuilder.ts';
import { getEnemySkillEffect } from '../utils/skillPresentation.ts';
import { getSkillRecipe } from '../components/effects/skillRecipes.ts';
import { getSpriteAnimationAsset } from './spriteAnimationAssets.ts';
import en from '../i18n/locales/en-US.ts';
import zh from '../i18n/locales/zh-TW.ts';

test('four map guardians have distinct shipped backgrounds and reachable regional encounters', () => {
  assert.equal(Object.keys(GUARDIAN_ENCOUNTERS).length, 4);
  assert.equal(new Set(Object.values(GUARDIAN_ENCOUNTERS).map(e => e.background)).size, 4);
  assert.equal(MONSTER_CONFIGS[0].id, 'slime', 'preserve legacy index fallback');
  assert.equal(BOSS_IDS.size, 4, 'regional guardians do not replace campaign bosses');
  for (const [id, encounter] of Object.entries(GUARDIAN_ENCOUNTERS)) {
    assert.ok(MONSTERS_BY_MTYPE.get(encounter.region).includes(id));
    assert.ok(!BOSS_IDS.has(id));
    const config = MONSTER_CONFIGS.find(c => c.id === id);
    assert.equal(config.mType, encounter.region);
    const roster = buildRoster(() => 0, 'single', { singleWaves: [{ monsterId: id }], disableRandomSwap: true });
    assert.equal(roster[0].id, id);
    assert.ok(getSpriteAnimationAsset(roster[0].activeSpriteKey));
    assert.equal(getSpriteAnimationAsset(roster[0].activeSpriteKey).profile.flip, true,
      'normalize right-facing drawings so enemies attack toward the player');
    const bytes = readFileSync(new URL(`../../public${getGuardianBackground(id)}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

test('guardian skills unlock at levels 1, 4, 7 with named, distinct effect recipes', () => {
  for (const [id, encounter] of Object.entries(GUARDIAN_ENCOUNTERS)) {
    for (const [level, count] of [[1, 1], [3, 1], [4, 2], [6, 2], [7, 3], [20, 3]]) {
      const moves = Array.from({ length: 6 }, (_, turn) => getGuardianSkill(id, level, turn));
      assert.equal(new Set(moves.map(s => s.skillId)).size, count);
      moves.forEach((skill, turn) => {
        assert.equal(skill.slot, turn % count);
        const fx = getEnemySkillEffect({ id, lvl: level }, 1, false, turn);
        assert.equal(fx.skillId, skill.skillId);
        assert.equal(fx.type, encounter.region);
        assert.ok(getSkillRecipe(fx.skillId));
        assert.equal(en[`guardian.skill.${skill.skillId}`], skill.nameEn);
        assert.equal(zh[`guardian.skill.${skill.skillId}`], skill.name);
      });
    }
    const motions = encounter.skills.map((_, i) => getSkillRecipe(`${id}:${i}`).motion);
    assert.equal(new Set(motions).size, 3);
  }
  for (const id of ['slime', 'constructor', '__proto__', '', undefined]) {
    assert.equal(getGuardianSkill(id), undefined);
    assert.equal(getGuardianBackground(id), undefined);
    assert.equal(getGuardianEncounter(id), undefined);
  }
  for (const turn of [-1, NaN, Infinity]) assert.equal(getGuardianSkill('limit_knight', NaN, turn).slot, 0);
});

test('guardian animation sources retain all 32 unique registered drawings and reviewed anchors', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../scripts/guardian-art-sources.json', import.meta.url)));
  const registration = JSON.parse(readFileSync(new URL('../../public/sprites/visual-pilot/registration-guardians-v1.json', import.meta.url)));
  assert.equal(manifest.generator, 'Built-in image_gen');
  assert.deepEqual(manifest.sources.map(s => s.key).sort(), Object.keys(GUARDIAN_ENCOUNTERS).sort());
  for (const source of manifest.sources) {
    const record = registration.assets[source.output];
    assert.equal(new Set(record.frames.map(f => f.rgbaSha256)).size, 8);
    assert.deepEqual(record.frames.map(f => f.sourceFootX), source.anchors);
    assert.ok(source.prompt.length > 100);
  }
});
