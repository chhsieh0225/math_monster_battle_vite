import { clamp01, getPaintedFrame, tidalSeed } from './skillEffectModel.ts';
import type { BattleEffectClock, TidalLayout } from './skillEffectModel.ts';
import { getSignatureArt } from './signatureSkillArt.ts';

export type PlacePigment = (tile: number, x: number, y: number, width: number, height: number, rotation?: number, alpha?: number, flip?: number) => void;
const easeOut = (value: number) => 1 - (1 - clamp01(value)) ** 3;

/** Only contact events create eruptions, cuts and debris; the flight is anticipation. */
export function drawSignatureSkill(clock: BattleEffectClock, layout: TidalLayout, put: PlacePigment): boolean {
  const kind = getSignatureArt(clock.effect.skillId);
  if (!kind) return false;
  const f = getPaintedFrame(clock);
  if (!f.visible) return true;
  const { source: a, target: b, direction: dir, width, height } = layout;
  const size = Math.min(width * .48, height * .44, b.size * 1.35, 238);
  const groundY = Math.min(height - 18, b.cy + b.size * .27);
  const targetX = Math.max(size * .48, Math.min(width - size * .48, b.cx));
  const flight = f.flight, age = f.contactAge, fade = f.fade;
  const ground = (scale: number, alpha: number) => put(5, targetX, groundY, size * scale, size * scale * .29, 0, alpha);
  const frames = (progress: number, x: number, y: number, w: number, h: number, angle: number, alpha: number, flip = 1, loop = false) => {
    const frame = loop ? (Math.max(0, progress) % 1) * 5 : Math.min(3.999, Math.max(0, progress) * 4);
    const index = Math.floor(frame), mix = frame - index;
    // Normal-alpha compensation avoids a transparent dip halfway between drawings.
    put(index, x, y, w, h, angle, alpha * (1 - mix) / Math.max(.001, 1 - alpha * mix), flip);
    put((index + 1) % 5, x, y, w, h, angle, alpha * mix, flip);
  };

  if (kind === 'eruption') {
    if (!f.contact) {
      // The heat travels along the ground, rather than firing a miniature volcano.
      const y = a.cy + a.size * .28;
      for (let i = 0; i < 3; i++) {
        const p = clamp01(flight * 1.3 - i * .16);
        put(5, a.cx + (targetX - a.cx) * p, y + (groundY - y) * p, size * .43, size * .08, 0, Math.sin(p * Math.PI) * .56);
      }
      ground(.35 + flight * .5, .18 + flight * .42);
      return true;
    }
    const rise = .18 + .82 * easeOut(age / 105);
    ground(.72 + easeOut(age / 230) * .78, fade * .85);
    for (let i = 0; i < 2; i++) {
      const drift = easeOut(age / 450);
      put(6, targetX + (i ? 1 : -1) * size * (.22 + drift * .28), groundY - size * (.18 + drift * .35),
        size * (.62 + drift * .3), size * (.45 + drift * .12), i ? .2 : -.2, fade * drift * .4, i ? 1 : -1);
    }
    const count = f.tier === 1 ? 1 : 3;
    for (let i = count - 1; i >= 0; i--) {
      const side = i === 0 ? 0 : i === 1 ? -1 : 1;
      const h = size * (i ? .8 : 1.25) * rise;
      const w = size * (i ? .63 : .96);
      const progress = (age / 270 + i * .21) % 1;
      frames(progress, targetX + side * size * .29, groundY - h * .41, w, h, side * .13, fade * (i ? .68 : .96), i === 1 ? -1 : 1, true);
    }
  } else if (kind === 'wolf') {
    if (!f.contact) {
      const p = easeOut(flight);
      const angle = Math.atan2(b.cy - a.cy, b.cx - a.cx);
      put(6, a.cx + (b.cx - a.cx) * p * .75, a.cy + (b.cy - a.cy) * p * .75,
        size * .5, size * .13, angle, Math.sin(flight * Math.PI) * .26);
      return true;
    }
    const cross = clock.effect.skillId === 'wolf:2';
    const count = clock.effect.skillId === 'wolf:0' ? 1 : 2;
    ground(.84 + easeOut(age / 280) * .55, fade * .32);
    for (let i = 0; i < count; i++) {
      const local = age - i * (cross ? 65 : 38);
      if (local < 0) continue;
      const sweep = easeOut((local + 22) / 155);
      const tail = 1 - clamp01((local - 140) / 220);
      frames(sweep, b.cx, b.cy + (cross || count === 1 ? 0 : (i - .5) * size * .25),
        size * 1.15, size * (cross ? 1 : .77), (cross ? -.48 + i * 1.58 : -.23) * dir,
        fade * tail, dir);
    }
    const shock = 1 - clamp01(age / 210);
    put(6, b.cx, b.cy, size * (.4 + easeOut(age / 170) * .52), size * .55, -.5 * dir, shock * .64, dir);
  } else {
    const count = f.tier === 1 ? 1 : f.tier === 2 ? 3 : 5;
    const bladeHeight = Math.min(size * 1.2, groundY - 18);
    const apex = Math.max(bladeHeight * .5 + 12, groundY - size * 1.25);
    ground(.8 + (f.contact ? easeOut(age / 250) * .75 : flight * .25), f.contact ? fade * .82 : flight * .4);
    // Clouds separate around the blade's path, not across the actor's face.
    for (let i = 0; i < 2; i++) {
      const split = f.contact ? easeOut(age / 240) : flight * .4;
      put(3, targetX + (i ? 1 : -1) * size * (.16 + split * .22), apex - bladeHeight * .17,
        size * .85, size * .36, i ? .12 : -.12, (f.contact ? fade * .3 : .5 * Math.sin(flight * Math.PI)), i ? 1 : -1);
    }
    for (let i = count - 1; i >= 0; i--) {
      const side = i === 0 ? 0 : (i % 2 ? -1 : 1) * Math.ceil(i / 2);
      const local = Math.max(0, age - i * 22);
      const x = targetX + side * size * .2;
      const h = bladeHeight * (i ? .72 : 1);
      const drop = f.contact ? 1 : clamp01((flight - .24 - i * .035) / (.76 - i * .035)) ** 2.5;
      const endY = groundY - h * .435;
      const y = apex + (endY - apex) * drop;
      const alpha = f.contact ? fade * (1 - clamp01((local - 200) / 310)) : clamp01(flight * 5);
      put(2, x, y - h * .25, h * .28, h * (f.contact ? .7 : .5 + drop * .4), side * -.08, alpha * .34);
      put(i ? 1 : 0, x, y + (f.contact ? easeOut(local / 80) * size * .055 : 0), h * .54, h, side * -.075, alpha);
    }
    if (f.contact) {
      const burst = easeOut((age + 20) / 145);
      put(4, targetX, groundY - size * .14, size * (1 + burst * .4), size * .73 * burst, 0, fade * .72);
      for (let i = 0; i < 2; i++) put(6, targetX + (i ? 1 : -1) * size * (.25 + burst * .3), groundY - size * .07,
        size * .75, size * .28, i ? -.15 : .15, fade * .42, i ? 1 : -1);
    }
  }

  const count = 5 + f.tier * 3;
  for (let i = 0; i < count; i++) {
    const seed = tidalSeed(i + 51);
    const p = clamp01((age - seed * 80) / (kind === 'eruption' ? 520 : 410));
    if (p === 0 || p === 1) continue;
    const side = seed < .5 ? -1 : 1;
    const px = targetX + side * size * (.06 + p * (.24 + seed * .42));
    const py = kind === 'eruption' ? groundY - size * (.15 + p * (.6 + seed * .5))
      : groundY - size * (.15 + Math.sin(p * Math.PI) * (.18 + seed * .3));
    const chip = size * (.035 + tidalSeed(i + 201) * .035);
    put(7, px, py, chip, chip * (kind === 'eruption' ? 2.3 : 1.2), seed * 6 + p * side, Math.sin(p * Math.PI) * fade * .9);
  }
  return true;
}
