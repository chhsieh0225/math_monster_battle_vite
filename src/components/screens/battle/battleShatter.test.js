import assert from 'node:assert/strict';
import test from 'node:test';
import { BOSS_SHARDS } from './battleShatter.ts';
import { resolveBattleSpriteClip } from './battleSpriteMotion.ts';

test('boss shards tile the sprite and break away from the top down', () => {
  assert.equal(BOSS_SHARDS.length, 24);
  for (const shard of BOSS_SHARDS) {
    const points = [...shard.clip.matchAll(/(-?\d+(?:\.\d+)?)% (-?\d+(?:\.\d+)?)%/g)].map((m) => [Number(m[1]), Number(m[2])]);
    assert.equal(points.length, 3, shard.clip);
    for (const [x, y] of points) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, shard.clip);
    assert.ok(shard.dy > 0, 'shards fall');
  }
  const area = BOSS_SHARDS.reduce((sum, shard) => {
    const [[x1, y1], [x2, y2], [x3, y3]] = [...shard.clip.matchAll(/(-?\d+)% (-?\d+)%/g)].map((m) => [Number(m[1]), Number(m[2])]);
    return sum + Math.abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)) / 2;
  }, 0);
  assert.equal(Math.round(area), 100 * 100, 'no gaps or overlaps');
  const firstRow = Math.max(...BOSS_SHARDS.slice(0, 8).map((s) => s.delay));
  const lastRow = Math.min(...BOSS_SHARDS.slice(16).map((s) => s.delay));
  assert.ok(firstRow < lastRow, 'the head breaks first');
});

test('every defeat animation shows the defeat pose', () => {
  for (const name of ['enemyDissolve', 'enemyDeathBurn', 'enemyDeathBoss', 'enemyDeathBossLite', 'enemyDeathVoid']) {
    assert.equal(resolveBattleSpriteClip(`${name} 1.2s ease-in forwards`).clip, 'defeat', name);
  }
});
