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
