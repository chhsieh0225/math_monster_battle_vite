import type { AchievementId, EncyclopediaData } from '../types/game';
import { readJson, writeJson } from './storage.ts';

/**
 * localStorage helpers for achievements & encyclopedia.
 */

const ACH_KEY = 'mathMonsterBattle_ach';
const ENC_KEY = 'mathMonsterBattle_enc';

// ─── Achievements ───
export function loadAch(): AchievementId[] {
  return readJson<AchievementId[]>(ACH_KEY, []);
}

export function saveAch(ids: AchievementId[]): void {
  writeJson(ACH_KEY, ids);
}

// ─── Encyclopedia ───
const EMPTY_ENC: EncyclopediaData = { encountered: {}, defeated: {} };

export function loadEnc(): EncyclopediaData {
  return readJson<EncyclopediaData>(ENC_KEY, EMPTY_ENC);
}

export function saveEnc(data: EncyclopediaData): void {
  writeJson(ENC_KEY, data);
}
