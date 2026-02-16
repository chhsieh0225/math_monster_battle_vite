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
 * • Damage math is delegated to utils/damageCalc.ts (pure, testable).
 * • Achievements, Encyclopedia, and SessionLog are extracted into sub-hooks
 *   (useAchievements, useEncyclopedia, useSessionLog) to keep this file focused.
 */
import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { useI18n } from '../i18n';

import { SCENE_NAMES } from '../data/scenes';
import {
  MAX_MOVE_LVL,
  TIMER_SEC,
} from '../data/constants';
import { STARTERS } from '../data/starters.ts';
import {
  localizeEnemy,
  localizeEnemyRoster,
  localizeSceneName,
  localizeStarter,
} from '../utils/contentLocalization';

import { genQ } from '../utils/questionGenerator.ts';
import {
  movePower,
  bestEffectiveness,
} from '../utils/damageCalc';
import {
  getStageMaxHp,
  getStarterMaxHp,
  getStarterStageIdx,
} from '../utils/playerHp';
import { useTimer } from './useTimer';
import { useAchievements } from './useAchievements';
import { useEncyclopedia } from './useEncyclopedia';
import { useSessionLog } from './useSessionLog';
import { useBattleRng } from './useBattleRng';
import { useBattleUIState } from './useBattleUIState';
import { usePvpState } from './usePvpState';
import { useBattleSessionLifecycle } from './useBattleSessionLifecycle';
import { ENC_TOTAL } from '../data/encyclopedia.ts';
import sfx from '../utils/sfx.ts';
import { buildRoster } from '../utils/rosterBuilder';
import {
  createAbilityModel,
  getDifficultyLevelForOps,
  resolveLevelProgress,
  updateAbilityModel,
} from '../utils/battleEngine';
import {
  battleReducer,
  createInitialBattleState,
} from './battle/battleReducer';
import { createBattleFieldSetters } from './battle/battleFieldSetters';
import { effectOrchestrator } from './battle/effectOrchestrator';
import {
  createEnemyTurnHandlers,
} from './battle/flowHandlers';
import { runAnswerController } from './battle/answerController.ts';
import { runEnemyTurn } from './battle/enemyFlow';
import { handleTimeoutFlow } from './battle/timeoutFlow';
import { runStartGameController } from './battle/startGameController.ts';
import { runStartBattleFlow } from './battle/startBattleFlow';
import { runSelectMoveFlow } from './battle/selectMoveFlow';
import { runVictoryFlow } from './battle/victoryFlow';
import { runAdvanceController } from './battle/advanceController.ts';
import {
  continueFromVictoryFlow,
} from './battle/advanceFlow';
import {
  getActingStarter as resolveActingStarter,
  getOtherPvpTurn,
  getPvpTurnName as resolvePvpTurnName,
} from './battle/turnHelpers';
import {
  createPvpEnemyFromStarter,
} from './battle/pvpFlow';
import {
  canSwitchCoopActiveSlot,
  handleCoopPartyKo,
  runCoopAllySupportTurn,
} from './battle/coopFlow';
import {
  applyGameCompletionAchievements,
  applyVictoryAchievements,
} from './battle/achievementFlow';
import { useCoopTurnRotation } from './useCoopTurnRotation';
import { useBattleAsyncGate, useBattleStateRef } from './useBattleRuntime';

// ── Constants (module-level to avoid re-allocation per render) ──
const DIFF_MODS = [0.7, 0.85, 1.0, 1.15, 1.3]; // diffLevel 0..4
const PARTNER_BY_STARTER = {
  fire: "water",
  water: "electric",
  grass: "fire",
  electric: "grass",
  lion: "water",
};

function pickPartnerStarter(mainStarter, pickIndex, locale) {
  if (!mainStarter) return null;
  const preferId = PARTNER_BY_STARTER[mainStarter.id];
  const preferred = STARTERS.find((s) => s.id === preferId);
  if (preferred) return localizeStarter(preferred, locale);
  const pool = STARTERS.filter((s) => s.id !== mainStarter.id);
  if (pool.length <= 0) return null;
  return localizeStarter(pool[pickIndex(pool.length)], locale);
}

// ═══════════════════════════════════════════════════════════════════
export function useBattle() {
  const { t, locale } = useI18n();
  // ──── Sub-hooks ────
  const { achUnlocked, achPopup, tryUnlock, dismissAch } = useAchievements();
  const { encData, setEncData, updateEnc, updateEncDefeated } = useEncyclopedia();
  const { initSession, markQStart, logAns, endSession } = useSessionLog();
  const { rand, randInt, chance, pickIndex, reseed } = useBattleRng();
  const UI = useBattleUIState({ rand, randInt });

  const buildNewRoster = useCallback(
    (mode = "single") => localizeEnemyRoster(buildRoster(pickIndex, mode), locale),
    [pickIndex, locale],
  );
  const [enemies, setEnemies] = useState(() => buildNewRoster("single"));

  // ──── Screen & mode ────
  const [screen, setScreenState] = useState("title");
  const [timedMode, setTimedMode] = useState(false);
  const [battleMode, setBattleMode] = useState("single");
  const [coopActiveSlot, setCoopActiveSlot] = useState("main");
  const {
    pvpStarter2, setPvpStarter2,
    pvpHp2, setPvpHp2,
    pvpTurn, setPvpTurn,
    pvpWinner, setPvpWinner,
    pvpChargeP1, setPvpChargeP1,
    pvpChargeP2, setPvpChargeP2,
    pvpActionCount, setPvpActionCount,
    pvpBurnP1, setPvpBurnP1,
    pvpBurnP2, setPvpBurnP2,
    pvpFreezeP1, setPvpFreezeP1,
    pvpFreezeP2, setPvpFreezeP2,
    pvpStaticP1, setPvpStaticP1,
    pvpStaticP2, setPvpStaticP2,
    pvpParalyzeP1, setPvpParalyzeP1,
    pvpParalyzeP2, setPvpParalyzeP2,
    pvpComboP1, setPvpComboP1,
    pvpComboP2, setPvpComboP2,
    pvpSpecDefP1, setPvpSpecDefP1,
    pvpSpecDefP2, setPvpSpecDefP2,
    resetPvpRuntime,
  } = usePvpState();

  // ──── Player ────
  const [starter, setStarter] = useState(null);
  const [battle, dispatchBattle] = useReducer(battleReducer, undefined, createInitialBattleState);
  const {
    pHp, allySub, pHpSub, pExp, pLvl, pStg,
    round, enemy, eHp, enemySub, eHpSub,
    streak, passiveCount, charge, tC, tW, defeated, maxStreak,
    mHits, mLvls, mLvlUp,
    burnStack, frozen, staticStack, specDef, defAnim, cursed,
    diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns,
  } = battle;

  const {
    setPHp,
    setAllySub,
    setPHpSub,
    setPExp,
    setPLvl,
    setPStg,
    setEHp,
    setStreak,
    setPassiveCount,
    setCharge,
    setTC,
    setTW,
    setDefeated,
    setMaxStreak,
    setMHits,
    setMLvls,
    setMLvlUp,
    setBurnStack,
    setFrozen,
    setStaticStack,
    setSpecDef,
    setDefAnim,
    setCursed,
    setDiffLevel,
    setBossPhase,
    setBossTurn,
    setBossCharging,
    setSealedMove,
    setSealedTurns,
  } = useMemo(
    () => createBattleFieldSetters(dispatchBattle),
    [dispatchBattle],
  );

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

  const getActingStarter = resolveActingStarter;
  const getPvpTurnName = useCallback(
    (state, turn) => resolvePvpTurnName(state, turn, t),
    [t],
  );

  // ──── Internal refs ────
  const doEnemyTurnRef = useRef(() => {});
  const pendingEvolve = useRef(false);   // ← Bug #2 fix

  // ──── State ref — always points at latest committed values ────
  const sr = useBattleStateRef({
    enemy, enemySub, starter, allySub, eHp, eHpSub, pHp, pHpSub, pExp, pLvl, pStg,
    streak, passiveCount, charge, burnStack, frozen, staticStack, specDef, cursed,
    mHits, mLvls, selIdx, phase, round, q,
    screen, timedMode, battleMode, diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns,
    tC, tW, maxStreak, defeated,
    coopActiveSlot,
    pvpStarter2, pvpHp2, pvpTurn, pvpWinner, pvpChargeP1, pvpChargeP2, pvpActionCount,
    pvpBurnP1, pvpBurnP2, pvpFreezeP1, pvpFreezeP2, pvpStaticP1, pvpStaticP2,
    pvpParalyzeP1, pvpParalyzeP2, pvpComboP1, pvpComboP2, pvpSpecDefP1, pvpSpecDefP2,
  });

  const {
    beginRun,
    appendSessionEvent,
    endSessionOnce,
    appendQuitEventIfOpen,
  } = useBattleSessionLifecycle({ reseed, endSession });

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
  const { safeTo, invalidateAsyncWork } = useBattleAsyncGate();

  const {
    markPending: markCoopRotatePending,
    resetPending: resetCoopRotatePending,
  } = useCoopTurnRotation({
    phase,
    safeTo,
    sr,
    setCoopActiveSlot,
  });

  // ═══════════════════════════════════════════════════════════════
  //  TIMER
  // ═══════════════════════════════════════════════════════════════
  const onTimeout = () => {
    handleTimeoutFlow({
      sr,
      t,
      getPvpTurnName,
      getOtherPvpTurn,
      setAnswered,
      setFb,
      setTW,
      setPvpChargeP1,
      setPvpChargeP2,
      setPvpComboP1,
      setPvpComboP2,
      setBText,
      setPvpTurn,
      setPvpActionCount,
      setPhase,
      sfx,
      setStreak,
      setPassiveCount,
      setCharge,
      logAns,
      updateAbility: _updateAbility,
      getActingStarter,
      appendSessionEvent,
      markCoopRotatePending,
      safeTo,
      doEnemyTurn: () => doEnemyTurnRef.current(),
    });
  };

  const {
    paused: _PAUSED,
    startTimer, clearTimer, pauseTimer, resumeTimer,
    subscribeTimerLeft, getTimerLeft,
  } = useTimer(TIMER_SEC, onTimeout);

  const setScreen = (nextScreen) => {
    const prevScreen = sr.current.screen;
    if (prevScreen === "battle" && nextScreen !== "battle") {
      clearTimer();
      invalidateAsyncWork();
    }
    setScreenState(nextScreen);
  };

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
    runStartBattleFlow({
      idx,
      roster,
      enemies,
      locale,
      battleMode: sr.current.battleMode || battleMode,
      allySub: sr.current.allySub,
      starter,
      t,
      sceneNames: SCENE_NAMES,
      localizeEnemy,
      localizeSceneName,
      dispatchBattle,
      updateEnc,
      setPhase,
      setBText,
      setScreen,
      finishGame: _finishGame,
      resetFrozen: () => { frozenR.current = false; },
      playBattleIntro: () => effectOrchestrator.playBattleIntro({ safeTo, setEAnim, setPAnim }),
    });
  };

  // --- Full game reset (starterOverride used on first game when setStarter hasn't rendered yet) ---
  const resetRunRuntimeState = () => {
    setDmgs([]);
    setParts([]);
    setAtkEffect(null);
    setEffMsg(null);
    frozenR.current = false;
    abilityModelRef.current = createAbilityModel(2);
    pendingEvolve.current = false;
  };

  const startGame = (starterOverride, modeOverride = null, allyOverride = null) => {
    invalidateAsyncWork();
    beginRun();
    clearTimer();
    resetCoopRotatePending();
    runStartGameController({
      starterOverride,
      modeOverride,
      allyOverride,
      sr,
      battleMode,
      pvpStarter2,
      locale,
      localizeStarter,
      pickPartnerStarter: (mainStarter) => pickPartnerStarter(mainStarter, pickIndex, locale),
      getStarterStageIdx,
      getStageMaxHp,
      pvpStartDeps: {
        chance,
        getStarterMaxHp,
        t,
        setEnemies,
        setTimedMode,
        setCoopActiveSlot,
        dispatchBattle,
        setPvpStarter2,
        setPvpHp2,
        setPvpTurn,
        resetPvpRuntime,
        resetRunRuntimeState,
        appendSessionEvent,
        initSession,
        createPvpEnemyFromStarter,
        setPhase,
        setBText,
        setScreen,
        playBattleIntro: () => effectOrchestrator.playBattleIntro({ safeTo, setEAnim, setPAnim }),
      },
      standardStartDeps: {
        buildNewRoster,
        getStarterMaxHp,
        setEnemies,
        setCoopActiveSlot,
        resetPvpRuntime,
        dispatchBattle,
        resetRunRuntimeState,
        appendSessionEvent,
        initSession,
        setScreen,
        startBattle,
      },
    });
  };

  // ── Finalize and persist session log ──
  const _endSession = (isCompleted, reasonOverride = null) => {
    endSessionOnce(sr.current, isCompleted, reasonOverride);
  };

  const quitGame = () => {
    clearTimer();
    appendQuitEventIfOpen(sr.current);
    _endSession(false, "quit");
    setScreen("gameover");
  };

  const handlePlayerPartyKo = ({ target = "main", reason = t("battle.ally.ko", "Your partner has fallen...") }) => {
    return handleCoopPartyKo({
      state: sr.current,
      target,
      reason,
      setStarter,
      setPStg,
      setPHp,
      setAllySub,
      setPHpSub,
      setCoopActiveSlot,
      setPhase,
      setBText,
      safeTo,
      endSession: _endSession,
      setScreen,
      t,
    });
  };

  const runAllySupportTurn = ({ delayMs = 850, onDone } = {}) => {
    return runCoopAllySupportTurn({
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
      delayMs,
      onDone,
      t,
    });
  };

  // --- Handle a defeated enemy ---
  const handleVictory = (verb = t("battle.victory.verb.defeated", "was defeated")) => {
    runVictoryFlow({
      sr,
      verb,
      randInt,
      resolveLevelProgress,
      getStageMaxHp,
      tryUnlock,
      applyVictoryAchievements,
      updateEncDefeated,
      setBurnStack,
      setStaticStack,
      setFrozen,
      frozenRef: frozenR,
      setCursed,
      setBossPhase,
      setBossTurn,
      setBossCharging,
      setSealedMove,
      setSealedTurns,
      setPExp,
      setPLvl,
      setPHp,
      setDefeated,
      setBText,
      setPhase,
      sfx,
      t,
      setPendingEvolve: (value) => { pendingEvolve.current = value; },
    });
  };

  // --- Frozen enemy skips turn ---
  const handleFreeze = () => {
    const s = sr.current;
    frozenR.current = false; setFrozen(false);
    setBText(t("battle.freeze.enemySkip", "❄️ {enemy} is frozen and cannot attack!", { enemy: s.enemy.name }));
    setPhase("text");
    safeTo(() => { setPhase("menu"); setBText(""); }, 1500);
  };

  // --- Player selects a move ---
  const selectMove = (i) => {
    runSelectMoveFlow({
      index: i,
      state: sr.current,
      timedMode,
      diffMods: DIFF_MODS,
      t,
      getActingStarter,
      getMoveDiffLevel: _getMoveDiffLevel,
      genQuestion: genQ,
      startTimer,
      markQStart,
      sfx,
      setSelIdx,
      setDiffLevel,
      setQ,
      setFb,
      setAnswered,
      setPhase,
    });
  };

  // --- Enemy turn logic (reads from stateRef) ---
  function doEnemyTurn() {
    runEnemyTurn(createEnemyTurnHandlers({
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
    }));
  }
  useEffect(() => { doEnemyTurnRef.current = doEnemyTurn; });

  // --- Player answers a question ---
  const onAns = (choice) => {
    runAnswerController({
      choice,
      answered,
      setAnswered,
      clearTimer,
      sr,
      pvpHandlerDeps: {
        sr,
        rand,
        chance,
        safeTo,
        sfx,
        getOtherPvpTurn,
        setFb,
        setTC,
        setTW,
        setPvpChargeP1,
        setPvpChargeP2,
        setPvpComboP1,
        setPvpComboP2,
        setPvpTurn,
        setPvpActionCount,
        setBText,
        setPhase,
        setPvpSpecDefP1,
        setPvpSpecDefP2,
        setEffMsg,
        setAtkEffect,
        addP,
        setPvpParalyzeP1,
        setPvpParalyzeP2,
        setPAnim,
        setEAnim,
        addD,
        setPHp,
        setPvpHp2,
        setEHp,
        setScreen,
        setPvpWinner,
        setPvpBurnP1,
        setPvpBurnP2,
        setPvpFreezeP1,
        setPvpFreezeP2,
        setPvpStaticP1,
        setPvpStaticP2,
        t,
      },
      playerHandlerDeps: {
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
      },
      getActingStarter,
      logAns,
      appendSessionEvent,
      updateAbility: _updateAbility,
      markCoopRotatePending,
    });
  };

  // --- Advance from text / victory phase ---
  const continueFromVictory = () => {
    continueFromVictoryFlow({
      state: sr.current,
      enemiesLength: enemies.length,
      setScreen,
      dispatchBattle,
      localizeEnemy,
      locale,
      setBText,
      setPhase,
      finishGame: _finishGame,
      setPHp,
      setPHpSub,
      getStageMaxHp,
      getStarterMaxHp,
      startBattle,
      t,
    });
  };

  const advance = () => {
    runAdvanceController({
      phase,
      sr,
      pvpTurnStartHandlerDeps: {
        safeTo,
        getOtherPvpTurn,
        getPvpTurnName,
        setPHp,
        setPvpBurnP1,
        setPAnim,
        addD,
        setPvpWinner,
        setScreen,
        setPvpHp2,
        setEHp,
        setPvpBurnP2,
        setEAnim,
        setBText,
        setPhase,
        setPvpParalyzeP1,
        setPvpParalyzeP2,
        setPvpTurn,
        setPvpFreezeP1,
        setPvpFreezeP2,
        t,
      },
      setPhase,
      setBText,
      pendingEvolutionArgs: {
        pendingEvolveRef: pendingEvolve,
        setPStg,
        tryUnlock,
        getStageMaxHp,
        setPHp,
        setAllySub,
        setPHpSub,
        getStarterMaxHp,
        setMLvls,
        maxMoveLvl: MAX_MOVE_LVL,
        setScreen,
      },
      continueFromVictory,
    });
  };

  // --- Shared game-completion logic (achievements + session save) ---
  const _finishGame = () => {
    const s = sr.current;
    applyGameCompletionAchievements({
      state: s,
      tryUnlock,
      setEncData,
      encTotal: ENC_TOTAL,
    });
    _endSession(true);
    setScreen("gameover");
  };

  // --- Continue from evolve screen → start next battle ---
  const continueAfterEvolve = () => {
    continueFromVictory();
  };

  const toggleCoopActive = () => {
    const s = sr.current;
    if (!canSwitchCoopActiveSlot(s)) return;
    setCoopActiveSlot((prev) => (prev === "main" ? "sub" : "main"));
  };

  const setStarterLocalized = useCallback((nextStarter) => {
    setStarter(localizeStarter(nextStarter, locale));
  }, [locale]);

  const setPvpStarter2Localized = useCallback((nextStarter) => {
    setPvpStarter2(localizeStarter(nextStarter, locale));
  }, [locale, setPvpStarter2]);

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    // ── State (read by render shell) ──
    screen, timedMode, battleMode, enemies,
    starter, allySub, pHp, pHpSub, pExp, pLvl, pStg,
    coopActiveSlot,
    pvpStarter2, pvpHp2, pvpTurn, pvpWinner, pvpChargeP1, pvpChargeP2, pvpActionCount,
    pvpBurnP1, pvpBurnP2, pvpFreezeP1, pvpFreezeP2, pvpStaticP1, pvpStaticP2,
    pvpParalyzeP1, pvpParalyzeP2, pvpComboP1, pvpComboP2, pvpSpecDefP1, pvpSpecDefP2,
    round, enemy, eHp, enemySub, eHpSub,
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
    setTimedMode, setBattleMode, setScreen, setStarter: setStarterLocalized, setPvpStarter2: setPvpStarter2Localized,
    startGame, selectMove, onAns, advance, continueAfterEvolve,
    quitGame, togglePause, toggleCoopActive,

    // ── Helpers exposed for render ──
    getPow, dualEff,
    rmD, rmP,
    // ── SFX ──
    sfx,
  };
}
