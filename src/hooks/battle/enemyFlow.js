import { getEff } from '../../data/typeEffectiveness.js';
import { calcEnemyDamage } from '../../utils/damageCalc.js';
import { computeBossPhase } from '../../utils/turnFlow.js';
import { effectOrchestrator } from './effectOrchestrator.js';
import {
  resolveBossTurnState,
  resolveEnemyAssistStrike,
  resolveEnemyPrimaryStrike,
} from './turnResolver.ts';

function formatFallback(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, key) => String(params[key] ?? ""));
}

function tr(t, key, fallback, params) {
  if (typeof t === "function") return t(key, fallback, params);
  return formatFallback(fallback, params);
}

export function runEnemyTurn({
  sr,
  safeTo,
  rand,
  randInt,
  chance,
  sfx,
  setSealedTurns,
  setSealedMove,
  setBossPhase,
  setBossTurn,
  setBossCharging,
  setBText,
  setPhase,
  setEAnim,
  setPAnim,
  setPHp,
  setPHpSub,
  setSpecDef,
  setDefAnim,
  setEHp,
  setEffMsg,
  setCursed,
  addD,
  addP,
  _endSession,
  setScreen,
  handleVictory,
  handlePlayerPartyKo,
  t,
}) {
  const loseToGameOver = (message = tr(t, "battle.ally.ko", "Your partner has fallen...")) => {
    _endSession(false);
    setPhase("ko");
    setBText(message);
    setScreen("gameover");
  };

  const resolvePlayerTarget = (s) => {
    const targets = [];
    if ((s.pHp || 0) > 0) targets.push("main");
    if (s.allySub && (s.pHpSub || 0) > 0) targets.push("sub");
    if (targets.length <= 0) return "main";
    return targets[randInt(0, targets.length - 1)];
  };

  const applyDamageToTarget = ({ s, target, dmg, label = null, color = "#ef4444" }) => {
    const isSub = target === "sub";
    const prevHp = isSub ? (s.pHpSub || 0) : (s.pHp || 0);
    const nextHp = Math.max(0, prevHp - dmg);
    if (isSub) {
      setPHpSub(nextHp);
    } else {
      setPHp(nextHp);
      setPAnim("playerHit 0.5s ease");
      safeTo(() => setPAnim(""), 500);
    }
    addD(label || `-${dmg}`, isSub ? 112 : 60, isSub ? 146 : 170, color);
    return nextHp;
  };

  const maybeEnemyAssistAttack = (delayMs = 850) => {
    const s = sr.current;
    if (!s.enemySub || !s.starter) return false;
    if (!chance(0.35)) return false;

    safeTo(() => {
      const s2 = sr.current;
      if (!s2.enemySub || !s2.starter) {
        setPhase("menu");
        setBText("");
        return;
      }
      setBText(tr(t, "battle.enemy.assistAttack", "⚔️ {enemy} launched an assist attack!", { enemy: s2.enemySub.name }));
      setPhase("enemyAtk");
      effectOrchestrator.runEnemyLunge({
        safeTo,
        setEAnim,
        strikeDelay: 380,
        onStrike: () => {
          const s3 = sr.current;
          if (!s3.enemySub || !s3.starter) {
            setPhase("menu");
            setBText("");
            return;
          }
          const target = resolvePlayerTarget(s3);
          const targetName = target === "sub" ? (s3.allySub?.name || tr(t, "battle.role.sub", "Sub")) : s3.starter.name;
          const defenderType = target === "sub" ? (s3.allySub?.type || s3.starter.type) : s3.starter.type;
          const { dmg } = resolveEnemyAssistStrike({
            enemySub: s3.enemySub,
            starterType: defenderType,
          });
          const nh = applyDamageToTarget({
            s: s3,
            target,
            dmg,
            label: `✶-${dmg}`,
            color: "#f97316",
          });
          sfx.play("playerHit");
          addP("enemy", 84, 186, 3);
          if (nh <= 0) {
            safeTo(() => {
              sfx.play("ko");
              if (handlePlayerPartyKo) {
                handlePlayerPartyKo({
                  target,
                  reason: tr(t, "battle.ko.doubleFocus", "{name} was knocked out by a double focus attack...", { name: targetName }),
                });
              } else {
                loseToGameOver(tr(t, "battle.ko.doubleFocus.generic", "Your partner was knocked out by a double focus attack..."));
              }
            }, 650);
            return;
          }
          safeTo(() => {
            setPhase("menu");
            setBText("");
          }, 650);
        },
      });
    }, delayMs);

    return true;
  };

  function doEnemyAttack(bp) {
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    setBText(tr(t, "battle.enemy.attackStart", "{enemy} attacks!", { enemy: s.enemy.name }));
    setPhase("enemyAtk");
    effectOrchestrator.runEnemyLunge({
      safeTo,
      setEAnim,
      onStrike: () => {
        const s2 = sr.current; // re-read after delay
        const target = resolvePlayerTarget(s2);
        const targetName = target === "sub" ? (s2.allySub?.name || tr(t, "battle.role.sub", "Sub")) : s2.starter.name;
        const defenderType = target === "sub" ? (s2.allySub?.type || s2.starter.type) : s2.starter.type;
        if (target === "main" && s2.specDef) {
          const st = s2.starter.type;
          setSpecDef(false);
          setDefAnim(st);
          if (st === "fire") {
            setBText(tr(t, "battle.specdef.fire.block", "🛡️ Barrier blocked the attack!"));
            addD("🛡️BLOCK", 60, 170, "#fbbf24");
            addP("starter", 50, 170, 6);
            safeTo(() => { setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
          } else if (st === "water") {
            setPAnim("dodgeSlide 0.9s ease");
            setBText(tr(t, "battle.specdef.water.dodge", "💨 Perfect dodge!"));
            addD("MISS!", 60, 170, "#38bdf8");
            safeTo(() => { setPAnim(""); setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
          } else if (st === "electric") {
            setBText(tr(t, "battle.specdef.electric.stun", "⚡ Electric stun! Enemy cannot move!"));
            addD(tr(t, "battle.pvp.tag.paralyze", "⚡Paralyzed"), 60, 170, "#fbbf24");
            setEAnim("enemyElecHit 0.6s ease");
            addP("electric", 155, 80, 5);
            safeTo(() => {
              setEAnim("");
              setDefAnim(null);
              setBText(tr(t, "battle.enemy.paralyzedSkip", "⚡ {enemy} is paralyzed and cannot attack!", { enemy: sr.current.enemy.name }));
              setPhase("text");
              safeTo(() => { setPhase("menu"); setBText(""); }, 1500);
            }, 1800);
          } else if (st === "light") {
            const roarDmg = 15;
            const nh = Math.max(0, sr.current.eHp - roarDmg);
            setEHp(nh);
            setBText(tr(t, "battle.specdef.light.roarCounter", "✨ Lion's roar! Blocked and countered!"));
            addD("🛡️BLOCK", 60, 170, "#f59e0b");
            addP("starter", 50, 170, 6);
            sfx.play("light");
            safeTo(() => {
              addD(`-${roarDmg}`, 155, 50, "#f59e0b");
              setEAnim("enemyFireHit 0.6s ease");
              addP("starter", 155, 80, 5);
            }, 500);
            safeTo(() => {
              setEAnim("");
              setDefAnim(null);
              if (nh <= 0) safeTo(() => handleVictory(tr(t, "battle.victory.verb.lionRoar", "was defeated by lion's roar")), 500);
              else { setPhase("menu"); setBText(""); }
            }, 1800);
          } else {
            const rawDmg = Math.round(s2.enemy.atk * (0.8 + rand() * 0.4));
            const refDmg = Math.round(rawDmg * 1.2);
            const nh = Math.max(0, sr.current.eHp - refDmg);
            setEHp(nh);
            setBText(tr(t, "battle.specdef.grass.reflect", "🌿 Reflected attack!"));
            addD("🛡️BLOCK", 60, 170, "#22c55e");
            safeTo(() => {
              addD(`-${refDmg}`, 155, 50, "#22c55e");
              setEAnim("enemyGrassHit 0.6s ease");
              addP("starter", 155, 80, 5);
            }, 500);
            safeTo(() => {
              setEAnim("");
              setDefAnim(null);
              if (nh <= 0) safeTo(() => handleVictory(tr(t, "battle.victory.verb.reflected", "was defeated by reflected damage")), 500);
              else { setPhase("menu"); setBText(""); }
            }, 1800);
          }
          return;
        }

        const {
          trait,
          scaledAtk,
          isBlaze,
          isCrit,
          defEff,
          dmg,
        } = resolveEnemyPrimaryStrike({
          enemy: s2.enemy,
          enemyHp: s2.eHp,
          starterType: defenderType,
          bossPhase: bp,
          chance,
        });
        const nh = applyDamageToTarget({
          s: s2,
          target,
          dmg,
          label: isCrit ? `💥-${dmg}` : `-${dmg}`,
          color: isCrit ? "#ff6b00" : "#ef4444",
        });
        sfx.play("playerHit");
        addP("enemy", 80, 190, 4);
        if (isCrit) { setEffMsg({ text: tr(t, "battle.enemy.effect.crit", "🔥 Critical!"), color: "#ff6b00" }); safeTo(() => setEffMsg(null), 1500); }
        else if (isBlaze) { setEffMsg({ text: tr(t, "battle.enemy.effect.blazeAwaken", "🔥 Blaze awakened! ATK↑"), color: "#ef4444" }); safeTo(() => setEffMsg(null), 1500); }
        else if (defEff > 1) { setEffMsg({ text: tr(t, "battle.enemy.effect.super", "Enemy move is super effective!"), color: "#ef4444" }); safeTo(() => setEffMsg(null), 1500); }
        else if (defEff < 1) { setEffMsg({ text: tr(t, "battle.enemy.effect.notVery", "Enemy move is not very effective"), color: "#64748b" }); safeTo(() => setEffMsg(null), 1500); }

        if (nh <= 0) {
          safeTo(() => {
            sfx.play("ko");
            if (handlePlayerPartyKo) {
              handlePlayerPartyKo({ target, reason: tr(t, "battle.ko.fallen", "{name} has fallen...", { name: targetName }) });
            } else {
              loseToGameOver();
            }
          }, 800);
          return;
        }

        if (trait === "tenacity") {
          const heal = Math.round(s2.enemy.maxHp * 0.15);
          const newEHp = Math.min(sr.current.eHp + heal, s2.enemy.maxHp);
          safeTo(() => {
            setEHp(newEHp);
            addD(`+${heal}`, 155, 50, "#3b82f6");
            setBText(tr(t, "battle.enemy.tenacityHeal", "💧 {enemy} recovered HP!", { enemy: s2.enemy.name }));
          }, 600);
        }

        if (trait === "curse" && chance(0.35)) {
          setCursed(true);
          safeTo(() => {
            addD(tr(t, "battle.tag.curse", "💀Curse"), 60, 140, "#a855f7");
            setBText(tr(t, "battle.enemy.curseApplied", "💀 {enemy}'s curse weakens your next attack!", { enemy: s2.enemy.name }));
          }, 600);
        }

        if (trait === "swift" && chance(0.25)) {
          safeTo(() => {
            setBText(tr(t, "battle.enemy.swiftExtra", "⚡ {enemy} attacks again!", { enemy: s2.enemy.name }));
            effectOrchestrator.runEnemyLunge({
              safeTo,
              setEAnim,
              onStrike: () => {
                const s3 = sr.current;
                const target2 = resolvePlayerTarget(s3);
                const target2Name = target2 === "sub" ? (s3.allySub?.name || tr(t, "battle.role.sub", "Sub")) : s3.starter.name;
                const defenderType2 = target2 === "sub" ? (s3.allySub?.type || s3.starter.type) : s3.starter.type;
                const dmg2 = calcEnemyDamage(scaledAtk, getEff(s3.enemy.mType, defenderType2));
                const nh2 = applyDamageToTarget({
                  s: s3,
                  target: target2,
                  dmg: dmg2,
                  label: `⚡-${dmg2}`,
                  color: "#eab308",
                });
                sfx.play("playerHit");
                addP("enemy", 80, 190, 3);
                if (nh2 <= 0) safeTo(() => {
                  sfx.play("ko");
                  if (handlePlayerPartyKo) {
                    handlePlayerPartyKo({ target: target2, reason: tr(t, "battle.ko.comboDown", "{name} was knocked out by combo hits...", { name: target2Name }) });
                  } else {
                    loseToGameOver();
                  }
                }, 800);
                else {
                  if (maybeEnemyAssistAttack(500)) return;
                  safeTo(() => { setPhase("menu"); setBText(""); }, 800);
                }
              },
            });
          }, 1000);
          return;
        }

        if (maybeEnemyAssistAttack(900)) return;
        safeTo(() => { setPhase("menu"); setBText(""); }, 800);
      },
    });
  }

  function doEnemyTurnInner() {
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    const bossState = resolveBossTurnState({
      enemy: s.enemy,
      eHp: s.eHp,
      bossTurn: s.bossTurn,
      bossCharging: s.bossCharging,
      sealedMove: s.sealedMove,
    });
    const { isBoss, phase: bp, nextBossTurn, bossEvent } = bossState;
    if (isBoss) setBossTurn(nextBossTurn);

    if (bossEvent === "release") {
      setBossCharging(false);
      setBText(tr(t, "battle.boss.release", "💀 Dark Dragon King unleashes dark breath!"));
      sfx.play("bossBoom");
      setPhase("enemyAtk");
      effectOrchestrator.runEnemyLunge({
        safeTo,
        setEAnim,
        onStrike: () => {
          const s2 = sr.current;
          const target = resolvePlayerTarget(s2);
          const targetName = target === "sub" ? (s2.allySub?.name || tr(t, "battle.role.sub", "Sub")) : s2.starter.name;
          const bigDmg = Math.round(s2.enemy.atk * 2.2);
          const nh = applyDamageToTarget({
            s: s2,
            target,
            dmg: bigDmg,
            label: `💀-${bigDmg}`,
            color: "#a855f7",
          });
          addP("enemy", 80, 190, 6);
          if (nh <= 0) safeTo(() => {
            if (handlePlayerPartyKo) {
              handlePlayerPartyKo({ target, reason: tr(t, "battle.ko.bossBreath", "{name} was knocked out by dark breath...", { name: targetName }) });
            } else {
              loseToGameOver();
            }
          }, 800);
          else safeTo(() => { setPhase("menu"); setBText(""); }, 800);
        },
      });
      return;
    }

    if (bossEvent === "start_charge") {
      setBossCharging(true);
      sfx.play("bossCharge");
      setBText(tr(t, "battle.boss.charge", "⚠️ Dark Dragon King is charging! It will unleash a big move next turn!"));
      setPhase("text");
      setEAnim("bossShake 0.5s ease infinite");
      safeTo(() => { setPhase("menu"); setBText(""); setEAnim(""); }, 2000);
      return;
    }

    if (bossEvent === "seal_move") {
      const sealIdx = randInt(0, 2);
      setSealedMove(sealIdx);
      sfx.play("seal");
      setSealedTurns(2);
      const moveName = s.starter.moves[sealIdx]?.name || "???";
      setBText(tr(t, "battle.boss.sealMove", "💀 Dark Dragon King sealed your \"{move}\"! (2 turns)", { move: moveName }));
      setPhase("text");
      safeTo(() => doEnemyAttack(bp), 1500);
      return;
    }

    doEnemyAttack(bp);
  }

  const s = sr.current;
  if (!s.enemy || !s.starter) return;
  const isBoss = s.enemy.id === "boss";

  if (isBoss && s.sealedTurns > 0) {
    const nt = s.sealedTurns - 1;
    setSealedTurns(nt);
    if (nt <= 0) setSealedMove(-1);
  }

  if (isBoss) {
    const newPhase = computeBossPhase(s.eHp, s.enemy.maxHp);
    if (newPhase !== s.bossPhase) {
      setBossPhase(newPhase);
      const phaseMsg = newPhase === 2 ? tr(t, "battle.boss.phase2", "💀 Dark Dragon King entered rage state! ATK increased!")
        : newPhase === 3 ? tr(t, "battle.boss.phase3", "💀 Dark Dragon King awakened! Final stand!")
          : "";
      if (phaseMsg) {
        setBText(phaseMsg);
        setPhase("text");
        setEAnim("bossShake 0.5s ease");
        safeTo(() => setEAnim(""), 600);
        safeTo(() => doEnemyTurnInner(), 1500);
        return;
      }
    }
  }

  doEnemyTurnInner();
}
