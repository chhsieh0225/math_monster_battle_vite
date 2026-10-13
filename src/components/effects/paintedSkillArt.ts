import type { SkillMotif, SkillRecipe } from './skillRecipes.ts';
import { tidalSeed, getEffectLighting } from './skillEffectModel.ts';

// Authored silhouettes, not generated pictures or a stock glow recolored per element.
const FORMS: Record<SkillMotif, string> = {
  flame: 'M44 4Q30-27 4-17L-17-39-13-15-43-23-26-3-51 13-19 16-25 33 0 22Q29 33 44 4Z',
  meteor: 'M30-2Q29-31-2-26L-53-45-30-18-63-20-30 5-53 13-8 24Q27 32 30-2Z',
  bubble: 'M29-4C29-39-30-36-31-2S31 37 29-4ZM-21-11Q-19-22-7-24',
  tide: 'M-48 37C-21 15-26-28 7-39C37-51 49-21 26-11Q10-8 19-23Q28-29 30-19C40-38 13-38 10-14C7 14 37 29 49 38Z',
  vortex: 'M-47 19C-55-31 31-54 45-19C56 7 7 33-14 16C-34 2-7-24 11-13C-4-11-10-1-1 4C24 17 48-9 25-20C-3-31-35-9-34 11Z',
  leaf: 'M43-30Q-39-42-45 29Q13 40 43-30ZM-40 25 35-25M-16 5-20-16M1-6 22 0',
  vine: 'M-47 29C-31-32-13-41 3-7S22 34 44-28L47-21C25 51 6 30-3-4S-24-22-39 31ZM-29-10-45-24-22-21M13 8 37 5 22 25',
  thorn: 'M-43 39-31-2-41-19-17-5-7-46 8-13 32-37 23-3 44-15 31 39Z',
  spark: 'M-33 4-43-11-22-18-17-40 1-27 21-40 23-15 43-8 30 9 39 27 12 23-2 42-17 22-41 26Z',
  bolt: 'M-13-49-1-22-10-24 8-1 0-3 7 48-10 7-3 11-20-23-9-18-22-47ZM-8-23-36-31-26-3-12 8-19-7-28-24ZM4 0 33-22 28-6 44-5 15 13 20 3 6 13Z',
  chain: 'M-34-18Q-44-1-26 10L0 25Q22 31 28 10Q30 0 19-8L-7-25Q-22-34-34-18ZM-24-13Q-19-21-11-16L14 1Q25 12 13 16L-15 0Q-29-5-24-13Z',
  claw: 'M-42-38Q-18-6 40 29L8 18Q-29-2-42-38ZM-15-43Q8-12 43 4L21 3Q-8-12-15-43ZM-48-10Q-20 16 12 39L-8 30Q-43 9-48-10Z',
  roar: 'M-17-47Q54-2-12 47L0 22Q28-2-2-25Z',
  eclipse: 'M15-40C-37-54-60 23-8 42Q-25 18-12-3T15-40ZM18-31Q48-6 21 27L31 5Z',
  blade: 'M-49 35Q-14-32 47-35Q20-2-49 35ZM-42 29Q-8-12 38-29',
  frost: 'M43 0 10-28-28-19-46 0-23 25 13 24ZM43 0-46 0M10-28-9 0 13 24M-28-19-9 0-23 25',
  mirror: 'M-25-42 24-38 40-4 25 36-24 40-41 3ZM-18-29 17-28 28-3 18 26-17 28-29 2ZM-12 14 17-16',
  storm: 'M-45 21C-57-24 28-52 46-22Q58 1 35 24L43 9C49-21 13-28-18-12Q-34-3-34 14ZM0-43 16-18 2-18 19 10 1 5 9 39-18 7-5 9-21-21-9-18Z',
  breath: 'M-49-8Q-11-41 14-20L7-37 37-19Q55-10 43 10L50 24Q19 32 1 15L-2 34-28 13Z',
  fang: 'M-43-35-28 33-10-23Q-26-13-43-35ZM43-35 26 33 10-23Q28-13 43-35ZM-11-34 0 25 12-34Z',
  venom: 'M-42 27Q-45-8-20-19L-7-43 10-21Q41-17 45 27Q15 42-42 27ZM-18 0Q-11-15-6-4',
  serpent: 'M-40 40C-58-9-32-48-8-37C15-31 6-7-11-13L-23-8-33-21-18-29C-43-35-47 9-28 36ZM-23-22-12-18-19-13Z',
  wing: 'M45 25 10-10-6-37-18-9-45-39-29-9-49-20-30 10-48 7-22 30 0 20Z',
  rift: 'M-2-49 7-13 46-2 9 8 1 48-7 13-46 4-11-7ZM-40-36 15 17 39 37-21-18Z',
  sword: 'M1-49 10-31 5 14 19 17 17 22 4 20 3 42-3 42-4 20-18 22-19 17-5 14-8-31ZM1-40 0 11',
  slime: 'M-45 23Q-42-13-23-7Q-16-42 5-31Q15-13 27-18Q45-12 46 23Q9 43-45 23Z',
  wisp: 'M12-45Q34-25 29 0L43 19 22 17 11 38 0 23-20 41-20 18-43 28-32 2Q-21-10-19-29L-6-20ZM0-8 6-3M17-7 13-2',
  spore: 'M-45-3Q-33-43-1-39Q34-38 44-2L8 4 13 37Q2 43-11 36L-7 4ZM-30-13Q-26-29-15-26M2-29 10-25',
  stone: 'M-40-17-14-39 24-30 43-1 24 35-14 41-43 15ZM-14-39-4 0 24 35M-4 0-43 15M-4 0 43-1',
  mud: 'M-46 31Q-37-23-17-22L-8-4 6-36Q29-36 43 16L49 32Q15 46-46 31Z',
  candy: 'M-25-23 25-21 28 24-25 24ZM-25-14-46-30-39 26-25 12M25-12 43-31 44 26 28 15M-18-20 7 23M0-21 22 10',
  butterfly: 'M0 0C-43-52-52-17-24 4Q-48 17-24 35Q-6 40 0 0C43-52 52-17 24 4Q48 17 24 35Q6 40 0 0Z',
  calculus: 'M-47 34Q-22-48 44-34Q14-9-47 34ZM-24 29C9 20-12-25 19-29M-36 9 34 9',
  knot: 'M-36-1C-34-42-7-30 11-1S46 36 37 0-6-29-11 0-44 41-36-1ZM-11-39Q39-12 14 36Q-39 14-11-39Z',
  matrix: 'M-38-37H38V37H-38ZM-12-35V35M12-35V35M-36-12H36M-36 12H36M-47-45H-41V45H-47M47-45H41V45H47',
  crescent: 'M-14-44Q46-32 40 7Q34 39-18 44Q18 13 12-4Q12-27-14-44Z',
};

const TONES: Record<string, string> = {
  fire: '#ce663e', water: '#438fa6', grass: '#729a50', electric: '#c9a348',
  ice: '#81bec9', steel: '#87969e', light: '#d1ac61', dark: '#73667e',
};
function mix(a: string, b: string, ratio: number) {
  const color = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(color(a, i) * (1 - ratio) + color(b, i) * ratio).toString(16).padStart(2, '0')).join('')}`;
}

export function paintedPalette(recipe: SkillRecipe, type: string) {
  const pigment = mix(recipe.tone || TONES[type] || TONES.dark, '#8a806f', .22);
  if (recipe.motif === 'flame' || recipe.motif === 'meteor') {
    if (type === 'dark') return { ink: '#242638', shade: '#5b3d47', pigment: '#b76b4f', light: '#d49c66', highlight: '#f3d5a0' };
    return { ink: '#543443', shade: '#a54435', pigment: '#e67e3b', light: '#f3bc65', highlight: '#fff0b9' };
  }
  if (recipe.motif === 'bolt' || recipe.motif === 'spark') {
    return { ink: '#746448', shade: '#bf903d', pigment: '#e5c675', light: '#fff1bb', highlight: '#fff8d9' };
  }
  return { ink: mix(pigment, '#192938', .78), shade: mix(pigment, '#293a49', .55), pigment,
    light: mix(pigment, '#f0dfa9', .48), highlight: mix(recipe.accent || '#eee5c7', '#e4dcc1', .42) };
}

const BRUSH = 'M-49 27C-30-19 4-39 47-23Q7-24-31 14L-18 11-42 29ZM-39 33Q1-2 39-7Q15 7-39 33Z';
const CHIP = 'M-12-30 17-19 13 8-9 31-15 7ZM-7-21 7-14 2 11Z';
const FIRE_PILLAR = 'M-31 40C-51 13-10-5-23-34C0-27 8-7 4 7C20-6 12-30 21-48C45-13 27 2 37 16C48 33 25 47-1 45Z';
const DROP = 'M0-34C-7-17-22 3-13 18C-5 34 17 24 17 10Q19-3 0-34Z';

/** Four 512px tiles, baked once: moving form, individual skill seal, dry brush, debris. */
export function paintSkillAtlas(recipe: SkillRecipe, type: string, lighting: ReturnType<typeof getEffectLighting> = 'neutral'): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Painted skill texture unavailable');
  const colors = paintedPalette(recipe, type);
  if (lighting === 'sunlit') colors.ink = mix(colors.ink, '#25313e', .24);
  if (lighting === 'night') colors.highlight = mix(colors.highlight, '#edf2e5', .24);
  const particle = ['leaf', 'frost', 'stone', 'butterfly', 'candy', 'wing'].includes(recipe.motif) ? FORMS[recipe.motif]
    : recipe.motif === 'vine' ? FORMS.leaf : ['venom', 'slime', 'serpent', 'bubble'].includes(recipe.motif) ? DROP : CHIP;
  const uprightFlame = recipe.motif === 'flame' && recipe.motion === 'field';
  const paths = [uprightFlame ? FIRE_PILLAR : FORMS[recipe.motif], recipe.mark, BRUSH, particle];
  paths.forEach((path, tile) => {
    ctx.save(); ctx.translate((tile % 2) * 512 + 256, Math.floor(tile / 2) * 512 + 256); ctx.scale(4.5, 4.5);
    const shape = new Path2D(path);
    const pigment = ctx.createLinearGradient(-24, -46, 26, 46);
    pigment.addColorStop(0, colors.light); pigment.addColorStop(.34, colors.pigment);
    pigment.addColorStop(.78, colors.shade); pigment.addColorStop(1, colors.ink);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.fillStyle = pigment; ctx.fill(shape, 'evenodd');
    ctx.strokeStyle = colors.ink; ctx.lineWidth = lighting === 'sunlit' ? 2 : 1.3; ctx.stroke(shape);
    if (tile === 0 && recipe.motif === 'mirror') {
      ctx.globalAlpha = .38; ctx.fillStyle = colors.light;
      ctx.fill(new Path2D('M-18-29 17-28 28-3 18 26-17 28-29 2Z'));
      ctx.fillStyle = colors.highlight;
      ctx.fill(new Path2D('M-18-29 17-28-17 28-29 2Z'));
      ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.clip(shape, 'evenodd');
    // Broad, directional underpainting and broken dry-brush marks, not screen-space noise.
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = i % 2 ? colors.light : colors.shade; ctx.globalAlpha = .2;
      ctx.lineWidth = 4 + tidalSeed(i + 18) * 9;
      ctx.beginPath(); ctx.moveTo(-50, -33 + i * 13); ctx.bezierCurveTo(-17, -24 + i * 9, 4, -36 + i * 13, 52, -43 + i * 13); ctx.stroke();
    }
    if (tile === 0) {
      ctx.globalAlpha = .88; ctx.fillStyle = colors.light;
      if (recipe.motif === 'flame' || recipe.motif === 'meteor') {
        ctx.fill(new Path2D(uprightFlame
          ? 'M-21 41C-32 20-4 12-12-9Q12 1 9 21Q31 0 24-19C44 18 20 52-21 41Z'
          : 'M-43 5Q-16-10 1-5L-12-18Q23-11 36 5Q17 25-11 15L-3 8Z'));
        ctx.fillStyle = colors.highlight;
        ctx.fill(new Path2D(uprightFlame
          ? 'M-7 42Q-21 26 3 16Q1 29 15 25Q22 44-7 42Z'
          : 'M-22 7Q0-6 24 5Q9 16-6 10Z'));
        for (let i = 0; i < 16; i++) {
          ctx.globalAlpha = i % 3 ? .27 : .45;
          ctx.strokeStyle = i % 3 ? colors.highlight : colors.shade;
          ctx.lineWidth = i % 3 ? .7 : 1.8;
          const offset = i * 4;
          ctx.beginPath();
          if (uprightFlame) {
            ctx.moveTo(-34 + offset, 43);
            ctx.bezierCurveTo(-17 + offset, 20, -45 + offset, -6, -22 + offset, -44);
          } else {
            ctx.moveTo(-49, -24 + offset);
            ctx.bezierCurveTo(-10, -33 + offset * .6, 6, -18 + offset * .5, 43, -12 + offset * .4);
          }
          ctx.stroke();
        }
      } else if (recipe.motif === 'bolt' || recipe.motif === 'spark') {
        ctx.fillStyle = colors.highlight;
        ctx.fill(new Path2D('M-14-49-8-25-14-26 2 0-3-1 6 44-3 8 1 10-13-21-8-19Z'));
      } else if (['frost', 'stone', 'mirror', 'matrix', 'sword', 'blade'].includes(recipe.motif)) {
        ctx.globalAlpha = .55;
        ctx.fill(new Path2D('M-43-36 8-39-9 0-35 26ZM9-34 38-13 2-2Z'));
        ctx.strokeStyle = colors.highlight; ctx.lineWidth = 1.4;
        ctx.stroke(new Path2D('M-37 26-8-1 21-30M-8-1 30 28M-29-21 4-7'));
      } else {
        ctx.globalAlpha = .58; ctx.strokeStyle = colors.highlight; ctx.lineWidth = 2;
        ctx.stroke(new Path2D('M-34 19Q-23-21 12-25M-29 29Q-2 21 28 6M-21 16Q-7-4 18-7'));
      }
    }
    for (let i = 0; i < 125; i++) {
      const x = tidalSeed(i + 10) * 110 - 55, y = tidalSeed(i + 310) * 110 - 55;
      ctx.globalAlpha = .045 + tidalSeed(i + 510) * .13;
      ctx.strokeStyle = i % 3 ? colors.highlight : colors.ink; ctx.lineWidth = .2 + tidalSeed(i + 610) * .8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 + tidalSeed(i + 100) * 13, y - 2); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = lighting === 'night' ? .8 : .6; ctx.strokeStyle = colors.highlight; ctx.lineWidth = .7;
    ctx.setLineDash([9, 2, 3, 1]); ctx.stroke(shape);
    ctx.restore();
  });
  return canvas;
}
