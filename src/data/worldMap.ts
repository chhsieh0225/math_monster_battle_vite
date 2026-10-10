/**
 * World map content: regions on the hand-painted atlas and the expeditions
 * that cross them. Positions are percentages of the illustration so markers
 * stay aligned at any display size.
 */

export type RegionId =
  | 'grass' | 'water' | 'fire' | 'rock' | 'electric' | 'steel' | 'candy'
  | 'ghost' | 'poison' | 'burnt_warplace' | 'heaven' | 'light' | 'dark';

export type WorldRegion = {
  id: RegionId;
  /** Battle scene key in src/data/scenes.tsx. */
  scene: RegionId;
  /** Element of the monsters met here (type chart key). */
  element: string;
  /** Marker centre on the illustration, in percent of width / height. */
  x: number;
  y: number;
};

export type MapTileLevel = { width: number; height: number; cols: number; rows: number; dir: string };

export const WORLD_MAP_ART = {
  src: 'maps/world-map-v1.webp',
  width: 1536,
  height: 1024,
  /** Sharper levels: a Real-ESRGAN x4plus upscale of the painting, cut into 512px tiles loaded only where you look. */
  tileSize: 512,
  levels: [
    { width: 3072, height: 2048, cols: 6, rows: 4, dir: 'maps/world-map-v1/l1' },
    { width: 6144, height: 4096, cols: 12, rows: 8, dir: 'maps/world-map-v1/l2' },
  ] as readonly MapTileLevel[],
} as const;

export const WORLD_REGIONS: Record<RegionId, WorldRegion> = {
  grass: { id: 'grass', scene: 'grass', element: 'grass', x: 16, y: 60 },
  water: { id: 'water', scene: 'water', element: 'water', x: 33, y: 77 },
  fire: { id: 'fire', scene: 'fire', element: 'fire', x: 26, y: 14 },
  rock: { id: 'rock', scene: 'rock', element: 'rock', x: 25, y: 34 },
  electric: { id: 'electric', scene: 'electric', element: 'electric', x: 44, y: 15 },
  steel: { id: 'steel', scene: 'steel', element: 'steel', x: 49, y: 33 },
  candy: { id: 'candy', scene: 'candy', element: 'dream', x: 59, y: 55 },
  ghost: { id: 'ghost', scene: 'ghost', element: 'ghost', x: 66, y: 41 },
  poison: { id: 'poison', scene: 'poison', element: 'poison', x: 86, y: 41 },
  burnt_warplace: { id: 'burnt_warplace', scene: 'burnt_warplace', element: 'fire', x: 81, y: 22 },
  heaven: { id: 'heaven', scene: 'heaven', element: 'light', x: 62, y: 7 },
  light: { id: 'light', scene: 'light', element: 'light', x: 62, y: 24 },
  dark: { id: 'dark', scene: 'dark', element: 'dark', x: 91, y: 10 },
};

export const REGION_IDS = Object.keys(WORLD_REGIONS) as RegionId[];
export const START_REGION: RegionId = 'grass';
export const EXPEDITION_FLOORS = 10;

export type ExpeditionId = 'hydra' | 'sword_god' | 'crazy_dragon' | 'dark_king';

export type Expedition = {
  id: ExpeditionId;
  /** Unlock order: each expedition opens after the previous boss is defeated once. */
  order: number;
  bossId: 'boss_hydra' | 'boss_sword_god' | 'boss_crazy_dragon' | 'boss';
  region: RegionId;
  /** Region pools for floors 2-4, 5-7 and 8-9; floor 1 is the grassland start, floor 10 the boss. */
  stages: { early: RegionId[]; mid: RegionId[]; late: RegionId[] };
  /** Enemy HP/ATK multiplier so later expeditions feel harder. */
  power: number;
};

export const EXPEDITIONS: readonly Expedition[] = [
  {
    id: 'hydra', order: 1, bossId: 'boss_hydra', region: 'poison', power: 1,
    stages: { early: ['water', 'candy', 'rock'], mid: ['candy', 'ghost', 'steel'], late: ['ghost', 'steel', 'poison'] },
  },
  {
    id: 'sword_god', order: 2, bossId: 'boss_sword_god', region: 'heaven', power: 1.05,
    stages: { early: ['rock', 'water', 'candy'], mid: ['steel', 'electric', 'rock'], late: ['electric', 'light', 'steel'] },
  },
  {
    id: 'crazy_dragon', order: 3, bossId: 'boss_crazy_dragon', region: 'burnt_warplace', power: 1.1,
    stages: { early: ['rock', 'fire', 'candy'], mid: ['steel', 'ghost', 'fire'], late: ['light', 'ghost', 'burnt_warplace'] },
  },
  {
    id: 'dark_king', order: 4, bossId: 'boss', region: 'dark', power: 1.15,
    stages: { early: ['fire', 'water', 'candy', 'rock'], mid: ['steel', 'electric', 'ghost', 'poison'], late: ['light', 'burnt_warplace', 'ghost', 'poison'] },
  },
];

export function getExpedition(id: string | null | undefined): Expedition | null {
  return EXPEDITIONS.find((expedition) => expedition.id === id) ?? null;
}
