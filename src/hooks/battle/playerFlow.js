import {
  HITS_PER_LVL,
  MAX_MOVE_LVL,
  PLAYER_MAX_HP,
  POWER_CAPS,
} from '../../data/constants.js';
import { bestAttackType, freezeChance } from '../../utils/damageCalc.js';
import {
  getAttackEffectClearDelay,
  getAttackEffectHitDelay,
  getAttackEffectNextStepDelay,
} from '../../utils/effectTiming.js';
import { effectOrchestrator } from './effectOrchestrator.js';
import { resolvePlayerStrike, resolveRiskySelfDamage } from './turnResolver.js';

const HIT_ANIMS = {
  fire: "enemyFireHit 0.6s ease",
  electric: "enemyElecHit 0.6s ease",
  water: "enemyWaterHit 0.7s ease",
  grass: "enemyGrassHit 0.6s ease",
  dark: "enemyDarkHit 0.8s ease",
  light: "enemyFireHit 0.6s ease",
};

export function runPlayerAnswer({
  correct,
  move,
  starter,
  sr,
  safeTo,
  chance,
  sfx,
  setFb,
  setTC,
  setTW,
  setStreak,
  setPassiveCount,
  setCharge,
  setMaxStreak,
  setSpecDef,
  tryUnlock,
  setMLvls,
  setMLvlUp,
  setMHits,
  setPhase,
  setPAnim,
  setAtkEffect,
  setEAnim,
  setEffMsg,
  setBossCharging,
  setBurnStack,
  setPHp,
  setFrozen,
  frozenR,
  setStaticStack,
  setEHp,
  addD,
  doEnemyTurn,
  handleVictory,
  handleFreeze,
  setCursed,
  _endSession,
  setScreen,
  setBText,
}) {
  const s = sr.current;
  if (!s || !move || !starter) return;

  const loseToGameOver = (message = "你的夥伴倒下了...") => {
    _endSession(false);
    setPhase("ko");
    setBText(message);
    setScreen("gameover");
  };

  if (correct) {
    setFb({ correct: true });
    setTC((c) => c + 1);
    const ns = s.streak + 1;
    sfx.play(ns >= 5 ? "crit" : "hit");
    setStreak(ns);
    setCharge((c) => Math.min(c + 1, 3));
    if (ns > s.maxStreak) setMaxStreak(ns);

    const np = s.passiveCount + 1;
    if (np >= 8) {
      setPassiveCount(0);
      if (!s.specDef) {
        setSpecDef(true);
        tryUnlock("spec_def");
        sfx.play("specDef");
      }
    } else {
      setPassiveCount(np);
    }

    if (ns >= 5) tryUnlock("streak_5");
    if (ns >= 10) tryUnlock("streak_10");

    const nh = [...s.mHits];
    nh[s.selIdx] += 1;
    const cl = s.mLvls[s.selIdx];
    let didLvl = false;
    if (nh[s.selIdx] >= HITS_PER_LVL * cl && cl < MAX_MOVE_LVL) {
      const np2 = move.basePower + cl * move.growth;
      if (np2 <= POWER_CAPS[s.selIdx]) {
        const nl = [...s.mLvls];
        nl[s.selIdx] += 1;
        setMLvls(nl);
        didLvl = true;
        nh[s.selIdx] = 0;
        setMLvlUp(s.selIdx);
        safeTo(() => setMLvlUp(null), 2000);
        sfx.play("levelUp");
        if (nl[s.selIdx] >= MAX_MOVE_LVL) tryUnlock("move_max");
        if (nl.every((v) => v >= MAX_MOVE_LVL)) tryUnlock("all_moves_max");
      }
    }
    setMHits(nh);

    setPhase("playerAtk");
    effectOrchestrator.runPlayerLunge({
      safeTo,
      setPAnim,
      onReady: () => {
        const s2 = sr.current;
        const dmgType = bestAttackType(move, s2.enemy);
        const vfxType = move.risky && move.type2 ? move.type2 : dmgType;

        const effectMeta = {
          idx: s2.selIdx,
          lvl: s2.mLvls[s2.selIdx],
        };
        const effectTimeline = {
          hitDelay: getAttackEffectHitDelay(vfxType),
          clearDelay: getAttackEffectClearDelay(effectMeta),
          nextDelay: getAttackEffectNextStepDelay(effectMeta),
        };
        setAtkEffect({ type: vfxType, idx: effectMeta.idx, lvl: effectMeta.lvl });
        sfx.play(vfxType);

        safeTo(() => {
          const s3 = sr.current;
          const strike = resolvePlayerStrike({
            move,
            enemy: s3.enemy,
            moveIdx: s3.selIdx,
            moveLvl: s3.mLvls[s3.selIdx],
            didLevel: didLvl,
            maxPower: POWER_CAPS[s3.selIdx],
            streak: ns,
            stageBonus: s3.pStg,
            cursed: s3.cursed,
            starterType: starter.type,
            playerHp: s3.pHp,
            bossPhase: s3.bossPhase,
          });
          const { eff, isFortress, wasCursed } = strike;
          let { dmg } = strike;

          const isPhantom = s3.enemy.trait === "phantom" && chance(0.25);
          if (isPhantom) {
            setEAnim("dodgeSlide 0.9s ease");
            setEffMsg({ text: "👻 幻影閃避！", color: "#c084fc" });
            safeTo(() => setEffMsg(null), 1500);
            addD("MISS!", 155, 50, "#c084fc");
            safeTo(() => { setEAnim(""); setAtkEffect(null); }, effectTimeline.clearDelay);
            safeTo(() => doEnemyTurn(), effectTimeline.nextDelay);
            return;
          }

          if (wasCursed) setCursed(false);

          if (wasCursed) { setEffMsg({ text: "💀 詛咒弱化了攻擊...", color: "#a855f7" }); safeTo(() => setEffMsg(null), 1500); }
          else if (isFortress) { setEffMsg({ text: "🛡️ 鐵壁減傷！", color: "#94a3b8" }); safeTo(() => setEffMsg(null), 1500); }
          else if (starter.type === "light" && s3.pHp < PLAYER_MAX_HP * 0.5) { setEffMsg({ text: "🦁 勇氣之心！ATK↑", color: "#f59e0b" }); safeTo(() => setEffMsg(null), 1500); }
          else if (eff > 1) { setEffMsg({ text: "效果絕佳！", color: "#22c55e" }); safeTo(() => setEffMsg(null), 1500); }
          else if (eff < 1) { setEffMsg({ text: "效果不好...", color: "#94a3b8" }); safeTo(() => setEffMsg(null), 1500); }

          if (s3.bossCharging) {
            setBossCharging(false);
            safeTo(() => addD("💥打斷蓄力！", 155, 30, "#fbbf24"), 400);
          }

          let afterHp = Math.max(0, s3.eHp - dmg);

          let newBurn = s3.burnStack;
          if (starter.type === "fire" && afterHp > 0) {
            newBurn = Math.min(s3.burnStack + 1, 5);
            setBurnStack(newBurn);
            const bd = newBurn * 2;
            afterHp = Math.max(0, afterHp - bd);
            safeTo(() => addD(`🔥-${bd}`, 155, 50, "#f97316"), 500);
          }

          if (starter.type === "grass") {
            const heal = 2 * s3.mLvls[s3.selIdx];
            setPHp((h) => Math.min(h + heal, PLAYER_MAX_HP));
            sfx.play("heal");
            safeTo(() => addD(`+${heal}`, 50, 165, "#22c55e"), 500);
          }

          let willFreeze = false;
          if (starter.type === "water" && afterHp > 0) {
            if (chance(freezeChance(s3.mLvls[s3.selIdx]))) {
              willFreeze = true;
              setFrozen(true);
              frozenR.current = true;
              sfx.play("freeze");
              safeTo(() => addD("❄️凍結", 155, 50, "#38bdf8"), 600);
            }
          }

          if (starter.type === "electric" && afterHp > 0) {
            const newStatic = Math.min(s3.staticStack + 1, 3);
            setStaticStack(newStatic);
            if (newStatic >= 3) {
              const sd = 12;
              afterHp = Math.max(0, afterHp - sd);
              setStaticStack(0);
              sfx.play("staticDischarge");
              safeTo(() => addD(`⚡-${sd}`, 155, 50, "#fbbf24"), 500);
            }
          }

          setEHp(afterHp);
          setEAnim(HIT_ANIMS[vfxType] || "enemyHit 0.5s ease");
          const dmgColor = {
            fire: "#ef4444",
            electric: "#fbbf24",
            water: "#3b82f6",
            grass: "#22c55e",
            dark: "#a855f7",
            light: "#f59e0b",
          }[vfxType] || "#ef4444";
          addD(`-${dmg}`, 140, 55, dmgColor);
          safeTo(() => { setEAnim(""); setAtkEffect(null); }, effectTimeline.clearDelay);

          if (s3.enemy.trait === "counter" && afterHp > 0) {
            const refDmg = Math.round(dmg * 0.2);
            if (refDmg > 0) {
              safeTo(() => {
                const s4 = sr.current;
                const nh4 = Math.max(0, s4.pHp - refDmg);
                setPHp(nh4);
                setPAnim("playerHit 0.5s ease");
                addD(`🛡️-${refDmg}`, 60, 170, "#60a5fa");
                setEffMsg({ text: "🛡️ 反擊裝甲！", color: "#60a5fa" });
                safeTo(() => setEffMsg(null), 1500);
                safeTo(() => setPAnim(""), 500);
                if (nh4 <= 0) safeTo(() => { sfx.play("ko"); loseToGameOver("你的夥伴被反擊傷害打倒了..."); }, 800);
              }, 600);
            }
          }

          if (afterHp <= 0 && dmg >= s3.enemy.maxHp) tryUnlock("one_hit");
          if (afterHp <= 0) safeTo(() => handleVictory(), effectTimeline.nextDelay);
          else if (willFreeze) safeTo(() => handleFreeze(), effectTimeline.nextDelay);
          else safeTo(() => doEnemyTurn(), effectTimeline.nextDelay);
        }, effectTimeline.hitDelay);
      },
    });
    return;
  }

  setFb({ correct: false, answer: s.q.answer, steps: s.q.steps || [] });
  sfx.play("wrong");
  setTW((w) => w + 1);
  setStreak(0);
  setPassiveCount(0);
  setCharge(0);

  safeTo(() => {
    const s2 = sr.current;
    if (move.risky) {
      const sd = resolveRiskySelfDamage({
        move,
        moveLvl: s2.mLvls[s2.selIdx],
        moveIdx: s2.selIdx,
      });
      const nh2 = Math.max(0, s2.pHp - sd);
      setPHp(nh2);
      setPAnim("playerHit 0.5s ease");
      addD(`-${sd}`, 40, 170, "#ef4444");
      safeTo(() => setPAnim(""), 500);
      setBText(`${move.name} 失控了！自己受到 ${sd} 傷害！`);
      setPhase("text");
      safeTo(() => {
        if (nh2 <= 0) loseToGameOver();
        else if (frozenR.current) handleFreeze();
        else doEnemyTurn();
      }, 1500);
    } else {
      let mt = "攻擊落空了！";
      if (s2.burnStack > 0) {
        const bd = s2.burnStack * 2;
        const nh3 = Math.max(0, s2.eHp - bd);
        setEHp(nh3);
        addD(`🔥-${bd}`, 155, 50, "#f97316");
        mt += ` 灼燒-${bd}！`;
        if (nh3 <= 0) {
          setBText(mt);
          setPhase("text");
          safeTo(() => handleVictory("被灼燒打倒了"), 1200);
          return;
        }
      }
      setBText(mt);
      setPhase("text");
      if (frozenR.current) safeTo(() => handleFreeze(), 1200);
      else safeTo(() => doEnemyTurn(), 1200);
    }
  }, 2500);
}
