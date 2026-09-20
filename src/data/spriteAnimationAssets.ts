import { getProfile, VB_H, VB_W } from './spriteProfiles.ts';
import type { SpriteKey, SpriteProfile } from './spriteProfiles.ts';

export type SpriteAnimationAsset = {
  file: string;
  footX: number;
  hit: { x: number; y: number };
  mouth?: { x: number; y: number };
  /** Only enable for reviewed, closely registered idle/inhale drawings. */
  idleExpression?: boolean;
  /** Union of all eight silhouettes, not the current pose's bounds. */
  bounds: readonly [number, number, number, number];
};

export const SPRITE_ATLAS = { width: 512, height: 384, columns: 4, rows: 2 } as const;
export const SPRITE_ANIMATION_ASSETS = {
  player_fire0: {
    file: 'fire-hatchling-v2.webp', footX: 301, hit: { x: 255, y: 248 }, idleExpression: true,
    bounds: [14, 51, 499, 368],
  },
  player_fire1: {
    file: 'player-fire1-refined-v2.webp', footX: 312, hit: { x: 254, y: 231 },
    bounds: [14, 29, 498, 368],
  },
  player_fire2: {
    file: 'player-fire2-refined-v2.webp', footX: 291, hit: { x: 246, y: 209 },
    bounds: [24, 16, 488, 368],
  },
  player_wolf0: {
    file: 'player-wolf0-refined-v2.webp', footX: 383, hit: { x: 256, y: 211 },
    bounds: [15, 21, 497, 368],
  },
  player_wolf1: {
    file: 'player-wolf1-refined-v2.webp', footX: 306, hit: { x: 254, y: 258 },
    bounds: [14, 111, 498, 368],
  },
  player_wolf2: {
    file: 'player-wolf2-refined-v2.webp', footX: 379, hit: { x: 252, y: 215 },
    bounds: [59, 78, 453, 368],
  },
  boss_crazy_dragon: {
    file: 'boss-crazy-dragon-refined-v2.webp', footX: 148, hit: { x: 289, y: 236 }, mouth: { x: 453, y: 189 },
    bounds: [27, 54, 485, 368],
  },
  boss: {
    file: 'boss-refined-v2.webp', footX: 325, hit: { x: 256, y: 246 },
    bounds: [14, 96, 498, 368],
  },
  boss_2nd_phase: {
    file: 'boss-2nd-phase-refined-v2.webp', footX: 341, hit: { x: 257, y: 230 },
    bounds: [35, 60, 478, 368],
  },
  boss_hydra: {
    file: 'boss-hydra-refined-v2.webp', footX: 308, hit: { x: 257, y: 232 },
    bounds: [14, 67, 498, 368],
  },
  boss_sword_god: {
    file: 'boss-sword-god-refined-v2.webp', footX: 308, hit: { x: 256, y: 228 },
    bounds: [14, 56, 497, 368],
  },
  player_water0: {
    file: 'player-water0-refined-v2.webp', footX: 293, hit: { x: 256, y: 212 },
    bounds: [15, 21, 497, 368],
  },
  player_water1: {
    file: 'player-water1-refined-v2.webp', footX: 286, hit: { x: 256, y: 228 },
    bounds: [14, 58, 498, 368],
  },
  player_water2: {
    file: 'player-water2-refined-v2.webp', footX: 244, hit: { x: 256, y: 247 },
    bounds: [14, 100, 497, 368],
  },
  player_grass0: {
    file: 'player-grass0-refined-v2.webp', footX: 294, hit: { x: 257, y: 222 },
    bounds: [14, 45, 498, 368],
  },
  player_grass1: {
    file: 'player-grass1-refined-v2.webp', footX: 270, hit: { x: 257, y: 227 },
    bounds: [15, 56, 498, 368],
  },
  player_grass2: {
    file: 'player-grass2-refined-v2.webp', footX: 267, hit: { x: 256, y: 236 },
    bounds: [15, 76, 497, 368],
  },
  player_electric0: {
    file: 'player-electric0-refined-v2.webp', footX: 307, hit: { x: 258, y: 210 },
    bounds: [17, 17, 498, 368],
  },
  player_electric1: {
    file: 'player-electric1-refined-v2.webp', footX: 288, hit: { x: 255, y: 221 },
    bounds: [14, 41, 496, 368],
  },
  player_electric2: {
    file: 'player-electric2-refined-v2.webp', footX: 289, hit: { x: 257, y: 231 },
    bounds: [14, 63, 499, 368],
  },
  player_lion0: {
    file: 'player-lion0-refined-v2.webp', footX: 306, hit: { x: 256, y: 254 },
    bounds: [14, 114, 497, 368],
  },
  player_lion1: {
    file: 'player-lion1-refined-v2.webp', footX: 325, hit: { x: 255, y: 246 },
    bounds: [14, 96, 496, 368],
  },
  player_lion2: {
    file: 'player-lion2-refined-v2.webp', footX: 287, hit: { x: 257, y: 260 },
    bounds: [15, 127, 499, 368],
  },
  player_tiger0: {
    file: 'player-tiger0-refined-v2.webp', footX: 271, hit: { x: 256, y: 240 },
    bounds: [14, 82, 498, 368],
  },
  player_tiger1: {
    file: 'player-tiger1-refined-v2.webp', footX: 327, hit: { x: 257, y: 259 },
    bounds: [14, 124, 498, 368],
  },
  player_tiger2: {
    file: 'player-tiger2-refined-v2.webp', footX: 321, hit: { x: 257, y: 254 },
    bounds: [19, 113, 494, 368],
  },
  slime: {
    file: 'slime-refined-v2.webp', footX: 236, hit: { x: 256, y: 211 },
    bounds: [57, 20, 454, 368],
  },
  slime_fire: {
    file: 'slime-fire-refined-v2.webp', footX: 254, hit: { x: 256, y: 210 },
    bounds: [70, 17, 442, 368],
  },
  slime_water: {
    file: 'slime-water-refined-v2.webp', footX: 212, hit: { x: 256, y: 221 },
    bounds: [48, 42, 464, 368],
  },
  slime_electric: {
    file: 'slime-electric-refined-v2.webp', footX: 291, hit: { x: 257, y: 229 },
    bounds: [41, 58, 472, 368],
  },
  slime_dark: {
    file: 'slime-dark-refined-v2.webp', footX: 266, hit: { x: 256, y: 216 },
    bounds: [47, 29, 464, 368],
  },
  slime_steel: {
    file: 'slime-steel-refined-v2.webp', footX: 256, hit: { x: 255, y: 233 },
    bounds: [52, 68, 457, 368],
  },
  slime_evolved: {
    file: 'slime-evolved-refined-v2.webp', footX: 320, hit: { x: 256, y: 212 },
    bounds: [15, 21, 496, 368],
  },
  slime_electric_evolved: {
    file: 'slime-electric-evolved-refined-v2.webp', footX: 339, hit: { x: 256, y: 210 },
    bounds: [37, 17, 475, 368],
  },
  slime_fire_evolved: {
    file: 'slime-fire-evolved-refined-v2.webp', footX: 322, hit: { x: 256, y: 213 },
    bounds: [14, 22, 497, 368],
  },
  slime_water_evolved: {
    file: 'slime-water-evolved-refined-v2.webp', footX: 313, hit: { x: 256, y: 222 },
    bounds: [15, 44, 497, 368],
  },
  slime_steel_evolved: {
    file: 'slime-steel-evolved-refined-v2.webp', footX: 341, hit: { x: 256, y: 210 },
    bounds: [20, 16, 491, 368],
  },
  slime_dark_evolved: {
    file: 'slime-dark-evolved-refined-v2.webp', footX: 320, hit: { x: 256, y: 226 },
    bounds: [14, 53, 497, 368],
  },
  fire: {
    file: 'fire-refined-v2.webp', footX: 343, hit: { x: 257, y: 251 },
    bounds: [15, 108, 498, 368],
  },
  fire_evolved: {
    file: 'fire-evolved-refined-v2.webp', footX: 349, hit: { x: 256, y: 226 },
    bounds: [15, 52, 497, 368],
  },
  dragon: {
    file: 'dragon-refined-v2.webp', footX: 253, hit: { x: 256, y: 227 },
    bounds: [14, 56, 498, 368],
  },
  dragon_evolved: {
    file: 'dragon-evolved-refined-v2.webp', footX: 275, hit: { x: 256, y: 241 },
    bounds: [14, 86, 498, 368],
  },
  ghost: {
    file: 'ghost-v2.webp', footX: 302, hit: { x: 256, y: 225 }, idleExpression: true,
    bounds: [25, 17, 487, 368],
  },
  ghost_evolved: {
    file: 'ghost-evolved-refined-v2.webp', footX: 327, hit: { x: 256, y: 222 },
    bounds: [14, 44, 498, 368],
  },
  ghost_lantern: {
    file: 'ghost-lantern-refined-v2.webp', footX: 269, hit: { x: 256, y: 210 },
    bounds: [26, 17, 486, 368],
  },
  mushroom: {
    file: 'mushroom-refined-v2.webp', footX: 316, hit: { x: 256, y: 252 },
    bounds: [38, 111, 474, 368],
  },
  golumn: {
    file: 'golumn-refined-v2.webp', footX: 335, hit: { x: 256, y: 248 },
    bounds: [14, 101, 497, 368],
  },
  golumn_mud: {
    file: 'golumn-mud-refined-v2.webp', footX: 355, hit: { x: 256, y: 217 },
    bounds: [14, 32, 498, 368],
  },
  candy_knight: {
    file: 'candy-knight-refined-v2.webp', footX: 401, hit: { x: 256, y: 241 },
    bounds: [15, 87, 497, 368],
  },
  candy_monster: {
    file: 'candy-monster-refined-v2.webp', footX: 293, hit: { x: 257, y: 236 },
    bounds: [14, 75, 498, 368],
  },
  colorful_butterfly: {
    file: 'colorful-butterfly-refined-v2.webp', footX: 301, hit: { x: 256, y: 212 },
    bounds: [14, 21, 497, 368],
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
