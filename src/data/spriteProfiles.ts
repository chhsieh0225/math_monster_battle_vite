/**
 * spriteProfiles.ts — Centralised sprite geometry profiles.
 *
 * Every sprite's natural dimensions, safe-padding, and rendering hint are
 * defined here.  The `heightCompensation` formula automatically computes
 * the display-size multiplier so that all sprites appear at a visually
 * consistent height regardless of aspect ratio.
 *
 * ### Mathematics
 *
 * viewBox = VB_W × VB_H = 120 × 100.
 * Available region after safe-padding p:
 *   A_W = VB_W(1−2p),  A_H = VB_H(1−2p)
 * Contain-scale:
 *   s = min(A_W/natW, A_H/natH)
 * Visible height ratio:
 *   r_h = natH·s / VB_H
 * Compensation factor:
 *   c = 1 / r_h   (≥ 1)
 *
 * displaySize = baseSize × c  ⟹  perceived monster height ≈ baseSize.
 */

import type { SPRITE_IMGS } from './sprites.ts';

export type SpriteKey = keyof typeof SPRITE_IMGS;

export interface SpriteProfile {
  /** Key into SPRITE_IMGS (the PNG asset identifier). */
  imgKey: SpriteKey;
  /** Natural image width (px). */
  natW: number;
  /** Natural image height (px). */
  natH: number;
  /**
   * Safe-padding fraction per edge (0 – 0.15).
   * 0 = pixel-perfect fill (120×100 sprites).
   * 0.04 = boss-class (large, minimal guard).
   * 0.05 = default for non-standard sprites.
   * 0.06 = wide-wing sprites (butterfly).
   */
  safePad: number;
  /** Horizontally flip the image (boss_crazy_dragon). */
  flip?: boolean;
  /** CSS image-rendering. */
  rendering?: 'pixelated' | 'auto';
}

export type SpriteShape = 'square' | 'wide' | 'tall';

export const VB_W = 120;
export const VB_H = 100;

// ─── Profile registry ────────────────────────────────────────────────
// Keyed by SVG export name (the same string used in monsterConfigs.spriteKey).

const std = (imgKey: SpriteKey, rendering?: 'pixelated' | 'auto'): SpriteProfile =>
  ({ imgKey, natW: 120, natH: 100, safePad: 0, rendering });

const wide = (imgKey: SpriteKey, safePad = 0.05): SpriteProfile =>
  ({ imgKey, natW: 677, natH: 369, safePad });

export const PROFILES: Record<string, SpriteProfile> = {
  // ── Standard-fill sprites (120×100, safePad 0) ────────────────────
  slimeSVG:                    std('slime', 'pixelated'),
  slimeRedSVG:                 std('slime_fire', 'pixelated'),
  slimeBlueSVG:                std('slime_water', 'pixelated'),
  slimeYellowSVG:              std('slime_electric', 'pixelated'),
  slimeDarkSVG:                std('slime_dark', 'pixelated'),
  slimeSteelSVG:               std('slime_steel', 'pixelated'),
  fireLizardSVG:               std('fire'),
  ghostSVG:                    std('ghost'),
  dragonSVG:                   std('dragon', 'pixelated'),
  darkLordSVG:                 std('boss'),
  golumnSVG:                   std('golumn'),
  golumnMudSVG:                std('golumn_mud'),
  slimeEvolvedSVG:             std('slime_evolved'),
  slimeElectricEvolvedSVG:     std('slime_electric_evolved'),
  slimeFireEvolvedSVG:         std('slime_fire_evolved'),
  slimeWaterEvolvedSVG:        std('slime_water_evolved'),
  slimeSteelEvolvedSVG:        std('slime_steel_evolved'),
  slimeDarkEvolvedSVG:         std('slime_dark_evolved'),
  fireEvolvedSVG:              std('fire_evolved'),
  ghostEvolvedSVG:             std('ghost_evolved'),
  dragonEvolvedSVG:            std('dragon_evolved'),

  // ── Dragon-kin starters (120×100 standard) ────────────────────────
  playerfire0SVG:              std('player_fire0'),
  playerfire1SVG:              std('player_fire1'),
  playerfire2SVG:              std('player_fire2'),
  playerwater0SVG:             std('player_water0'),
  playerwater1SVG:             std('player_water1'),
  playerwater2SVG:             std('player_water2'),
  playergrass0SVG:             std('player_grass0'),
  playergrass1SVG:             std('player_grass1'),
  playergrass2SVG:             std('player_grass2'),
  playerelectric0SVG:          std('player_electric0'),
  playerelectric1SVG:          std('player_electric1'),
  playerelectric2SVG:          std('player_electric2'),

  // ── Wide starters (677×369, safePad 0.05) ─────────────────────────
  playerlion0SVG:              wide('player_lion0'),
  playerlion1SVG:              wide('player_lion1'),
  playerlion2SVG:              wide('player_lion2'),
  playerwolf0SVG:              wide('player_wolf0'),
  playerwolf1SVG:              wide('player_wolf1'),
  playerwolf2SVG:              wide('player_wolf2'),
  playertiger0SVG:             wide('player_tiger0'),
  playertiger1SVG:             wide('player_tiger1'),
  playertiger2SVG:             wide('player_tiger2'),

  // ── Wide enemy sprites (677×369) ──────────────────────────────────
  ghostLanternSVG:             wide('ghost_lantern'),
  mushroomSVG:                 wide('mushroom'),
  colorfulButterflySVG:        wide('colorful_butterfly', 0.06),

  // ── Boss sprites ──────────────────────────────────────────────────
  bossHydraSVG:                wide('boss_hydra', 0.04),
  bossCrazyDragonSVG:          { imgKey: 'boss_crazy_dragon', natW: 677, natH: 369, safePad: 0.04, flip: true },
  bossSwordGodSVG:             { imgKey: 'boss_sword_god', natW: 409, natH: 610, safePad: 0.04 },
  bossDarkPhase2SVG:           { imgKey: 'boss_2nd_phase', natW: 548, natH: 455, safePad: 0.04 },

  // ── Candy sprites ─────────────────────────────────────────────────
  candyKnightSVG:              { imgKey: 'candy_knight', natW: 590, natH: 423, safePad: 0.05 },
  candyMonsterSVG:             { imgKey: 'candy_monster', natW: 530, natH: 471, safePad: 0.05 },
};

// ─── Pure geometry helpers ───────────────────────────────────────────

/**
 * Compute the height-compensation factor for a given profile.
 *
 * c = VB_H / visibleHeight ≥ 1.
 *
 * Standard-fill sprites (120×100, pad=0) return exactly 1.
 * Width-bound sprites return c > 1 proportional to their aspect ratio.
 */
export function heightCompensation(p: SpriteProfile): number {
  const { natW, natH, safePad } = p;
  // Fast path: standard-fill sprites need no compensation.
  if (natW === VB_W && natH === VB_H && safePad === 0) return 1;
  const aW = VB_W * (1 - 2 * safePad);
  const aH = VB_H * (1 - 2 * safePad);
  const s = Math.min(aW / natW, aH / natH);
  const visH = natH * s;
  return VB_H / visH;
}

/**
 * Get the height-compensation factor by SVG export name.
 *
 * Returns 1 for unknown keys (safe fallback — no size change).
 */
export function getCompensation(svgExportName: string): number {
  const p = PROFILES[svgExportName];
  return p ? heightCompensation(p) : 1;
}

/**
 * Get the full profile by SVG export name.
 */
export function getProfile(svgExportName: string): SpriteProfile | undefined {
  return PROFILES[svgExportName];
}

/**
 * Classify sprite silhouette from profile geometry (no image decode needed).
 * wide  : aspect ratio >= 1.35
 * tall  : aspect ratio <= 0.82
 * square: everything else
 */
export function getSpriteShape(svgExportName?: string): SpriteShape {
  if (!svgExportName) return 'square';
  const p = PROFILES[svgExportName];
  if (!p) return 'square';
  const aspect = p.natW / Math.max(1, p.natH);
  if (aspect >= 1.35) return 'wide';
  if (aspect <= 0.82) return 'tall';
  return 'square';
}
