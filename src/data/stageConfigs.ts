/**
 * Stage progression is data-driven so stage order and enemy scaling can be
 * adjusted without changing roster builder logic.
 */
import { BALANCE_CONFIG } from './balanceConfig.ts';

export const STAGE_SCALE_BASE = BALANCE_CONFIG.stage.scaleBase;
export const STAGE_SCALE_STEP = BALANCE_CONFIG.stage.scaleStep;

export type StageWave = {
  monsterId: string;
  slimeType?: string;
  sceneType?: string;
};

export const STAGE_WAVES: StageWave[] = [...BALANCE_CONFIG.stage.waves.single];

/**
 * Double-battle lineup (1v2):
 * - Each two consecutive waves form one themed duo.
 * - `slimeType` can force slime variants to match intended attributes.
 * - `sceneType` forces battle background theme for stronger identity.
 */
export const DOUBLE_STAGE_WAVES: StageWave[] = [...BALANCE_CONFIG.stage.waves.double];
