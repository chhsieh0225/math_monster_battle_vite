/**
 * localStorage helpers for achievements & encyclopedia.
 */

const ACH_KEY = "mathMonsterBattle_ach";
const ENC_KEY = "mathMonsterBattle_enc";

// ─── Achievements ───
export function loadAch() {
  try { return JSON.parse(localStorage.getItem(ACH_KEY)) || []; }
  catch { return []; }
}
export function saveAch(ids) {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(ids)); } catch {}
}

// ─── Encyclopedia ───
const EMPTY_ENC = { encountered: {}, defeated: {} };

export function loadEnc() {
  try { return JSON.parse(localStorage.getItem(ENC_KEY)) || { ...EMPTY_ENC }; }
  catch { return { ...EMPTY_ENC }; }
}
export function saveEnc(data) {
  try { localStorage.setItem(ENC_KEY, JSON.stringify(data)); } catch {}
}
