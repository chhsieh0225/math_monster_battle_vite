import { readJson, writeJson } from './storage';

/**
 * localStorage helpers for achievements & encyclopedia.
 */

const ACH_KEY = "mathMonsterBattle_ach";
const ENC_KEY = "mathMonsterBattle_enc";

// ─── Achievements ───
export function loadAch() {
  return readJson(ACH_KEY, []);
}
export function saveAch(ids) {
  writeJson(ACH_KEY, ids);
}

// ─── Encyclopedia ───
const EMPTY_ENC = { encountered: {}, defeated: {} };

export function loadEnc() {
  return readJson(ENC_KEY, EMPTY_ENC);
}
export function saveEnc(data) {
  writeJson(ENC_KEY, data);
}
