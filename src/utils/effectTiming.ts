import { getChoreographyCast } from '../components/effects/skillChoreography.ts';

/**
 * effectTiming.ts — single source of truth for attack effect timeline.
 *
 * Battle flow owns when effect starts/hits/ends and when next step begins.
 */

const HIT_DELAY_MS: Record<string, number> = {
  fire: 300,
  electric: 200,
  water: 350,
  grass: 280,
  dark: 400,
  light: 300,
  steel: 300,
  ice: 300,
};

const PLAYER_SKILL_BEATS: Record<string, [number, number]> = {
  'fire:0': [800, 220], 'fire:1': [900, 120],
  'fire:2': [1100, 240], 'fire:3': [1400, 380],
  'water:0': [850, 240], 'water:1': [950, 270],
  'water:2': [1150, 320], 'water:3': [1400, 400],
  'electric:0': [760, 170], 'electric:1': [800, 120],
  'electric:2': [1050, 220], 'electric:3': [1350, 330],
  'grass:0': [800, 210], 'grass:1': [900, 140],
  'grass:2': [1100, 300], 'grass:3': [1400, 390],
  'tiger:0': [800, 220], 'tiger:1': [950, 260],
  'tiger:2': [1000, 130], 'tiger:3': [1400, 400],
  'wolf:0': [850, 140], 'wolf:1': [950, 150], 'wolf:2': [1100, 150],
  'wolf:3': [1400, 360],
  'lion:0': [850, 150], 'lion:1': [950, 260], 'lion:2': [1100, 190], 'lion:3': [1400, 380],
  'boss:0': [850, 150], 'boss:1': [950, 260], 'boss:2': [1100, 300], 'boss:3': [1400, 380],
  'boss_hydra:0': [850, 150], 'boss_hydra:1': [950, 260], 'boss_hydra:2': [1100, 290], 'boss_hydra:3': [1400, 380],
  'boss_crazy_dragon:0': [850, 150], 'boss_crazy_dragon:1': [950, 170], 'boss_crazy_dragon:2': [1100, 300], 'boss_crazy_dragon:3': [1400, 380],
  'boss_sword_god:0': [850, 150], 'boss_sword_god:1': [950, 260], 'boss_sword_god:2': [1100, 260],
  'boss_sword_god:3': [1400, 350],
};

/** Early is the single-player 36% contact; late and immediate preserve PvP/support clocks. */
export function getSignatureCastAnimation(skillId?: string, timing: 'early' | 'late' | 'immediate' = 'early') {
  const kind = skillId === 'fire:2' ? 'Eruption' : /^wolf:[012]$/.test(skillId || '') ? 'Wolf'
    : skillId === 'boss_sword_god:3' ? 'Heavenfall' : getChoreographyCast(skillId);
  return kind ? `signature${kind}${timing === 'late' ? 'Finish' : timing === 'immediate' ? 'Follow' : ''}` : undefined;
}

/** Keep the atlas strike pose (36%) and projectile contact on the same clock. */
export function getPlayerSkillMotion(skillId: string | undefined, mode?: string) {
  if (mode === 'pvp') return null;
  const beat = skillId ? PLAYER_SKILL_BEATS[skillId] : undefined;
  if (!beat) return null;
  const [durationMs, flightMs] = beat;
  return { durationMs, flightMs, releaseMs: Math.round(durationMs * .36) - flightMs };
}

export type AttackImpactOutcome = 'hit' | 'critical' | 'blocked' | 'miss';
export type AttackImpactEvent = { outcome: AttackImpactOutcome; at: number };
export type ImpactPhase = 'idle' | 'charge' | 'freeze' | 'shake' | 'settle';

export function createAttackImpact(outcome: AttackImpactOutcome, now = performance.now()): AttackImpactEvent {
  return { outcome, at: now };
}

export function getAttackImpactProfile(idx = 0, outcome: AttackImpactOutcome = 'hit') {
  if (outcome === 'miss') return { freezeMs: 0, shakeMs: 0, settleMs: 0, shakePx: 0, scale: 1 };
  if (outcome === 'blocked') return { freezeMs: 0, shakeMs: 0, settleMs: 220, shakePx: 0, scale: 1 };
  const tier = clampMoveIndex(idx);
  const critical = outcome === 'critical';
  return {
    freezeMs: (tier >= 3 ? 90 : tier === 2 ? 64 : 42) + (critical ? 16 : 0),
    shakeMs: tier >= 3 ? 190 : tier === 2 ? 150 : 100,
    settleMs: tier >= 3 ? 160 : 110,
    shakePx: (tier >= 3 ? 4 : tier === 2 ? 2.5 : 1.5) + (critical ? 1 : 0),
    scale: tier >= 3 ? 1.018 : critical ? 1.012 : tier === 2 ? 1.008 : 1,
  };
}

export function getAttackImpactPhase(idx: number, outcome: AttackImpactOutcome, elapsedMs: number): ImpactPhase {
  const profile = getAttackImpactProfile(idx, outcome);
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed < profile.freezeMs) return 'freeze';
  if (elapsed < profile.freezeMs + profile.shakeMs) return 'shake';
  if (elapsed < profile.freezeMs + profile.shakeMs + profile.settleMs) return 'settle';
  return 'idle';
}

const BASE_CLEAR_MS = 760;
const IDX_CLEAR_BONUS_MS = [0, 90, 230, 620];
const LEVEL_CLEAR_STEP_MS = 24;

type AttackEffectMeta = {
  idx?: number | null;
  lvl?: number | null;
};

function clampMoveIndex(idx: number | null | undefined): number {
  if (!Number.isFinite(idx)) return 0;
  return Math.max(0, Math.min(3, Math.floor(Number(idx))));
}

function clampMoveLevel(lvl: number | null | undefined): number {
  if (!Number.isFinite(lvl)) return 1;
  return Math.max(1, Math.floor(Number(lvl)));
}

export function getAttackEffectHitDelay(type: string | null | undefined): number {
  if (!type) return 300;
  return HIT_DELAY_MS[type] ?? 300;
}

export function getAttackEffectClearDelay({ idx = 0, lvl = 1 }: AttackEffectMeta = {}): number {
  const moveIdx = clampMoveIndex(idx);
  const moveLvl = clampMoveLevel(lvl);
  return BASE_CLEAR_MS + IDX_CLEAR_BONUS_MS[moveIdx] + (moveLvl - 1) * LEVEL_CLEAR_STEP_MS;
}

export function getAttackEffectNextStepDelay(effect?: AttackEffectMeta): number {
  return getAttackEffectClearDelay(effect) + 120;
}
