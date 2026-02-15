import { PLAYER_MAX_HP } from '../data/constants.js';

const STAGE_HP_BONUS = 20;

function clampStageIdx(stageIdx) {
  const raw = Number.isFinite(stageIdx) ? stageIdx : 0;
  return Math.max(0, Math.min(2, raw));
}

export function getStarterStageIdx(starter, fallbackStageIdx = 0) {
  const raw = Number.isFinite(starter?.selectedStageIdx)
    ? starter.selectedStageIdx
    : fallbackStageIdx;
  return clampStageIdx(raw);
}

export function getStageMaxHp(stageIdx = 0) {
  return PLAYER_MAX_HP + clampStageIdx(stageIdx) * STAGE_HP_BONUS;
}

export function getStarterMaxHp(starter, fallbackStageIdx = 0) {
  return getStageMaxHp(getStarterStageIdx(starter, fallbackStageIdx));
}
