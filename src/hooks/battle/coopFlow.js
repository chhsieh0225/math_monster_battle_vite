import { getStarterStageIdx } from '../../utils/playerHp.js';

export function isCoopBattleMode(mode) {
  return mode === "coop" || mode === "double";
}

export function buildNextEvolvedAlly(allySub) {
  if (!allySub) return null;
  const allyStage = getStarterStageIdx(allySub);
  const nextAllyStage = Math.min(allyStage + 1, 2);
  const allyStageData = allySub.stages?.[nextAllyStage] || allySub.stages?.[0];
  return {
    ...allySub,
    selectedStageIdx: nextAllyStage,
    name: allyStageData?.name || allySub.name,
  };
}

export function handleCoopPartyKo({
  state,
  target = "main",
  reason = "你的夥伴倒下了...",
  setStarter,
  setPStg,
  setPHp,
  setAllySub,
  setPHpSub,
  setCoopActiveSlot,
  setPhase,
  setBText,
  safeTo,
  endSession,
  setScreen,
}) {
  if (target === "sub") {
    setAllySub(null);
    setPHpSub(0);
    setCoopActiveSlot("main");
    if ((state.pHp || 0) <= 0) {
      endSession(false);
      setPhase("ko");
      setBText(reason);
      setScreen("gameover");
      return "gameover";
    }
    setBText(`💫 ${state.allySub?.name || "副將"} 倒下了！`);
    setPhase("text");
    safeTo(() => {
      setPhase("menu");
      setBText("");
    }, 1100);
    return "sub_down";
  }

  if ((state.pHpSub || 0) > 0 && state.allySub) {
    const promoted = state.allySub;
    setStarter(promoted);
    setPStg(getStarterStageIdx(promoted));
    setPHp(state.pHpSub);
    setAllySub(null);
    setPHpSub(0);
    setCoopActiveSlot("main");
    setBText(`💫 ${promoted.name} 接替上場！`);
    setPhase("text");
    safeTo(() => {
      setPhase("menu");
      setBText("");
    }, 1200);
    return "promoted";
  }

  endSession(false);
  setPhase("ko");
  setBText(reason);
  setScreen("gameover");
  return "gameover";
}

export function runCoopAllySupportTurn({
  sr,
  safeTo,
  chance,
  rand,
  setBText,
  setPhase,
  setEAnim,
  setEHp,
  addD,
  addP,
  sfx,
  handleVictory,
  delayMs = 850,
  onDone,
}) {
  const state = sr.current;
  if (
    !isCoopBattleMode(state.battleMode)
    || !state.allySub
    || (state.pHpSub || 0) <= 0
    || !state.enemy
  ) return false;
  if (!chance(0.45)) return false;

  safeTo(() => {
    const s2 = sr.current;
    if (!s2.allySub || (s2.pHpSub || 0) <= 0 || !s2.enemy) {
      if (onDone) onDone();
      return;
    }

    const base = 16 + Math.max(0, s2.pLvl - 1) * 2;
    const dmg = Math.min(28, Math.max(6, Math.round(base * (0.85 + rand() * 0.3))));
    const nh = Math.max(0, s2.eHp - dmg);
    setBText(`🤝 ${s2.allySub.name} 協同攻擊！`);
    setPhase("playerAtk");
    setEAnim("enemyWaterHit 0.45s ease");
    setEHp(nh);
    addD(`-${dmg}`, 140, 55, "#60a5fa");
    addP("starter", 120, 130, 3);
    sfx.play("water");

    safeTo(() => setEAnim(""), 450);
    if (nh <= 0) {
      safeTo(() => handleVictory("被雙人連攜打倒了"), 700);
      return;
    }
    if (onDone) safeTo(onDone, 700);
  }, delayMs);

  return true;
}
