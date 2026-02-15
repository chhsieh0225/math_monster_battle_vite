import {
  HITS_PER_LVL,
  MAX_MOVE_LVL,
  POWER_CAPS,
} from '../../data/constants.js';
import { bestAttackType, freezeChance } from '../../utils/damageCalc.js';
import { getStageMaxHp, getStarterMaxHp, getStarterStageIdx } from '../../utils/playerHp.js';
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

function formatFallback(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, key) => String(params[key] ?? ""));
}

function tr(t, key, fallback, params) {
  if (typeof t === "function") return t(key, fallback, params);
  return formatFallback(fallback, params);
}

export function runPlayerAnswer({
  correct,
  move,
  starter,
  attackerSlot = "main",
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
  setPHpSub,
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
  handlePlayerPartyKo,
  runAllySupportTurn,
  t,
}) {
  const s = sr.current;
  if (!s || !move || !starter) return;

  const loseToGameOver = (message = tr(t, "battle.ally.ko", "Your partner has fallen...")) => {
    _endSession(false);
    setPhase("ko");
    setBText(message);
    setScreen("gameover");
  };

  const resolveMainKo = (message = tr(t, "battle.ally.ko", "Your partner has fallen...")) => {
    if (handlePlayerPartyKo) {
      return handlePlayerPartyKo({ target: "main", reason: message });
    }
    loseToGameOver(message);
    return "gameover";
  };

  const isSubAttacker = attackerSlot === "sub";
  const attackerName = isSubAttacker
    ? (s.allySub?.name || tr(t, "battle.role.sub", "Sub"))
    : (s.starter?.name || tr(t, "battle.role.main", "Main"));
  const getAttackerHp = (state) => (
    isSubAttacker ? (state.pHpSub || 0) : (state.pHp || 0)
  );
  const getAttackerMaxHp = (state) => (
    isSubAttacker
      ? getStarterMaxHp(state.allySub)
      : getStageMaxHp(state.pStg)
  );
  const healAttacker = (heal) => {
    const maxHp = getAttackerMaxHp(sr.current);
    if (isSubAttacker && typeof setPHpSub === "function") {
      setPHpSub((h) => Math.min(h + heal, maxHp));
      return;
    }
    setPHp((h) => Math.min(h + heal, maxHp));
  };
  const applyDamageToAttacker = ({ state, damage, popupText = null, color = "#ef4444" }) => {
    const baseHp = getAttackerHp(state);
    const nextHp = Math.max(0, baseHp - damage);
    if (isSubAttacker && typeof setPHpSub === "function") {
      setPHpSub(nextHp);
    } else {
      setPHp(nextHp);
      setPAnim("playerHit 0.5s ease");
      safeTo(() => setPAnim(""), 500);
    }
    addD(
      popupText || `-${damage}`,
      isSubAttacker ? 112 : 60,
      isSubAttacker ? 146 : 170,
      color,
    );
    return nextHp;
  };
  const resolveActiveKo = (message = tr(t, "battle.ally.ko", "Your partner has fallen...")) => {
    if (!isSubAttacker) return resolveMainKo(message);
    if (handlePlayerPartyKo) {
      return handlePlayerPartyKo({ target: "sub", reason: message });
    }
    loseToGameOver(message);
    return "gameover";
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
            stageBonus: isSubAttacker ? getStarterStageIdx(s3.allySub) : s3.pStg,
            cursed: s3.cursed,
            starterType: starter.type,
            playerHp: getAttackerHp(s3),
            attackerMaxHp: getAttackerMaxHp(s3),
            bossPhase: s3.bossPhase,
          });
          const { eff, isFortress, wasCursed } = strike;
          let { dmg } = strike;

          const isPhantom = s3.enemy.trait === "phantom" && chance(0.25);
          if (isPhantom) {
            setEAnim("dodgeSlide 0.9s ease");
            setEffMsg({ text: tr(t, "battle.effect.phantomDodge", "👻 Phantom Dodge!"), color: "#c084fc" });
            safeTo(() => setEffMsg(null), 1500);
            addD("MISS!", 155, 50, "#c084fc");
            safeTo(() => { setEAnim(""); setAtkEffect(null); }, effectTimeline.clearDelay);
            safeTo(() => doEnemyTurn(), effectTimeline.nextDelay);
            return;
          }

          if (wasCursed) setCursed(false);

          if (wasCursed) { setEffMsg({ text: tr(t, "battle.effect.curseWeak", "💀 Curse weakened the attack..."), color: "#a855f7" }); safeTo(() => setEffMsg(null), 1500); }
          else if (isFortress) { setEffMsg({ text: tr(t, "battle.effect.fortressGuard", "🛡️ Fortress reduced damage!"), color: "#94a3b8" }); safeTo(() => setEffMsg(null), 1500); }
          else if (starter.type === "light" && getAttackerHp(s3) < getAttackerMaxHp(s3) * 0.5) { setEffMsg({ text: tr(t, "battle.effect.lightCourage", "🦁 Courage Heart! ATK↑"), color: "#f59e0b" }); safeTo(() => setEffMsg(null), 1500); }
          else if (eff > 1) { setEffMsg({ text: tr(t, "battle.effect.super", "Super effective!"), color: "#22c55e" }); safeTo(() => setEffMsg(null), 1500); }
          else if (eff < 1) { setEffMsg({ text: tr(t, "battle.effect.notVery", "Not very effective..."), color: "#94a3b8" }); safeTo(() => setEffMsg(null), 1500); }

          if (s3.bossCharging) {
            setBossCharging(false);
            safeTo(() => addD(tr(t, "battle.tag.chargeInterrupted", "💥Charge Interrupted!"), 155, 30, "#fbbf24"), 400);
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
            healAttacker(heal);
            sfx.play("heal");
            safeTo(() => addD(`+${heal}`, isSubAttacker ? 112 : 50, isSubAttacker ? 146 : 165, "#22c55e"), 500);
          }

          let willFreeze = false;
          if (starter.type === "water" && afterHp > 0) {
            if (chance(freezeChance(s3.mLvls[s3.selIdx]))) {
              willFreeze = true;
              setFrozen(true);
              frozenR.current = true;
              sfx.play("freeze");
              safeTo(() => addD(tr(t, "battle.tag.freeze", "❄️Frozen"), 155, 50, "#38bdf8"), 600);
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
                const nh4 = applyDamageToAttacker({
                  state: s4,
                  damage: refDmg,
                  popupText: `🛡️-${refDmg}`,
                  color: "#60a5fa",
                });
                setEffMsg({ text: tr(t, "battle.effect.counterArmor", "🛡️ Counter Armor!"), color: "#60a5fa" });
                safeTo(() => setEffMsg(null), 1500);
                if (nh4 <= 0) safeTo(() => {
                  sfx.play("ko");
                  resolveActiveKo(tr(t, "battle.ko.counter", "{name} was knocked out by counter damage...", { name: attackerName }));
                }, 800);
              }, 600);
            }
          }

          if (afterHp <= 0 && dmg >= s3.enemy.maxHp) tryUnlock("one_hit");
          if (afterHp <= 0) safeTo(() => handleVictory(), effectTimeline.nextDelay);
          else {
            const continueAfterTurn = () => {
              if (willFreeze) handleFreeze();
              else doEnemyTurn();
            };
            if (runAllySupportTurn && runAllySupportTurn({
              delayMs: effectTimeline.nextDelay,
              onDone: continueAfterTurn,
            })) {
              return;
            }
            safeTo(continueAfterTurn, effectTimeline.nextDelay);
          }
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
      const nh2 = applyDamageToAttacker({
        state: s2,
        damage: sd,
      });
      setBText(tr(t, "battle.risky.backfire", "{move} went out of control! {name} took {damage} damage!", {
        move: move.name,
        name: attackerName,
        damage: sd,
      }));
      setPhase("text");
      safeTo(() => {
        if (nh2 <= 0) resolveActiveKo(tr(t, "battle.ko.fallen", "{name} has fallen...", { name: attackerName }));
        else if (frozenR.current) handleFreeze();
        else doEnemyTurn();
      }, 1500);
    } else {
      let mt = tr(t, "battle.attack.miss", "Attack missed!");
      if (s2.burnStack > 0) {
        const bd = s2.burnStack * 2;
        const nh3 = Math.max(0, s2.eHp - bd);
        setEHp(nh3);
        addD(`🔥-${bd}`, 155, 50, "#f97316");
        mt += tr(t, "battle.burn.tickShort", " Burn -{damage}!", { damage: bd });
        if (nh3 <= 0) {
          setBText(mt);
          setPhase("text");
          safeTo(() => handleVictory(tr(t, "battle.victory.verb.burned", "was burned down")), 1200);
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
