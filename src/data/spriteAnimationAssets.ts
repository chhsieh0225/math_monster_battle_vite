import { getProfile, VB_H, VB_W } from './spriteProfiles.ts';
import type { SpriteKey, SpriteProfile } from './spriteProfiles.ts';

export type SpriteAnimationAsset = {
  file: string;
  footX: number;
  hit: { x: number; y: number };
  mouth?: { x: number; y: number };
  /** Union of all eight silhouettes, not the current pose's bounds. */
  bounds: readonly [number, number, number, number];
};

export const SPRITE_ATLAS = { width: 512, height: 384, columns: 4, rows: 2 } as const;
export const SPRITE_ANIMATION_ASSETS = {
  player_fire0: {
    file: 'fire-hatchling-v1.webp', footX: 296, hit: { x: 255, y: 248 },
    bounds: [37, 57, 489, 368],
  },
  player_fire1: {
    file: 'fire-beast-v1.webp', footX: 280, hit: { x: 250, y: 245 },
    bounds: [22, 63, 482, 368],
  },
  player_fire2: {
    file: 'fire-dragon-king-v1.webp', footX: 278, hit: { x: 245, y: 230 },
    bounds: [23, 63, 486, 368],
  },
  player_wolf0: {
    file: 'steel-wolf-cub-v1.webp', footX: 356, hit: { x: 246, y: 236 },
    bounds: [42, 76, 450, 368],
  },
  player_wolf1: {
    file: 'steel-wolf-blade-v1.webp', footX: 306, hit: { x: 250, y: 260 },
    bounds: [17, 115, 487, 368],
  },
  player_wolf2: {
    file: 'steel-wolf-v2.webp', footX: 368, hit: { x: 250, y: 230 },
    bounds: [18, 107, 491, 368],
  },
  boss_crazy_dragon: {
    file: 'crazy-dragon-v2.webp', footX: 300, hit: { x: 300, y: 235 }, mouth: { x: 432, y: 218 },
    bounds: [56, 51, 482, 368],
  },
  boss: {
    file: 'boss-v1.webp', footX: 310, hit: { x: 256, y: 257 },
    bounds: [14, 121, 498, 368],
  },
  boss_2nd_phase: {
    file: 'boss-2nd-phase-v1.webp', footX: 314, hit: { x: 256, y: 226 },
    bounds: [14, 52, 497, 368],
  },
  boss_hydra: {
    file: 'boss-hydra-v1.webp', footX: 280, hit: { x: 257, y: 226 },
    bounds: [33, 53, 480, 368],
  },
  boss_sword_god: {
    file: 'boss-sword-god-v1.webp', footX: 370, hit: { x: 256, y: 219 },
    bounds: [14, 37, 498, 368],
  },
  player_water0: {
    file: 'player-water0-v1.webp', footX: 261, hit: { x: 256, y: 221 },
    bounds: [14, 42, 498, 368],
  },
  player_water1: {
    file: 'player-water1-v1.webp', footX: 259, hit: { x: 256, y: 231 },
    bounds: [14, 64, 498, 368],
  },
  player_water2: {
    file: 'player-water2-v1.webp', footX: 302, hit: { x: 256, y: 229 },
    bounds: [14, 59, 498, 368],
  },
  player_grass0: {
    file: 'player-grass0-v1.webp', footX: 278, hit: { x: 257, y: 217 },
    bounds: [15, 33, 498, 368],
  },
  player_grass1: {
    file: 'player-grass1-v1.webp', footX: 289, hit: { x: 256, y: 218 },
    bounds: [14, 35, 498, 368],
  },
  player_grass2: {
    file: 'player-grass2-v1.webp', footX: 273, hit: { x: 256, y: 243 },
    bounds: [14, 91, 498, 368],
  },
  player_electric0: {
    file: 'player-electric0-v1.webp', footX: 331, hit: { x: 256, y: 210 },
    bounds: [43, 16, 469, 368],
  },
  player_electric1: {
    file: 'player-electric1-v1.webp', footX: 244, hit: { x: 256, y: 240 },
    bounds: [14, 84, 498, 368],
  },
  player_electric2: {
    file: 'player-electric2-v1.webp', footX: 274, hit: { x: 256, y: 237 },
    bounds: [14, 76, 498, 368],
  },
  player_lion0: {
    file: 'player-lion0-v1.webp', footX: 305, hit: { x: 256, y: 241 },
    bounds: [14, 86, 498, 368],
  },
  player_lion1: {
    file: 'player-lion1-v1.webp', footX: 333, hit: { x: 256, y: 255 },
    bounds: [14, 116, 498, 368],
  },
  player_lion2: {
    file: 'player-lion2-v1.webp', footX: 327, hit: { x: 256, y: 238 },
    bounds: [14, 78, 498, 368],
  },
  player_tiger0: {
    file: 'player-tiger0-v1.webp', footX: 270, hit: { x: 256, y: 238 },
    bounds: [14, 78, 498, 368],
  },
  player_tiger1: {
    file: 'player-tiger1-v1.webp', footX: 314, hit: { x: 256, y: 255 },
    bounds: [14, 116, 497, 368],
  },
  player_tiger2: {
    file: 'player-tiger2-v1.webp', footX: 326, hit: { x: 256, y: 254 },
    bounds: [14, 114, 498, 368],
  },
  slime: {
    file: 'slime-v1.webp', footX: 240, hit: { x: 257, y: 235 },
    bounds: [62, 73, 451, 368],
  },
  slime_fire: {
    file: 'slime-fire-v1.webp', footX: 253, hit: { x: 256, y: 225 },
    bounds: [75, 51, 437, 368],
  },
  slime_water: {
    file: 'slime-water-v1.webp', footX: 212, hit: { x: 256, y: 215 },
    bounds: [34, 29, 478, 368],
  },
  slime_electric: {
    file: 'slime-electric-v1.webp', footX: 285, hit: { x: 256, y: 224 },
    bounds: [31, 48, 481, 368],
  },
  slime_dark: {
    file: 'slime-dark-v1.webp', footX: 252, hit: { x: 256, y: 215 },
    bounds: [60, 27, 451, 368],
  },
  slime_steel: {
    file: 'slime-steel-v1.webp', footX: 268, hit: { x: 257, y: 246 },
    bounds: [53, 96, 460, 368],
  },
  slime_evolved: {
    file: 'slime-evolved-v1.webp', footX: 335, hit: { x: 256, y: 216 },
    bounds: [14, 30, 498, 368],
  },
  slime_electric_evolved: {
    file: 'slime-electric-evolved-v1.webp', footX: 362, hit: { x: 256, y: 210 },
    bounds: [14, 16, 498, 368],
  },
  slime_fire_evolved: {
    file: 'slime-fire-evolved-v1.webp', footX: 359, hit: { x: 256, y: 210 },
    bounds: [24, 16, 488, 368],
  },
  slime_water_evolved: {
    file: 'slime-water-evolved-v1.webp', footX: 313, hit: { x: 256, y: 234 },
    bounds: [14, 71, 498, 368],
  },
  slime_steel_evolved: {
    file: 'slime-steel-evolved-v1.webp', footX: 334, hit: { x: 256, y: 214 },
    bounds: [14, 25, 498, 368],
  },
  slime_dark_evolved: {
    file: 'slime-dark-evolved-v1.webp', footX: 333, hit: { x: 257, y: 233 },
    bounds: [14, 68, 499, 368],
  },
  fire: {
    file: 'fire-v1.webp', footX: 315, hit: { x: 256, y: 259 },
    bounds: [14, 126, 498, 368],
  },
  fire_evolved: {
    file: 'fire-evolved-v1.webp', footX: 338, hit: { x: 256, y: 241 },
    bounds: [14, 86, 498, 368],
  },
  dragon: {
    file: 'dragon-v1.webp', footX: 271, hit: { x: 256, y: 233 },
    bounds: [14, 69, 498, 368],
  },
  dragon_evolved: {
    file: 'dragon-evolved-v1.webp', footX: 268, hit: { x: 256, y: 228 },
    bounds: [14, 57, 498, 368],
  },
  ghost: {
    file: 'ghost-v1.webp', footX: 290, hit: { x: 256, y: 225 },
    bounds: [48, 50, 464, 368],
  },
  ghost_evolved: {
    file: 'ghost-evolved-v1.webp', footX: 335, hit: { x: 256, y: 215 },
    bounds: [14, 28, 498, 368],
  },
  ghost_lantern: {
    file: 'ghost-lantern-v1.webp', footX: 281, hit: { x: 256, y: 218 },
    bounds: [32, 34, 480, 368],
  },
  mushroom: {
    file: 'mushroom-v1.webp', footX: 345, hit: { x: 256, y: 239 },
    bounds: [14, 81, 498, 368],
  },
  golumn: {
    file: 'golumn-v1.webp', footX: 332, hit: { x: 256, y: 241 },
    bounds: [14, 86, 498, 368],
  },
  golumn_mud: {
    file: 'golumn-mud-v1.webp', footX: 334, hit: { x: 256, y: 233 },
    bounds: [14, 68, 498, 368],
  },
  candy_knight: {
    file: 'candy-knight-v1.webp', footX: 393, hit: { x: 256, y: 250 },
    bounds: [14, 106, 498, 368],
  },
  candy_monster: {
    file: 'candy-monster-v1.webp', footX: 280, hit: { x: 256, y: 236 },
    bounds: [14, 74, 497, 368],
  },
  colorful_butterfly: {
    file: 'colorful-butterfly-v1.webp', footX: 250, hit: { x: 257, y: 228 },
    bounds: [42, 57, 471, 368],
  },
} as const satisfies Record<SpriteKey, SpriteAnimationAsset>;

const registry: Record<SpriteKey, SpriteAnimationAsset> = SPRITE_ANIMATION_ASSETS;
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';

export function getSpriteAnimationAsset(profileKey?: string) {
  const profile = profileKey ? getProfile(profileKey) : undefined;
  const art = profile ? registry[profile.imgKey] : undefined;
  return profile && art ? { profile, art, src: `${BASE}sprites/visual-pilot/${art.file}` } : null;
}

export function getSpriteAtlasEnvelope(profile: SpriteProfile) {
  const scale = Math.min(VB_W * (1 - 2 * profile.safePad) / profile.natW,
    VB_H * (1 - 2 * profile.safePad) / profile.natH);
  return {
    // The new sword poses are landscape compositions, not the old narrow portrait.
    // Widen the battle-only envelope; height and fallback portraits stay unchanged.
    width: profile.imgKey === 'boss_sword_god' ? VB_W * (1 - 2 * profile.safePad) : Math.round(profile.natW * scale),
    height: Math.round(profile.natH * scale),
  };
}

/** Fit the union once: no pose-dependent zoom or foot-baseline changes. */
export function fitSpriteAtlas(profile: SpriteProfile, art: SpriteAnimationAsset) {
  const { width, height } = getSpriteAtlasEnvelope(profile);
  const [left, top, right, bottom] = art.bounds;
  const scale = Math.min(width / (right - left), height / (bottom - top));
  return {
    x: VB_W / 2 - (left + right) / 2 * scale,
    y: Math.round((VB_H - height) / 2) + height - bottom * scale,
    width: SPRITE_ATLAS.width * scale,
    height: SPRITE_ATLAS.height * scale,
    scale,
  };
}

export function getSpritePosePosition(index: number): string {
  const frame = Number.isInteger(index) && index >= 0 && index < 8 ? index : 0;
  return `${frame % 4 / 3 * 100}% ${Math.floor(frame / 4) * 100}%`;
}
