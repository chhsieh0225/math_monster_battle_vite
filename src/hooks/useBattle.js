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
 * • Async callbacks are guarded by an explicit gate token, invalidated on
 *   run/screen/battle transitions to prevent stale timers from mutating state.
 * • Evolution no longer races with advance() — a `pendingEvolve` ref
 *   gates the screen transition so it only fires when the user taps.
 * • Damage math is delegated to utils/damageCalc.js (pure, testable).
 * • Achievements, Encyclopedia, and SessionLog are extracted into sub-hooks
 *   (useAchievements, useEncyclopedia, useSessionLog) to keep this file focused.
 */
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useReducer } from 'react';

import { SCENE_NAMES } from '../data/scenes';
import {
  MAX_MOVE_LVL,
  TIMER_SEC, PLAYER_MAX_HP,
} from '../data/constants';

import { genQ } from '../utils/questionGenerator';
import {
  movePower, bestEffectiveness,
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
import {
  createAbilityModel,
  getDifficultyLevelForOps,
  resolveLevelProgress,
  updateAbilityModel,
} from '../utils/battleEngine';
import { appendEvent, createEventSessionId } from '../utils/eventLogger';
import {
  battleReducer,
  createInitialBattleState,
} from './battle/battleReducer';
import { effectOrchestrator } from './battle/effectOrchestrator';
import { runEnemyTurn } from './battle/enemyFlow';
import { runPlayerAnswer } from './battle/playerFlow';

// ── Constants (module-level to avoid re-allocation per render) ──
const DIFF_MODS = [0.7, 0.85, 1.0, 1.15, 1.3]; // diffLevel 0..4

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
  const [screen, setScreenState] = useState("title");
  const [timedMode, setTimedMode] = useState(false);

  // ──── Player ────
  const [starter, setStarter] = useState(null);
  const [battle, dispatchBattle] = useReducer(battleReducer, undefined, createInitialBattleState);
  const {
    pHp, pExp, pLvl, pStg,
    round, enemy, eHp,
    streak, passiveCount, charge, tC, tW, defeated, maxStreak,
    mHits, mLvls, mLvlUp,
    burnStack, frozen, staticStack, specDef, defAnim, cursed,
    diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns,
  } = battle;

  const setBattleField = (key, value) => dispatchBattle({ type: "set_field", key, value });
  const setPHp = (value) => setBattleField("pHp", value);
  const setPExp = (value) => setBattleField("pExp", value);
  const setPLvl = (value) => setBattleField("pLvl", value);
  const setPStg = (value) => setBattleField("pStg", value);
  const setEHp = (value) => setBattleField("eHp", value);
  const setStreak = (value) => setBattleField("streak", value);
  const setPassiveCount = (value) => setBattleField("passiveCount", value);
  const setCharge = (value) => setBattleField("charge", value);
  const setTC = (value) => setBattleField("tC", value);
  const setTW = (value) => setBattleField("tW", value);
  const setDefeated = (value) => setBattleField("defeated", value);
  const setMaxStreak = (value) => setBattleField("maxStreak", value);
  const setMHits = (value) => setBattleField("mHits", value);
  const setMLvls = (value) => setBattleField("mLvls", value);
  const setMLvlUp = (value) => setBattleField("mLvlUp", value);
  const setBurnStack = (value) => setBattleField("burnStack", value);
  const setFrozen = (value) => setBattleField("frozen", value);
  const setStaticStack = (value) => setBattleField("staticStack", value);
  const setSpecDef = (value) => setBattleField("specDef", value);
  const setDefAnim = (value) => setBattleField("defAnim", value);
  const setCursed = (value) => setBattleField("cursed", value);
  const setDiffLevel = (value) => setBattleField("diffLevel", value);
  const setBossPhase = (value) => setBattleField("bossPhase", value);
  const setBossTurn = (value) => setBattleField("bossTurn", value);
  const setBossCharging = (value) => setBattleField("bossCharging", value);
  const setSealedMove = (value) => setBattleField("sealedMove", value);
  const setSealedTurns = (value) => setBattleField("sealedTurns", value);

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

  // ──── Status refs ────
  const frozenR = useRef(false);

  // ──── Learning model 2.0: per-question-type adaptive difficulty ────
  const abilityModelRef = useRef(createAbilityModel(2));

  const _updateAbility = (op, correct) => {
    if (!op) return;
    const { nextModel, nextLevel } = updateAbilityModel({
      model: abilityModelRef.current,
      op,
      correct,
    });
    abilityModelRef.current = nextModel;
    setDiffLevel(nextLevel);
  };

  const _getMoveDiffLevel = (move) => (
    getDifficultyLevelForOps(abilityModelRef.current, move?.ops, 2)
  );

  // ──── Internal refs ────
  const runSeedRef = useRef(0);
  const asyncGateRef = useRef(0);
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

  // ──── Safe timeout (cancelled on async-gate change or unmount) ────
  const activeTimers = useRef(new Set());
  const invalidateAsyncWork = useCallback(() => {
    asyncGateRef.current += 1;
    activeTimers.current.forEach(clearTimeout);
    activeTimers.current.clear();
  }, []);

  const safeTo = useCallback((fn, ms) => {
    const g = asyncGateRef.current;
    const id = setTimeout(() => {
      activeTimers.current.delete(id);
      if (g === asyncGateRef.current) fn();
    }, ms);
    activeTimers.current.add(id);
  }, []);
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
    _updateAbility(s.q?.op, false);
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
    paused: _PAUSED,
    startTimer, clearTimer, pauseTimer, resumeTimer,
    subscribeTimerLeft, getTimerLeft,
  } = useTimer(TIMER_SEC, onTimeout);

  const setScreen = useCallback((nextScreen) => {
    const prevScreen = sr.current.screen;
    if (prevScreen === "battle" && nextScreen !== "battle") {
      clearTimer();
      invalidateAsyncWork();
    }
    setScreenState(nextScreen);
  }, [clearTimer, invalidateAsyncWork]);

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
    invalidateAsyncWork();
    clearTimer();
    const list = roster || enemies;
    const e = list[idx];
    dispatchBattle({ type: "start_battle", enemy: e, round: idx });
    frozenR.current = false;
    updateEnc(e); // ← encyclopedia: mark encountered
    const sn = SCENE_NAMES[e.sceneMType || e.mType] || "";
    setPhase("text");
    setBText(`【${sn}】野生的 ${e.name}(${e.typeIcon}${e.typeName}) Lv.${e.lvl} 出現了！`);
    setScreen("battle");
    effectOrchestrator.playBattleIntro({ safeTo, setEAnim, setPAnim });
  };

  // --- Full game reset (starterOverride used on first game when setStarter hasn't rendered yet) ---
  const startGame = (starterOverride) => {
    invalidateAsyncWork();
    runSeedRef.current += 1;
    reseed(runSeedRef.current * 2654435761);
    clearTimer();
    sessionClosedRef.current = false;
    sessionStartRef.current = Date.now();
    eventSessionIdRef.current = createEventSessionId();
    // Regenerate roster so slime variants are re-randomised each game
    const newRoster = buildNewRoster();
    setEnemies(newRoster);
    dispatchBattle({ type: "reset_run", patch: { diffLevel: 2 } });
    setDmgs([]); setParts([]); setAtkEffect(null); setEffMsg(null);
    frozenR.current = false;
    abilityModelRef.current = createAbilityModel(2);
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
    const move = starter.moves[i];
    const lv = _getMoveDiffLevel(move);
    const diffMod = DIFF_MODS[lv] ?? DIFF_MODS[2];
    setDiffLevel(lv);
    setQ(genQ(move, diffMod));
    setFb(null);
    setAnswered(false);
    setPhase("question");
    markQStart(); // ← log question start time
    // Timed mode always uses standard question timer.
    if (timedMode) startTimer();
  };

  // --- Enemy turn logic (reads from stateRef) ---
  function doEnemyTurn() {
    runEnemyTurn({
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
    });
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
    _updateAbility(s.q?.op, correct);
    runPlayerAnswer({
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
    });
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
    gamePaused, timerSubscribe: subscribeTimerLeft, getTimerLeft,
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
