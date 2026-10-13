import { getSkillChoreography } from './skillChoreography.ts';
import { clamp01, getPaintedFrame, tidalSeed } from './skillEffectModel.ts';
import type { BattleEffectClock, TidalLayout } from './skillEffectModel.ts';
import type { PlacePigment } from './signatureSkillMotion.ts';
import { drawSolarSkill } from './solarSkill.ts';

const TAU = Math.PI * 2;
const out = (v: number) => 1 - (1 - clamp01(v)) ** 3;

function drawIceSkill(clock: BattleEffectClock, layout: TidalLayout, put: PlacePigment, action: string) {
  const f = getPaintedFrame(clock);
  const { source: a, target: b, width, height, direction: dir } = layout;
  const size = Math.min(width * .42, height * .4, b.size * 1.18, 218);
  const { contact, contactAge: age, flight: p, tier, fade } = f;
  const floor = Math.min(height - 14, b.cy + b.size * .29);
  const sx = a.cx + dir * a.size * .17, sy = a.cy - a.size * .09;
  const travel = p * p * (3 - 2 * p);
  const phase = (contact ? age : f.age) / 520;
  const form = (x: number, y: number, w: number, h: number, rotation: number, alpha: number, offset = 0) => {
    const frame = ((phase + offset) % 1) * 4, index = Math.floor(frame), mix = frame - index;
    // Geometry is stable between frames; only the baked reflection moves over clear facets.
    put(index, x, y, w, h, rotation, alpha * (1 - mix), dir);
    put((index + 1) % 4, x, y, w, h, rotation, alpha * mix, dir);
  };
  const aimX = b.cx - dir * size * .16;
  if (action === 'orb') {
    const x = sx + (b.cx - sx) * (contact ? 1 : travel);
    const y = sy + (b.cy - sy) * (contact ? 1 : travel) - (contact ? 0 : Math.sin(p * Math.PI) * size * .1);
    const intact = contact ? (1 - clamp01(age / 85)) * fade : 1;
    if (intact > 0) {
      put(7, x - dir * size * .13, y, size * .94, size * .58, -.2 * dir, intact * .64);
      form(x, y, size * .79, size * .93, dir * (.16 + p * .5), intact);
      for (let i = 0; i < tier - 1; i++) {
        form(x - dir * size * (.29 + i * .15), y + (i ? -.2 : .16) * size,
          size * .25, size * .37, dir * (-.3 + phase), intact * .75, i * .2);
      }
    }
  } else if (action === 'mirror') {
    const count = tier === 1 ? 2 : 3;
    const settle = contact ? 1 : out(p);
    const intact = contact ? (1 - clamp01((age - 50) / 160)) * fade : clamp01(p * 5);
    for (let i = 0; i < count; i++) {
      const side = i - (count - 1) / 2;
      const x = sx + (aimX - sx) * settle + dir * side * size * .45 * settle;
      const y = sy + (b.cy - size * .22 - sy) * settle + Math.abs(side) * size * .15;
      const turn = p * .8 + i * .65 + (contact ? age / 150 : 0);
      const perspective = .32 + Math.abs(Math.cos(turn)) * .68;
      if (intact > 0) form(Math.max(size * .22, Math.min(width - size * .22, x)), y,
        size * .74 * perspective, size * 1.05, dir * (.12 + side * .2), intact, i * .23);
    }
  } else if (action === 'claws') {
    if (!contact) {
      form(sx + (aimX - sx) * travel * .63, sy + (b.cy - sy) * travel * .63,
        size * .38, size * .5, -.45 * dir, Math.sin(p * Math.PI) * .6);
    } else for (let i = 0; i < 3; i++) {
      const local = age - i * 29;
      if (local < 0) continue;
      const sweep = out((local + 18) / 145);
      const alpha = (1 - clamp01((local - 100) / 230)) * fade;
      form(aimX + dir * (sweep - .65) * size * .13,
        b.cy - size * .16 + (i - 1) * size * .2, size * 1.4, size * .94,
        dir * (-.27 + sweep * .37), alpha, i * .17);
    }
  } else {
    for (let i = 0; i < 2 + tier; i++) {
      const side = i - (1 + tier) / 2;
      const drop = contact ? 1 : clamp01((p - i * .045) / (1 - i * .045)) ** 2;
      const h = size * (1.1 - Math.abs(side) * .12);
      const end = floor - h * .39;
      const start = Math.max(h * .52 + 6, end - size * .8);
      const alpha = contact ? fade * (1 - clamp01((age - 70) / 190)) : clamp01(p * 5);
      form(Math.max(h * .3, Math.min(width - h * .3, aimX + side * size * .26)),
        start + (end - start) * drop, h * .7, h, side * .14, alpha, i * .19);
    }
  }
  if (!contact) return;
  const spread = out((age + 10) / 185);
  const extent = action === 'orb' ? .85 : 1.15;
  put(5, aimX, floor, size * extent * (.65 + spread * .55), size * .22, 0, fade * .69);
  put(7, aimX, b.cy + size * .17, size * extent, size * .64, 0, fade * Math.exp(-age / 180) * .5);
  put(6, aimX, b.cy, size * extent * spread, size * extent * spread, -.15 * dir, fade * .9);
  for (let i = 0; i < 4 + tier * 2; i++) {
    const local = (age - i * 9) / 365;
    if (local <= 0 || local >= 1) continue;
    const seed = tidalSeed(i + 317), turn = i * 2.4 + .2;
    const distance = size * (.13 + out(local) * (.3 + seed * .18));
    const s = size * (.12 + seed * .09);
    put(4, aimX + Math.cos(turn) * distance,
      b.cy + Math.sin(turn) * distance * .65 + local * local * size * .25,
      s * (.42 + Math.abs(Math.cos(local * 5 + i)) * .58), s * 1.2,
      turn + local * 1.3, Math.sin(local * Math.PI) * fade * .95);
  }
}

function drawFireMeteors(clock: BattleEffectClock, layout: TidalLayout, put: PlacePigment) {
  const f = getPaintedFrame(clock);
  const { target: b, width, height, direction: dir } = layout;
  const size = Math.min(width * .4, height * .4, b.size * 1.15, 210);
  const floor = Math.min(height - 15, b.cy + b.size * .29);
  const count = 2 + f.tier;
  // The first landing follows the real hit. Later landings are visual beats, not damage events.
  const time = f.contact ? f.contactAge : (f.flight - 1) * 300;
  const finish = f.contact ? clamp01((500 - time) / 40) : 1;
  for (let i = 0; i < count; i++) {
    const landing = i * 92;
    const local = time - landing;
    const fallMs = i === 0 ? 300 : 166;
    if (local < -fallMs || local >= 180) continue;
    const side = [0, -.28, .24, -.14, .11][i];
    const x = Math.max(size * .32, Math.min(width - size * .32, b.cx + side * size));
    const y = floor + (i % 2 ? -1 : 1) * size * .025;
    const scale = i === count - 1 ? 1.06 : i === 0 ? .94 : .73 + (i % 2) * .09;
    const s = size * scale;
    if (local < 0) {
      const progress = clamp01(1 + local / fallMs);
      const drop = progress ** 1.7;
      const turn = -dir * (.18 + (i % 2) * .06);
      const startY = Math.max(s * .8 + 10, y - size * (1.35 + (i % 2) * .15));
      const headX = x - dir * (1 - drop) * size * .32;
      const headY = startY + (y - startY) * drop;
      const opacity = clamp01(progress * 6) * finish;
      // The leading edge is at author-space y=74. Anchor it, rather than the texture centre.
      const pivot = s * (74 * 2.26 / 512);
      const cx = headX + Math.sin(turn) * pivot, cy = headY - Math.cos(turn) * pivot;
      put(7, headX, headY - s * .1, s * .93, s * .93, 0, opacity * .62);
      const frame = ((time + 300) / 230 + i * .27) % 1 * 4;
      const index = Math.floor(frame), mix = frame - index;
      put(index, cx, cy, s, s, turn, opacity * (1 - mix) / Math.max(.001, 1 - opacity * mix));
      put((index + 1) % 4, cx, cy, s, s, turn, opacity * mix);
      put(7, x, y, s * .85, s * .16, 0, opacity * drop ** 3 * .43);
    } else if (f.contact) {
      const fade = (1 - clamp01(local / 180)) ** 1.3 * finish;
      const spread = .55 + out(local / 130) * .62;
      put(7, x, y - s * .08, s * spread, s * spread * .58, 0, Math.exp(-local / 63) * finish * .85);
      put(5, x, y, s * spread, s * spread * .25, 0, fade * .76);
      const burst = s * (.55 + out(local / 85) * .34);
      put(6, x, y - burst * (65 * 2.26 / 512), burst, burst, 0, fade * .92);
      for (let j = 0; j < 3; j++) {
        const t = clamp01(local / 180), turn = (j - 1) * .78;
        const reach = out(t) * s * (.23 + tidalSeed(i * 3 + j + 30) * .18);
        put(4, x + Math.sin(turn) * reach, y - Math.cos(turn) * reach + t * t * s * .27,
          s * .065, s * .15, turn, Math.sin(t * Math.PI) * fade * .84);
      }
    }
  }
}

function drawElectricSkill(clock: BattleEffectClock, layout: TidalLayout, put: PlacePigment, action: string) {
  const f = getPaintedFrame(clock);
  const { source: a, target: b, width, height, direction: dir } = layout;
  const size = Math.min(width * .4, height * .38, b.size * 1.05, 205);
  const orb = action === 'orb', storm = action === 'thunder', chain = action === 'chain';
  const age = f.contactAge, p = f.flight, tier = f.tier;
  const phase = (f.contact ? age : f.age) / 340;
  const sx = a.cx + dir * a.size * .16, sy = a.cy - a.size * .05;
  const dx = b.cx - sx, dy = b.cy - sy;
  const floor = Math.min(height - 12, b.cy + b.size * .27);
  const charge = Math.min(size * .63, a.size * .58);

  const corona = (tile: number, x: number, y: number, s: number, alpha: number, turn = 0) => {
    if (alpha > .001) put(tile, x, y, s, s, turn, clamp01(alpha));
  };
  const arc = (x1: number, y1: number, x2: number, y2: number, breadth: number, opacity: number, contour = phase) => {
    if (opacity <= .001) return;
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 1) return;
    // Fixed endpoints join short baked filaments even in a shallow landscape arena.
    const count = Math.max(1, Math.ceil(length / (Math.min(width, height) * .7)));
    const angle = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count;
      const frame = ((contour + i * .21) % 1 + 1) % 1 * 4;
      const index = Math.floor(frame), mix = clamp01((frame - index - .72) / .28), alpha = clamp01(opacity);
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      const h = length / count * (512 / (196 * 2.26));
      put(index, x, y, breadth, h, angle, alpha * (1 - mix) / Math.max(.001, 1 - alpha * mix));
      put((index + 1) % 4, x, y, breadth, h, angle, alpha * mix);
    }
  };

  if (!f.contact) {
    const release = clamp01((p - .12) / .88);
    corona(7, sx, sy, charge * (.7 + p * .23), (1 - p) * .58, phase * .25);
    if (orb) {
      const travel = release ** 1.15 * .96;
      const x = sx + dx * travel, y = sy + dy * travel - Math.sin(travel * Math.PI) * size * .045;
      const s = Math.min(size * .65, a.size * .72) * (1 + (tier - 1) * .07);
      const tail = Math.max(0, travel - .15);
      arc(sx + dx * tail, sy + dy * tail, x, y, s * .64, .48);
      corona(7, x, y, s, .9, phase * .7);
    } else if (storm) {
      const apex = Math.max(14, b.cy - size * .93);
      arc(sx, sy, sx + dx * release * .78, sy + (apex - sy) * release, size * .2, Math.sin(p * Math.PI) * .27);
      corona(7, b.cx, apex, size * (.22 + p * .23), p * .32, -.3);
    } else {
      const reach = release ** .8 * .94;
      const x = sx + dx * reach, y = sy + dy * reach;
      arc(sx, sy, x, y, size * (chain ? .46 : .34), .22 + p * .24);
      if (chain) arc(sx, sy - charge * .2, x, y - size * .15 * Math.sin(p * Math.PI), size * .25, p * .28, phase + .42);
      corona(7, x, y, charge * .36, p * .5, phase);
    }
    return;
  }

  const discharge = Math.exp(-age / 130) * f.fade;
  if (orb) {
    corona(6, b.cx, b.cy, size * (.42 + out(age / 180) * .33), discharge * .88, -.25);
  } else if (storm) {
    // One principal strike, then uneven after-strikes. Never a fence of identical bolts.
    const count = 2 + tier;
    for (let i = 0; i < count; i++) {
      const delay = i === 0 ? 0 : 48 + i * 37;
      const local = age - delay;
      if (local < 0 || local > 230) continue;
      const side = i === 0 ? 0 : (i % 2 ? -1 : 1) * (.18 + i * .043);
      const x = Math.max(12, Math.min(width - 12, b.cx + side * size));
      const top = Math.max(10, b.cy - size * (i === 0 ? 1.15 : .72 + (i % 3) * .11));
      const end = b.cy + size * (i === 0 ? .17 : .28);
      const alpha = (1 - clamp01((local - 36) / 194)) ** 1.15 * f.fade * (i === 0 ? 1 : .85);
      arc(x - side * size * .24, top, x, end, size * (i === 0 ? .78 : .4), alpha, i * .23 + local / 350);
      corona(6, x, end, size * (.4 + out(local / 130) * .24), alpha * .65, side);
    }
  } else if (chain) {
    const wrap = out(age / 160), alpha = f.fade * (1 - clamp01((age - 180) / 290));
    // Interlacing current closes around the silhouette, without opaque metal links.
    for (let i = 0; i < 6; i++) {
      const t1 = i / 6 * TAU - .3, t2 = (i + 1) / 6 * TAU - .3;
      const radius = size * (.48 - wrap * .08);
      const x1 = b.cx + Math.cos(t1) * radius;
      const y1 = b.cy + Math.sin(t1) * radius * .72;
      const x2 = b.cx + Math.cos(t2) * radius;
      const y2 = b.cy + Math.sin(t2) * radius * .72;
      arc(sx + (x1 - sx) * wrap, sy + (y1 - sy) * wrap, x2, y2,
        size * .29, alpha * .78, phase + i * .17);
    }
    for (const side of [-1, 1]) arc(b.cx + side * size * .29, b.cy - size * .31,
      b.cx + side * size * .34, floor, size * .26, alpha * .57, phase + side * .2);
  } else {
    arc(sx, sy, b.cx, b.cy, size * (.55 + tier * .06), discharge, phase);
    corona(7, sx, sy, charge * .73, discharge * .48, phase);
    corona(6, b.cx, b.cy, size * (.55 + out(age / 140) * .25), discharge * .83);
  }
  const groundAlpha = f.fade * (1 - clamp01((age - 90) / 280)) * (orb ? .26 : .53);
  put(5, b.cx, floor, size * (storm ? 1.16 : .8), size * .19, 0, groundAlpha);
  for (let i = 0; i < 3 + tier; i++) {
    const local = (age - i * 12) / 360;
    if (local <= 0 || local >= 1) continue;
    const turn = tidalSeed(i + 203) * TAU;
    const reach = size * (.12 + out(local) * (orb ? .23 : .37));
    const s = size * (.07 + tidalSeed(i + 86) * .05);
    put(4, b.cx + Math.cos(turn) * reach, b.cy + Math.sin(turn) * reach * .72,
      s, s * 1.5, turn, Math.sin(local * Math.PI) * (1 - local) * f.fade * .65);
  }
}

/** Presentation only. Secondary cuts and returning souls never apply extra damage/healing. */
export function drawChoreographedSkill(clock: BattleEffectClock, layout: TidalLayout, put: PlacePigment): boolean {
  const plan = getSkillChoreography(clock.effect.skillId);
  if (!plan) return false;
  const f = getPaintedFrame(clock);
  if (!f.visible) return true;
  const { source: a, target: b, direction: dir, width, height } = layout;
  const { action, pigment, density } = plan;
  if (pigment === 'solar') {
    drawSolarSkill(clock, layout, put, action);
    return true;
  }
  if (pigment === 'ice') {
    drawIceSkill(clock, layout, put, action);
    return true;
  }
  if (pigment === 'lightning' && action !== 'vortex') {
    drawElectricSkill(clock, layout, put, action);
    return true;
  }
  if (pigment === 'ember' && action === 'meteor') {
    drawFireMeteors(clock, layout, put);
    return true;
  }
  const size = Math.min(width * .43, height * .4, b.size * 1.22, 224);
  const groundY = Math.min(height - 16, b.cy + b.size * .29);
  const gx = Math.max(size * .72, Math.min(width - size * .72, b.cx));
  const dx = b.cx - a.cx, dy = b.cy - a.cy, angle = Math.atan2(dy, dx);
  const age = f.contactAge, p = f.flight, fade = f.fade, tier = f.tier;
  const phase = f.contact ? age / 230 : f.age / 230;
  const travel = p * p * (3 - 2 * p);
  const x = a.cx + dx * travel, y = a.cy + dy * travel;
  const ground = (scale = 1, alpha = .6) => put(5, gx, groundY, size * scale, size * scale * .24, 0, fade * alpha);
  const mark = (scale = .8, alpha = .4) => put(7, b.cx, b.cy, size * scale, size * scale, 0, alpha * fade);
  const form = (progress: number, cx: number, cy: number, w: number, h: number, rotation = 0, alpha = 1, flip = 1) => {
    const frame = ((Math.max(0, progress) % 1) * 4), index = Math.floor(frame), mix = frame - index;
    const opacity = clamp01(alpha);
    // Compensated normal blending keeps pigment density stable between contour drawings.
    put(index, cx, cy, w, h, rotation, opacity * (1 - mix) / Math.max(.001, 1 - opacity * mix), flip);
    put((index + 1) % 4, cx, cy, w, h, rotation, opacity * mix, flip);
  };
  const burst = (scale = 1, alpha = .7) => {
    if (!f.contact) return;
    const expand = out((age + 15) / 180);
    put(6, b.cx, b.cy + size * .1, size * scale * expand, size * scale * expand, .1 * dir, fade * alpha);
  };

  if (action === 'orb' || action === 'vector' || action === 'surge') {
    const rush = action === 'surge', vector = action === 'vector';
    if (!f.contact) {
      const count = rush ? 2 : Math.min(4, density + tier - 1);
      for (let i = count - 1; i >= 0; i--) {
        const trail = Math.max(0, travel - i * .13);
        const curve = Math.sin(trail * Math.PI) * size * (i % 2 ? -.2 : .16) * (rush ? .25 : 1);
        const s = size * (rush ? .86 : vector ? .75 : .44) * (1 - i * .12);
        form(phase + i * .14, a.cx + dx * trail, a.cy + dy * trail + curve, s, s * (vector ? .45 : 1),
          pigment === 'sword' || pigment === 'candy' ? angle + Math.PI / 2 : rush ? angle : phase * .24, .94 - i * .24, dir);
      }
      if (vector) put(7, x, y, size * .6, size * .6, angle, .7);
    } else {
      burst(rush ? 1.15 : .8);
      if (rush) {
        form(phase, b.cx + dir * size * out(age / 190) * .18, b.cy, size, size * .8, angle, fade * .63, dir);
        ground(1.25, .48);
      } else if (pigment === 'tide' || pigment === 'slime') {
        ground(.6 + out(age / 240) * .9, .72);
      } else mark(.65 + out(age / 170) * .3, .6);
    }
  } else if (action === 'cut' || action === 'cross' || action === 'claws' || action === 'clamp') {
    const metalClaw = pigment === 'claw' && Boolean(plan.finish);
    if (!f.contact) {
      form(phase, a.cx + dx * p * .44, a.cy + dy * p * .44, size * .4, size * .3,
        -.45 * dir, Math.sin(p * Math.PI) * .4, dir);
    } else {
      const count = action === 'cross' || action === 'clamp' ? 2 : action === 'claws' ? 1 : density;
      for (let i = 0; i < count; i++) {
        const local = age - i * (action === 'clamp' ? 0 : 32);
        if (local < 0) continue;
        const sweep = out((local + 20) / 155), tail = 1 - clamp01((local - 140) / 230);
        const turn = action === 'cross' ? -.65 + i * 1.5 : -.8 + sweep * .9;
        const offset = action === 'clamp' ? (i ? 1 : -1) * size * (.5 - sweep * .25) : 0;
        const parallel = action === 'claws' || action === 'cut' ? (i - (count - 1) / 2) * size * .22 : 0;
        form(Math.min(.74, sweep * .74), b.cx + offset - (metalClaw ? dir * size * .2 : 0), b.cy + parallel - (metalClaw ? size * .12 : 0),
          size * (action === 'clamp' ? .66 : metalClaw ? 1.3 : 1.15),
          size * (metalClaw ? 1.25 : action === 'claws' ? .66 : .98), turn * dir, fade * tail * .95, i && action === 'clamp' ? -dir : dir);
      }
      ground(1.08, .25); burst(.52, .48);
    }
  } else if (action === 'meteor' || action === 'rain' || action === 'bolt' || action === 'thunder') {
    const thunder = action === 'bolt' || action === 'thunder';
    const count = action === 'bolt' ? 1 : action === 'thunder' ? 2 + tier : Math.min(5, density + tier - 1);
    ground(.75 + (f.contact ? out(age / 220) * .7 : p * .2), f.contact ? .7 : p * .38);
    for (let i = 0; i < count; i++) {
      const local = age - i * 23;
      const side = i === 0 ? 0 : (i % 2 ? -1 : 1) * Math.ceil(i / 2);
      const spread = side * size * .25;
      const h = Math.min(size * (thunder ? 1.55 : 1.05) * (i ? .74 + tidalSeed(i + 16) * .16 : 1), groundY - 12);
      if (thunder) {
        const alpha = f.contact && local >= 0 ? fade * (1 - clamp01((local - 100) / 260)) : p * .15;
        form(phase + i * .23, gx + spread, groundY - h * .48, size * (i ? .42 : .64), h, side * .08, alpha * (i ? .72 : 1), i % 2 ? -1 : 1);
      } else {
        const drop = f.contact ? 1 : clamp01((p - i * .03) / (1 - i * .03)) ** 2.4;
        const end = groundY - h * .35;
        const apex = Math.max(h * .5 + 6, end - size * .8);
        const offset = f.contact ? out(local / 150) * size * .07 : (1 - drop) * size * .27 * dir;
        const alpha = f.contact ? fade * (1 - clamp01((local - 80) / 250)) : clamp01(p * 4);
        form(phase + i * .17, gx + spread + offset, apex + (end - apex) * drop,
          h * (pigment === 'sword' ? .55 : .85), h,
          (pigment === 'sword' ? Math.PI : pigment === 'ember' ? 1.5 : -.18 * dir) + side * .1, alpha * (i ? .8 : 1));
      }
    }
    burst(1.17, .57);
    if (f.contact && clock.effect.skillId === 'monster:storm_feathers') mark(1.12, .72);
  } else if (action === 'ripple' || action === 'breath') {
    if (action === 'ripple') {
      const count = Math.min(4, density + tier - 1);
      for (let i = count - 1; i >= 0; i--) {
        const reach = f.contact ? 1 : clamp01(p * 1.2 - i * .11);
        const sx = a.cx + dx * reach - dir * i * size * .18;
        const sy = a.cy + dy * reach + size * .16;
        const scale = (.4 + reach * .6) * (1 - i * .12);
        form(phase + i * .21, sx, sy, size * scale, size * scale * (1 - f.decay * .38), 0, fade * (1 - i * .15), dir);
      }
    } else {
      const count = 4 + tier, reach = f.contact ? 1 : out(p);
      for (let i = 0; i < count; i++) {
        const t = (i + .5) / count * reach;
        const s = size * (.21 + t * .73);
        const curl = Math.sin(t * TAU - phase * 2) * size * .06 * t;
        form(phase + i * .19, a.cx + dx * t, a.cy + dy * t + curl,
          Math.max(s, Math.hypot(dx, dy) / count * 1.55), s, angle, fade * (.45 + t * .43));
      }
    }
    if (f.contact) { ground(1.3, .6); burst(1.1, .48); }
  } else if (action === 'vortex' || action === 'halo' || action === 'knot' || action === 'mirror' || action === 'swarm') {
    const swirl = action === 'vortex', mirror = action === 'mirror', knot = action === 'knot';
    const metalOrbit = action === 'halo' && pigment === 'knot' && Boolean(plan.finish);
    const bladeOrbit = action === 'halo' && pigment === 'sword' && Boolean(plan.finish);
    const count = bladeOrbit ? 3 + tier : swirl || knot || metalOrbit ? 3 : Math.min(8, density + tier * 2);
    const collapse = f.contact ? out(age / (mirror ? 200 : 380)) : 0;
    const radius = size * (.17 + p * .38) * (1 - collapse * (action === 'swarm' ? .6 : .8));
    for (let i = 0; i < count; i++) {
      const turn = i / count * TAU + phase * (swirl ? 1.7 : .7);
      const cx = b.cx + Math.cos(turn) * radius, cy = b.cy + Math.sin(turn) * radius * .65;
      if (bladeOrbit) {
        const outer = size * (.45 + p * .16) * (1 - collapse * .3);
        const sx = Math.max(size * .2, Math.min(width - size * .2, b.cx + Math.cos(turn) * outer));
        form(phase + i * .16, sx, b.cy + Math.sin(turn) * outer * .72, size * .42, size * .76,
          turn + Math.PI / 2, fade * (.88 + Math.sin(turn) * .08));
      } else if (metalOrbit) {
        form(phase + i * .22, b.cx, b.cy, size * (1.15 - i * .09), size * .78,
          i * Math.PI / 3 + phase * .32, fade * (.9 - i * .09));
      } else if (swirl || knot) {
        form(phase + i * .2, b.cx, b.cy, size * (1.1 - i * .17) * (1 - collapse * .35),
          size * (knot ? .85 : .55), turn, fade * (.75 - i * .16));
      } else {
        const s = size * (mirror ? .65 : .42);
        form(phase + i * .16, cx, cy, s, s * (mirror ? 1.25 : 1), mirror ? -.15 : turn + Math.PI / 2,
          fade * (.6 + Math.sin(turn) * .16));
      }
    }
    if (f.contact) { ground(1.2, .46); if (mirror) burst(1.18, .65); else mark(.95, .43); }
  } else if (action === 'vine' || action === 'chain' || action === 'serpents' || action === 'weave') {
    const links = action === 'chain', serpent = action === 'serpents', weave = action === 'weave';
    const count = links ? 9 + tier : serpent ? 3 + tier * 2 : 7;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1), reach = f.contact ? 1 : out(p);
      const bend = Math.sin(t * TAU - phase * 1.5) * size * .24 * Math.sin(t * Math.PI);
      const curl = t * TAU + phase * .5;
      const wrap = f.contact ? out(age / 155) : 0;
      const cx = (a.cx + dx * t * reach) * (1 - wrap) + (b.cx + Math.cos(curl) * size * .35) * wrap;
      const cy = (a.cy + dy * t * reach + bend) * (1 - wrap) + (b.cy + Math.sin(curl) * size * .32) * wrap;
      if (links) put(i % 4, cx, cy, size * .27, size * .3, angle + Math.cos(t * TAU - phase) * .65, fade * .92, i % 2 ? -1 : 1);
      else form(phase + i * .2, cx, cy, size * (serpent ? .58 : weave ? .64 : .5), size * (serpent ? .72 : .48),
        f.contact ? curl : angle + .8, fade * (serpent ? .86 : .72));
    }
    if (f.contact) {
      ground(1.25, .52);
      if (weave) put(7, b.cx, b.cy, size * 1.2, size * 1.2, -.15, fade * .75);
    }
  } else if (action === 'drain') {
    if (!f.contact) {
      const count = 2 + tier;
      for (let i = 0; i < count; i++) {
        const turn = i / count * TAU + phase;
        form(phase + i * .17, b.cx + Math.cos(turn) * size * .38, b.cy + Math.sin(turn) * size * .29,
          size * .39, size * .46, turn * .2, p * .6);
      }
    } else {
      ground(1.15 - out(age / 350) * .3, .5);
      for (let i = 0; i < 3 + tier; i++) {
        const returnP = out((age - i * 24) / 330);
        if (age < i * 24) continue;
        const arc = Math.sin(returnP * Math.PI) * size * (.26 + i % 2 * .12);
        const s = size * (.29 - returnP * .1);
        form(phase + i * .19, b.cx - dx * returnP, b.cy - dy * returnP - arc, s, s * 1.2,
          angle + Math.PI, fade * .85);
      }
      put(5, a.cx, Math.min(height - 16, a.cy + a.size * .27), size * .75, size * .16, 0, fade * out(age / 240) * .42);
    }
  } else if (action === 'rift') {
    const opening = f.contact ? out((age + 20) / 100) : p * .13;
    form(phase, b.cx, b.cy, size * (.3 + opening * .8), size * 1.35, -.16 * dir, fade * (f.contact ? .96 : .35));
    put(7, b.cx, b.cy, size * 1.25 * opening, size * 1.25, -.12 * dir, fade * .7);
    if (f.contact) {
      ground(1.4, .56);
      for (let i = 0; i < 2; i++) form(phase + i * .2, b.cx + (i ? 1 : -1) * size * .32 * out(age / 240), b.cy,
        size * .37, size * .95, i ? .3 : -.3, fade * .45, i ? -1 : 1);
    }
  } else {
    // Grounded summons have different structures: roots, planted blades, lattice, prison, lotus.
    ground(.7 + (f.contact ? out(age / 180) * .72 : p * .2), f.contact ? .72 : p * .35);
    const rise = f.contact ? out((age + 20) / 150) : p * .12;
    if (action === 'matrix' || action === 'cage') {
      const count = action === 'matrix' ? 3 : 5;
      for (let i = 0; i < count; i++) {
        const lateral = (i - (count - 1) / 2) * size * (action === 'matrix' ? .35 : .24);
        form(phase + i * .18, gx + lateral, groundY - size * .47 * rise, size * (action === 'matrix' ? .48 : .23),
          size * 1.06 * rise, 0, fade * .87);
      }
      put(7, gx, groundY - size * .45, size * 1.25, size * 1.15 * rise, 0, fade * .7);
    } else if (action === 'blades') {
      const count = 3 + (tier - 1) * 2;
      for (let i = 0; i < count; i++) {
        const turn = i / count * TAU, radius = size * .44;
        const h = size * (.65 + Math.sin(turn) * .15) * rise;
        form(phase + i * .12, gx + Math.cos(turn) * radius, groundY + Math.sin(turn) * size * .1 - h * .36,
          h * .46, h, Math.cos(turn) * .22, fade * .9);
      }
    } else if (action === 'bloom') {
      const count = 3 + tier;
      for (let i = 0; i < count; i++) {
        const turn = i / count * TAU, r = size * (.1 + rise * .25);
        form(phase + i * .17, gx + Math.cos(turn) * r, groundY - size * .23 + Math.sin(turn) * r * .38,
          size * .55, size * .65 * rise, Math.cos(turn) * .35, fade * .85);
      }
      mark(.75, f.contact ? .7 : .1);
    } else {
      const count = Math.min(5, density + tier - 1);
      for (let i = 0; i < count; i++) {
        const localRise = f.contact ? out((age - i * 16 + 20) / 125) : rise;
        const h = size * (1.08 - Math.abs(i - (count - 1) / 2) * .13) * localRise;
        const side = i - (count - 1) / 2;
        form(phase + i * .21, gx + side * size * .24, groundY - h * .4,
          size * .7, h, side * .11, fade * .94, i % 2 ? -1 : 1);
      }
    }
  }

  // Material fragments are reserved for actual contact, not predicted or blocked hits.
  if (f.contact && action !== 'drain') {
    const count = 4 + tier * 2;
    for (let i = 0; i < count; i++) {
      const seed = tidalSeed(i + 93), local = (age - seed * 60) / 430;
      if (local <= 0 || local >= 1) continue;
      const turn = seed * TAU, reach = size * (.13 + local * .57);
      const soft = ['ember', 'wisp', 'spore', 'butterfly'].includes(pigment);
      const px = b.cx + Math.cos(turn) * reach;
      const py = b.cy + Math.sin(turn) * reach * .65 + (soft ? -local * size * .2 : local * local * size * .36);
      const s = size * (.035 + seed * .065);
      put(4, px, py, s, s * (pigment === 'feather' ? 1.6 : 1.2), turn + local * 2,
        Math.sin(local * Math.PI) * fade * .9);
    }
  }
  return true;
}
