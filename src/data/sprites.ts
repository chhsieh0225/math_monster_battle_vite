// Vite 會根據 vite.config.js 的 base 設定自動填入正確的前綴
// 本地開發時 BASE = '/'，GitHub Pages 部署時 BASE = './'
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';

// Sprite image paths — loaded as static assets from public/
export const SPRITE_IMGS = {
  slime: `${BASE}sprites/slime.png`,
  fire: `${BASE}sprites/fire.png`,
  ghost: `${BASE}sprites/ghost.png`,
  ghost_lantern: `${BASE}sprites/ghost_lantern.png`,
  mushroom: `${BASE}sprites/mushroom.png`,
  dragon: `${BASE}sprites/dragon.png`,
  boss: `${BASE}sprites/boss.png`,
  player_fire0: `${BASE}sprites/player_fire0.png`,
  player_fire1: `${BASE}sprites/player_fire1.png`,
  player_fire2: `${BASE}sprites/player_fire2.png`,
  player_water0: `${BASE}sprites/player_water0.png`,
  player_water1: `${BASE}sprites/player_water1.png`,
  player_water2: `${BASE}sprites/player_water2.png`,
  player_grass0: `${BASE}sprites/player_grass0.png`,
  player_grass1: `${BASE}sprites/player_grass1.png`,
  player_grass2: `${BASE}sprites/player_grass2.png`,
  player_electric0: `${BASE}sprites/player_electric0.png`,
  player_electric1: `${BASE}sprites/player_electric1.png`,
  player_electric2: `${BASE}sprites/player_electric2.png`,
  slime_fire: `${BASE}sprites/slime_fire.png`,
  slime_water: `${BASE}sprites/slime_water.png`,
  slime_electric: `${BASE}sprites/slime_electric.png`,
  slime_dark: `${BASE}sprites/slime_dark.png`,
  slime_steel: `${BASE}sprites/slime_steel.png`,
  slime_evolved: `${BASE}sprites/slime_evolved.png`,
  slime_electric_evolved: `${BASE}sprites/slime_electric_evolved.png`,
  slime_fire_evolved: `${BASE}sprites/slime_fire_evolved.png`,
  slime_water_evolved: `${BASE}sprites/slime_water_evolved.png`,
  slime_steel_evolved: `${BASE}sprites/slime_steel_evolved.png`,
  slime_dark_evolved: `${BASE}sprites/slime_dark_evolved.png`,
  dragon_evolved: `${BASE}sprites/dragon_evolved.png`,
  fire_evolved: `${BASE}sprites/fire_evolved.png`,
  ghost_evolved: `${BASE}sprites/ghost_evolved.png`,
  player_lion0: `${BASE}sprites/player_lion0.png`,
  player_lion1: `${BASE}sprites/player_lion1.png`,
  player_lion2: `${BASE}sprites/player_lion2.png`,
  player_wolf0: `${BASE}sprites/player_wolf0.png`,
  player_wolf1: `${BASE}sprites/player_wolf1.png`,
  player_wolf2: `${BASE}sprites/player_wolf2.png`,
  player_tiger0: `${BASE}sprites/player_tiger0.png`,
  player_tiger1: `${BASE}sprites/player_tiger1.png`,
  player_tiger2: `${BASE}sprites/player_tiger2.png`,
  boss_hydra: `${BASE}sprites/boss_hydra.png`,
  boss_crazy_dragon: `${BASE}sprites/boss_crazy_dragon.png`,
  boss_sword_god: `${BASE}sprites/boss_sword_god.png`,
  golumn: `${BASE}sprites/golumn.png`,
  golumn_mud: `${BASE}sprites/golumn_mud.png`,
  candy_knight: `${BASE}sprites/candy_knight.png`,
  candy_monster: `${BASE}sprites/candy_monster.png`,
  colorful_butterfly: `${BASE}sprites/colorful_butterfly.png`,
} as const;

export const BG_IMGS = {
  grass: `${BASE}backgrounds/grass.jpg`,
  fire: `${BASE}backgrounds/fire.jpg`,
  water: `${BASE}backgrounds/water_breach.jpg`,
  electric: `${BASE}backgrounds/lighting_platou.jpg`,
  ghost: `${BASE}backgrounds/ghost.jpg`,
  poison: `${BASE}backgrounds/poison_swamp.jpg`,
  steel: `${BASE}backgrounds/steel.jpg`,
  dark: `${BASE}backgrounds/dark.jpg`,
  rock: `${BASE}backgrounds/rock.jpg`,
  heaven: `${BASE}backgrounds/heaven.jpg`,
  burnt_warplace: `${BASE}backgrounds/burnt_warplace.jpg`,
  candy: `${BASE}backgrounds/candy.jpg`,
} as const;

export const BG_IMGS_LOW = {
  ...BG_IMGS,
  water: `${BASE}backgrounds/water_breach_low.jpg`,
  electric: `${BASE}backgrounds/lighting_platou_low.jpg`,
  poison: `${BASE}backgrounds/poison_swamp_low.jpg`,
  candy: `${BASE}backgrounds/candy_low.jpg`,
} as const;

type SvgFactory = () => string;

// ─── Unified SVG factory ─────────────────────────────────────────────
// All sprite geometry lives in spriteProfiles.ts.  This function reads a
// SpriteProfile and produces the matching SVG <image> markup.

import { PROFILES, VB_W, VB_H, type SpriteProfile } from './spriteProfiles.ts';

function makeSvgFromProfile(p: SpriteProfile): SvgFactory {
  const { imgKey, natW, natH, safePad, flip, rendering = 'auto' } = p;
  const href = SPRITE_IMGS[imgKey];

  // Fast path: standard-fill sprite (120×100, no padding).
  if (natW === VB_W && natH === VB_H && safePad === 0) {
    return () => `<image href="${href}" x="0" y="0" width="120" height="100" style="image-rendering:${rendering}"/>`;
  }

  // Contain-safe: fit within padded region, centred both axes.
  const aW = VB_W * (1 - 2 * safePad);
  const aH = VB_H * (1 - 2 * safePad);
  const s = Math.min(aW / natW, aH / natH);
  const w = Math.round(natW * s);
  const h = Math.round(natH * s);
  const x = Math.round((VB_W - w) / 2);
  const y = Math.round((VB_H - h) / 2);

  if (flip) {
    return () =>
      `<g transform="translate(${VB_W},0) scale(-1,1)"><image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" style="image-rendering:${rendering}"/></g>`;
  }
  return () =>
    `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" style="image-rendering:${rendering}"/>`;
}

// Helper to build from a profile key (SVG export name).
function fromProfile(name: string): SvgFactory {
  const p = PROFILES[name];
  if (!p) throw new Error(`[sprites] missing profile for "${name}"`);
  return makeSvgFromProfile(p);
}

// ─── Exports — one per sprite ────────────────────────────────────────

export const slimeSVG = fromProfile('slimeSVG');

// ── Slime variant PNGs (dedicated sprites with white eyes) ──
export const slimeRedSVG    = fromProfile('slimeRedSVG');
export const slimeBlueSVG   = fromProfile('slimeBlueSVG');
export const slimeYellowSVG = fromProfile('slimeYellowSVG');
export const slimeDarkSVG   = fromProfile('slimeDarkSVG');
export const slimeSteelSVG  = fromProfile('slimeSteelSVG');

export const fireLizardSVG = fromProfile('fireLizardSVG');
export const ghostSVG = fromProfile('ghostSVG');
export const ghostLanternSVG = fromProfile('ghostLanternSVG');
export const mushroomSVG = fromProfile('mushroomSVG');
export const dragonSVG = fromProfile('dragonSVG');
export const darkLordSVG = fromProfile('darkLordSVG');
export const slimeEvolvedSVG = fromProfile('slimeEvolvedSVG');
export const slimeElectricEvolvedSVG = fromProfile('slimeElectricEvolvedSVG');
export const slimeFireEvolvedSVG = fromProfile('slimeFireEvolvedSVG');
export const slimeWaterEvolvedSVG = fromProfile('slimeWaterEvolvedSVG');
export const slimeSteelEvolvedSVG = fromProfile('slimeSteelEvolvedSVG');
export const slimeDarkEvolvedSVG = fromProfile('slimeDarkEvolvedSVG');
export const fireEvolvedSVG = fromProfile('fireEvolvedSVG');
export const ghostEvolvedSVG = fromProfile('ghostEvolvedSVG');
export const dragonEvolvedSVG = fromProfile('dragonEvolvedSVG');
export const playerfire0SVG = fromProfile('playerfire0SVG');
export const playerfire1SVG = fromProfile('playerfire1SVG');
export const playerfire2SVG = fromProfile('playerfire2SVG');
export const playerwater0SVG = fromProfile('playerwater0SVG');
export const playerwater1SVG = fromProfile('playerwater1SVG');
export const playerwater2SVG = fromProfile('playerwater2SVG');
export const playergrass0SVG = fromProfile('playergrass0SVG');
export const playergrass1SVG = fromProfile('playergrass1SVG');
export const playergrass2SVG = fromProfile('playergrass2SVG');
export const playerelectric0SVG = fromProfile('playerelectric0SVG');
export const playerelectric1SVG = fromProfile('playerelectric1SVG');
export const playerelectric2SVG = fromProfile('playerelectric2SVG');
export const playerlion0SVG = fromProfile('playerlion0SVG');
export const playerlion1SVG = fromProfile('playerlion1SVG');
export const playerlion2SVG = fromProfile('playerlion2SVG');
export const playerwolf0SVG = fromProfile('playerwolf0SVG');
export const playerwolf1SVG = fromProfile('playerwolf1SVG');
export const playerwolf2SVG = fromProfile('playerwolf2SVG');
export const playertiger0SVG = fromProfile('playertiger0SVG');
export const playertiger1SVG = fromProfile('playertiger1SVG');
export const playertiger2SVG = fromProfile('playertiger2SVG');
export const bossHydraSVG = fromProfile('bossHydraSVG');
export const bossCrazyDragonSVG = fromProfile('bossCrazyDragonSVG');
export const bossSwordGodSVG = fromProfile('bossSwordGodSVG');
export const golumnSVG = fromProfile('golumnSVG');
export const golumnMudSVG = fromProfile('golumnMudSVG');
export const candyKnightSVG = fromProfile('candyKnightSVG');
export const candyMonsterSVG = fromProfile('candyMonsterSVG');
export const colorfulButterflySVG = fromProfile('colorfulButterflySVG');
