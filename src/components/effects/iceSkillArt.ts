import { line } from './signatureSkillArt.ts';
import type { SkillChoreography } from './skillChoreography.ts';

function iceEdge(ctx: CanvasRenderingContext2D, path: string, width = 1.2, alpha = 1) {
  ctx.save(); ctx.shadowColor = '#84ddff'; ctx.shadowBlur = 17;
  line(ctx, path, '#8ddcf2', width * 3, alpha * .34); ctx.restore();
  line(ctx, path, '#f0ffff', width, alpha);
}

function face(ctx: CanvasRenderingContext2D, path: string, colors: string[]) {
  const tint = ctx.createLinearGradient(-70, -85, 65, 82);
  colors.forEach((color, i) => tint.addColorStop(i / (colors.length - 1), color));
  ctx.fillStyle = tint; ctx.fill(new Path2D(path));
}

function glint(ctx: CanvasRenderingContext2D, x: number, y: number, strength: number) {
  ctx.save(); ctx.translate(x, y);
  const light = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
  light.addColorStop(0, '#ffffffbd'); light.addColorStop(.22, '#d7fbff62'); light.addColorStop(1, '#b3f2ff00');
  ctx.globalAlpha = strength; ctx.fillStyle = light; ctx.fillRect(-14, -14, 28, 28);
  line(ctx, 'M-7 2 7-2M-2-8 2 8', '#f6ffff', .8, .95); ctx.restore();
}

/** Alpha lives in the facets, not just the sprite: a thick rim surrounds a clear interior. */
function crystal(ctx: CanvasRenderingContext2D, frame: number, mirror = false, needle = false) {
  const outer = mirror ? 'M-46-83 41-77 66-48 57 64 28 84-50 73-66 43-63-54Z'
    : needle ? 'M-4-101 25-49 27 48 2 98-31 40-27-51Z'
      : 'M-30-70 21-82 60-41 48 46 8 73-44 53-61-6Z';
  const front = mirror ? 'M-43-68 36-63 48-43 41 57 22 67-40 56-49 35-47-46Z'
    : needle ? 'M-4-89 12-42 10 41 2 84-15 32-13-42Z'
      : 'M-25-49 14-61 39-32 28 32 4 53-29 33-39-7Z';
  face(ctx, outer, ['#dbfbffb0', '#83cfe343', '#24698e88']);
  // Clear out the broad face before painting it. Overlapping opaque washes would make blue stone.
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#fff'; ctx.fill(new Path2D(front)); ctx.restore();
  face(ctx, front, ['#defcff50', '#64c3e01a', '#7f97cc35', '#d4faff65']);
  ctx.save(); ctx.clip(new Path2D(outer));
  face(ctx, 'M-72-86 11-75-12 12-64 59Z', ['#eaffff60', '#b7eafa0a']);
  face(ctx, 'M19-83 65-45 46 63 9 81-11 13Z', ['#c7f2ff0b', '#4892b246', '#b1efff54']);
  const shift = [-37, -9, 22, 47][frame % 4];
  const reflection = ctx.createLinearGradient(shift - 26, -25, shift + 26, 10);
  reflection.addColorStop(0, '#eeffff00'); reflection.addColorStop(.4, '#e9ffff07');
  reflection.addColorStop(.49, '#f5ffff75'); reflection.addColorStop(.55, '#c6f3ff32');
  reflection.addColorStop(1, '#e0ffff00');
  ctx.fillStyle = reflection; ctx.fillRect(-90, -105, 180, 210);
  // Trapped hairline fractures, offset dark refraction and a few air inclusions.
  const crack = mirror ? 'M-38-48-17-29-21-8 0 5 8 33M-17-29 3-39 17-35M0 5 24-1 32 14M-21-8-34 3'
    : 'M-23-35-7-12-14 8 8 23 4 46M-7-12 15-25 29-20M-14 8-27 17M8 23 25 18';
  ctx.save(); ctx.translate(1.1, 1.4); line(ctx, crack, '#357293', .85, .38); ctx.restore();
  line(ctx, crack, '#dbffff', .7, .68);
  for (let i = 0; i < 11; i++) {
    const x = -28 + (i * 19 % 57), y = -48 + (i * 31 % 99);
    line(ctx, `M${x} ${y}l${1 + i % 2} -2`, '#e7ffff', .55, .3 + i % 3 * .12);
  }
  ctx.restore();
  line(ctx, outer, '#397991', 1.6, .62);
  iceEdge(ctx, front, .75, .65);
  iceEdge(ctx, mirror ? 'M-63 39-60-52-44-79 38-74 60-48M-49 69 27 81 55 62'
    : needle ? 'M-28 37-24-50-4-97 23-48M2 92 24 47'
      : 'M-58-6-28-67 20-78 56-40M-42 49 8 69 46 44', 1.7);
  iceEdge(ctx, mirror ? 'M-60-50-46-45M40-74 35-62M57-48 46-42M-49 68-40 55M29 79 23 66'
    : 'M-29-65-25-50M20-77 14-60M55-39 38-32M-41 49-29 32M8 69 4 53', 1.1, .9);
  // Small frosted corners keep the surface painted rather than a perfectly regular glass icon.
  line(ctx, mirror ? 'M-54-47-44-44-47-31M-45-44-37-53M39 49 30 57 34 64M30 57 17 56'
    : 'M-42-13-33-18-37-28M-33-18-23-21M22 44 28 36 35 39', '#ecffff', 1.8, .7);
  glint(ctx, mirror ? -44 : needle ? -4 : -28, mirror ? -78 : needle ? -95 : -65, .65 + frame % 2 * .25);
  glint(ctx, mirror ? 53 : needle ? 23 : 45, mirror ? 62 : needle ? 45 : 44, .6 - frame % 2 * .2);
}

function iceClaw(ctx: CanvasRenderingContext2D, frame: number) {
  const edge = 'M-89 83C-96 10-42-87 78-88';
  face(ctx, 'M-91 88C-101 8-47-92 89-94L62-77 43-66 26-41 9-39-5-15-23-8-32 15-52 31-66 64Z',
    ['#c8f7ff9c', '#76c8e636', '#d5f9ff24', '#5aa1c178']);
  face(ctx, 'M-89 83C-93 0-36-83 78-88Q-30-45-73 72Z', ['#eaffffb8', '#b7ecf35e', '#eaffff99']);
  face(ctx, 'M-79 61-61 29-53 10-36-10-22-17-9-40 9-41 32-69 58-78Q-31-27-79 61Z',
    ['#91b6d742', '#d5fcff17', '#549bb767']);
  iceEdge(ctx, edge, 1.9);
  iceEdge(ctx, 'M-65 56-60 31-43 17-37-8-18-14-10-35 9-40 28-62 44-69', .85, .75);
  line(ctx, 'M-73 41-63 29-66 10M-45-17-29-21-31-36M9-58 16-74 35-79', '#eeffff', .7, .75);
  const x = [-73, -54, -14, 39][frame];
  const y = [29, -14, -56, -79][frame];
  iceEdge(ctx, `M${x - 7} ${y + 7}q6-10 15-13`, 3, .85);
  glint(ctx, x, y, .9);
  line(ctx, 'M-88 43Q-69-47 41-91M-95 50Q-90-7-62-38', '#c6f5ff', .6, .4);
}

function caustic(ctx: CanvasRenderingContext2D, strength = 1) {
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 102);
  glow.addColorStop(0, '#d9ffff48'); glow.addColorStop(.4, '#7bdcfa24'); glow.addColorStop(1, '#72c2ef00');
  ctx.save(); ctx.globalAlpha = strength; ctx.fillStyle = glow; ctx.fillRect(-106, -106, 212, 212);
  iceEdge(ctx, 'M-79 7-53-17-28-10-9-39 23-30 37-6 67-17 82 6M-53-17-48 20-13 27-9-39M-13 27 12 48 37 21 37-6M37 21 68 31 82 6', 1, .75);
  line(ctx, 'M-79 7-64 31M12 48 6 61M23-30 38-51M68 31 80 40', '#ddffff', .65, .5); ctx.restore();
}

/** Eight pre-baked tiles share the existing atlas and sprite pool; no per-frame blur. */
export function paintIceTile(ctx: CanvasRenderingContext2D, tile: number, action: SkillChoreography['action']) {
  if (tile < 4) {
    if (action === 'claws') iceClaw(ctx, tile);
    else crystal(ctx, tile, action === 'mirror', action === 'rain');
  } else if (tile === 4) {
    crystal(ctx, 1);
  } else if (tile === 5) caustic(ctx);
  else if (tile === 6) {
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate(i * Math.PI * 2 / 5 + .19); ctx.translate(0, -57 - i % 2 * 14);
      ctx.scale(.22, .33); crystal(ctx, i % 4, false, true); ctx.restore();
    }
    caustic(ctx, .4);
  } else {
    const mist = ctx.createRadialGradient(0, 0, 2, 0, 0, 100);
    mist.addColorStop(0, '#edffff6b'); mist.addColorStop(.28, '#b5f1ff3b');
    mist.addColorStop(.62, '#80d1ec13'); mist.addColorStop(1, '#75bcdb00');
    ctx.fillStyle = mist; ctx.fillRect(-105, -105, 210, 210);
    line(ctx, 'M-80 22Q-22-12 67-27M-69 32Q-27 12 31 9M-24-31 2-39M46 32 63 26', '#d3faff', 1, .42);
  }
}
