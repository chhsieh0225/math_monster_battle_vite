/**
 * Stage progression is data-driven so stage order and enemy scaling can be
 * adjusted without changing roster builder logic.
 */
import { BALANCE_CONFIG } from './balanceConfig.ts';

export const STAGE_SCALE_BASE = BALANCE_CONFIG.stage.scaleBase;
export const STAGE_SCALE_STEP = BALANCE_CONFIG.stage.scaleStep;

export type StageWave = {
  /**
   * 指定出場怪獸 ID。若省略，則依 sceneType 從符合屬性的怪獸池隨機抽取。
   * 至少需要 monsterId 或 sceneType 其中之一。
   */
  monsterId?: string;
  slimeType?: string;
  sceneType?: string;
};

export const STAGE_WAVES: StageWave[] = [...BALANCE_CONFIG.stage.waves.single];
export const STAGE_RANDOM_SWAP_START_INDEX = BALANCE_CONFIG.stage.randomSwap.startIndex;
export const STAGE_RANDOM_SWAP_END_INDEX_EXCLUSIVE_FROM_TAIL =
  BALANCE_CONFIG.stage.randomSwap.endIndexExclusiveFromTail;
export const STAGE_RANDOM_SWAP_CANDIDATES: StageWave[] = [...BALANCE_CONFIG.stage.randomSwap.candidates];

/**
 * Double-battle lineup (1v2):
 * - Each two consecutive waves form one themed duo.
 * - `slimeType` can force slime variants to match intended attributes.
 * - `sceneType` forces battle background theme for stronger identity.
 */
export const DOUBLE_STAGE_WAVES: StageWave[] = [...BALANCE_CONFIG.stage.waves.double];
