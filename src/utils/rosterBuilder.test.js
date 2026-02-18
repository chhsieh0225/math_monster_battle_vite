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

test('buildRoster uses double-stage waves and keeps scene type override', () => {
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
    const expectedScene = wave.sceneType || mon.mType;
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
