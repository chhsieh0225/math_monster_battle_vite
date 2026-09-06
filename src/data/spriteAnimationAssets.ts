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
  player_wolf2: {
    file: 'steel-wolf-v2.webp', footX: 368, hit: { x: 250, y: 230 },
    bounds: [18, 107, 491, 368],
  },
  boss_crazy_dragon: {
    file: 'crazy-dragon-v2.webp', footX: 300, hit: { x: 300, y: 235 }, mouth: { x: 432, y: 218 },
    bounds: [56, 51, 482, 368],
  },
} as const satisfies Partial<Record<SpriteKey, SpriteAnimationAsset>>;

const registry: Partial<Record<SpriteKey, SpriteAnimationAsset>> = SPRITE_ANIMATION_ASSETS;
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';

export function getSpriteAnimationAsset(profileKey?: string) {
  const profile = profileKey ? getProfile(profileKey) : undefined;
  const art = profile ? registry[profile.imgKey] : undefined;
  return profile && art ? { profile, art, src: `${BASE}sprites/visual-pilot/${art.file}` } : null;
}

/** Keep every pose inside the original profile's envelope and foot baseline. */
export function fitSpriteAtlas(profile: SpriteProfile, art: SpriteAnimationAsset) {
  const originalScale = Math.min(VB_W * (1 - 2 * profile.safePad) / profile.natW,
    VB_H * (1 - 2 * profile.safePad) / profile.natH);
  const width = Math.round(profile.natW * originalScale);
  const height = Math.round(profile.natH * originalScale);
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
