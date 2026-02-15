/**
 * effectTiming.js — single source of truth for attack effect timeline.
 *
 * Battle flow owns when effect starts/hits/ends and when next step begins.
 */

const HIT_DELAY_MS = {
  fire: 300,
  electric: 200,
  water: 350,
  grass: 280,
  dark: 400,
  light: 300,
};

const BASE_CLEAR_MS = 760;
const IDX_CLEAR_BONUS_MS = [0, 90, 230, 620];
const LEVEL_CLEAR_STEP_MS = 24;

function clampMoveIndex(idx) {
  if (!Number.isFinite(idx)) return 0;
  return Math.max(0, Math.min(3, Math.floor(idx)));
}

function clampMoveLevel(lvl) {
  if (!Number.isFinite(lvl)) return 1;
  return Math.max(1, Math.floor(lvl));
}

export function getAttackEffectHitDelay(type) {
  return HIT_DELAY_MS[type] ?? 300;
}

export function getAttackEffectClearDelay({ idx = 0, lvl = 1 } = {}) {
  const moveIdx = clampMoveIndex(idx);
  const moveLvl = clampMoveLevel(lvl);
  return BASE_CLEAR_MS + IDX_CLEAR_BONUS_MS[moveIdx] + (moveLvl - 1) * LEVEL_CLEAR_STEP_MS;
}

export function getAttackEffectNextStepDelay(effect) {
  return getAttackEffectClearDelay(effect) + 120;
}
