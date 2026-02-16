/**
 * Stage progression is data-driven so stage order and enemy scaling can be
 * adjusted without changing roster builder logic.
 */
export const STAGE_SCALE_BASE = 1;
export const STAGE_SCALE_STEP = 0.12;

export type StageWave = {
  monsterId: string;
  slimeType?: string;
  sceneType?: string;
};

export const STAGE_WAVES: StageWave[] = [
  { monsterId: 'slime' },
  { monsterId: 'fire' },
  { monsterId: 'slime' },
  { monsterId: 'ghost' },
  { monsterId: 'slime' },
  { monsterId: 'fire' },
  { monsterId: 'dragon' },
  { monsterId: 'ghost' },
  { monsterId: 'dragon' },
  { monsterId: 'boss' },
];

/**
 * Double-battle lineup (1v2):
 * - Each two consecutive waves form one themed duo.
 * - `slimeType` can force slime variants to match intended attributes.
 * - `sceneType` forces battle background theme for stronger identity.
 */
export const DOUBLE_STAGE_WAVES: StageWave[] = [
  { monsterId: 'slime', slimeType: 'grass', sceneType: 'grass' },
  { monsterId: 'slime', slimeType: 'water', sceneType: 'grass' },

  { monsterId: 'fire', sceneType: 'fire' },
  { monsterId: 'ghost', sceneType: 'fire' },

  { monsterId: 'slime', slimeType: 'steel', sceneType: 'steel' },
  { monsterId: 'dragon', sceneType: 'steel' },

  { monsterId: 'slime', slimeType: 'dark', sceneType: 'dark' },
  { monsterId: 'fire', sceneType: 'dark' },

  { monsterId: 'ghost', sceneType: 'dark' },
  { monsterId: 'boss', sceneType: 'dark' },
];
