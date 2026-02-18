import { PLAYER_MAX_HP } from '../data/constants.ts';
import { BALANCE_CONFIG } from '../data/balanceConfig.ts';

const STAGE_HP_BONUS = 20;

type StarterWithStage = {
  selectedStageIdx?: number | null;
} | null | undefined;

function clampStageIdx(stageIdx: number | null | undefined): number {
  const raw = Number.isFinite(stageIdx) ? Number(stageIdx) : 0;
  return Math.max(0, Math.min(2, raw));
}

export function getStarterStageIdx(starter: StarterWithStage, fallbackStageIdx = 0): number {
  const raw = Number.isFinite(starter?.selectedStageIdx)
    ? Number(starter?.selectedStageIdx)
    : fallbackStageIdx;
  return clampStageIdx(raw);
}

/**
 * Legacy HP formula — evolution stage only, no level scaling.
 * Kept for backward compatibility with all existing callers.
 *
 * Callers should migrate to getLevelMaxHp(pLvl, pStg) once
 * useBattle passes pLvl through.
 */
export function getStageMaxHp(stageIdx = 0): number {
  return (PLAYER_MAX_HP as number) + clampStageIdx(stageIdx) * STAGE_HP_BONUS;
}

/**
 * Level-aware HP ceiling.
 *
 *   maxHp = PLAYER_MAX_HP
 *         + pLvl × hpPerLevel          (grows every level-up)
 *         + pStg × evolutionHpBonus     (extra bump on evolve)
 *
 * Example with defaults (hpPerLevel=5, evolutionHpBonus=15):
 *   Lv 1, stage 0 →  100 + 5  +  0 = 105
 *   Lv 3, stage 1 →  100 + 15 + 15 = 130
 *   Lv 6, stage 2 →  100 + 30 + 30 = 160
 *   Lv 10, stage 2 → 100 + 50 + 30 = 180
 *
 * This ensures the HP ceiling rises with player progression,
 * keeping pace with enemy stat scaling (scaleStep = 0.12/wave).
 *
 * @param pLvl  Player level (1-based, from battleReducer.pLvl)
 * @param pStg  Evolution stage (0–2)
 */
export function getLevelMaxHp(pLvl = 1, pStg = 0): number {
  const safeLvl = Math.max(1, Math.floor(pLvl));
  const safeStg = clampStageIdx(pStg);
  return (PLAYER_MAX_HP as number)
    + safeLvl * (BALANCE_CONFIG.hpPerLevel as number)
    + safeStg * (BALANCE_CONFIG.evolutionHpBonus as number);
}

export function getStarterMaxHp(starter: StarterWithStage, fallbackStageIdx = 0): number {
  return getStageMaxHp(getStarterStageIdx(starter, fallbackStageIdx));
}

/**
 * Level-aware version of getStarterMaxHp.
 * Use this when pLvl data is available.
 */
export function getStarterLevelMaxHp(
  starter: StarterWithStage,
  pLvl = 1,
  fallbackStageIdx = 0,
): number {
  return getLevelMaxHp(pLvl, getStarterStageIdx(starter, fallbackStageIdx));
}
