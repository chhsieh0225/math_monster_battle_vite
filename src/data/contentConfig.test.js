import assert from 'node:assert/strict';
import test from 'node:test';

import { DROP_TABLES, WEIGHTED_DROP_TABLES } from './dropTables.ts';
import {
  BOSS_ID_LIST,
  BOSS_SCENE_BY_ID,
  EVOLVED_SLIME_VARIANT_CONFIGS,
  MONSTER_CONFIGS,
  RANDOM_ENCOUNTER_VARIANTS_BY_BASE_ID,
  SLIME_VARIANT_CONFIGS,
} from './monsterConfigs.ts';
import { SKILL_SETS } from './skillSets.ts';
import { STARTERS } from './starters.ts';
import {
  DOUBLE_STAGE_WAVES,
  STAGE_SCALE_BASE,
  STAGE_SCALE_STEP,
  STAGE_WAVES,
} from './stageConfigs.ts';
import { BALANCE_CONFIG } from './balanceConfig.ts';
import { SPRITE_MAP } from './monsters.ts';
import { ENC_ENTRIES } from './encyclopedia.ts';
import {
  MONSTER_NAME_EN,
  MONSTER_DESC_EN,
  MONSTER_HABITAT_EN,
} from '../utils/contentLocalization.ts';

test('stage config references valid monster ids', () => {
  const knownIds = new Set(MONSTER_CONFIGS.map(mon => mon.id));
  const knownTypes = new Set([
    "grass", "fire", "water", "ice", "electric", "ghost", "steel", "dark",
  ]);
  const knownSceneTypes = new Set(["grass", "fire", "water", "electric", "ghost", "steel", "dark", "rock", "poison", "light", "heaven", "burnt_warplace", "candy"]);
  assert.ok(STAGE_SCALE_BASE > 0);
  assert.ok(STAGE_SCALE_STEP > 0);
  assert.ok(STAGE_WAVES.length > 0);
  assert.ok(DOUBLE_STAGE_WAVES.length > 0);
  assert.equal(DOUBLE_STAGE_WAVES.length % 2, 0, "double waves should be paired");

  for (const wave of STAGE_WAVES) {
    assert.ok(knownIds.has(wave.monsterId), `unknown monsterId: ${wave.monsterId}`);
  }

  for (const wave of DOUBLE_STAGE_WAVES) {
    assert.ok(knownIds.has(wave.monsterId), `unknown double monsterId: ${wave.monsterId}`);
    if (wave.slimeType) {
      assert.ok(knownTypes.has(wave.slimeType), `unknown slimeType: ${wave.slimeType}`);
    }
    if (wave.sceneType) {
      assert.ok(knownSceneTypes.has(wave.sceneType), `unknown sceneType: ${wave.sceneType}`);
    }
  }
});

test('boss and random encounter config map only to valid monster ids', () => {
  const knownIds = new Set(MONSTER_CONFIGS.map(mon => mon.id));

  for (const bossId of BOSS_ID_LIST) {
    assert.ok(knownIds.has(bossId), `unknown boss id: ${bossId}`);
    assert.equal(typeof BOSS_SCENE_BY_ID[bossId], 'string', `missing boss scene for id: ${bossId}`);
  }

  for (const [baseId, variants] of Object.entries(RANDOM_ENCOUNTER_VARIANTS_BY_BASE_ID)) {
    assert.ok(knownIds.has(baseId), `unknown random-encounter base id: ${baseId}`);
    assert.ok(Array.isArray(variants) && variants.length > 0, `empty variants for base id: ${baseId}`);
    for (const variantId of variants) {
      assert.ok(knownIds.has(variantId), `unknown random-encounter variant id: ${variantId}`);
    }
  }
});

test('all monster/variant configs point to existing drop tables', () => {
  const allConfigs = [
    ...MONSTER_CONFIGS,
    ...SLIME_VARIANT_CONFIGS,
    ...EVOLVED_SLIME_VARIANT_CONFIGS,
  ];
  for (const cfg of allConfigs) {
    const table = DROP_TABLES[cfg.dropTable];
    assert.ok(Array.isArray(table), `missing drop table: ${cfg.dropTable}`);
    assert.ok(table.length > 0, `empty drop table: ${cfg.dropTable}`);
  }
});

test('weighted drop tables cover every configured drop table with valid weights', () => {
  for (const [tableKey, basePool] of Object.entries(DROP_TABLES)) {
    const weighted = WEIGHTED_DROP_TABLES[tableKey];
    assert.ok(weighted, `missing weighted drop table: ${tableKey}`);
    assert.ok(Array.isArray(weighted.entries), `weighted table entries missing: ${tableKey}`);
    assert.ok(weighted.entries.length > 0, `weighted table empty: ${tableKey}`);
    const weightedEmojiSet = new Set(weighted.entries.map((entry) => entry.emoji));
    for (const emoji of basePool) {
      assert.ok(weightedEmojiSet.has(emoji), `weighted table ${tableKey} missing emoji: ${emoji}`);
    }
    for (const entry of weighted.entries) {
      assert.ok(entry.weight > 0, `invalid weight in ${tableKey}/${entry.emoji}`);
    }
  }
});

test('skill sets have required structure for all starters', () => {
  const starterIds = ["fire", "water", "grass", "tiger", "electric", "lion", "wolf"];
  for (const id of starterIds) {
    const moves = SKILL_SETS[id];
    assert.ok(Array.isArray(moves), `missing skill set for starter: ${id}`);
    assert.equal(moves.length, 4, `starter ${id} should have exactly 4 moves`);

    for (const move of moves) {
      assert.equal(typeof move.name, 'string');
      assert.equal(typeof move.icon, 'string');
      assert.equal(typeof move.type, 'string');
      assert.ok(Array.isArray(move.range), `${id}/${move.name} range should be array`);
      assert.ok(Array.isArray(move.ops), `${id}/${move.name} ops should be array`);
      assert.ok(move.basePower > 0, `${id}/${move.name} basePower should be positive`);
      assert.ok(move.growth > 0, `${id}/${move.name} growth should be positive`);
    }
  }
});

test('starter learning metadata has valid difficulty and grade ranges', () => {
  for (const starter of STARTERS) {
    assert.equal(typeof starter.difficulty, 'number', `missing difficulty for ${starter.id}`);
    assert.ok(starter.difficulty >= 1 && starter.difficulty <= 5, `invalid difficulty for ${starter.id}`);
    assert.ok(Array.isArray(starter.gradeRange), `missing gradeRange for ${starter.id}`);
    assert.equal(starter.gradeRange.length, 2, `invalid gradeRange length for ${starter.id}`);
    assert.ok(starter.gradeRange[0] >= 1, `invalid gradeRange start for ${starter.id}`);
    assert.ok(starter.gradeRange[1] >= starter.gradeRange[0], `invalid gradeRange ordering for ${starter.id}`);
  }
});

test('boss phase-3 burst multipliers stay within survivability guardrails', () => {
  assert.ok(BALANCE_CONFIG.traits.boss.phase3AttackMultiplier <= 1.8);
  assert.ok(BALANCE_CONFIG.traits.boss.releaseAttackScale <= 1.8);
});

test('campaign branch choices reference valid monster ids and event tags', () => {
  const knownIds = new Set(MONSTER_CONFIGS.map(mon => mon.id));
  const validEvents = new Set(['healing_spring', 'focus_surge', 'hazard_ambush']);
  const campaign = BALANCE_CONFIG.stage.campaign;

  assert.ok(Array.isArray(campaign.branchChoices));
  assert.ok(campaign.branchChoices.length > 0);

  for (const choice of campaign.branchChoices) {
    assert.ok(knownIds.has(choice.left.monsterId), `unknown campaign left monsterId: ${choice.left.monsterId}`);
    assert.ok(knownIds.has(choice.right.monsterId), `unknown campaign right monsterId: ${choice.right.monsterId}`);
  }

  assert.ok(Array.isArray(campaign.eventPool));
  for (const eventTag of campaign.eventPool) {
    assert.ok(validEvents.has(eventTag), `unknown campaign event tag: ${eventTag}`);
  }
});

test('all monster/variant spriteKeys exist in SPRITE_MAP', () => {
  const spriteKeys = new Set(Object.keys(SPRITE_MAP));
  const allConfigs = [
    ...MONSTER_CONFIGS,
    ...SLIME_VARIANT_CONFIGS,
    ...EVOLVED_SLIME_VARIANT_CONFIGS,
  ];
  for (const cfg of allConfigs) {
    assert.ok(
      spriteKeys.has(cfg.spriteKey),
      `spriteKey "${cfg.spriteKey}" (monster ${cfg.id}) not found in SPRITE_MAP`,
    );
  }
});

test('all encyclopedia entries have EN name, description, and habitat', () => {
  assert.ok(ENC_ENTRIES.length > 0, 'ENC_ENTRIES should not be empty');
  for (const entry of ENC_ENTRIES) {
    const key = entry.key;
    assert.ok(
      typeof MONSTER_NAME_EN[key] === 'string' && MONSTER_NAME_EN[key].length > 0,
      `missing MONSTER_NAME_EN for encyclopedia key: ${key}`,
    );
    assert.ok(
      typeof MONSTER_DESC_EN[key] === 'string' && MONSTER_DESC_EN[key].length > 0,
      `missing MONSTER_DESC_EN for encyclopedia key: ${key}`,
    );
    assert.ok(
      typeof MONSTER_HABITAT_EN[key] === 'string' && MONSTER_HABITAT_EN[key].length > 0,
      `missing MONSTER_HABITAT_EN for encyclopedia key: ${key}`,
    );
  }
});

test('DROP_TABLES and WEIGHTED_DROP_TABLES key sets are identical', () => {
  const dropKeys = new Set(Object.keys(DROP_TABLES));
  const weightedKeys = new Set(Object.keys(WEIGHTED_DROP_TABLES));
  for (const k of dropKeys) {
    assert.ok(weightedKeys.has(k), `WEIGHTED_DROP_TABLES missing key present in DROP_TABLES: ${k}`);
  }
  for (const k of weightedKeys) {
    assert.ok(dropKeys.has(k), `DROP_TABLES missing key present in WEIGHTED_DROP_TABLES: ${k}`);
  }
});
