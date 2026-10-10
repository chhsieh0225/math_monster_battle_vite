/**
 * Level-of-detail tiles for the world map: pick the sharpest level the screen
 * needs (zoom × device pixel ratio) and only the tiles inside the view.
 */
import { WORLD_MAP_ART, type MapTileLevel } from '../../data/worldMap.ts';

export type MapTile = { key: string; src: string; left: number; top: number; width: number; height: number };

/** 0 = the base painting; 1.. = tile levels. Chooses the first level that covers the needed pixels. */
export function pickTileLevel(mapCssHeight: number, devicePixelRatio: number): number {
  const needed = mapCssHeight * Math.max(1, devicePixelRatio || 1);
  if (needed <= WORLD_MAP_ART.height * 1.15) return 0;
  const index = WORLD_MAP_ART.levels.findIndex((level) => level.height >= needed * 0.85);
  return (index === -1 ? WORLD_MAP_ART.levels.length - 1 : index) + 1;
}

/** Tiles of `level` that intersect the visible part of the map (fractions 0..1, with a margin). */
export function visibleTiles(
  levelIndex: number,
  view: { x0: number; y0: number; x1: number; y1: number },
  baseUrl = '',
  margin = 0.04,
): MapTile[] {
  if (levelIndex <= 0) return [];
  const level: MapTileLevel = WORLD_MAP_ART.levels[levelIndex - 1];
  const size = WORLD_MAP_ART.tileSize;
  const tiles: MapTile[] = [];
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const left = (col * size) / level.width;
      const top = (row * size) / level.height;
      const width = Math.min(size, level.width - col * size) / level.width;
      const height = Math.min(size, level.height - row * size) / level.height;
      if (left > view.x1 + margin || left + width < view.x0 - margin) continue;
      if (top > view.y1 + margin || top + height < view.y0 - margin) continue;
      tiles.push({ key: `${levelIndex}-${col}-${row}`, src: `${baseUrl}${level.dir}/${col}-${row}.webp`, left, top, width, height });
    }
  }
  return tiles;
}

const MAX_MOUNTED_TILES = 60;

/** Keep tiles already shown at this level (no reload flicker while panning), newest last, bounded. */
export function mergeTiles(previous: { level: number; tiles: MapTile[] }, level: number, next: MapTile[]) {
  if (previous.level !== level) return { level, tiles: next };
  const byKey = new Map(previous.tiles.map((tile) => [tile.key, tile]));
  let changed = false;
  for (const tile of next) {
    if (!byKey.has(tile.key)) { byKey.set(tile.key, tile); changed = true; }
  }
  if (!changed) return previous;
  const tiles = [...byKey.values()];
  return { level, tiles: tiles.slice(Math.max(0, tiles.length - MAX_MOUNTED_TILES)) };
}
