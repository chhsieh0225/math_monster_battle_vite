/**
 * useBattle — Core game-state hook.
 *
 * Owns every piece of mutable state that was previously crammed into App.jsx.
 * Returns a flat object of state values + action callbacks that the render
 * shell (App.jsx) can destructure.
 *
 * Design notes
 * ────────────
 * • A `stateRef` (sr) is kept in sync with the latest render so that
 *   setTimeout chains inside safeTo() always read *current* state,
 *   eliminating the stale-closure family of bugs.
 * • Evolution no longer races with advance() — a `pendingEvolve` ref
 *   gates the screen transition so it only fires when the user taps.
 * • Damage math is delegated to utils/damageCalc.js (pure, testable).
 * • Achievements, Encyclopedia, and SessionLog are extracted into sub-hooks
 *   (useAchievements, useEncyclopedia, useSessionLog) to keep this file focused.
 */
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

import { getEff } from '../data/typeEffectiveness';
import { SCENE_NAMES } from '../data/scenes';
import {
  MAX_MOVE_LVL, POWER_CAPS, HITS_PER_LVL,
  TIMER_SEC, PLAYER_MAX_HP,
} from '../data/constants';

import { genQ } from '../utils/questionGenerator';
import {
  movePower, bestAttackType, bestEffectiveness,
  calcAttackDamage, calcEnemyDamage, freezeChance,
} from '../utils/damageCalc';
import { useTimer } from './useTimer';
import { useAchievements } from './useAchievements';
import { useEncyclopedia } from './useEncyclopedia';
import { useSessionLog } from './useSessionLog';
import { useBattleRng } from './useBattleRng';
import { useBattleUIState } from './useBattleUIState';
import { ENC_TOTAL } from '../data/encyclopedia';
import sfx from '../utils/sfx';
import { buildRoster } from '../utils/rosterBuilder';
import { computeBossPhase, decideBossTurnEvent } from '../utils/turnFlow';
import { resolveLevelProgress, updateAdaptiveDifficulty } from '../utils/battleEngine';
import { appendEvent, createEventSessionId } from '../utils/eventLogger';

// ── Constants (module-level to avoid re-allocation per render) ──
const DIFF_MODS = [0.7, 0.85, 1.0, 1.15, 1.3]; // diffLevel 0..4
const HIT_ANIMS = {
  fire: "enemyFireHit 0.6s ease", electric: "enemyElecHit 0.6s ease",
  water: "enemyWaterHit 0.7s ease", grass: "enemyGrassHit 0.6s ease",
  dark: "enemyDarkHit 0.8s ease", light: "enemyFireHit 0.6s ease",
};
const EFX_DELAY = { fire: 300, electric: 200, water: 350, grass: 280, dark: 400, light: 300 };

// ═══════════════════════════════════════════════════════════════════
export function useBattle() {
  // ──── Sub-hooks ────
  const { achUnlocked, achPopup, tryUnlock, dismissAch } = useAchievements();
  const { encData, setEncData, updateEnc, updateEncDefeated } = useEncyclopedia();
  const { initSession, markQStart, logAns, endSession } = useSessionLog();
  const { rand, randInt, chance, pickIndex, reseed } = useBattleRng();
  const UI = useBattleUIState({ rand, randInt });

  const buildNewRoster = useCallback(() => buildRoster(pickIndex), [pickIndex]);
  const [enemies, setEnemies] = useState(buildNewRoster);

  // ──── Screen & mode ────
  const [screen, setScreen] = useState("title");
  const [timedMode, setTimedMode] = useState(false);

  // ──── Player ────
  const [starter, setStarter] = useState(null);
  const [pHp, setPHp] = useState(PLAYER_MAX_HP);
  const [pExp, setPExp] = useState(0);
  const [pLvl, setPLvl] = useState(1);
  const [pStg, setPStg] = useState(0);

  // ──── Battle ────
  const [round, setRound] = useState(0);
  const [enemy, setEnemy] = useState(null);
  const [eHp, setEHp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [passiveCount, setPassiveCount] = useState(0); // counts consecutive correct answers mod 8 → triggers specDef
  const [charge, setCharge] = useState(0);
  const [tC, setTC] = useState(0);
  const [tW, setTW] = useState(0);
  const [defeated, setDefeated] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [mHits, setMHits] = useState([0, 0, 0, 0]);
  const [mLvls, setMLvls] = useState([1, 1, 1, 1]);
  const [mLvlUp, setMLvlUp] = useState(null);

  // ──── Phase & UI ────
  const {
    phase, setPhase,
    selIdx, setSelIdx,
    q, setQ,
    fb, setFb,
    bText, setBText,
    answered, setAnswered,
    dmgs, setDmgs,
    parts, setParts,
    eAnim, setEAnim,
    pAnim, setPAnim,
    atkEffect, setAtkEffect,
    effMsg, setEffMsg,
    addD, rmD,
    addP, rmP,
  } = UI;

  // ──── Status effects ────
  const [burnStack, setBurnStack] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const frozenR = useRef(false);
  const [staticStack, setStaticStack] = useState(0);   // electric: static charge
  const [specDef, setSpecDef] = useState(false);
  const [defAnim, setDefAnim] = useState(null);
  const [cursed, setCursed] = useState(false);     // dark slime curse: 0.6x player damage next turn

  // ──── Adaptive difficulty ────
  const [diffLevel, setDiffLevel] = useState(2);     // start at normal (1.0)
  const recentAnsRef = useRef([]);                    // sliding window of last 6 answers (true/false)

  const _updateDiff = (correct) => {
    const { nextLevel, nextRecent } = updateAdaptiveDifficulty({
      currentLevel: diffLevel,
      recentAnswers: recentAnsRef.current,
      correct,
    });
    recentAnsRef.current = nextRecent;
    setDiffLevel(nextLevel);
  };

  // ──── Boss mechanics ────
  const [bossPhase, setBossPhase] = useState(0);         // 0=not boss, 1/2/3
  const [bossTurn, setBossTurn] = useState(0);            // turn counter in boss fight
  const [bossCharging, setBossCharging] = useState(false);// boss is charging next big attack
  const [sealedMove, setSealedMove] = useState(-1);       // index of sealed move (-1=none)
  const [sealedTurns, setSealedTurns] = useState(0);      // remaining sealed turns

  // ──── Internal refs ────
  const turnRef = useRef(0);
  const doEnemyTurnRef = useRef(() => {});
  const pendingEvolve = useRef(false);   // ← Bug #2 fix
  const evolveRound = useRef(0);        // round to resume after evolve screen
  const eventSessionIdRef = useRef(null);
  const sessionClosedRef = useRef(false);
  const sessionStartRef = useRef(0);

  // ──── State ref — always points at latest committed values ────
  // Use useLayoutEffect so the ref is updated synchronously after DOM commit,
  // before any setTimeout/safeTo callbacks fire. This prevents Concurrent Mode
  // from polluting sr.current with intermediate render values.
  const sr = useRef({});
  const _srSnapshot = {
    enemy, starter, eHp, pHp, pExp, pLvl, pStg,
    streak, passiveCount, charge, burnStack, frozen, staticStack, specDef, cursed,
    mHits, mLvls, selIdx, phase, round, q,
    screen, timedMode, diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns,
    tC, tW, maxStreak, defeated,
  };
  useLayoutEffect(() => { sr.current = _srSnapshot; });

  // ──── Computed ────
  const expNext = pLvl * 30;
  const chargeReady = charge >= 3;

  const getPow = useCallback(
    (i) => starter ? movePower(starter.moves[i], mLvls[i], i) : 0,
    [starter, mLvls],
  );

  const dualEff = useCallback(
    (move) => bestEffectiveness(move, enemy),
    [enemy],
  );

  // ──── Safe timeout (cancelled on turn/game change or unmount) ────
  const activeTimers = useRef(new Set());
  const safeTo = (fn, ms) => {
    const g = turnRef.current;
    const id = setTimeout(() => {
      activeTimers.current.delete(id);
      if (g === turnRef.current) fn();
    }, ms);
    activeTimers.current.add(id);
  };
  // Cleanup all pending timers on unmount
  useEffect(() => () => { activeTimers.current.forEach(clearTimeout); activeTimers.current.clear(); }, []);

  // ═══════════════════════════════════════════════════════════════
  //  TIMER
  // ═══════════════════════════════════════════════════════════════
  const onTimeout = () => {
    const s = sr.current;
    setAnswered(true);
    setFb({ correct: false, answer: s.q?.answer, steps: s.q?.steps || [] });
    sfx.play("timeout");
    setTW(w => w + 1);
    setStreak(0); setPassiveCount(0);
    setCharge(0);
    // ── Session logging: timeout counts as wrong ──
    const answerTimeMs = logAns(s.q, false);
    appendEvent("question_answered", {
      outcome: "timeout",
      correct: false,
      selectedAnswer: null,
      expectedAnswer: s.q?.answer ?? null,
      answerTimeMs,
      op: s.q?.op ?? null,
      display: s.q?.display ?? null,
      moveIndex: s.selIdx ?? -1,
      moveName: s.starter?.moves?.[s.selIdx]?.name || null,
      moveType: s.starter?.moves?.[s.selIdx]?.type || null,
      timedMode: !!s.timedMode,
      diffLevel: s.diffLevel ?? null,
      round: s.round ?? 0,
    }, { sessionId: eventSessionIdRef.current });
    setBText("⏰ 時間到！來不及出招！");
    setPhase("text");
    // Read enemy from stateRef so we never hit a stale closure
    safeTo(() => doEnemyTurnRef.current(), 1500);
  };

  const {
    timerLeft, paused: _PAUSED,
    startTimer, clearTimer, pauseTimer, resumeTimer,
  } = useTimer(TIMER_SEC, onTimeout);

  const [gamePaused, setGamePaused] = useState(false);

  const togglePause = useCallback(() => {
    if (gamePaused) { resumeTimer(); setGamePaused(false); }
    else { pauseTimer(); setGamePaused(true); }
  }, [gamePaused, pauseTimer, resumeTimer]);

  // Cleanup timer when leaving question phase
  useEffect(() => { if (phase !== "question") clearTimer(); }, [phase, clearTimer]);

  // ═══════════════════════════════════════════════════════════════
  //  BATTLE FLOW
  // ═══════════════════════════════════════════════════════════════

  // --- Start a battle against enemies[idx], optionally from a fresh roster ---
  const startBattle = (idx, roster) => {
    const list = roster || enemies;
    const e = list[idx];
    setEnemy(e);
    setEHp(e.maxHp);
    setBurnStack(0);
    setStaticStack(0);
    setFrozen(false);
    frozenR.current = false;
    setSpecDef(false);
    setDefAnim(null);
    // Boss mechanics init
    const isBoss = e.id === "boss";
    setBossPhase(isBoss ? 1 : 0);
    setBossTurn(0);
    setBossCharging(false);
    setSealedMove(-1);
    setSealedTurns(0);
    setRound(idx);
    updateEnc(e); // ← encyclopedia: mark encountered
    const sn = SCENE_NAMES[e.sceneMType || e.mType] || "";
    setPhase("text");
    setBText(`【${sn}】野生的 ${e.name}(${e.typeIcon}${e.typeName}) Lv.${e.lvl} 出現了！`);
    setScreen("battle");
    setEAnim("slideInBattle 0.6s ease");
    setPAnim("slideInPlayer 0.6s ease");
    safeTo(() => { setEAnim(""); setPAnim(""); }, 700);
  };

  // --- Full game reset (starterOverride used on first game when setStarter hasn't rendered yet) ---
  const startGame = (starterOverride) => {
    turnRef.current++;
    reseed(turnRef.current * 2654435761);
    clearTimer();
    sessionClosedRef.current = false;
    sessionStartRef.current = Date.now();
    eventSessionIdRef.current = createEventSessionId();
    // Regenerate roster so slime variants are re-randomised each game
    const newRoster = buildNewRoster();
    setEnemies(newRoster);
    setPHp(PLAYER_MAX_HP); setPExp(0); setPLvl(1); setPStg(0);
    setStreak(0); setPassiveCount(0); setCharge(0); setTC(0); setTW(0);
    setDefeated(0); setMaxStreak(0);
    setMHits([0, 0, 0, 0]); setMLvls([1, 1, 1, 1]); setMLvlUp(null);
    setDmgs([]); setParts([]); setAtkEffect(null); setEffMsg(null);
    setBurnStack(0); setStaticStack(0); setFrozen(false); frozenR.current = false;
    setSpecDef(false); setDefAnim(null); setCursed(false);
    setBossPhase(0); setBossTurn(0); setBossCharging(false);
    setSealedMove(-1); setSealedTurns(0);
    setDiffLevel(2); recentAnsRef.current = [];
    pendingEvolve.current = false;
    // Init session log — use override on first game since setStarter is async
    const s = starterOverride || sr.current.starter;
    appendEvent("starter_selected", {
      starterId: s?.id || null,
      starterName: s?.name || null,
      starterType: s?.type || null,
      timedMode: !!sr.current.timedMode,
    }, { sessionId: eventSessionIdRef.current });
    initSession(s, sr.current.timedMode);
    setScreen("battle");
    startBattle(0, newRoster);
  };

  // ── Finalize and persist session log ──
  const _endSession = (isCompleted, reasonOverride = null) => {
    if (sessionClosedRef.current) return;
    sessionClosedRef.current = true;
    const s = sr.current;
    const reason = reasonOverride || (isCompleted ? "clear" : "player_ko");
    const result = isCompleted ? "win" : reason === "quit" ? "quit" : "lose";
    appendEvent("battle_result", {
      result,
      reason,
      defeated: s.defeated || 0,
      finalLevel: s.pLvl || 1,
      maxStreak: s.maxStreak || 0,
      pHp: s.pHp || 0,
      tC: s.tC || 0,
      tW: s.tW || 0,
      timedMode: !!s.timedMode,
      durationMs: sessionStartRef.current > 0 ? Date.now() - sessionStartRef.current : null,
    }, { sessionId: eventSessionIdRef.current });
    endSession({
      defeated: s.defeated || 0,
      finalLevel: s.pLvl || 1,
      maxStreak: s.maxStreak || 0,
      pHp: s.pHp || 0,
      completed: !!isCompleted,
    });
  };

  const quitGame = () => {
    clearTimer();
    if (!sessionClosedRef.current) {
      const s = sr.current;
      appendEvent("game_exit", {
        reason: "quit_button",
        screen: s.screen || null,
        phase: s.phase || null,
        round: s.round || 0,
        defeated: s.defeated || 0,
        pHp: s.pHp || 0,
      }, { sessionId: eventSessionIdRef.current });
    }
    _endSession(false, "quit");
    setScreen("gameover");
  };

  // --- Handle a defeated enemy ---
  const handleVictory = (verb = "被打倒了") => {
    const s = sr.current;
    setBurnStack(0); setStaticStack(0); setFrozen(false); frozenR.current = false;
    setCursed(false);
    setBossPhase(0); setBossTurn(0); setBossCharging(false);
    setSealedMove(-1); setSealedTurns(0);
    const xp = s.enemy.lvl * 15;
    const progress = resolveLevelProgress({
      currentExp: s.pExp,
      currentLevel: s.pLvl,
      currentStage: s.pStg,
      gainExp: xp,
    });
    if (progress.evolveCount > 0) {
      pendingEvolve.current = true;
      sfx.play("evolve");
    }
    setPExp(progress.nextExp);
    if (progress.nextLevel !== s.pLvl) {
      setPLvl(progress.nextLevel);
      if (progress.hpBonus > 0) setPHp(h => Math.min(h + progress.hpBonus, PLAYER_MAX_HP));
    }
    setDefeated(d => d + 1);
    updateEncDefeated(s.enemy); // ← encyclopedia: mark defeated
    // ── Achievement checks on victory ──
    tryUnlock("first_win");
    if (s.enemy.id === "boss") tryUnlock("boss_kill");
    if (s.pHp <= 5) tryUnlock("low_hp");
    const drop = s.enemy.drops[randInt(0, s.enemy.drops.length - 1)];
    setBText(`${s.enemy.name} ${verb}！獲得 ${xp} 經驗值 ${drop}`);
    setPhase("victory"); sfx.play("victory");
  };

  // --- Frozen enemy skips turn ---
  const handleFreeze = () => {
    const s = sr.current;
    frozenR.current = false; setFrozen(false);
    setBText(`❄️ ${s.enemy.name} 被凍住了，無法攻擊！`);
    setPhase("text");
    safeTo(() => { setPhase("menu"); setBText(""); }, 1500);
  };

  // --- Player selects a move ---
  const selectMove = (i) => {
    if (phase !== "menu" || !starter) return;
    // Boss: sealed move check
    if (sr.current.sealedMove === i) return; // silently blocked, UI shows lock
    sfx.play("select");
    setSelIdx(i);
    setQ(genQ(starter.moves[i], DIFF_MODS[sr.current.diffLevel]));
    setFb(null);
    setAnswered(false);
    setPhase("question");
    markQStart(); // ← log question start time
    // Boss: halve timer in boss fight (Phase 1+ roar effect)
    if (timedMode) startTimer();
  };

  // --- Enemy turn logic (reads from stateRef) ---
  function doEnemyTurn() {
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    const isBoss = s.enemy.id === "boss";

    // ── Boss: decrement sealed move turns at start of enemy turn ──
    if (isBoss && s.sealedTurns > 0) {
      const nt = s.sealedTurns - 1;
      setSealedTurns(nt);
      if (nt <= 0) setSealedMove(-1);
    }

    // ── Boss: update phase from current HP ──
    if (isBoss) {
      const newPhase = computeBossPhase(s.eHp, s.enemy.maxHp);
      if (newPhase !== s.bossPhase) {
        setBossPhase(newPhase);
        // Phase transition announcement
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

  function doEnemyTurnInner() {
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    const isBoss = s.enemy.id === "boss";
    const bp = isBoss ? computeBossPhase(s.eHp, s.enemy.maxHp) : 0;

    // ── Boss: increment turn counter ──
    let turnCount = s.bossTurn;
    if (isBoss) {
      turnCount = s.bossTurn + 1;
      setBossTurn(turnCount);
    }

    const bossEvent = decideBossTurnEvent({
      isBoss,
      bossCharging: s.bossCharging,
      turnCount,
      bossPhase: bp,
      sealedMove: s.sealedMove,
    });

    // ── Boss charging mechanic: release big attack ──
    if (bossEvent === "release") {
      setBossCharging(false);
      setBText(`💀 暗黑龍王釋放暗黑吐息！`); sfx.play("bossBoom");
      setPhase("enemyAtk");
      setEAnim("enemyAttackLunge 0.6s ease");
      safeTo(() => {
        setEAnim("");
        const s2 = sr.current;
        const bigDmg = Math.round(s2.enemy.atk * 2.2);
        const nh = Math.max(0, s2.pHp - bigDmg);
        setPHp(nh); setPAnim("playerHit 0.5s ease");
        addD(`💀-${bigDmg}`, 60, 170, "#a855f7"); addP("enemy", 80, 190, 6);
        safeTo(() => setPAnim(""), 500);
        if (nh <= 0) safeTo(() => { _endSession(false); setPhase("ko"); setBText("你的夥伴倒下了..."); setScreen("gameover"); }, 800);
        else safeTo(() => { setPhase("menu"); setBText(""); }, 800);
      }, 500);
      return;
    }

    // ── Boss: start charging every 4 turns ──
    if (bossEvent === "start_charge") {
      setBossCharging(true); sfx.play("bossCharge");
      setBText("⚠️ 暗黑龍王正在蓄力！下回合將釋放大招！");
      setPhase("text");
      setEAnim("bossShake 0.5s ease infinite");
      safeTo(() => { setPhase("menu"); setBText(""); setEAnim(""); }, 2000);
      return;
    }

    // ── Boss Phase 2+: seal a random move ──
    if (bossEvent === "seal_move") {
      const sealIdx = randInt(0, 2); // only seal moves 0-2, not ultimate
      setSealedMove(sealIdx); sfx.play("seal");
      setSealedTurns(2);
      const moveName = s.starter.moves[sealIdx]?.name || "???";
      setBText(`💀 暗黑龍王封印了你的「${moveName}」！（2回合）`);
      setPhase("text");
      safeTo(() => doEnemyAttack(bp), 1500);
      return;
    }

    doEnemyAttack(bp);
  }

  function doEnemyAttack(bp) {
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    setBText(`${s.enemy.name} 發動攻擊！`);
    setPhase("enemyAtk");
    setEAnim("enemyAttackLunge 0.6s ease");
    safeTo(() => {
      setEAnim("");
      const s2 = sr.current; // re-read after delay
      if (s2.specDef) {
        const st = s2.starter.type;
        setSpecDef(false); setDefAnim(st);  // streak no longer resets — passiveCount handles passive trigger independently
        if (st === "fire") {
          setBText("🛡️ 防護罩擋下了攻擊！");
          addD("🛡️BLOCK", 60, 170, "#fbbf24"); addP("starter", 50, 170, 6);
          safeTo(() => { setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
        } else if (st === "water") {
          setPAnim("dodgeSlide 0.9s ease");
          setBText("💨 完美閃避！"); addD("MISS!", 60, 170, "#38bdf8");
          safeTo(() => { setPAnim(""); setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
        } else if (st === "electric") {
          setBText("⚡ 電流麻痺！敵人無法行動！"); addD("⚡麻痺", 60, 170, "#fbbf24");
          setEAnim("enemyElecHit 0.6s ease");
          addP("electric", 155, 80, 5);
          safeTo(() => {
            setEAnim(""); setDefAnim(null);
            setBText(`⚡ ${sr.current.enemy.name} 被麻痺了，無法攻擊！`);
            setPhase("text");
            safeTo(() => { setPhase("menu"); setBText(""); }, 1500);
          }, 1800);
        } else if (st === "light") {
          // Lion King's Roar: block attack + 15 fixed counter damage
          const roarDmg = 15;
          const nh = Math.max(0, sr.current.eHp - roarDmg);
          setEHp(nh);
          setBText("✨ 獅王咆哮！擋下攻擊並反擊！");
          addD("🛡️BLOCK", 60, 170, "#f59e0b"); addP("starter", 50, 170, 6);
          sfx.play("light");
          safeTo(() => {
            addD(`-${roarDmg}`, 155, 50, "#f59e0b");
            setEAnim("enemyFireHit 0.6s ease");
            addP("starter", 155, 80, 5);
          }, 500);
          safeTo(() => {
            setEAnim(""); setDefAnim(null);
            if (nh <= 0) { safeTo(() => handleVictory("被獅王咆哮打倒了"), 500); }
            else { setPhase("menu"); setBText(""); }
          }, 1800);
        } else {
          const rawDmg = Math.round(s2.enemy.atk * (0.8 + rand() * 0.4));
          const refDmg = Math.round(rawDmg * 1.2);
          const nh = Math.max(0, sr.current.eHp - refDmg);
          setEHp(nh);
          setBText("🌿 反彈攻擊！"); addD("🛡️BLOCK", 60, 170, "#22c55e");
          safeTo(() => {
            addD(`-${refDmg}`, 155, 50, "#22c55e");
            setEAnim("enemyGrassHit 0.6s ease");
            addP("starter", 155, 80, 5);
          }, 500);
          safeTo(() => {
            setEAnim(""); setDefAnim(null);
            if (nh <= 0) { safeTo(() => handleVictory("被反彈攻擊打倒了"), 500); }
            else { setPhase("menu"); setBText(""); }
          }, 1800);
        }
        return;
      }
      // Normal enemy attack — boss phase scales damage
      const atkMult = bp >= 3 ? 2.0 : bp >= 2 ? 1.5 : 1.0;
      let scaledAtk = Math.round(s2.enemy.atk * atkMult);
      const trait = s2.enemy.trait || null;

      // ── Blaze trait: ATK +50% when HP below 50% ──
      const isBlaze = trait === "blaze" && s2.eHp <= s2.enemy.maxHp * 0.5;
      if (isBlaze) scaledAtk = Math.round(scaledAtk * 1.5);

      // ── Berserk trait: 30% chance 1.5x critical ──
      const isCrit = trait === "berserk" && chance(0.3);
      const critMult = isCrit ? 1.5 : 1.0;

      let dmg = calcEnemyDamage(scaledAtk, getEff(s2.enemy.mType, s2.starter.type));
      dmg = Math.round(dmg * critMult);
      const defEff = getEff(s2.enemy.mType, s2.starter.type);
      const nh = Math.max(0, s2.pHp - dmg);
      setPHp(nh); setPAnim("playerHit 0.5s ease"); sfx.play("playerHit");
      addD(isCrit ? `💥-${dmg}` : `-${dmg}`, 60, 170, isCrit ? "#ff6b00" : "#ef4444"); addP("enemy", 80, 190, 4);
      if (isCrit) { setEffMsg({ text: "🔥 暴擊！", color: "#ff6b00" }); safeTo(() => setEffMsg(null), 1500); }
      else if (isBlaze) { setEffMsg({ text: "🔥 烈焰覺醒！ATK↑", color: "#ef4444" }); safeTo(() => setEffMsg(null), 1500); }
      else if (defEff > 1) { setEffMsg({ text: "敵人招式很有效！", color: "#ef4444" }); safeTo(() => setEffMsg(null), 1500); }
      else if (defEff < 1) { setEffMsg({ text: "敵人招式效果不佳", color: "#64748b" }); safeTo(() => setEffMsg(null), 1500); }
      safeTo(() => setPAnim(""), 500);

      if (nh <= 0) { safeTo(() => { sfx.play("ko"); _endSession(false); setPhase("ko"); setBText("你的夥伴倒下了..."); setScreen("gameover"); }, 800); return; }

      // ── Tenacity trait: heal 15% maxHP after attacking ──
      if (trait === "tenacity") {
        const heal = Math.round(s2.enemy.maxHp * 0.15);
        const newEHp = Math.min(sr.current.eHp + heal, s2.enemy.maxHp);
        safeTo(() => {
          setEHp(newEHp);
          addD(`+${heal}`, 155, 50, "#3b82f6");
          setBText(`💧 ${s2.enemy.name} 回復了體力！`);
        }, 600);
      }

      // ── Curse trait: 35% chance to weaken player's next attack ──
      if (trait === "curse" && chance(0.35)) {
        setCursed(true);
        safeTo(() => {
          addD("💀詛咒", 60, 140, "#a855f7");
          setBText(`💀 ${s2.enemy.name} 的詛咒弱化了你的下次攻擊！`);
        }, 600);
      }

      // ── Swift trait: 25% chance double attack ──
      if (trait === "swift" && chance(0.25)) {
        safeTo(() => {
          setBText(`⚡ ${s2.enemy.name} 再次攻擊！`);
          setEAnim("enemyAttackLunge 0.6s ease");
          safeTo(() => {
            setEAnim("");
            const s3 = sr.current;
            const dmg2 = calcEnemyDamage(scaledAtk, getEff(s3.enemy.mType, s3.starter.type));
            const nh2 = Math.max(0, s3.pHp - dmg2);
            setPHp(nh2); setPAnim("playerHit 0.5s ease"); sfx.play("playerHit");
            addD(`⚡-${dmg2}`, 60, 170, "#eab308"); addP("enemy", 80, 190, 3);
            safeTo(() => setPAnim(""), 500);
            if (nh2 <= 0) safeTo(() => { sfx.play("ko"); _endSession(false); setPhase("ko"); setBText("你的夥伴倒下了..."); setScreen("gameover"); }, 800);
            else safeTo(() => { setPhase("menu"); setBText(""); }, 800);
          }, 500);
        }, 1000);
        return; // skip the normal phase transition
      }

      safeTo(() => { setPhase("menu"); setBText(""); }, 800);
    }, 500);
  }
  useEffect(() => { doEnemyTurnRef.current = doEnemyTurn; });

  // --- Player answers a question ---
  const onAns = (choice) => {
    if (answered || !starter) return;
    setAnswered(true);
    clearTimer();
    const s = sr.current;
    const move = starter.moves[s.selIdx];
    const correct = choice === s.q.answer;

    // ── Session logging ──
    const answerTimeMs = logAns(s.q, correct);
    appendEvent("question_answered", {
      outcome: "submitted",
      correct,
      selectedAnswer: choice,
      expectedAnswer: s.q?.answer ?? null,
      answerTimeMs,
      op: s.q?.op ?? null,
      display: s.q?.display ?? null,
      moveIndex: s.selIdx ?? -1,
      moveName: move?.name || null,
      moveType: move?.type || null,
      timedMode: !!s.timedMode,
      diffLevel: s.diffLevel ?? null,
      round: s.round ?? 0,
    }, { sessionId: eventSessionIdRef.current });
    _updateDiff(correct);

    if (correct) {
      setFb({ correct: true }); setTC(c => c + 1);
      const ns = s.streak + 1;
      sfx.play(ns >= 5 ? "crit" : "hit");
      setStreak(ns); setCharge(c => Math.min(c + 1, 3));
      if (ns > s.maxStreak) setMaxStreak(ns);

      // ── Passive counter: triggers specDef every 8 consecutive correct answers ──
      const np = s.passiveCount + 1;
      if (np >= 8) {
        setPassiveCount(0);
        if (!s.specDef) { setSpecDef(true); tryUnlock("spec_def"); sfx.play("specDef"); }
      } else {
        setPassiveCount(np);
      }

      // ── Achievement: streak milestones ──
      if (ns >= 5) tryUnlock("streak_5");
      if (ns >= 10) tryUnlock("streak_10");

      // Move hit tracking & level-up check
      const nh = [...s.mHits]; nh[s.selIdx]++;
      const cl = s.mLvls[s.selIdx];
      let didLvl = false;
      if (nh[s.selIdx] >= HITS_PER_LVL * cl && cl < MAX_MOVE_LVL) {
        const np = move.basePower + cl * move.growth;
        if (np <= POWER_CAPS[s.selIdx]) {
          const nl = [...s.mLvls]; nl[s.selIdx]++; setMLvls(nl);
          didLvl = true; nh[s.selIdx] = 0;
          setMLvlUp(s.selIdx); safeTo(() => setMLvlUp(null), 2000); sfx.play("levelUp");
          if (nl[s.selIdx] >= MAX_MOVE_LVL) tryUnlock("move_max");
          if (nl.every(v => v >= MAX_MOVE_LVL)) tryUnlock("all_moves_max");
        }
      }
      setMHits(nh);

      // Animation chain
      safeTo(() => {
        setPhase("playerAtk"); setPAnim("attackLunge 0.6s ease");
        safeTo(() => {
          setPAnim("");
          const s2 = sr.current;
          const bt = bestAttackType(move, s2.enemy);
          setAtkEffect({ type: bt, idx: s2.selIdx, lvl: s2.mLvls[s2.selIdx] });
          sfx.play(bt); // type-specific attack sound

          safeTo(() => {
            const s3 = sr.current;
            const pow = didLvl
              ? Math.min(move.basePower + s3.mLvls[s3.selIdx] * move.growth, POWER_CAPS[s3.selIdx])
              : movePower(move, s3.mLvls[s3.selIdx], s3.selIdx);
            const eff = bestEffectiveness(move, s3.enemy);
            let dmg = calcAttackDamage({
              basePow: pow,
              streak: ns,
              stageBonus: s3.pStg,
              effMult: eff,
            });
            // ── Phantom trait: 25% chance to dodge player attack ──
            const isPhantom = s3.enemy.trait === "phantom" && chance(0.25);
            if (isPhantom) {
              setEAnim("dodgeSlide 0.9s ease");
              setEffMsg({ text: "👻 幻影閃避！", color: "#c084fc" }); safeTo(() => setEffMsg(null), 1500);
              addD("MISS!", 155, 50, "#c084fc");
              safeTo(() => { setEAnim(""); setAtkEffect(null); }, 800);
              safeTo(() => doEnemyTurn(), 1200);
              return; // skip all damage
            }
            // ── Fortress trait: enemy takes 30% less damage ──
            const isFortress = s3.enemy.trait === "fortress";
            if (isFortress) dmg = Math.round(dmg * 0.7);
            // ── Curse debuff: player attack weakened by 0.6x ──
            const wasCursed = s3.cursed;
            if (wasCursed) { dmg = Math.round(dmg * 0.6); setCursed(false); }
            // Lion Brave Heart passive: damage bonus scales with missing HP (max +50%)
            if (starter.type === "light" && s3.pHp < PLAYER_MAX_HP) {
              const braveMult = 1 + ((PLAYER_MAX_HP - s3.pHp) / PLAYER_MAX_HP) * 0.5;
              dmg = Math.round(dmg * braveMult);
            }
            // Boss Phase 3: 背水一戰 — player gets ×1.3 bonus
            if (s3.bossPhase >= 3) dmg = Math.round(dmg * 1.3);

            if (wasCursed) { setEffMsg({ text: "💀 詛咒弱化了攻擊...", color: "#a855f7" }); safeTo(() => setEffMsg(null), 1500); }
            else if (isFortress) { setEffMsg({ text: "🛡️ 鐵壁減傷！", color: "#94a3b8" }); safeTo(() => setEffMsg(null), 1500); }
            else if (starter.type === "light" && s3.pHp < PLAYER_MAX_HP * 0.5) { setEffMsg({ text: "🦁 勇氣之心！ATK↑", color: "#f59e0b" }); safeTo(() => setEffMsg(null), 1500); }
            else if (eff > 1) { setEffMsg({ text: "效果絕佳！", color: "#22c55e" }); safeTo(() => setEffMsg(null), 1500); }
            else if (eff < 1) { setEffMsg({ text: "效果不好...", color: "#94a3b8" }); safeTo(() => setEffMsg(null), 1500); }

            // Boss: interrupt charging on correct answer
            if (s3.bossCharging) {
              setBossCharging(false);
              safeTo(() => addD("💥打斷蓄力！", 155, 30, "#fbbf24"), 400);
            }

            let afterHp = Math.max(0, s3.eHp - dmg);

            // Fire: burn
            let newBurn = s3.burnStack;
            if (starter.type === "fire" && afterHp > 0) {
              newBurn = Math.min(s3.burnStack + 1, 5); setBurnStack(newBurn);
              const bd = newBurn * 2;
              afterHp = Math.max(0, afterHp - bd);
              safeTo(() => addD(`🔥-${bd}`, 155, 50, "#f97316"), 500);
            }
            // Grass: heal
            if (starter.type === "grass") {
              const heal = 2 * s3.mLvls[s3.selIdx];
              setPHp(h => Math.min(h + heal, PLAYER_MAX_HP)); sfx.play("heal");
              safeTo(() => addD(`+${heal}`, 50, 165, "#22c55e"), 500);
            }
            // Water: freeze
            let willFreeze = false;
            if (starter.type === "water" && afterHp > 0) {
              if (chance(freezeChance(s3.mLvls[s3.selIdx]))) {
                willFreeze = true; setFrozen(true); frozenR.current = true; sfx.play("freeze");
                safeTo(() => addD("❄️凍結", 155, 50, "#38bdf8"), 600);
              }
            }
            // Electric: static charge — accumulate, discharge at 3 stacks
            if (starter.type === "electric" && afterHp > 0) {
              const newStatic = Math.min(s3.staticStack + 1, 3);
              setStaticStack(newStatic);
              if (newStatic >= 3) {
                const sd = 3 * 4; // 3 stacks × 4 damage
                afterHp = Math.max(0, afterHp - sd);
                setStaticStack(0); sfx.play("staticDischarge");
                safeTo(() => addD(`⚡-${sd}`, 155, 50, "#fbbf24"), 500);
              }
            }

            setEHp(afterHp);
            setEAnim(HIT_ANIMS[bt] || "enemyHit 0.5s ease");
            const dmgColor = { fire: "#ef4444", electric: "#fbbf24", water: "#3b82f6", grass: "#22c55e", dark: "#a855f7", light: "#f59e0b" }[bt] || "#ef4444";
            addD(`-${dmg}`, 140, 55, dmgColor);
            safeTo(() => { setEAnim(""); setAtkEffect(null); }, 800);

            // ── Counter trait: reflect 20% damage back to player ──
            if (s3.enemy.trait === "counter" && afterHp > 0) {
              const refDmg = Math.round(dmg * 0.2);
              if (refDmg > 0) {
                safeTo(() => {
                  const s4 = sr.current;
                  const nh4 = Math.max(0, s4.pHp - refDmg);
                  setPHp(nh4); setPAnim("playerHit 0.5s ease");
                  addD(`🛡️-${refDmg}`, 60, 170, "#60a5fa");
                  setEffMsg({ text: "🛡️ 反擊裝甲！", color: "#60a5fa" }); safeTo(() => setEffMsg(null), 1500);
                  safeTo(() => setPAnim(""), 500);
                  if (nh4 <= 0) safeTo(() => { sfx.play("ko"); _endSession(false); setPhase("ko"); setBText("你的夥伴被反擊傷害打倒了..."); setScreen("gameover"); }, 800);
                }, 600);
              }
            }

            // Achievement: one-hit KO (dealt damage >= enemy maxHp)
            if (afterHp <= 0 && dmg >= s3.enemy.maxHp) tryUnlock("one_hit");
            if (afterHp <= 0) safeTo(() => handleVictory(), 900);
            else if (willFreeze) safeTo(() => handleFreeze(), 900);
            else safeTo(() => doEnemyTurn(), 900);
          }, EFX_DELAY[bt] || 300);
        }, 400);
      }, 600);
    } else {
      // Wrong answer
      setFb({ correct: false, answer: s.q.answer, steps: s.q.steps || [] }); sfx.play("wrong");
      setTW(w => w + 1); setStreak(0); setPassiveCount(0); setCharge(0);
      safeTo(() => {
        const s2 = sr.current;
        if (move.risky) {
          const sd = Math.round(movePower(move, s2.mLvls[s2.selIdx], s2.selIdx) * 0.4);
          const nh2 = Math.max(0, s2.pHp - sd);
          setPHp(nh2); setPAnim("playerHit 0.5s ease");
          addD(`-${sd}`, 40, 170, "#ef4444");
          safeTo(() => setPAnim(""), 500);
          setBText(`${move.name} 失控了！自己受到 ${sd} 傷害！`);
          setPhase("text");
          safeTo(() => {
            if (nh2 <= 0) { _endSession(false); setPhase("ko"); setBText("你的夥伴倒下了..."); setScreen("gameover"); }
            else if (frozenR.current) handleFreeze();
            else doEnemyTurn();
          }, 1500);
        } else {
          let mt = "攻擊落空了！";
          if (s2.burnStack > 0) {
            const bd = s2.burnStack * 2;
            const nh3 = Math.max(0, s2.eHp - bd);
            setEHp(nh3); addD(`🔥-${bd}`, 155, 50, "#f97316");
            mt += ` 灼燒-${bd}！`;
            if (nh3 <= 0) {
              setBText(mt); setPhase("text");
              safeTo(() => handleVictory("被灼燒打倒了"), 1200);
              return;
            }
          }
          setBText(mt); setPhase("text");
          if (frozenR.current) safeTo(() => handleFreeze(), 1200);
          else safeTo(() => doEnemyTurn(), 1200);
        }
      }, 2500);
    }
  };

  // --- Advance from text / victory phase ---
  const advance = () => {
    if (phase === "text") { setPhase("menu"); setBText(""); }
    else if (phase === "victory") {
      // Bug #2 fix: if an evolution is pending, go to evolve screen
      // instead of starting next battle (eliminates timer-based race).
      if (pendingEvolve.current) {
        pendingEvolve.current = false;
        // Apply evolution state NOW (deferred from win handler so battle
        // screen kept showing the pre-evolution sprite during victory).
        setPStg(st => { if (st + 1 >= 2) tryUnlock("evolve_max"); return Math.min(st + 1, 2); });
        setPHp(PLAYER_MAX_HP);
        setMLvls(prev => prev.map(v => Math.min(v + 1, MAX_MOVE_LVL)));
        evolveRound.current = round;   // remember which round to resume from
        setScreen("evolve");
        return;
      }
      const nx = round + 1;
      if (nx >= enemies.length) {
        _finishGame();
      }
      else { setPHp(h => Math.min(h + 10, PLAYER_MAX_HP)); startBattle(nx); }
    }
  };

  // --- Shared game-completion logic (achievements + session save) ---
  const _finishGame = () => {
    const s = sr.current;
    if (s.tW === 0) tryUnlock("perfect");
    if (s.timedMode) tryUnlock("timed_clear");
    if (s.pHp >= PLAYER_MAX_HP) tryUnlock("no_damage");
    if (s.starter) {
      const sid = s.starter.id;
      if (sid === "fire") tryUnlock("fire_clear");
      else if (sid === "water") tryUnlock("water_clear");
      else if (sid === "grass") tryUnlock("grass_clear");
      else if (sid === "electric") tryUnlock("electric_clear");
      else if (sid === "lion") tryUnlock("lion_clear");
    }
    setEncData(prev => {
      if (Object.keys(prev.encountered).length >= ENC_TOTAL) tryUnlock("enc_all");
      if (Object.keys(prev.defeated).length >= ENC_TOTAL) tryUnlock("enc_defeat");
      return prev;
    });
    _endSession(true);
    setScreen("gameover");
  };

  // --- Continue from evolve screen → start next battle ---
  const continueAfterEvolve = () => {
    const nx = evolveRound.current + 1;
    if (nx >= enemies.length) {
      _finishGame();
    } else {
      startBattle(nx);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    // ── State (read by render shell) ──
    screen, timedMode, enemies,
    starter, pHp, pExp, pLvl, pStg,
    round, enemy, eHp,
    streak, passiveCount, charge, tC, tW, defeated, maxStreak,
    mHits, mLvls, mLvlUp,
    phase, selIdx, q, fb, bText, answered,
    dmgs, parts, eAnim, pAnim, atkEffect, effMsg,
    burnStack, frozen, staticStack, specDef, defAnim, cursed,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns, diffLevel,
    gamePaused, timerLeft,
    expNext, chargeReady,

    // ── Achievements & Encyclopedia ──
    achUnlocked, achPopup, encData, dismissAch,

    // ── Actions ──
    setTimedMode, setScreen, setStarter,
    startGame, selectMove, onAns, advance, continueAfterEvolve,
    quitGame, togglePause,

    // ── Helpers exposed for render ──
    getPow, dualEff,
    rmD, rmP,
    // ── SFX ──
    sfx,
  };
}
