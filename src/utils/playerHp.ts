import { PLAYER_MAX_HP } from '../data/constants.js';

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

export function getStageMaxHp(stageIdx = 0): number {
  return (PLAYER_MAX_HP as number) + clampStageIdx(stageIdx) * STAGE_HP_BONUS;
}

export function getStarterMaxHp(starter: StarterWithStage, fallbackStageIdx = 0): number {
  return getStageMaxHp(getStarterStageIdx(starter, fallbackStageIdx));
}
