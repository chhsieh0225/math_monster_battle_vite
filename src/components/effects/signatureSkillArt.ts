import { tidalSeed } from './skillEffectModel.ts';

export type SignatureArt = 'eruption' | 'wolf' | 'heavenfall';
export function getSignatureArt(skillId?: string): SignatureArt | null {
  if (skillId === 'fire:2') return 'eruption';
  if (skillId === 'wolf:0' || skillId === 'wolf:1' || skillId === 'wolf:2') return 'wolf';
  return skillId === 'boss_sword_god:3' ? 'heavenfall' : null;
}

export type Paint = [string, string, string];
const FIRE: Paint = ['#943832', '#e8792f', '#f7bc63'];
const STEEL: Paint = ['#324c60', '#9ab9c0', '#f5eed5'];
const GOLD: Paint = ['#695039', '#bda46d', '#fff2c8'];
const SMOKE: Paint = ['#393c44', '#707779', '#c2bfa8'];

/** Pigment stays in object space. All brushwork is baked, never repainted per frame. */
export function wash(ctx: CanvasRenderingContext2D, path: string, paint: Paint, seed = 0, edge = true) {
  const shape = new Path2D(path);
  ctx.save();
  const gradient = ctx.createLinearGradient(-55, 65, 45, -60);
  gradient.addColorStop(0, paint[0]); gradient.addColorStop(.52, paint[1]); gradient.addColorStop(1, paint[2]);
  ctx.fillStyle = gradient; ctx.fill(shape);
  if (edge) { ctx.strokeStyle = paint[0]; ctx.lineWidth = .7; ctx.stroke(shape); }
  ctx.clip(shape);
  for (let i = 0; i < 170; i++) {
    const x = tidalSeed(i + seed + 10) * 210 - 105;
    const y = tidalSeed(i + seed + 400) * 210 - 105;
    ctx.globalAlpha = .06 + tidalSeed(i + 900) * .13;
    ctx.strokeStyle = i % 3 ? paint[2] : paint[0];
    ctx.lineWidth = .3 + tidalSeed(i + 700) * 2.6;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 3, y - 7, x + 10, y - 6, x + 17, y - 19); ctx.stroke();
  }
  ctx.restore();
}

export function line(ctx: CanvasRenderingContext2D, path: string, color: string, width = 1, alpha = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
  ctx.stroke(new Path2D(path)); ctx.restore();
}

/** A moving reflection band is baked into each contour, retaining ink and brushed grain. */
export function metalWash(ctx: CanvasRenderingContext2D, path: string, frame = 0, seed = 0) {
  wash(ctx, path, ['#243848', '#73939e', '#dce9e3'], seed);
  ctx.save(); ctx.clip(new Path2D(path));
  const shift = [-29, -9, 17, 35, 8][frame % 5];
  const reflection = ctx.createLinearGradient(-77 + shift, -78, 69 + shift, 69);
  for (const [stop, color] of [[0, '#243543'], [.25, '#638692'], [.4, '#b1ced1'],
    [.47, '#fff9df'], [.52, '#effcff'], [.58, '#426273'], [.78, '#9cb9bd'], [1, '#303f4d']] as const) {
    reflection.addColorStop(stop, color);
  }
  ctx.globalAlpha = .72; ctx.fillStyle = reflection; ctx.fillRect(-110, -110, 220, 220);
  for (let i = 0; i < 7; i++) line(ctx, `M${-95 + i * 27} 82l79-159`, '#d7ebe4', .6, .19);
  ctx.restore();
}

/** Narrow edge light only. Both blur passes are baked once, not GPU post-processing. */
export function metalEdge(ctx: CanvasRenderingContext2D, path: string, width = 1.4, alpha = 1, gilded = false) {
  ctx.save(); ctx.shadowColor = gilded ? '#ffe09b' : '#b0e7ff'; ctx.shadowBlur = 42;
  line(ctx, path, gilded ? '#ffd789' : '#a0d8ee', width * 4, alpha * .42);
  ctx.shadowBlur = 15; line(ctx, path, gilded ? '#fff0be' : '#d3f4ff', width * 2, alpha * .78);
  ctx.restore(); line(ctx, path, '#fffcef', width, alpha);
}

export function metalFloorLight(ctx: CanvasRenderingContext2D, gilded = false) {
  const light = ctx.createRadialGradient(0, 0, 2, 0, 0, 101);
  light.addColorStop(0, '#fff8dc80'); light.addColorStop(.26, gilded ? '#f9d98655' : '#bddfee55');
  light.addColorStop(.66, gilded ? '#c9a55c1c' : '#83b8cd1c'); light.addColorStop(1, '#8bb9ca00');
  ctx.fillStyle = light; ctx.fillRect(-108, -108, 216, 216);
}

export function metalImpact(ctx: CanvasRenderingContext2D, gilded = false) {
  metalFloorLight(ctx, gilded);
  for (let i = 0; i < 7; i++) {
    ctx.save(); ctx.rotate(i * Math.PI * 2 / 7 + (i % 2) * .19);
    metalEdge(ctx, `M${12 + i % 3 * 6} 0Q43-4 ${69 + i % 3 * 10}-${9 + i % 2 * 8}`, 1.3 + i % 2 * .4, .94, gilded);
    line(ctx, 'M40 8 55 6M76-23 86-27', '#efd2a0', 1.2, .8);
    ctx.restore();
  }
}

export function metalChip(ctx: CanvasRenderingContext2D) {
  metalWash(ctx, 'M-9 30-13-20 3-42 12-13 6 22Z', 2, 27);
  metalEdge(ctx, 'M3-40 6-11 1 20', 2.4);
  metalEdge(ctx, 'M-2 23 0 40', 1.5, .82, true);
}

// Five different curling silhouettes, not one flame stretched into a pillar.
const FLAMES = [
  'M-73 84C-99 57-79 15-56 6C-68 34-42 39-43 5C-43-18-24-27-18-45C-10-19-31-5-14 16C8 34 27 9 11-9C-2-24 1-49 26-64C15-38 50-27 52-3C54 21 33 28 41 43C64 54 83 28 78 12C107 44 87 88 50 90Z',
  'M-71 83C-101 47-60 22-60-3C-40 14-56 33-34 32C-13 32-35-2-29-22C-21-54 17-56 4-90C47-63 1-47 18-25C45 6 65-18 54-35C88-14 45 26 58 41C71 57 82 37 90 27C96 66 64 96 28 90Z',
  'M-69 83C-102 55-76 25-82 0C-52 9-67 33-42 25C-20 17-37-5-42-18C-53-43-22-67-2-62C-22-51-29-27-9-26C14-24 26-42 13-59C8-73 17-92 33-96C21-71 52-66 55-41C56-18 23-7 40 13C55 31 81 16 79-6C108 32 67 41 72 59C80 86 35 96 3 87Z',
  'M-72 83C-96 46-63 40-69 12C-40 28-37 12-47-8C-64-35-37-55-18-57C-29-33-9-22 9-34C26-48 9-63-2-69C31-89 60-52 35-27C11-2 29 16 44 1C68-22 56-40 72-49C70-13 93-11 82 14C69 39 49 36 57 54C77 74 90 60 94 49C91 86 44 94 11 86Z',
  'M-74 82C-100 65-85 38-60 24C-68 53-32 42-45 17C-64-13-34-27-39-53C-5-36-28-12-7-2C16 7 36-9 22-26C-6-53 24-71 36-84C29-57 56-53 57-32C58-8 44 9 61 19C78 26 85 9 85 0C106 32 80 49 75 58C77 85 36 97 5 86Z',
];

export function fireFrame(ctx: CanvasRenderingContext2D, frame: number) {
  wash(ctx, FLAMES[frame], FIRE, frame * 19, false);
  const curl = frame % 2 ? 7 : -7;
  wash(ctx, `M-54 82C-72 56-32 44-37 20C-13 37-28 48-5 53C24 60 30 32 17 12C50 27 37 57 55 64L67 57Q72 87 17 87Z`, ['#e76d32', '#ffc35d', '#fff3c9'], 30 + frame, false);
  wash(ctx, `M-27 84C-47 68-13 61-16 45C7 61-5 66 16 68C32 70 35 56 34 47Q57 78 22 86Z`, ['#ffc464', '#ffe4a0', '#fff9dc'], 8, false);
  for (let i = 0; i < 8; i++) {
    const x = -63 + i * 17;
    line(ctx, `M${x} 80C${x - 23} 52 ${x + 26} 38 ${x + curl} ${8 - i % 3 * 15}`, '#ffe5a2', 1.1, .54);
  }
  // Detached tongues break the silhouette without a screen-space sparkle cloud.
  wash(ctx, `M-65-18Q-87-38-61-55Q-74-35-58-28Z M65-49Q85-71 67-89Q94-67 75-44Z`, FIRE, frame, false);
}

function slashFrame(ctx: CanvasRenderingContext2D, frame: number) {
  const tips = [[-40, -52], [13, -83], [75, -60], [100, -12], [85, 55]];
  const [x, y] = tips[frame];
  const path = `M-94 71C-89-13-33-106 ${x} ${y}C${x - 25} ${y - 1} -52-60-94 71Z`;
  metalWash(ctx, path, frame, 24 + frame);
  metalEdge(ctx, `M-92 67C-69-12-20-75 ${x} ${y}`, 2.1);
  line(ctx, `M-89 49C-80-17-18-89 ${x - 9} ${y - 2}`, '#55818e', 1.3, .8);
  line(ctx, `M-72 70C-39 22 5-12 ${x - 12} ${y + 15}`, '#c3cbd0', .8, .52);
  for (let i = 0; i < 6; i++) {
    line(ctx, `M${-89 + i * 6} ${51 - i * 9}Q-53-46 ${x - 15 - i * 5} ${y + 2 + i}`, i % 2 ? '#e9e4cb' : '#4f7280', .5, .64);
  }
}

function sword(ctx: CanvasRenderingContext2D, dark = false) {
  wash(ctx, 'M0 95-12 64-10-43-19-47-16-55-7-52-6-75-9-81 0-91 9-81 6-75 7-52 16-55 19-47 10-43 12 64Z', dark ? ['#293747', '#738995', '#b7c7c7'] : STEEL);
  wash(ctx, 'M0 93-7 62-6-42 0-48Z', ['#94b8bf', '#d9e5db', '#fff8dc'], 33);
  metalWash(ctx, 'M0 95-12 64-10-43 0-48 10-43 12 64Z', dark ? 1 : 2, 33);
  metalEdge(ctx, 'M-9-40-10 63 0 94 11 63M0-34V81', 1.2, dark ? .75 : 1, true);
  wash(ctx, 'M-30-51-15-60-7-53 0-57 7-53 15-60 30-51 23-44 9-46 0-37-9-46-23-44Z', GOLD, 73);
  wash(ctx, 'M-5-77 0-83 5-77 4-59 0-56-4-59Z', GOLD, 24);
  wash(ctx, 'M0-55 5-49 0-42-5-49Z', ['#1f5568', '#589eac', '#d3ebe0']);
  line(ctx, 'M0-34V79 M-3-71H3 M-3-65H3 M-5-19 0-25 5-19 0-13Z M-5 0 0 6 5 0 M-4 23 0 28 4 23', '#f4e3aa', .8);
}

function groundSeal(ctx: CanvasRenderingContext2D, kind: SignatureArt) {
  const paint = kind === 'eruption' ? FIRE : kind === 'heavenfall' ? GOLD : STEEL;
  if (kind !== 'eruption') metalFloorLight(ctx, kind === 'heavenfall');
  wash(ctx, 'M-90 12C-107-58-24-94 31-76L17-75C-42-81-95-34-90 12Z M-79 39Q-36 87 48 49L66 38Q2 99-58 67Z M54-72Q97-42 84 22L79 32Q90-26 54-72Z', paint, 2, false);
  line(ctx, 'M-88 21Q-110-21-75-53M-51 73Q-18 85 18 71M94-8 89 17', paint[1], .9, .65);
  line(ctx, 'M-78 5-45-9-34 4-4-8 8 5 32-7 41 9 77-3 M-7-59 3-29-8-14 1 9-9 36 8 63', paint[0], 2.4, .85);
  line(ctx, 'M-77 3-44-11-33 2-3-10 9 3 32-9', paint[2], 1.2, .85);
}

/** Eight 512px cells share a single 8 MiB atlas. Original actor artwork is untouched. */
export function paintSignatureAtlas(kind: SignatureArt, night = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Signature pigment texture unavailable');
  for (let tile = 0; tile < 8; tile++) {
    ctx.save();
    ctx.beginPath(); ctx.rect(tile % 4 * 512, Math.floor(tile / 4) * 512, 512, 512); ctx.clip();
    ctx.translate(tile % 4 * 512 + 256, Math.floor(tile / 4) * 512 + 256);
    ctx.scale(2.35, 2.35); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (tile < 5 && kind === 'eruption') fireFrame(ctx, tile);
    else if (tile < 5 && kind === 'wolf') slashFrame(ctx, tile);
    else if (kind === 'heavenfall' && tile < 2) sword(ctx, tile === 1);
    else if (kind === 'heavenfall' && tile === 2) {
      wash(ctx, 'M-5 88-19-87-8-49-2-101 4-50 13-85 7 88Z', STEEL, 21, false);
    } else if (kind === 'heavenfall' && tile === 4 || kind === 'wolf' && tile === 6) {
      metalImpact(ctx, kind === 'heavenfall');
    } else if (tile === 5) groundSeal(ctx, kind);
    else if (tile === 7) {
      if (kind === 'eruption') wash(ctx, 'M-7 29Q-20 9 0-28Q-3-9 10-3Q23 12 2 30Z', FIRE, 27);
      else metalChip(ctx);
    } else {
      wash(ctx, 'M-88 14C-99-11-73-36-47-23C-59-54-17-70 3-40C28-66 67-37 53-16C92-31 109 9 82 28Q42 55 8 28Q-45 50-88 14Z', night ? ['#3c4d5b', '#83928f', '#c8ccb5'] : SMOKE, 57, false);
      line(ctx, 'M-78 6C-96-13-51-38-41-9M-32-13C-47-45 7-52 7-19M21-12C16-35 63-28 55 4M16 13Q49 35 80 14', '#ddd7bc', 1.2, .48);
    }
    ctx.restore();
  }
  return canvas;
}
