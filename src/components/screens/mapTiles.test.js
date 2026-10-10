import assert from 'node:assert/strict';
import test from 'node:test';
import { pickTileLevel, visibleTiles } from './mapTiles.ts';

test('the sharper level is chosen only when the screen needs it', () => {
  assert.equal(pickTileLevel(520, 2), 0, 'Mac window at fit: 1040 device px, the painting is already 1:1');
  assert.equal(pickTileLevel(780, 2), 1, 'Mac at 1.5x zoom: 1560 device px → the 2048 level');
  assert.equal(pickTileLevel(500, 1), 0, 'low-density screen: the base painting is enough');
  assert.equal(pickTileLevel(1500, 3), 2, 'phone at 3x zoom: the sharpest level');
  assert.equal(pickTileLevel(9000, 3), 2, 'never beyond the sharpest level');
});

test('only tiles in view are loaded', () => {
  const all = visibleTiles(2, { x0: 0, y0: 0, x1: 1, y1: 1 });
  assert.equal(all.length, 96);
  const corner = visibleTiles(2, { x0: 0, y0: 0, x1: 0.2, y1: 0.2 }, '', 0);
  assert.deepEqual(corner.map((tile) => tile.key), ['2-0-0', '2-1-0', '2-2-0', '2-0-1', '2-1-1', '2-2-1']);
  assert.equal(visibleTiles(0, { x0: 0, y0: 0, x1: 1, y1: 1 }).length, 0);
  assert.equal(corner[0].src, 'maps/world-map-v1/l2/0-0.webp');
  const area = all.reduce((sum, tile) => sum + tile.width * tile.height, 0);
  assert.ok(Math.abs(area - 1) < 1e-9, 'tiles cover the map exactly once');
});

test('every tile of every level ships with the game', async () => {
  const { existsSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { WORLD_MAP_ART } = await import('../../data/worldMap.ts');
  WORLD_MAP_ART.levels.forEach((level, index) => {
    for (const tile of visibleTiles(index + 1, { x0: 0, y0: 0, x1: 1, y1: 1 })) {
      assert.ok(existsSync(fileURLToPath(new URL(`../../../public/${tile.src}`, import.meta.url))), tile.src);
    }
    assert.equal(level.cols * WORLD_MAP_ART.tileSize, level.width);
    assert.equal(level.rows * WORLD_MAP_ART.tileSize, level.height);
  });
});
