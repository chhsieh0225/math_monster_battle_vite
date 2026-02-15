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
  slime_evolved: `${BASE}sprites/slime_evolved.png`,
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

/**
 * Tinted slime variant — two-layer approach:
 *   Layer 1: feColorMatrix recolours the entire PNG (body changes colour).
 *   Layer 2: extracts only near-white pixels (eyes) from the original image
 *            and composites them on top, so eyes stay white.
 *
 * The "white extraction" filter uses feColorMatrix to measure luminance,
 * then feComponentTransfer with a steep discrete step to keep only pixels
 * whose RGB channels are all high (≥ ~0.75), i.e. white / near-white.
 */
let _svC = 0;
export function makeSlimeVariantSvg(matrix) {
  const fid = `sv${_svC++}`;
  const wf = `${fid}w`;          // white-extraction filter id
  return () =>
    `<defs>` +
      `<filter id="${fid}"><feColorMatrix type="matrix" values="${matrix.join(' ')}"/></filter>` +
      `<filter id="${wf}" color-interpolation-filters="sRGB">` +
        // Step 1: threshold each channel independently — ≥0.67 → 1, else → 0
        `<feComponentTransfer>` +
          `<feFuncR type="discrete" tableValues="0 0 1"/>` +
          `<feFuncG type="discrete" tableValues="0 0 1"/>` +
          `<feFuncB type="discrete" tableValues="0 0 1"/>` +
          `<feFuncA type="identity"/>` +
        `</feComponentTransfer>` +
        // Step 2: RGB→white, alpha = 2R+2G+2B−5 → only (1,1,1) yields alpha=1
        `<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2 2 2 0 -5"/>` +
      `</filter>` +
    `</defs>` +
    // Layer 1: tinted body
    `<image href="${SPRITE_IMGS.slime}" x="0" y="0" width="120" height="100" style="image-rendering:pixelated" filter="url(#${fid})"/>` +
    // Layer 2: white eyes overlay
    `<image href="${SPRITE_IMGS.slime}" x="0" y="0" width="120" height="100" style="image-rendering:pixelated" filter="url(#${wf})"/>`;
}

// Red slime (火): dedicated PNG with white eyes
export const slimeRedSVG = makeSvgFn('slime_fire', 'pixelated');
// Blue slime (水): green→blue
export const slimeBlueSVG = makeSlimeVariantSvg([
  0.2,0,0,0,0,  0,0.3,0,0,0,  0,1,0.3,0,0,  0,0,0,1,0,
]);
// Yellow slime (電): green→yellow
export const slimeYellowSVG = makeSlimeVariantSvg([
  0,1,0,0,0.1,  0,1,0,0,0,  0,0,0.15,0,0,  0,0,0,1,0,
]);
// Black slime (暗): desaturate+darken
export const slimeDarkSVG = makeSlimeVariantSvg([
  0.15,0.15,0.15,0,0,  0.1,0.1,0.1,0,0,  0.12,0.12,0.12,0,0,  0,0,0,1,0,
]);
// Steel slime (鋼): desaturate+lighten
export const slimeSteelSVG = makeSlimeVariantSvg([
  0.35,0.35,0.35,0,0.05,  0.33,0.33,0.33,0,0.05,  0.38,0.38,0.38,0,0.08,  0,0,0,1,0,
]);

export const fireLizardSVG = makeSvgFn('fire');
export const ghostSVG = makeSvgFn('ghost');
export const dragonSVG = makeSvgFn('dragon', 'pixelated');
export const darkLordSVG = makeSvgFn('boss');
export const slimeEvolvedSVG = makeSvgFn('slime_evolved');
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
