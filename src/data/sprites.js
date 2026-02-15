// Vite 會根據 vite.config.js 的 base 設定自動填入正確的前綴
// 本地開發時 BASE = '/'，GitHub Pages 部署時 BASE = './'
const BASE = import.meta.env.BASE_URL;

// Sprite image paths — loaded as static assets from public/
export const SPRITE_IMGS = {
  slime: `${BASE}sprites/slime.png`,
  fire: `${BASE}sprites/fire.png`,
  ghost: `${BASE}sprites/ghost.png`,
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
  dragon_evolved: `${BASE}sprites/dragon_evolved.png`,
  fire_evolved: `${BASE}sprites/fire_evolved.png`,
  ghost_evolved: `${BASE}sprites/ghost_evolved.png`,
};

export const BG_IMGS = {
  grass: `${BASE}backgrounds/grass.jpg`,
  fire: `${BASE}backgrounds/fire.jpg`,
  ghost: `${BASE}backgrounds/ghost.jpg`,
  steel: `${BASE}backgrounds/steel.jpg`,
  dark: `${BASE}backgrounds/dark.jpg`,
};

// SVG wrapper functions — return inner SVG markup using image paths
function makeSvgFn(key, rendering = 'auto') {
  return () => `<image href="${SPRITE_IMGS[key]}" x="0" y="0" width="120" height="100" style="image-rendering:${rendering}"/>`;
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
export const dragonSVG = makeSvgFn('dragon', 'pixelated');
export const darkLordSVG = makeSvgFn('boss');
export const slimeEvolvedSVG = makeSvgFn('slime_evolved');
export const slimeElectricEvolvedSVG = makeSvgFn('slime_electric_evolved');
export const slimeFireEvolvedSVG = makeSvgFn('slime_fire_evolved');
export const slimeWaterEvolvedSVG = makeSvgFn('slime_water_evolved');
export const slimeSteelEvolvedSVG = makeSvgFn('slime_steel_evolved');
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
