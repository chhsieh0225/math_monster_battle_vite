import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { buildSaveSnapshot, writeSave, loadSave, hasSave, clearSave } from './savegame.ts';
import { buildRoster } from './rosterBuilder.ts';
import { STARTERS } from '../data/starters.ts';
import { MONSTERS, SLIME_VARIANTS, EVOLVED_SLIME_VARIANTS } from '../data/monsters.ts';
import { ENEMY_PERSONALITIES, applyEnemyPersonality } from '../data/enemyPersonalities.ts';
import { createInitialBattleState } from '../hooks/battle/battleReducer.ts';

let previousStorage;
beforeEach(() => {
  previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
});
afterEach(() => {
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
});

function snapshot(enemies = buildRoster(() => 0, 'double'), overrides = {}) {
  return buildSaveSnapshot({
    battleMode: 'double', timedMode: false, nextRound: 0,
    starter: STARTERS[0], allySub: STARTERS[1], coopActiveSlot: 'sub',
    battle: createInitialBattleState(), enemies, ...overrides,
  });
}

function roundTrip(enemies, overrides) {
  const save = snapshot(enemies, overrides);
  assert.equal(writeSave(save), true);
  assert.equal(hasSave(), true);
  const loaded = loadSave();
  assert.ok(loaded);
  return loaded;
}

test('save round-trip preserves generated single and double rosters', () => {
  for (const mode of ['single', 'double']) {
    for (const pick of [() => 0, (n) => n - 1, (n) => Math.floor(n / 2)]) {
      const enemies = buildRoster(pick, mode);
      const loaded = roundTrip(enemies, { battleMode: mode });
      enemies.forEach((enemy, i) => {
        const restored = loaded.enemies[i];
        assert.equal(restored.svgFn(), enemy.svgFn(), enemy.id);
        assert.ok(restored.svgFn().length > 0, enemy.id);
        assert.deepEqual(restored.personality, enemy.personality, enemy.id);
        for (const key of ['hp', 'maxHp', 'atk', 'activeSpriteKey']) {
          assert.equal(restored[key], enemy[key], `${enemy.id}.${key}`);
        }
      });
    }
  }
});

test('save loader supports every monster and slime variant without active sprite keys', () => {
  for (const monster of [...MONSTERS, ...SLIME_VARIANTS, ...EVOLVED_SLIME_VARIANTS]) {
    for (const evolved of monster.evolvedSvgFn ? [false, true] : [false]) {
      const svgFn = evolved ? monster.evolvedSvgFn : monster.svgFn;
      const enemy = { ...monster, lvl: 1, hp: 100, maxHp: 100, atk: 10, isEvolved: evolved, svgFn };
      const loaded = roundTrip([enemy]);
      assert.equal(loaded.enemies[0].svgFn(), svgFn(), `${monster.id} evolved=${evolved}`);
    }
  }
});

test('personality modifiers are restored with clamping but without scaling HP or ATK twice', () => {
  for (const personality of ENEMY_PERSONALITIES) {
    const enemy = applyEnemyPersonality({ ...MONSTERS[0], lvl: 1, hp: 73, maxHp: 150, atk: 33 }, personality);
    const restored = roundTrip([enemy]).enemies[0];
    assert.deepEqual(restored.personality, enemy.personality, personality.id);
    assert.deepEqual([restored.hp, restored.maxHp, restored.atk], [enemy.hp, enemy.maxHp, enemy.atk]);
  }
});

test('save round-trip preserves wild starter stages and complete move definitions', () => {
  for (const starter of STARTERS) {
    for (let stageIdx = 0; stageIdx < starter.stages.length; stageIdx += 1) {
      const enemy = {
        ...MONSTERS[0], id: `wild_starter_${starter.id}`, lvl: 1, maxHp: 100,
        selectedStageIdx: stageIdx, svgFn: starter.stages[stageIdx].svgFn,
      };
      const loaded = roundTrip([enemy], { starter: { ...starter, selectedStageIdx: stageIdx } });
      assert.equal(loaded.enemies[0].svgFn(), enemy.svgFn());
      assert.equal(loaded.starter.selectedStageIdx, stageIdx);
      starter.moves.forEach((move, i) => {
        for (const [key, value] of Object.entries(move)) assert.deepEqual(loaded.starter.moves[i][key], value, key);
      });
    }
  }
});

test('invalid saves are not advertised as resumable and do not crash or get erased', () => {
  const valid = snapshot();
  for (const invalid of [
    { version: 1 },
    { ...valid, version: 999 },
    { ...valid, enemies: null },
    { ...valid, enemies: [null] },
    { ...valid, battle: null },
    { ...valid, battleMode: ['double'] },
    { ...valid, battle: { ...valid.battle, mLvls: [] } },
    { ...valid, battle: { ...valid.battle, mHits: [0] } },
    { ...valid, enemies: [{ ...valid.enemies[0], atk: 'broken' }] },
    { ...valid, enemies: [{ ...valid.enemies[0], personalityId: 'missing' }] },
    { ...valid, nextRound: 999 },
    { ...valid, enemies: [{ ...valid.enemies[0], id: 'missing', activeSpriteKey: 'missing' }] },
  ]) {
    writeSave(invalid);
    const raw = localStorage.getItem('mathMonsterBattle_save');
    assert.equal(hasSave(), false);
    assert.equal(loadSave(), null);
    assert.equal(localStorage.getItem('mathMonsterBattle_save'), raw);
  }
  clearSave();
  assert.equal(hasSave(), false);
  assert.equal(loadSave(), null);
});
