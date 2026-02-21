import assert from 'node:assert/strict';
import test from 'node:test';

import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import { BOSS_ID_LIST } from '../data/monsterConfigs.ts';
import {
  DOUBLE_STAGE_WAVES,
  STAGE_RANDOM_SWAP_CANDIDATES,
  STAGE_RANDOM_SWAP_START_INDEX,
  STAGE_WAVES,
} from '../data/stageConfigs.ts';
import { buildRoster } from './rosterBuilder.ts';

const pickFirst = () => 0;
const pickSecond = (length) => (length > 1 ? 1 : 0);
const pickStarterMidStage = (length) => {
  if (length >= 100) return 0;
  if (length >= 8) return 4;
  if (length === 3) return 1;
  return length > 1 ? 1 : 0;
};

test('buildRoster creates stage roster with expected length and level sequence', () => {
  const roster = buildRoster(pickFirst, 'single');

  assert.equal(roster.length, STAGE_WAVES.length);
  assert.equal(roster[0].lvl, 1);
  assert.equal(roster[roster.length - 1].lvl, STAGE_WAVES.length);

  for (const mon of roster) {
    assert.ok(mon.hp > 0);
    assert.equal(mon.maxHp, mon.hp);
    assert.ok(mon.atk > 0);
  }
});

test('buildRoster uses config-driven random swap candidates', () => {
  if (STAGE_RANDOM_SWAP_CANDIDATES.length === 0) return;

  const roster = buildRoster(pickFirst, 'single');
  const forcedCandidate = STAGE_RANDOM_SWAP_CANDIDATES[0];
  const swapped = roster[STAGE_RANDOM_SWAP_START_INDEX];

  if (forcedCandidate.monsterId === 'golumn') {
    assert.equal(['golumn', 'golumn_mud'].includes(swapped.id), true);
    return;
  }
  assert.equal(swapped.id, forcedCandidate.monsterId);
});

test('buildRoster scene follows the spawned monster type', () => {
  const roster = buildRoster(pickFirst, 'double');

  assert.equal(roster.length, DOUBLE_STAGE_WAVES.length);

  DOUBLE_STAGE_WAVES.forEach((wave, idx) => {
    const mon = roster[idx];
    // One mid-game wave may be swapped by STAGE_RANDOM_SWAP_CANDIDATES.
    // Skip slot-level assertions if this slot no longer matches the source wave.
    const sourceIsSlime = wave.monsterId === 'slime';
    const currentIsSlime = String(mon.id || '').startsWith('slime');
    const replaced = sourceIsSlime
      ? !currentIsSlime
      : wave.monsterId !== mon.id;
    if (replaced) return;
    const expectedScene = wave.sceneType || BALANCE_CONFIG.monsters.bossSceneById[mon.id] || mon.mType;
    assert.equal(mon.sceneMType, expectedScene);
  });
});

test('buildRoster respects slime type preference in double mode', () => {
  const roster = buildRoster(pickFirst, 'double');

  DOUBLE_STAGE_WAVES.forEach((wave, idx) => {
    if (wave.monsterId !== 'slime' || !wave.slimeType) return;
    // Candidate swap can replace one slime slot with a non-slime monster.
    if (!String(roster[idx].id || '').startsWith('slime')) return;
    assert.equal(roster[idx].mType, wave.slimeType);
  });
});

test('buildRoster can roll ghost and golumn variant encounters', () => {
  const roster = buildRoster(pickSecond, 'single');
  const ghostVariants = roster.filter((mon) => mon.id === 'ghost' || mon.id === 'ghost_lantern');

  assert.equal(ghostVariants.length > 0, true);
  assert.equal(ghostVariants.some((mon) => mon.id === 'ghost_lantern'), true);
  assert.equal(roster.some((mon) => mon.id === 'golumn_mud'), true);
});

test('scene-only waves produce monsters whose mType matches the scene', () => {
  // Build with disableRandomSwap so we can assert against the original wave config.
  const roster = buildRoster(pickFirst, 'single', { disableRandomSwap: true });
  for (let i = 0; i < STAGE_WAVES.length; i++) {
    const wave = STAGE_WAVES[i];
    if (wave.monsterId) continue; // skip fixed-monsterId waves
    if (!wave.sceneType) continue;
    const mon = roster[i];
    const expectedMType = {
      fire: 'fire', ghost: 'ghost', candy: 'dream', rock: 'rock',
      grass: 'grass', steel: 'steel', water: 'water', electric: 'electric',
      dark: 'dark', poison: 'poison',
    }[wave.sceneType] || wave.sceneType;
    assert.equal(
      mon.mType, expectedMType,
      `wave[${i}] sceneType=${wave.sceneType}: expected mType=${expectedMType}, got ${mon.mType} (id=${mon.id})`,
    );
  }
});

test('scene pool can draw wild starters (e.g. fire scene → 小火獸)', () => {
  // Use a pickIndex that picks the last element to maximize chance of hitting starters
  // (starters are appended last in the pool).
  const pickLast = (length) => Math.max(0, length - 1);
  const roster = buildRoster(pickLast, 'single', { disableRandomSwap: true });
  const wildStarters = roster.filter((mon) => mon.id.startsWith('wild_starter_'));
  assert.ok(
    wildStarters.length > 0,
    'Expected at least one wild starter from scene-based draw',
  );
  // Every wild starter should have an individual starter race and mType matching the scene
  const STARTER_RACES = new Set([
    'dragon_kin', 'wolf', 'tiger', 'lion',
  ]);
  for (const ws of wildStarters) {
    assert.ok(STARTER_RACES.has(ws.race), `wild starter race=${ws.race} not in starter races`);
  }
});

test('scene pool excludes the player-selected starter', () => {
  // Pick last to always draw starters, but exclude fire
  const pickLast = (length) => Math.max(0, length - 1);
  const roster = buildRoster(pickLast, 'single', {
    disableRandomSwap: true,
    excludedStarterIds: ['fire'],
  });
  const wildFire = roster.filter((mon) => mon.id === 'wild_starter_fire');
  assert.equal(
    wildFire.length, 0,
    'Player-selected starter (fire) should not appear as wild enemy',
  );
});

test('buildRoster final wave boss is selected from config-driven boss list', () => {
  const seen = new Set();

  for (let i = 0; i < BOSS_ID_LIST.length; i += 1) {
    const pickBossAtIndex = (length) => (length === BOSS_ID_LIST.length ? i : 0);
    const roster = buildRoster(pickBossAtIndex, 'single');
    const boss = roster[roster.length - 1];
    seen.add(boss.id);
  }

  assert.deepEqual(new Set(BOSS_ID_LIST), seen);
});

test('buildRoster double mode locks final battle to double-boss pair', () => {
  const pickLast = (length) => Math.max(0, length - 1);
  const roster = buildRoster(pickLast, 'double');
  const finalMain = roster[roster.length - 2];
  const finalSub = roster[roster.length - 1];
  const preFinalMain = roster[roster.length - 4];
  const preFinalSub = roster[roster.length - 3];

  assert.equal(BOSS_ID_LIST.includes(finalMain.id), true);
  assert.equal(BOSS_ID_LIST.includes(finalSub.id), true);
  assert.equal(BOSS_ID_LIST.includes(preFinalMain.id), false);
  assert.equal(BOSS_ID_LIST.includes(preFinalSub.id), false);
});

test('buildRoster applies boss scene override mapping from config', () => {
  const bossSceneMap = BALANCE_CONFIG.monsters.bossSceneById;

  for (let i = 0; i < BOSS_ID_LIST.length; i += 1) {
    const pickBossAtIndex = (length) => (length === BOSS_ID_LIST.length ? i : 0);
    const roster = buildRoster(pickBossAtIndex, 'single');
    const boss = roster[roster.length - 1];
    const expectedScene = bossSceneMap[boss.id];
    if (!expectedScene) continue;
    assert.equal(boss.sceneMType, expectedScene);
  }
});

test('buildRoster can inject wild starter encounters and respect excluded starter ids', () => {
  const roster = buildRoster(pickFirst, 'single', {
    disableRandomSwap: true,
    enableStarterEncounters: true,
    excludedStarterIds: ['fire'],
  });
  const wildStarters = roster.filter((mon) => String(mon.id || '').startsWith('wild_starter_'));

  assert.equal(wildStarters.length > 0, true);
  assert.equal(wildStarters.some((mon) => mon.id === 'wild_starter_fire'), false);
  assert.equal(wildStarters.some((mon) => mon.id === 'wild_starter_water'), true);
  assert.equal(wildStarters.some((mon) => mon.sceneMType === 'water'), true);
});

test('buildRoster can spawn mid-stage wild starter encounters in later waves', () => {
  const roster = buildRoster(pickStarterMidStage, 'single', {
    disableRandomSwap: true,
    enableStarterEncounters: true,
  });
  const wildStarters = roster.filter((mon) => String(mon.id || '').startsWith('wild_starter_'));
  const baseStarterNames = new Set(['小火獸', '小水獸', '小草獸', '小冰虎', '小雷獸', '小獅獸', '小鋼狼']);

  assert.equal(wildStarters.length > 0, true);
  assert.equal(wildStarters.some((mon) => !baseStarterNames.has(mon.name)), true);
  assert.equal(wildStarters.some((mon) => mon.isEvolved), true);
});

test('buildRoster skips wild starter encounters when all starters are excluded', () => {
  const roster = buildRoster(pickFirst, 'single', {
    disableRandomSwap: true,
    enableStarterEncounters: true,
    excludedStarterIds: ['fire', 'water', 'grass', 'tiger', 'electric', 'lion', 'wolf'],
  });
  const wildStarters = roster.filter((mon) => String(mon.id || '').startsWith('wild_starter_'));
  assert.equal(wildStarters.length, 0);
});
