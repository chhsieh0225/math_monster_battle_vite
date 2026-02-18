import assert from 'node:assert/strict';
import test from 'node:test';
import { isPvpBossLockedForSelection } from './selectionBossUnlock.ts';

test('does not lock bosses outside pvp mode', () => {
  assert.equal(isPvpBossLockedForSelection('single', 'boss'), false);
});

test('does not lock non-boss starters in pvp mode', () => {
  assert.equal(isPvpBossLockedForSelection('pvp', 'fire'), false);
});

test('locks pvp boss when never defeated', () => {
  assert.equal(isPvpBossLockedForSelection('pvp', 'boss_hydra', { defeated: {} }), true);
});

test('unlocks pvp boss after one defeat record', () => {
  assert.equal(isPvpBossLockedForSelection('pvp', 'boss_sword_god', {
    defeated: { boss_sword_god: 1 },
  }), false);
});
