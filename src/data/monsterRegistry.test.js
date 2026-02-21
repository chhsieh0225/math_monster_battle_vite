/**
 * Monster Registry Consistency Test
 *
 * Validates that every monster ID registered in monsterConfigs is
 * consistently present across ALL touchpoints in the codebase.
 *
 * When adding a new monster, this test will fail with a clear message
 * telling you exactly which registry is missing the new ID.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MONSTER_CONFIGS,
  SLIME_VARIANT_CONFIGS,
  EVOLVED_SLIME_VARIANT_CONFIGS,
  BOSS_IDS,
} from './monsterConfigs.ts';
import { MONSTERS, SLIME_VARIANTS, EVOLVED_SLIME_VARIANTS, SPRITE_MAP } from './monsters.ts';
import { DROP_TABLES } from './dropTables.ts';
import { ENC_ENTRIES } from './encyclopedia.ts';
import { BALANCE_CONFIG } from './balanceConfig.ts';
import {
  MONSTER_NAME_EN,
  MONSTER_DESC_EN,
  MONSTER_HABITAT_EN,
} from '../utils/contentLocalization.ts';

// ─── Source-of-truth ID sets ───────────────────────────────────

const monsterIds = MONSTER_CONFIGS.map((c) => c.id);
const slimeVariantIds = SLIME_VARIANT_CONFIGS.map((c) => c.id);
const evolvedSlimeVariantIds = EVOLVED_SLIME_VARIANT_CONFIGS.map((c) => c.id);

/** Evolved form IDs for configs that have evolvedSpriteKey (e.g. "fireEvolved") */
const evolvedFormIds = MONSTER_CONFIGS
  .filter((c) => c.evolvedSpriteKey)
  .map((c) => `${c.id}Evolved`);

/** Every encyclopedia key we expect to exist */
const allEncyclopediaKeys = new Set([
  ...slimeVariantIds,
  ...evolvedSlimeVariantIds,
  ...monsterIds.filter((id) => id !== 'slime'),
  ...evolvedFormIds,
]);

/** All IDs that should have EN localization */
const expectedNameKeys = new Set([
  ...monsterIds,
  ...slimeVariantIds,
  ...evolvedSlimeVariantIds,
  ...evolvedFormIds,
]);

// ─── 1. Unique IDs ─────────────────────────────────────────────

describe('Monster registry — unique IDs', () => {
  it('MONSTER_CONFIGS IDs are unique', () => {
    assert.equal(monsterIds.length, new Set(monsterIds).size);
  });

  it('SLIME_VARIANT_CONFIGS IDs are unique', () => {
    assert.equal(slimeVariantIds.length, new Set(slimeVariantIds).size);
  });

  it('EVOLVED_SLIME_VARIANT_CONFIGS IDs are unique', () => {
    assert.equal(evolvedSlimeVariantIds.length, new Set(evolvedSlimeVariantIds).size);
  });

  it('no ID collision between SLIME_VARIANT and EVOLVED_SLIME_VARIANT configs', () => {
    const overlap = slimeVariantIds.filter((id) => evolvedSlimeVariantIds.includes(id));
    assert.deepEqual(overlap, [], `ID collision: ${overlap.join(', ')}`);
  });
});

// ─── 2. Sprite coverage ────────────────────────────────────────

describe('Monster registry — sprite coverage', () => {
  it('every spriteKey in MONSTER_CONFIGS resolves to SPRITE_MAP', () => {
    const missing = MONSTER_CONFIGS
      .filter((c) => !(c.spriteKey in SPRITE_MAP))
      .map((c) => `${c.id} → spriteKey="${c.spriteKey}"`);
    assert.deepEqual(missing, [], `Missing sprites: ${missing.join(', ')}`);
  });

  it('every evolvedSpriteKey in MONSTER_CONFIGS resolves to SPRITE_MAP', () => {
    const missing = MONSTER_CONFIGS
      .filter((c) => c.evolvedSpriteKey && !(c.evolvedSpriteKey in SPRITE_MAP))
      .map((c) => `${c.id} → evolvedSpriteKey="${c.evolvedSpriteKey}"`);
    assert.deepEqual(missing, [], `Missing evolved sprites: ${missing.join(', ')}`);
  });

  it('every spriteKey in SLIME_VARIANT_CONFIGS resolves to SPRITE_MAP', () => {
    const missing = SLIME_VARIANT_CONFIGS
      .filter((c) => !(c.spriteKey in SPRITE_MAP))
      .map((c) => `${c.id} → spriteKey="${c.spriteKey}"`);
    assert.deepEqual(missing, [], `Missing sprites: ${missing.join(', ')}`);
  });

  it('every spriteKey in EVOLVED_SLIME_VARIANT_CONFIGS resolves to SPRITE_MAP', () => {
    const missing = EVOLVED_SLIME_VARIANT_CONFIGS
      .filter((c) => !(c.spriteKey in SPRITE_MAP))
      .map((c) => `${c.id} → spriteKey="${c.spriteKey}"`);
    assert.deepEqual(missing, [], `Missing sprites: ${missing.join(', ')}`);
  });
});

// ─── 3. Drop table coverage ───────────────────────────────────

describe('Monster registry — drop table coverage', () => {
  it('every dropTable in MONSTER_CONFIGS exists in DROP_TABLES', () => {
    const missing = MONSTER_CONFIGS
      .filter((c) => !DROP_TABLES[c.dropTable])
      .map((c) => `${c.id} → dropTable="${c.dropTable}"`);
    assert.deepEqual(missing, [], `Missing drop tables: ${missing.join(', ')}`);
  });

  it('every dropTable in SLIME_VARIANT_CONFIGS exists in DROP_TABLES', () => {
    const missing = SLIME_VARIANT_CONFIGS
      .filter((c) => !DROP_TABLES[c.dropTable])
      .map((c) => `${c.id} → dropTable="${c.dropTable}"`);
    assert.deepEqual(missing, [], `Missing drop tables: ${missing.join(', ')}`);
  });

  it('every dropTable in EVOLVED_SLIME_VARIANT_CONFIGS exists in DROP_TABLES', () => {
    const missing = EVOLVED_SLIME_VARIANT_CONFIGS
      .filter((c) => !DROP_TABLES[c.dropTable])
      .map((c) => `${c.id} → dropTable="${c.dropTable}"`);
    assert.deepEqual(missing, [], `Missing drop tables: ${missing.join(', ')}`);
  });
});

// ─── 4. Hydration integrity ───────────────────────────────────

describe('Monster registry — hydration', () => {
  it('MONSTERS length matches MONSTER_CONFIGS', () => {
    assert.equal(MONSTERS.length, MONSTER_CONFIGS.length);
  });

  it('SLIME_VARIANTS length matches SLIME_VARIANT_CONFIGS', () => {
    assert.equal(SLIME_VARIANTS.length, SLIME_VARIANT_CONFIGS.length);
  });

  it('EVOLVED_SLIME_VARIANTS length matches EVOLVED_SLIME_VARIANT_CONFIGS', () => {
    assert.equal(EVOLVED_SLIME_VARIANTS.length, EVOLVED_SLIME_VARIANT_CONFIGS.length);
  });

  it('every hydrated monster has a valid svgFn', () => {
    const invalid = MONSTERS.filter((m) => typeof m.svgFn !== 'function').map((m) => m.id);
    assert.deepEqual(invalid, [], `Monsters with invalid svgFn: ${invalid.join(', ')}`);
  });

  it('every hydrated monster with evolvedSvgFn has a valid function', () => {
    const invalid = MONSTERS
      .filter((m) => m.evolvedSvgFn !== undefined && typeof m.evolvedSvgFn !== 'function')
      .map((m) => m.id);
    assert.deepEqual(invalid, [], `Monsters with invalid evolvedSvgFn: ${invalid.join(', ')}`);
  });
});

// ─── 5. Encyclopedia coverage ─────────────────────────────────

describe('Monster registry — encyclopedia', () => {
  const encKeys = new Set(ENC_ENTRIES.map((e) => e.key));

  it('every expected monster has an encyclopedia entry', () => {
    const missing = [...allEncyclopediaKeys].filter((k) => !encKeys.has(k));
    assert.deepEqual(missing, [], `Missing encyclopedia entries: ${missing.join(', ')}`);
  });

  it('no encyclopedia entry references a nonexistent monster', () => {
    const validKeys = new Set([...allEncyclopediaKeys]);
    const orphan = ENC_ENTRIES.filter((e) => !validKeys.has(e.key)).map((e) => e.key);
    assert.deepEqual(orphan, [], `Orphaned encyclopedia entries: ${orphan.join(', ')}`);
  });

  it('every encyclopedia entry has desc, habitat, and rarity', () => {
    const incomplete = ENC_ENTRIES
      .filter((e) => !e.desc || !e.habitat || !e.rarity)
      .map((e) => `${e.key} (desc=${!!e.desc}, habitat=${!!e.habitat}, rarity=${!!e.rarity})`);
    assert.deepEqual(incomplete, [], `Incomplete encyclopedia entries: ${incomplete.join(', ')}`);
  });
});

// ─── 6. Balance config coverage ───────────────────────────────

describe('Monster registry — balance config', () => {
  it('every MONSTER_CONFIG has valid HP/ATK (> 0)', () => {
    const broken = MONSTER_CONFIGS.filter((c) => c.hp <= 0 || c.atk <= 0).map((c) => c.id);
    assert.deepEqual(broken, [], `Monsters with zero/negative stats: ${broken.join(', ')}`);
  });

  it('BOSS_IDS matches bossIds in balance config', () => {
    const configBossIds = new Set(BALANCE_CONFIG.monsters.bossIds);
    const missingInSet = BALANCE_CONFIG.monsters.bossIds.filter((id) => !BOSS_IDS.has(id));
    const extraInSet = [...BOSS_IDS].filter((id) => !configBossIds.has(id));
    assert.deepEqual(missingInSet, [], `Boss IDs in config but not in BOSS_IDS set`);
    assert.deepEqual(extraInSet, [], `Boss IDs in set but not in config`);
  });

  it('all boss IDs exist in MONSTER_CONFIGS', () => {
    const monsterIdSet = new Set(monsterIds);
    const missing = [...BOSS_IDS].filter((id) => !monsterIdSet.has(id));
    assert.deepEqual(missing, [], `Boss IDs not in MONSTER_CONFIGS: ${missing.join(', ')}`);
  });

  it('randomEncounterVariantsByBaseId references valid monster IDs', () => {
    const monsterIdSet = new Set(monsterIds);
    const variants = BALANCE_CONFIG.monsters.randomEncounterVariantsByBaseId;
    const invalid = [];
    for (const [baseId, variantIds] of Object.entries(variants)) {
      if (!monsterIdSet.has(baseId)) invalid.push(`base "${baseId}" not in configs`);
      for (const vid of variantIds) {
        if (!monsterIdSet.has(vid)) invalid.push(`variant "${vid}" (base="${baseId}") not in configs`);
      }
    }
    assert.deepEqual(invalid, [], `Invalid variant references: ${invalid.join(', ')}`);
  });

  it('slimeVariantMultipliersById covers all SLIME_VARIANT_CONFIGS', () => {
    const mults = BALANCE_CONFIG.monsters.slimeVariantMultipliersById;
    const missing = slimeVariantIds.filter((id) => !mults[id]);
    assert.deepEqual(missing, [], `Missing slime variant multipliers: ${missing.join(', ')}`);
  });

  it('evolvedSlimeVariantMultipliersById covers all EVOLVED_SLIME_VARIANT_CONFIGS', () => {
    const mults = BALANCE_CONFIG.monsters.evolvedSlimeVariantMultipliersById;
    const missing = evolvedSlimeVariantIds.filter((id) => !mults[id]);
    assert.deepEqual(missing, [], `Missing evolved slime variant multipliers: ${missing.join(', ')}`);
  });
});

// ─── 7. EN localization coverage ──────────────────────────────

describe('Monster registry — EN localization', () => {
  it('every monster/variant has an EN name', () => {
    const missing = [...expectedNameKeys].filter((k) => !MONSTER_NAME_EN[k]);
    assert.deepEqual(missing, [], `Missing EN names: ${missing.join(', ')}`);
  });

  it('every monster/variant has an EN description', () => {
    const missing = [...expectedNameKeys].filter((k) => !MONSTER_DESC_EN[k]);
    assert.deepEqual(missing, [], `Missing EN descriptions: ${missing.join(', ')}`);
  });

  it('every monster/variant has an EN habitat', () => {
    const missing = [...expectedNameKeys].filter((k) => !MONSTER_HABITAT_EN[k]);
    assert.deepEqual(missing, [], `Missing EN habitats: ${missing.join(', ')}`);
  });
});

// ─── 8. Evolved form consistency ──────────────────────────────

describe('Monster registry — evolved form consistency', () => {
  it('configs with evolvedSpriteKey also have evolvedName', () => {
    const broken = MONSTER_CONFIGS
      .filter((c) => c.evolvedSpriteKey && !c.evolvedName)
      .map((c) => c.id);
    assert.deepEqual(broken, [], `Missing evolvedName: ${broken.join(', ')}`);
  });

  it('configs with evolvedNameEn also have evolvedSpriteKey', () => {
    const broken = MONSTER_CONFIGS
      .filter((c) => c.evolvedNameEn && !c.evolvedSpriteKey)
      .map((c) => c.id);
    assert.deepEqual(broken, [], `evolvedNameEn without evolvedSpriteKey: ${broken.join(', ')}`);
  });

  it('non-slime configs with evolvedSpriteKey have complete EN evolved fields', () => {
    // Slime evolved forms use EVOLVED_SLIME_VARIANT_CONFIGS, not evolvedNameEn
    const incomplete = MONSTER_CONFIGS
      .filter((c) => c.id !== 'slime' && c.evolvedSpriteKey && (!c.evolvedNameEn || !c.evolvedDescEn || !c.evolvedHabitatEn))
      .map((c) => `${c.id} (nameEn=${!!c.evolvedNameEn}, descEn=${!!c.evolvedDescEn}, habitatEn=${!!c.evolvedHabitatEn})`);
    assert.deepEqual(incomplete, [], `Incomplete evolved EN fields: ${incomplete.join(', ')}`);
  });
});
