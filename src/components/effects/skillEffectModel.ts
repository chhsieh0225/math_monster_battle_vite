import { getAttackEffectClearDelay, getAttackEffectHitDelay, getPlayerSkillMotion, getSignatureCastAnimation } from '../../utils/effectTiming.ts';
import { getSkillRecipe } from './skillRecipes.ts';
import { getSkillMastery } from '../../utils/skillPresentation.ts';
import type { AttackEffectVm } from '../../types/battle.ts';
import type { SpriteTarget } from '../../hooks/useSpriteTargets.ts';

const motion = getPlayerSkillMotion('water:2')!;
export const TIDAL_TIMING = {
  release: motion.releaseMs,
  flight: motion.flightMs,
  hit: motion.releaseMs + motion.flightMs,
  end: motion.durationMs,
};

export type TidalPhase = 'ready' | 'charge' | 'surge' | 'impact' | 'settle' | 'done';
export type TidalLayout = ReturnType<typeof getTidalLayout>;
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function getTidalFrame(elapsed: number, level = 5) {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const { tier } = getSkillMastery(level);
  const phase: TidalPhase = time === 0 ? 'ready' : time < TIDAL_TIMING.release ? 'charge'
    : time < TIDAL_TIMING.hit ? 'surge' : time < TIDAL_TIMING.hit + 180 ? 'impact'
      : time < TIDAL_TIMING.end ? 'settle' : 'done';
  const flight = clamp01((time - TIDAL_TIMING.release) / TIDAL_TIMING.flight);
  const decay = clamp01((time - TIDAL_TIMING.hit) / (TIDAL_TIMING.end - TIDAL_TIMING.hit));
  return { time, tier, phase, flight, decay, contact: time >= TIDAL_TIMING.hit && time < TIDAL_TIMING.end,
    waveCount: tier, sprayCount: 12 + tier * 10 };
}

/** A shared layout for both renderers; HUD and controls sit outside this clipped arena. */
export function getTidalLayout(width: number, height: number, reversed = false) {
  const w = Math.max(1, Number.isFinite(width) ? width : 1);
  const h = Math.max(1, Number.isFinite(height) ? height : 1);
  const size = Math.min(w * .38, h * .55, 260);
  const sourceX = w * (reversed ? .77 : .23);
  const targetX = w * (reversed ? .23 : .77);
  const y = h * .57;
  const anchor = (cx: number) => ({ cx, cy: y, size, top: `${y}px`, right: `${w - cx}px`,
    flyTop: y / h * 100, flyRight: (w - cx) / w * 100 });
  return { width: w, height: h, source: anchor(sourceX), target: anchor(targetX),
    direction: reversed ? -1 : 1, waveSize: Math.min(w * .4, h * .46, 240) };
}

/** Fixed per-particle seeds keep original/new replays and tier comparisons repeatable. */
export function tidalSeed(index: number) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export const isTidalEffect = (effect: AttackEffectVm | null) => effect?.skillId === 'water:2';
export const hasPaintedEffect = (effect: AttackEffectVm | null) => Boolean(getSkillRecipe(effect?.skillId));
const SUNLIT_SCENES = new Set(['grass', 'fire', 'rock', 'light', 'heaven', 'burnt_warplace']);
const NIGHT_SCENES = new Set(['dark', 'ghost', 'poison', 'electric']);
export const getEffectLighting = (scene = '') => SUNLIT_SCENES.has(scene) ? 'sunlit' : NIGHT_SCENES.has(scene) ? 'night' : 'neutral';

/** Impact updates copy the launch object. They must not restart the same cast. */
export function isNewEffectCast(previous: AttackEffectVm | null, next: AttackEffectVm | null) {
  if (previous === next) return false;
  if (!previous || !next || !next.impact) return true;
  return previous.skillId !== next.skillId || previous.lvl !== next.lvl
    || previous.idx !== next.idx || previous.type !== next.type
    || previous.sourceSlot !== next.sourceSlot || previous.targetSlot !== next.targetSlot
    || previous.targetSide !== next.targetSide
    || Boolean(previous.impact && previous.impact !== next.impact);
}

export function getBattleTidalLayout(source: SpriteTarget, target: SpriteTarget, arena: { width: number; height: number }): TidalLayout {
  const base = getTidalLayout(arena.width, arena.height);
  const anchor = (actor: SpriteTarget) => ({ ...actor, size: actor.size || base.source.size });
  return { ...base, source: anchor(source), target: anchor(target), direction: target.cx >= source.cx ? 1 : -1,
    waveSize: Math.min(base.width * .4, base.height * .42, (target.size || base.target.size) * .95, 240) };
}

export type BattleEffectClock = {
  effect: AttackEffectVm;
  lastAt: number;
  paused: boolean;
  flightAge: number;
  contactAge: number;
};

/** Wall time catches up after hidden tabs; only an actual game pause freezes the clock. */
export function advanceBattleEffectClock(clock: BattleEffectClock | null, effect: AttackEffectVm, now: number, paused: boolean): BattleEffectClock {
  if (!clock || isNewEffectCast(clock.effect, effect)) {
    return { effect, lastAt: now, paused, flightAge: 0,
      contactAge: effect.impact ? Math.max(0, now - effect.impact.at) : 0 };
  }
  const delta = clock.paused ? 0 : Math.max(0, now - clock.lastAt);
  clock.flightAge += delta;
  clock.contactAge = !clock.effect.impact && effect.impact ? Math.max(0, now - effect.impact.at)
    : clock.contactAge + (clock.effect.impact ? delta : 0);
  clock.effect = effect;
  clock.lastAt = now;
  clock.paused = paused;
  return clock;
}

/** Production starts at release. Only a real hit may enter the impact part of the artwork. */
export function getBattleTidalTime(clock: BattleEffectClock) {
  const outcome = clock.effect.impact?.outcome;
  if (outcome === 'miss' || outcome === 'blocked') return 0;
  if (outcome) return Math.min(TIDAL_TIMING.end, TIDAL_TIMING.hit + clock.contactAge);
  const duration = clock.effect.flightMs ?? getAttackEffectHitDelay(clock.effect.type);
  return TIDAL_TIMING.release + Math.min(.999, clock.flightAge / Math.max(1, duration)) * TIDAL_TIMING.flight;
}

export function getPaintedFrame(clock: BattleEffectClock) {
  const { effect } = clock;
  const { tier } = getSkillMastery(effect.lvl);
  const flightMs = effect.flightMs ?? getAttackEffectHitDelay(effect.type);
  const contact = Boolean(effect.impact && effect.impact.outcome !== 'miss' && effect.impact.outcome !== 'blocked');
  // Enemy/support flows clear at 540ms; authored recoveries must finish before that.
  const settleMs = getSignatureCastAnimation(effect.skillId) ? 500
    : Math.min(680, Math.max(220, getAttackEffectClearDelay(effect) - flightMs - 80));
  const decay = contact ? clamp01(clock.contactAge / settleMs) : 0;
  const fade = contact ? (1 - clamp01((decay - .2) / .8)) ** 1.4 : 1;
  return { tier, contact, decay, fade, age: clock.flightAge, contactAge: clock.contactAge,
    flight: contact ? 1 : Math.min(.999, clock.flightAge / Math.max(1, flightMs)),
    visible: effect.impact ? contact && decay < 1 : true,
    done: Boolean(effect.impact) && (!contact || decay >= 1),
  };
}
