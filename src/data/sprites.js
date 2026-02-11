// Sprite image paths — loaded as static assets from public/
export const SPRITE_IMGS = {
  slime: '/sprites/slime.png',
  fire: '/sprites/fire.png',
  ghost: '/sprites/ghost.png',
  dragon: '/sprites/dragon.png',
  boss: '/sprites/boss.png',
  player_fire0: '/sprites/player_fire0.png',
  player_fire1: '/sprites/player_fire1.png',
  player_fire2: '/sprites/player_fire2.png',
  player_water0: '/sprites/player_water0.png',
  player_water1: '/sprites/player_water1.png',
  player_water2: '/sprites/player_water2.png',
  player_grass0: '/sprites/player_grass0.png',
  player_grass1: '/sprites/player_grass1.png',
  player_grass2: '/sprites/player_grass2.png',
  slime_evolved: '/sprites/slime_evolved.png',
  dragon_evolved: '/sprites/dragon_evolved.png',
  fire_evolved: '/sprites/fire_evolved.png',
  ghost_evolved: '/sprites/ghost_evolved.png',
};

export const BG_IMGS = {
  grass: '/backgrounds/grass.jpg',
  fire: '/backgrounds/fire.jpg',
  ghost: '/backgrounds/ghost.jpg',
  steel: '/backgrounds/steel.jpg',
  dark: '/backgrounds/dark.jpg',
};

// SVG wrapper functions — return inner SVG markup using image paths
function makeSvgFn(key, rendering = 'auto') {
  return () => `<image href="${SPRITE_IMGS[key]}" x="0" y="0" width="120" height="100" style="image-rendering:${rendering}"/>`;
}

export const slimeSVG = makeSvgFn('slime', 'pixelated');
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
