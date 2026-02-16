import assert from 'node:assert/strict';
import test from 'node:test';

import { DOUBLE_STAGE_WAVES, STAGE_WAVES } from '../data/stageConfigs.ts';
import { buildRoster } from './rosterBuilder.ts';

const pickFirst = () => 0;

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

test('buildRoster uses double-stage waves and keeps scene type override', () => {
  const roster = buildRoster(pickFirst, 'double');

  assert.equal(roster.length, DOUBLE_STAGE_WAVES.length);

  DOUBLE_STAGE_WAVES.forEach((wave, idx) => {
    const mon = roster[idx];
    const expectedScene = wave.sceneType || mon.mType;
    assert.equal(mon.sceneMType, expectedScene);
  });
});

test('buildRoster respects slime type preference in double mode', () => {
  const roster = buildRoster(pickFirst, 'double');

  DOUBLE_STAGE_WAVES.forEach((wave, idx) => {
    if (wave.monsterId !== 'slime' || !wave.slimeType) return;
    assert.equal(roster[idx].mType, wave.slimeType);
  });
});
