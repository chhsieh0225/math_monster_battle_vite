import { getStageMaxHp } from '../../utils/playerHp.js';

function unlockStarterClearAchievement(starterId, tryUnlock) {
  if (starterId === "fire") tryUnlock("fire_clear");
  else if (starterId === "water") tryUnlock("water_clear");
  else if (starterId === "grass") tryUnlock("grass_clear");
  else if (starterId === "electric") tryUnlock("electric_clear");
  else if (starterId === "lion") tryUnlock("lion_clear");
}

export function applyVictoryAchievements({
  state,
  tryUnlock,
}) {
  tryUnlock("first_win");
  if (state.enemy?.id === "boss") tryUnlock("boss_kill");
  if ((state.pHp || 0) <= 5) tryUnlock("low_hp");
}

export function applyGameCompletionAchievements({
  state,
  tryUnlock,
  setEncData,
  encTotal,
}) {
  if ((state.tW || 0) === 0) tryUnlock("perfect");
  if (state.timedMode) tryUnlock("timed_clear");
  if ((state.pHp || 0) >= getStageMaxHp(state.pStg || 0)) tryUnlock("no_damage");
  unlockStarterClearAchievement(state.starter?.id, tryUnlock);

  setEncData((prev) => {
    if (Object.keys(prev.encountered).length >= encTotal) tryUnlock("enc_all");
    if (Object.keys(prev.defeated).length >= encTotal) tryUnlock("enc_defeat");
    return prev;
  });
}
