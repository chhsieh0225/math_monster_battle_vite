import { line } from './signatureSkillArt.ts';
import { clamp01, getPaintedFrame, tidalSeed } from './skillEffectModel.ts';
import type { BattleEffectClock, TidalLayout } from './skillEffectModel.ts';
import type { SkillAction } from './skillChoreography.ts';
import type { PlacePigment } from './signatureSkillMotion.ts';

const TAU = Math.PI * 2;
const ease = (t: number) => 1 - (1 - clamp01(t)) ** 3;

function lightStroke(ctx: CanvasRenderingContext2D, path: string, width = 1.2, alpha = 1) {
  ctx.save(); ctx.shadowColor = '#ffe5ab'; ctx.shadowBlur = 24;
  line(ctx, path, '#eabe73', width * 4, alpha * .32); ctx.restore();
  line(ctx, path, '#b79559', width * 3.6, alpha * .32);
  line(ctx, path, '#ffeac1', width * 2, alpha * .65);
  line(ctx, path, '#fffff0', width, alpha);
}

function veil(ctx: CanvasRenderingContext2D, path: string) {
  const paint = ctx.createLinearGradient(-65, 50, 45, -65);
  paint.addColorStop(0, '#d5ad5720'); paint.addColorStop(.36, '#ffe7ae55');
  paint.addColorStop(.61, '#ffffeaa8'); paint.addColorStop(.77, '#e0f3ff32'); paint.addColorStop(1, '#fff1bd05');
  ctx.fillStyle = paint; ctx.fill(new Path2D(path));
}

function radiance(ctx: CanvasRenderingContext2D, eclipse = false) {
  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 103);
  glow.addColorStop(0, '#ffffe500'); glow.addColorStop(.38, '#ffedb60a');
  glow.addColorStop(.65, eclipse ? '#fff0bc55' : '#fff0bc38'); glow.addColorStop(.79, '#eacc8229');
  glow.addColorStop(1, '#e5c17400');
  ctx.fillStyle = glow; ctx.fillRect(-108, -108, 216, 216);
}

function solarRing(ctx: CanvasRenderingContext2D, frame: number, eclipse = false) {
  radiance(ctx, eclipse);
  if (eclipse) {
    line(ctx, 'M0-65A65 65 0 1 0 0 65A65 65 0 1 0 0-65', '#292f50', 9, .7);
    line(ctx, 'M-6-61A62 62 0 0 0-42 43', '#71739d', 3, .6);
  }
  const band = ctx.createRadialGradient(-6, -9, 46, 0, 0, 77);
  band.addColorStop(0, '#e6f5ff00'); band.addColorStop(.2, '#fff9dd14');
  band.addColorStop(.57, '#ffffeac7'); band.addColorStop(.73, '#ffeec48f'); band.addColorStop(1, '#dbb36a00');
  ctx.fillStyle = band;
  ctx.fill(new Path2D('M-10-76C-61-74-83-32-72 18C-61 68-20 84 23 68C66 53 80 13 67-26C57-59 31-73-10-76ZM-7-56C26-58 48-37 51-9C59 24 35 52 5 55C-28 59-53 32-55 4C-59-30-35-52-7-56Z'), 'evenodd');
  // Open pressure corona: no opaque disc, spinning runes or uniform spoke wheel.
  lightStroke(ctx, 'M-9-68C-49-68-74-34-68 9C-65 51-27 75 11 67C51 63 72 30 67-10C64-42 40-63 17-67', 3.1);
  lightStroke(ctx, 'M-59-24Q-68 23-39 48M39-48Q67-22 57 19M-24 59Q13 70 40 47', .8, .6);
  const rays = eclipse ? 19 : 9;
  for (let i = 0; i < rays; i++) {
    const seed = tidalSeed(i + 681), ray = 7 + seed * 21;
    ctx.save(); ctx.rotate(i / rays * TAU + seed * .07);
    veil(ctx, `M-2-73Q-5-${79 + ray * .4} 0-${75 + ray}L3-72Z`);
    lightStroke(ctx, `M0-75Q${seed * 3}-82 0-${75 + ray}`, .6 + seed * .55, .38 + seed * .42);
    ctx.restore();
  }
  const angle = [-1.9, -1.55, -.95, -.4][frame];
  ctx.save(); ctx.translate(Math.cos(angle) * 68, Math.sin(angle) * 68);
  lightStroke(ctx, 'M-9 0H9M0-13V13', 1.1, .94); ctx.restore();
}

function lionCrest(ctx: CanvasRenderingContext2D) {
  radiance(ctx);
  // A sparse, hand-drawn lion visage with a crown-shaped mane; the face remains clear.
  veil(ctx, 'M-18-43-40-67-39-31-69-39-51-8-74 7-49 23-52 52-27 43 0 79 27 43 52 52 49 23 74 7 51-8 69-39 39-31 40-67 18-43 0-83Z');
  lightStroke(ctx, 'M-18-43-40-67-39-31M18-43 40-67 39-31M-15-51 0-80 15-51', 1.25);
  lightStroke(ctx, 'M-37-28-59-34-43-5-60 10-38 23-41 43-22 37 0 69 22 37 41 43 38 23 60 10 43-5 59-34 37-28', 1.1, .8);
  lightStroke(ctx, 'M-27-20-12-13-7 3M27-20 12-13 7 3M-23-1-29 18-14 34 0 39 14 34 29 18 23-1', 1.4);
  lightStroke(ctx, 'M-8 7H8L0 16ZM0 16V23M-15 23Q-8 29 0 23Q8 29 15 23', 1.15);
  line(ctx, 'M-25-17-14-13M25-17 14-13', '#ffffed', 2.2, .94);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    line(ctx, 'M33-15 44-21M33 29 39 34M20 44 26 56M54-2 62 1', '#e8c98b', .75, .55); ctx.restore();
  }
}

function solarClaw(ctx: CanvasRenderingContext2D, frame: number) {
  veil(ctx, 'M-88 83C-79-19-12-97 94-83Q14-56-27-5Q-65 40-88 83Z');
  lightStroke(ctx, 'M-86 79C-65-21 1-86 90-82', 2.5);
  lightStroke(ctx, 'M-82 66Q-39-22 54-69', 1, .57);
  for (let i = 0; i < 5; i++) {
    line(ctx, `M${-84 + i * 4} ${64 - i * 13}Q-44-36 ${26 + i * 9}-${68 + i * 2}`,
      i % 2 ? '#cee7f1' : '#fff3cc', .5, .4);
  }
  const x = [-62, -34, 14, 65][frame], y = [10, -29, -61, -78][frame];
  lightStroke(ctx, `M${x - 4} ${y + 9}l8-18`, 1.5, .85);
}

function solarRush(ctx: CanvasRenderingContext2D, frame: number) {
  const curl = [-6, 6, 11, -2][frame];
  const glow = ctx.createRadialGradient(23, -10, 4, 18, -7, 91);
  glow.addColorStop(0, '#ffffdf80'); glow.addColorStop(.3, '#fff2c15c');
  glow.addColorStop(.63, '#f7d48e24'); glow.addColorStop(1, '#e4b96400');
  ctx.fillStyle = glow; ctx.fillRect(-108, -108, 216, 216);
  veil(ctx, `M-98 27Q-46 19-55-22Q-31 7-15-13Q-22-57 23-75L17-44Q52-65 61-31Q85-35 92-7L74 10 59 9Q72 40 38 59Q50 26 22 35Q-7 75-50 62Q-18 38-45 37Z`);
  lightStroke(ctx, `M-87 26Q-36 ${9 + curl}-30-13Q-30-46 11-64M-43 55Q2 51 12 24M25-49Q52-54 55-25L78-19 87-7 70 3 58-1`, 1.8);
  lightStroke(ctx, 'M39-18 48-15M55 13Q61 32 40 48M-72 13Q-61-4-67-25', 1.2);
  veil(ctx, 'M-56 35Q-6 26-19-5Q-15-33 16-48Q-1-25 23-20Q42-31 59-13L70-5 53 4Q30-7 17 13Q6 39-21 46L-4 25Z');
  lightStroke(ctx, 'M-33 35Q1 17-5-3Q-3-27 16-35M30-14 55-9', 3.2, .9);
  line(ctx, 'M-75 37Q-24 44-9 15M-50 12Q-9 6-2-36M6 46 25 38', '#edffff', .8, .6);
}

/** Lion-only light material; eight baked tiles, normal alpha and no runtime bloom. */
export function paintSolarTile(ctx: CanvasRenderingContext2D, tile: number, action: SkillAction) {
  if (tile < 4) {
    if (action === 'claws') solarClaw(ctx, tile);
    else if (action === 'surge') solarRush(ctx, tile);
    else solarRing(ctx, tile, action === 'vortex');
  } else if (tile === 4) {
    veil(ctx, 'M0-65Q19-15 0 53Q-12 7 0-65Z');
    lightStroke(ctx, 'M0-48Q3-5 0 30', 2);
  } else if (tile === 5) {
    radiance(ctx);
    lightStroke(ctx, 'M-76 25C-104-10-59-62 0-65Q57-66 85-20M75 34Q25 73-38 54M-62 43-48 50', 1.3, .65);
    line(ctx, 'M-34-27-8-16 18-26 43-10M-8-16-12 9 13 24 39 8', '#fff0c7', .8, .45);
  } else if (tile === 6) {
    solarRing(ctx, 1, action === 'vortex');
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate(i * TAU / 5 + .3);
      lightStroke(ctx, 'M7-22Q-2-39 1-52', 1.1, .7); ctx.restore();
    }
  } else lionCrest(ctx);
}

/** A physical pounce, a mouth-originating roar, a solar hunt and an eclipse climax. */
export function drawSolarSkill(clock: BattleEffectClock, layout: TidalLayout, put: PlacePigment, action: SkillAction) {
  const f = getPaintedFrame(clock);
  const { source: a, target: b, width, height, direction: dir } = layout;
  const size = Math.min(width * .43, height * .4, b.size * 1.16, 218);
  const sx = a.cx + dir * a.size * .22, sy = a.cy - a.size * .06;
  const dx = b.cx - sx, dy = b.cy - sy, angle = Math.atan2(dy, dx);
  const { contact, contactAge: age, flight: p, tier, fade } = f;
  const phase = (contact ? age : f.age) / 480;
  const floor = Math.min(height - 14, b.cy + b.size * .29);
  const targetX = b.cx - dir * size * .12;
  const form = (x: number, y: number, w: number, h: number, turn: number, alpha: number, offset = 0, flip = 1) => {
    const frame = ((phase + offset) % 1) * 4, index = Math.floor(frame), mix = frame - index;
    const opacity = clamp01(alpha);
    put(index, x, y, w, h, turn, opacity * (1 - mix) / Math.max(.001, 1 - opacity * mix), flip);
    put((index + 1) % 4, x, y, w, h, turn, opacity * mix, flip);
  };
  const crest = (x: number, y: number, s: number, alpha: number) => put(7, x, y, s, s, 0, alpha);
  if (action === 'claws') {
    if (!contact) {
      crest(sx, sy, Math.min(size * .64, a.size * .67), Math.sin(p * Math.PI) * .56);
    } else {
      for (let i = 0; i < 3; i++) {
        const local = age - i * 23;
        if (local < 0) continue;
        const sweep = ease((local + 18) / 155), tail = 1 - clamp01((local - 100) / 200);
        form(targetX, b.cy - size * .15 + (i - 1) * size * .17, size * (.98 + tier * .08), size * (.73 + tier * .04),
          dir * (-.5 + sweep * .55), fade * tail, i * .14, dir);
      }
    }
  } else if (action === 'ripple') {
    if (!contact) crest(sx - dir * a.size * .1, sy, Math.min(size * .8, a.size * .8), (1 - p * .6) * .64);
    const count = 2 + tier;
    for (let i = 0; i < count; i++) {
      const progress = contact ? 1 + age / 290 - i * .15 : p * 1.12 - i * .15;
      if (progress <= 0 || progress >= 1.75) continue;
      const reach = clamp01(progress), s = size * (.35 + reach * .62 + (contact ? ease(age / 300) * .16 : 0));
      const opacity = contact ? fade * (1 - clamp01((age - i * 22) / 350)) : clamp01(progress * 6) * .86;
      form(sx + dx * reach, sy + dy * reach, s * .5, s,
        angle, opacity * (1 - i * .09), i * .18);
    }
  } else if (action === 'surge') {
    const travel = contact ? 1 : p ** 1.35;
    const tail = contact ? fade * (1 - clamp01(age / 185)) : 1;
    for (let i = 0; i < 2; i++) {
      const reach = Math.max(0, travel - i * .2);
      const s = size * (i ? .64 : 1.05);
      form(sx + dx * reach, sy + dy * reach - Math.sin(reach * Math.PI) * size * .1,
        s * 1.16, s * .95, angle + (dir < 0 ? Math.PI : 0), tail * (i ? .36 : .95), i * .19, dir);
    }
    if (contact) crest(targetX, b.cy - size * .15, size * (1 + ease(age / 130) * .25), fade * Math.exp(-age / 240) * .73);
  } else {
    // Hold an open eclipse corona behind the actor; never fill a black disc over them.
    const opening = contact ? 1 + ease(age / 230) * .22 : .42 + ease(p) * .55;
    const s = size * 1.48 * opening;
    const cx = Math.max(s * .46, Math.min(width - s * .46, targetX));
    const cy = Math.max(s * .46 + 4, Math.min(height - s * .46 - 4, b.cy - size * .09));
    form(cx, cy, s, s, -.07, (contact ? fade : p * .63), 0);
    crest(cx, cy, size * 1.13 * opening, (contact ? fade : p) * .58);
  }
  if (!contact) return;
  const spread = ease((age + 16) / 190), loud = action === 'vortex' ? 1.45 : action === 'claws' ? .78 : 1.16;
  put(5, targetX, floor, size * loud, size * .2, 0, fade * .57);
  if (action !== 'vortex') put(6, targetX, b.cy, size * loud * spread, size * loud * spread, 0,
    fade * (action === 'claws' ? .35 : .68));
  for (let i = 0; i < 3 + tier * 2; i++) {
    const local = (age - i * 11) / 390;
    if (local <= 0 || local >= 1) continue;
    const seed = tidalSeed(i + 841), turn = i * 2.4, r = size * (.2 + ease(local) * (.24 + seed * .16));
    put(4, targetX + Math.cos(turn) * r, b.cy + Math.sin(turn) * r * .75 - local * size * .12,
      size * .075, size * (.18 + seed * .14), turn + Math.PI / 2,
      Math.sin(local * Math.PI) * fade * .82);
  }
}
