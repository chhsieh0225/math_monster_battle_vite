import assert from 'node:assert/strict';
import test from 'node:test';

import { DROP_TABLES } from './dropTables.js';
import {
  EVOLVED_SLIME_VARIANT_CONFIGS,
  MONSTER_CONFIGS,
  SLIME_VARIANT_CONFIGS,
} from './monsterConfigs.js';
import { SKILL_SETS } from './skillSets.js';
import {
  DOUBLE_STAGE_WAVES,
  STAGE_SCALE_BASE,
  STAGE_SCALE_STEP,
  STAGE_WAVES,
} from './stageConfigs.js';

test('stage config references valid monster ids', () => {
  const knownIds = new Set(MONSTER_CONFIGS.map(mon => mon.id));
  const knownTypes = new Set([
    "grass", "fire", "water", "electric", "ghost", "steel", "dark",
  ]);
  const knownSceneTypes = new Set(["grass", "fire", "ghost", "steel", "dark"]);
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

test('skill sets have required structure for all starters', () => {
  const starterIds = ["fire", "water", "grass", "electric", "lion"];
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
