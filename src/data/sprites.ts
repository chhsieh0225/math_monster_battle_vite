// Vite 會根據 vite.config.js 的 base 設定自動填入正確的前綴
// 本地開發時 BASE = '/'，GitHub Pages 部署時 BASE = './'
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';

// Sprite image paths — loaded as static assets from public/
export const SPRITE_IMGS = {
  slime: `${BASE}sprites/slime.png`,
  fire: `${BASE}sprites/fire.png`,
  ghost: `${BASE}sprites/ghost.png`,
  ghost_lantern: `${BASE}sprites/ghost_lantern.png`,
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
  boss_hydra: `${BASE}sprites/boss_hydra.png`,
  boss_crazy_dragon: `${BASE}sprites/boss_crazy_dragon.png`,
  boss_sword_god: `${BASE}sprites/boss_sword_god.png`,
  golumn: `${BASE}sprites/golumn.png`,
  golumn_mud: `${BASE}sprites/golumn_mud.png`,
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
} as const;

type SpriteKey = keyof typeof SPRITE_IMGS;
type SvgFactory = () => string;

// SVG wrapper functions — return inner SVG markup using image paths
// viewBox is 120×100; standard images (~1.2:1) fill it directly.
function makeSvgFn(key: SpriteKey, rendering = 'auto'): SvgFactory {
  return () => `<image href="${SPRITE_IMGS[key]}" x="0" y="0" width="120" height="100" style="image-rendering:${rendering}"/>`;
}
// For wide-aspect sprites (e.g. lion 677×369 = 1.83:1):
// scale to fill viewBox height, center horizontally, let viewBox clip sides.
function makeSvgFnFill(
  key: SpriteKey,
  natW: number,
  natH: number,
  rendering = 'auto',
): SvgFactory {
  const h = 100;
  const w = Math.round(natW / natH * h);
  const x = Math.round((120 - w) / 2);
  return () => `<image href="${SPRITE_IMGS[key]}" x="${x}" y="0" width="${w}" height="${h}" style="image-rendering:${rendering}"/>`;
}
// For sprites that must show in full (no clipping):
// scale to fit entirely within the 120×100 viewBox, centered both axes.
function makeSvgFnFit(
  key: SpriteKey,
  natW: number,
  natH: number,
  rendering = 'auto',
): SvgFactory {
  const vbW = 120, vbH = 100;
  const scale = Math.min(vbW / natW, vbH / natH);
  const w = Math.round(natW * scale);
  const h = Math.round(natH * scale);
  const x = Math.round((vbW - w) / 2);
  const y = Math.round((vbH - h) / 2);
  return () => `<image href="${SPRITE_IMGS[key]}" x="${x}" y="${y}" width="${w}" height="${h}" style="image-rendering:${rendering}"/>`;
}
// Like makeSvgFnFit but horizontally flipped (faces left → faces right).
function makeSvgFnFitFlip(
  key: SpriteKey,
  natW: number,
  natH: number,
  rendering = 'auto',
): SvgFactory {
  const vbW = 120, vbH = 100;
  const scale = Math.min(vbW / natW, vbH / natH);
  const w = Math.round(natW * scale);
  const h = Math.round(natH * scale);
  const x = Math.round((vbW - w) / 2);
  const y = Math.round((vbH - h) / 2);
  return () => `<g transform="translate(${vbW},0) scale(-1,1)"><image href="${SPRITE_IMGS[key]}" x="${x}" y="${y}" width="${w}" height="${h}" style="image-rendering:${rendering}"/></g>`;
}

export const slimeSVG = makeSvgFn('slime', 'pixelated');

// ── Slime variant PNGs (dedicated sprites with white eyes) ──
export const slimeRedSVG    = makeSvgFn('slime_fire', 'pixelated');
export const slimeBlueSVG   = makeSvgFn('slime_water', 'pixelated');
export const slimeYellowSVG = makeSvgFn('slime_electric', 'pixelated');
export const slimeDarkSVG   = makeSvgFn('slime_dark', 'pixelated');
export const slimeSteelSVG  = makeSvgFn('slime_steel', 'pixelated');

export const fireLizardSVG = makeSvgFn('fire');
export const ghostSVG = makeSvgFn('ghost');
export const ghostLanternSVG = makeSvgFnFill('ghost_lantern', 677, 369);
export const dragonSVG = makeSvgFn('dragon', 'pixelated');
export const darkLordSVG = makeSvgFn('boss');
export const slimeEvolvedSVG = makeSvgFn('slime_evolved');
export const slimeElectricEvolvedSVG = makeSvgFn('slime_electric_evolved');
export const slimeFireEvolvedSVG = makeSvgFn('slime_fire_evolved');
export const slimeWaterEvolvedSVG = makeSvgFn('slime_water_evolved');
export const slimeSteelEvolvedSVG = makeSvgFn('slime_steel_evolved');
export const slimeDarkEvolvedSVG = makeSvgFn('slime_dark_evolved');
export const fireEvolvedSVG = makeSvgFn('fire_evolved');
export const ghostEvolvedSVG = makeSvgFn('ghost_evolved');
export const dragonEvolvedSVG = makeSvgFn('dragon_evolved');
export const playerfire0SVG = makeSvgFn('player_fire0');
export const playerfire1SVG = makeSvgFn('player_fire1');
export const playerfire2SVG = makeSvgFn('player_fire2');
export const playerwater0SVG = makeSvgFn('player_water0');
export const playerwater1SVG = makeSvgFn('player_water1');
export const playerwater2SVG = makeSvgFn('player_water2');
export const playergrass0SVG = makeSvgFn('player_grass0');
export const playergrass1SVG = makeSvgFn('player_grass1');
export const playergrass2SVG = makeSvgFn('player_grass2');
export const playerelectric0SVG = makeSvgFn('player_electric0');
export const playerelectric1SVG = makeSvgFn('player_electric1');
export const playerelectric2SVG = makeSvgFn('player_electric2');
export const playerlion0SVG = makeSvgFnFill('player_lion0', 677, 369);
export const playerlion1SVG = makeSvgFnFill('player_lion1', 677, 369);
export const playerlion2SVG = makeSvgFnFill('player_lion2', 677, 369);
export const playerwolf0SVG = makeSvgFn('player_wolf0');
export const playerwolf1SVG = makeSvgFn('player_wolf1');
export const playerwolf2SVG = makeSvgFn('player_wolf2');
export const bossHydraSVG = makeSvgFnFit('boss_hydra', 677, 369);
export const bossCrazyDragonSVG = makeSvgFnFitFlip('boss_crazy_dragon', 677, 369);
export const bossSwordGodSVG = makeSvgFnFill('boss_sword_god', 409, 610);
export const golumnSVG = makeSvgFn('golumn');
export const golumnMudSVG = makeSvgFn('golumn_mud');
