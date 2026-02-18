import test from 'node:test';
import assert from 'node:assert/strict';

import { PVP_SELECTABLE_ROSTER } from './pvpRoster.ts';

const BOSS_IDS = ['boss', 'boss_hydra', 'boss_crazy_dragon', 'boss_sword_god'];

test('pvp roster includes both starters and four selectable bosses', () => {
  const ids = new Set(PVP_SELECTABLE_ROSTER.map((starter) => starter.id));
  for (const bossId of BOSS_IDS) {
    assert.ok(ids.has(bossId), `missing boss id in pvp roster: ${bossId}`);
  }
  assert.ok(PVP_SELECTABLE_ROSTER.length >= 9, 'expected starters + bosses in pvp roster');
});

test('every selectable in pvp roster has at least one stage and exactly four moves', () => {
  for (const starter of PVP_SELECTABLE_ROSTER) {
    assert.ok(Array.isArray(starter.stages), `stages missing for ${starter.id}`);
    assert.ok(starter.stages.length >= 1, `stage list empty for ${starter.id}`);
    assert.ok(Array.isArray(starter.moves), `moves missing for ${starter.id}`);
    assert.equal(starter.moves.length, 4, `expected 4 moves for ${starter.id}`);
  }
});
