import { getEff } from '../../data/typeEffectiveness.js';
import { calcEnemyDamage } from '../../utils/damageCalc.js';
import { computeBossPhase } from '../../utils/turnFlow.js';
import { effectOrchestrator } from './effectOrchestrator.js';
import {
  resolveBossTurnState,
  resolveEnemyAssistStrike,
  resolveEnemyPrimaryStrike,
} from './turnResolver.js';

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
}) {
  const loseToGameOver = (message = "你的夥伴倒下了...") => {
    _endSession(false);
    setPhase("ko");
    setBText(message);
    setScreen("gameover");
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
      setBText(`⚔️ ${s2.enemySub.name} 發動支援攻擊！`);
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
          const { dmg } = resolveEnemyAssistStrike({
            enemySub: s3.enemySub,
            starterType: s3.starter.type,
          });
          const nh = Math.max(0, s3.pHp - dmg);
          setPHp(nh);
          setPAnim("playerHit 0.45s ease");
          sfx.play("playerHit");
          addD(`✶-${dmg}`, 60, 170, "#f97316");
          addP("enemy", 84, 186, 3);
          safeTo(() => setPAnim(""), 450);
          if (nh <= 0) {
            safeTo(() => {
              sfx.play("ko");
              loseToGameOver("你的夥伴被雙打夾擊擊倒了...");
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
    setBText(`${s.enemy.name} 發動攻擊！`);
    setPhase("enemyAtk");
    effectOrchestrator.runEnemyLunge({
      safeTo,
      setEAnim,
      onStrike: () => {
        const s2 = sr.current; // re-read after delay
        if (s2.specDef) {
          const st = s2.starter.type;
          setSpecDef(false);
          setDefAnim(st);
          if (st === "fire") {
            setBText("🛡️ 防護罩擋下了攻擊！");
            addD("🛡️BLOCK", 60, 170, "#fbbf24");
            addP("starter", 50, 170, 6);
            safeTo(() => { setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
          } else if (st === "water") {
            setPAnim("dodgeSlide 0.9s ease");
            setBText("💨 完美閃避！");
            addD("MISS!", 60, 170, "#38bdf8");
            safeTo(() => { setPAnim(""); setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
          } else if (st === "electric") {
            setBText("⚡ 電流麻痺！敵人無法行動！");
            addD("⚡麻痺", 60, 170, "#fbbf24");
            setEAnim("enemyElecHit 0.6s ease");
            addP("electric", 155, 80, 5);
            safeTo(() => {
              setEAnim("");
              setDefAnim(null);
              setBText(`⚡ ${sr.current.enemy.name} 被麻痺了，無法攻擊！`);
              setPhase("text");
              safeTo(() => { setPhase("menu"); setBText(""); }, 1500);
            }, 1800);
          } else if (st === "light") {
            const roarDmg = 15;
            const nh = Math.max(0, sr.current.eHp - roarDmg);
            setEHp(nh);
            setBText("✨ 獅王咆哮！擋下攻擊並反擊！");
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
              if (nh <= 0) safeTo(() => handleVictory("被獅王咆哮打倒了"), 500);
              else { setPhase("menu"); setBText(""); }
            }, 1800);
          } else {
            const rawDmg = Math.round(s2.enemy.atk * (0.8 + rand() * 0.4));
            const refDmg = Math.round(rawDmg * 1.2);
            const nh = Math.max(0, sr.current.eHp - refDmg);
            setEHp(nh);
            setBText("🌿 反彈攻擊！");
            addD("🛡️BLOCK", 60, 170, "#22c55e");
            safeTo(() => {
              addD(`-${refDmg}`, 155, 50, "#22c55e");
              setEAnim("enemyGrassHit 0.6s ease");
              addP("starter", 155, 80, 5);
            }, 500);
            safeTo(() => {
              setEAnim("");
              setDefAnim(null);
              if (nh <= 0) safeTo(() => handleVictory("被反彈攻擊打倒了"), 500);
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
          starterType: s2.starter.type,
          bossPhase: bp,
          chance,
        });
        const nh = Math.max(0, s2.pHp - dmg);
        setPHp(nh);
        setPAnim("playerHit 0.5s ease");
        sfx.play("playerHit");
        addD(isCrit ? `💥-${dmg}` : `-${dmg}`, 60, 170, isCrit ? "#ff6b00" : "#ef4444");
        addP("enemy", 80, 190, 4);
        if (isCrit) { setEffMsg({ text: "🔥 暴擊！", color: "#ff6b00" }); safeTo(() => setEffMsg(null), 1500); }
        else if (isBlaze) { setEffMsg({ text: "🔥 烈焰覺醒！ATK↑", color: "#ef4444" }); safeTo(() => setEffMsg(null), 1500); }
        else if (defEff > 1) { setEffMsg({ text: "敵人招式很有效！", color: "#ef4444" }); safeTo(() => setEffMsg(null), 1500); }
        else if (defEff < 1) { setEffMsg({ text: "敵人招式效果不佳", color: "#64748b" }); safeTo(() => setEffMsg(null), 1500); }
        safeTo(() => setPAnim(""), 500);

        if (nh <= 0) {
          safeTo(() => { sfx.play("ko"); loseToGameOver(); }, 800);
          return;
        }

        if (trait === "tenacity") {
          const heal = Math.round(s2.enemy.maxHp * 0.15);
          const newEHp = Math.min(sr.current.eHp + heal, s2.enemy.maxHp);
          safeTo(() => {
            setEHp(newEHp);
            addD(`+${heal}`, 155, 50, "#3b82f6");
            setBText(`💧 ${s2.enemy.name} 回復了體力！`);
          }, 600);
        }

        if (trait === "curse" && chance(0.35)) {
          setCursed(true);
          safeTo(() => {
            addD("💀詛咒", 60, 140, "#a855f7");
            setBText(`💀 ${s2.enemy.name} 的詛咒弱化了你的下次攻擊！`);
          }, 600);
        }

        if (trait === "swift" && chance(0.25)) {
          safeTo(() => {
            setBText(`⚡ ${s2.enemy.name} 再次攻擊！`);
            effectOrchestrator.runEnemyLunge({
              safeTo,
              setEAnim,
              onStrike: () => {
                const s3 = sr.current;
                const dmg2 = calcEnemyDamage(scaledAtk, getEff(s3.enemy.mType, s3.starter.type));
                const nh2 = Math.max(0, s3.pHp - dmg2);
                setPHp(nh2);
                setPAnim("playerHit 0.5s ease");
                sfx.play("playerHit");
                addD(`⚡-${dmg2}`, 60, 170, "#eab308");
                addP("enemy", 80, 190, 3);
                safeTo(() => setPAnim(""), 500);
                if (nh2 <= 0) safeTo(() => { sfx.play("ko"); loseToGameOver(); }, 800);
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
      setBText("💀 暗黑龍王釋放暗黑吐息！");
      sfx.play("bossBoom");
      setPhase("enemyAtk");
      effectOrchestrator.runEnemyLunge({
        safeTo,
        setEAnim,
        onStrike: () => {
          const s2 = sr.current;
          const bigDmg = Math.round(s2.enemy.atk * 2.2);
          const nh = Math.max(0, s2.pHp - bigDmg);
          setPHp(nh);
          setPAnim("playerHit 0.5s ease");
          addD(`💀-${bigDmg}`, 60, 170, "#a855f7");
          addP("enemy", 80, 190, 6);
          safeTo(() => setPAnim(""), 500);
          if (nh <= 0) safeTo(() => loseToGameOver(), 800);
          else safeTo(() => { setPhase("menu"); setBText(""); }, 800);
        },
      });
      return;
    }

    if (bossEvent === "start_charge") {
      setBossCharging(true);
      sfx.play("bossCharge");
      setBText("⚠️ 暗黑龍王正在蓄力！下回合將釋放大招！");
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
      setBText(`💀 暗黑龍王封印了你的「${moveName}」！（2回合）`);
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
      const phaseMsg = newPhase === 2 ? "💀 暗黑龍王進入狂暴狀態！攻擊力上升！"
        : newPhase === 3 ? "💀 暗黑龍王覺醒了！背水一戰！"
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
