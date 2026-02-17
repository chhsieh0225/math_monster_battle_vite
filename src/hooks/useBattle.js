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
import {
  localizeEnemy,
  localizeEnemyRoster,
  localizeSceneName,
  localizeStarter,
} from '../utils/contentLocalization';

import { genQ } from '../utils/questionGenerator.ts';
import { withRandomSource } from '../utils/prng.ts';
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
import { useDailyChallengeRun } from './useDailyChallengeRun';
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
import { runEnemyTurnController } from './battle/enemyTurnController.ts';
import { runTimeoutController } from './battle/timeoutController.ts';
import { buildTimeoutControllerArgs } from './battle/timeoutDepsBuilder.ts';
import { runSelectMoveFlow } from './battle/selectMoveFlow';
import {
  buildEnemyTurnArgs,
  buildSelectMoveFlowArgs,
} from './battle/turnActionDepsBuilder.ts';
import { runResetRuntimeState } from './battle/runtimeReset.ts';
import { runScreenTransition } from './battle/screenTransition.ts';
import {
  runEndSessionController,
  runFinishGameController,
  runHandleFreezeController,
  runQuitGameController,
  runToggleCoopActiveController,
} from './battle/gameLifecycleController.ts';
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
} from './battle/coopFlow';
import {
  runAllySupportTurnController,
  runPlayerPartyKoController,
} from './battle/coopActionController.ts';
import {
  applyVictoryAchievements,
} from './battle/achievementFlow';
import {
  resolveDailyBattleRule,
} from './battle/challengeRuntime.ts';
import { DIFF_MODS, pickPartnerStarter } from './battle/partnerStarter.ts';
import { resolveBattleQuestionConfig } from './battle/questionConfig.ts';
import {
  runBattleStart,
  runBattleStartGame,
} from './battle/startFlowAdapter.ts';
import {
  runBattleAdvance,
  runBattleAnswer,
} from './battle/interactionFlowAdapter.ts';
import {
  runBattleVictory,
  runBattleContinueFromVictory,
} from './battle/progressionFlowAdapter.ts';
import { useCoopTurnRotation } from './useCoopTurnRotation';
import { useBattleAsyncGate, useBattleStateRef } from './useBattleRuntime';

// ═══════════════════════════════════════════════════════════════════
/** @returns {import('../types/battle').UseBattlePublicApi} */
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
  const {
    queuedChallenge,
    activeChallenge,
    dailyChallengeFeedback,
    setDailyChallengeFeedback,
    clearChallengeRun,
    queueChallengePlan,
    activateQueuedChallenge,
    dailyPlan,
    settleRunAsFailed,
    settleRunAsCleared,
  } = useDailyChallengeRun();
  const [coopActiveSlot, setCoopActiveSlot] = useState("main");
  const pvpState = usePvpState();
  const {
    pvpStarter2, setPvpStarter2,
    pvpHp2,
    pvpTurn,
    pvpWinner,
    pvpChargeP1,
    pvpChargeP2,
    pvpActionCount,
    pvpBurnP1,
    pvpBurnP2,
    pvpFreezeP1,
    pvpFreezeP2,
    pvpStaticP1,
    pvpStaticP2,
    pvpParalyzeP1,
    pvpParalyzeP2,
    pvpComboP1,
    pvpComboP2,
    pvpSpecDefP1,
    pvpSpecDefP2,
  } = pvpState;

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

  const battleFieldSetters = useMemo(
    () => createBattleFieldSetters(dispatchBattle),
    [dispatchBattle],
  );
  const {
    setPHp,
    setAllySub,
    setPHpSub,
    setPStg,
    setEHp,
    setFrozen,
    setDiffLevel,
  } = battleFieldSetters;

  // ──── Phase & UI ────
  const {
    phase, setPhase,
    selIdx,
    q,
    fb,
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

  const queueDailyChallenge = useCallback((plan) => {
    queueChallengePlan(plan);
    setTimedMode(true);
    setBattleMode('single');
  }, [queueChallengePlan]);

  const currentDailyBattleRule = useMemo(
    () => resolveDailyBattleRule(dailyPlan, round),
    [dailyPlan, round],
  );
  const { questionTimerSec, questionAllowedOps } = useMemo(
    () => resolveBattleQuestionConfig(currentDailyBattleRule, TIMER_SEC),
    [currentDailyBattleRule],
  );

  const genBattleQuestion = useCallback(
    (move, diffMod, options) => withRandomSource(rand, () => genQ(move, diffMod, options)),
    [rand],
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
    runTimeoutController(buildTimeoutControllerArgs({
      runtime: {
        sr,
        t,
        getPvpTurnName,
        getOtherPvpTurn,
        sfx,
        logAns,
        updateAbility: _updateAbility,
        getActingStarter,
        appendSessionEvent,
        markCoopRotatePending,
        safeTo,
        doEnemyTurnRef,
      },
      ui: UI,
      pvp: pvpState,
      battleFields: battleFieldSetters,
    }));
  };

  const {
    paused: _PAUSED,
    startTimer, clearTimer, pauseTimer, resumeTimer,
    subscribeTimerLeft, getTimerLeft,
  } = useTimer(TIMER_SEC, onTimeout);

  const setScreen = useCallback((nextScreen) => {
    if (nextScreen === 'title') {
      clearChallengeRun();
    }
    runScreenTransition({
      prevScreen: sr.current.screen,
      nextScreen,
      clearTimer,
      invalidateAsyncWork,
      setScreenState,
    });
  }, [clearChallengeRun, clearTimer, invalidateAsyncWork, sr]);

  const [gamePaused, setGamePaused] = useState(false);

  const togglePause = useCallback(() => {
    setGamePaused((prevPaused) => {
      if (prevPaused) {
        resumeTimer();
        return false;
      }
      pauseTimer();
      return true;
    });
  }, [pauseTimer, resumeTimer]);

  // Cleanup timer when leaving question phase
  useEffect(() => { if (phase !== "question") clearTimer(); }, [phase, clearTimer]);

  // ═══════════════════════════════════════════════════════════════
  //  BATTLE FLOW
  // ═══════════════════════════════════════════════════════════════

  const playBattleIntro = useCallback(() => {
    effectOrchestrator.playBattleIntro({ safeTo, setEAnim, setPAnim });
  }, [safeTo, setEAnim, setPAnim]);

  // ── Finalize and persist session log ──
  const _endSession = useCallback((isCompleted, reasonOverride = null) => {
    if (!isCompleted) {
      settleRunAsFailed(sr.current?.defeated || 0);
    }
    runEndSessionController({
      sr,
      endSessionOnce,
      isCompleted,
      reasonOverride,
    });
  }, [sr, endSessionOnce, settleRunAsFailed]);

  // --- Shared game-completion logic (achievements + session save) ---
  const _finishGame = useCallback(() => {
    settleRunAsCleared();
    runFinishGameController({
      sr,
      tryUnlock,
      setEncData,
      encTotal: ENC_TOTAL,
      endSession: _endSession,
      setScreen,
    });
  }, [settleRunAsCleared, sr, tryUnlock, setEncData, _endSession, setScreen]);

  // --- Start a battle against enemies[idx], optionally from a fresh roster ---
  const startBattle = useCallback((idx, roster) => {
    runBattleStart({
      idx,
      roster,
      invalidateAsyncWork,
      clearTimer,
      startBattleSharedArgsInput: {
        sr,
        enemies,
        locale,
        fallbackBattleMode: battleMode,
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
        playBattleIntro,
      },
    });
  }, [
    invalidateAsyncWork,
    clearTimer,
    sr,
    enemies,
    locale,
    battleMode,
    starter,
    t,
    dispatchBattle,
    updateEnc,
    setPhase,
    setBText,
    setScreen,
    _finishGame,
    playBattleIntro,
  ]);

  // --- Full game reset (starterOverride used on first game when setStarter hasn't rendered yet) ---
  const resetRunRuntimeState = useCallback(() => {
    runResetRuntimeState({
      setDmgs,
      setParts,
      setAtkEffect,
      setEffMsg,
      frozenRef: frozenR,
      abilityModelRef,
      createAbilityModel,
      abilityBaselineLevel: 2,
      pendingEvolveRef: pendingEvolve,
    });
  }, [setDmgs, setParts, setAtkEffect, setEffMsg]);

  const startGame = (starterOverride, modeOverride = null, allyOverride = null) => {
    runBattleStartGame({
      starterOverride,
      modeOverride,
      allyOverride,
      setDailyChallengeFeedback,
      queuedChallenge,
      activeChallenge,
      buildNewRoster,
      startGameOrchestratorArgs: {
        invalidateAsyncWork,
        beginRun,
        clearTimer,
        resetCoopRotatePending,
        pvpStartDepsArgs: {
          runtime: {
            chance,
            getStarterMaxHp,
            t,
            setEnemies,
            setTimedMode,
            setCoopActiveSlot,
            dispatchBattle,
            appendSessionEvent,
            initSession,
            createPvpEnemyFromStarter,
            setScreen,
            playBattleIntro,
          },
          pvp: pvpState,
          ui: UI,
          resetRunRuntimeState,
        },
        standardStartDepsArgs: {
          runtime: {
            getStarterMaxHp,
            setEnemies,
            setCoopActiveSlot,
            dispatchBattle,
            appendSessionEvent,
            initSession,
            setScreen,
            startBattle,
          },
          pvp: pvpState,
          resetRunRuntimeState,
        },
        startGameControllerArgs: {
          sr,
          battleMode,
          pvpStarter2,
          locale,
          localizeStarter,
          pickPartnerStarter: (mainStarter) => pickPartnerStarter(mainStarter, pickIndex, locale),
          getStarterStageIdx,
          getStageMaxHp,
        },
      },
      activateQueuedChallenge,
    });
  };

  const quitGame = () => {
    runQuitGameController({
      clearTimer,
      appendQuitEventIfOpen,
      sr,
      endSession: _endSession,
      setScreen,
    });
  };

  const handlePlayerPartyKo = ({ target = "main", reason = t("battle.ally.ko", "Your partner has fallen...") }) => {
    return runPlayerPartyKoController({
      sr,
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
    return runAllySupportTurnController({
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
    runBattleVictory({
      victoryInput: {
        verb,
        sr,
        runtime: {
          randInt,
          resolveLevelProgress,
          getStageMaxHp,
          tryUnlock,
          applyVictoryAchievements,
          updateEncDefeated,
          sfx,
          t,
        },
        battleFields: battleFieldSetters,
        ui: UI,
        frozenRef: frozenR,
        pendingEvolveRef: pendingEvolve,
      },
    });
  };

  // --- Frozen enemy skips turn ---
  const handleFreeze = () => {
    runHandleFreezeController({
      sr,
      frozenRef: frozenR,
      setFrozen,
      setBText,
      setPhase,
      safeTo,
      t,
    });
  };

  // --- Player selects a move ---
  const selectMove = (i) => {
    runSelectMoveFlow(buildSelectMoveFlowArgs({
      index: i,
      sr,
      runtime: {
        timedMode,
        questionTimeLimitSec: questionTimerSec,
        questionAllowedOps,
        diffMods: DIFF_MODS,
        t,
        getActingStarter,
        getMoveDiffLevel: _getMoveDiffLevel,
        genQuestion: genBattleQuestion,
        startTimer,
        markQStart,
        sfx,
      },
      ui: UI,
      battleFields: battleFieldSetters,
    }));
  };

  // --- Enemy turn logic (reads from stateRef) ---
  function doEnemyTurn() {
    runEnemyTurnController(buildEnemyTurnArgs({
      sr,
      runtime: {
        safeTo,
        rand,
        randInt,
        chance,
        sfx,
        setScreen,
        t,
      },
      battleFields: battleFieldSetters,
      ui: UI,
      callbacks: {
        _endSession,
        handleVictory,
        handlePlayerPartyKo,
      },
    }));
  }
  useEffect(() => { doEnemyTurnRef.current = doEnemyTurn; });

  // --- Player answers a question ---
  const onAns = (choice) => {
    runBattleAnswer({
      choice,
      answered,
      setAnswered,
      clearTimer,
      pvpAnswerDepsInput: {
        runtime: {
          sr,
          rand,
          chance,
          safeTo,
          sfx,
          getOtherPvpTurn,
          setScreen,
          t,
        },
        ui: UI,
        pvp: pvpState,
        battleFields: battleFieldSetters,
      },
      playerDepsArgs: {
        runtime: {
          sr,
          safeTo,
          chance,
          sfx,
          t,
        },
        ui: UI,
        battleFields: battleFieldSetters,
        callbacks: {
          tryUnlock,
          frozenR,
          doEnemyTurn,
          handleVictory,
          handleFreeze,
          _endSession,
          setScreen,
          handlePlayerPartyKo,
          runAllySupportTurn,
        },
      },
      answerControllerArgsInput: {
        sr,
        getActingStarter,
        logAns,
        appendSessionEvent,
        updateAbility: _updateAbility,
        markCoopRotatePending,
      },
    });
  };

  // --- Advance from text / victory phase ---
  const continueFromVictory = () => {
    runBattleContinueFromVictory({
      continueFromVictoryInput: {
        sr,
        enemiesLength: enemies.length,
        runtime: {
          setScreen,
          dispatchBattle,
          localizeEnemy,
          locale,
          getStageMaxHp,
          getStarterMaxHp,
          t,
        },
        battleFields: battleFieldSetters,
        ui: UI,
        callbacks: {
          finishGame: _finishGame,
          startBattle,
        },
      },
    });
  };

  const advance = () => {
    runBattleAdvance({
      phase,
      sr,
      setPhase,
      setBText,
      continueFromVictory,
      advancePvpDepsInput: {
        runtime: {
          sr,
          safeTo,
          getOtherPvpTurn,
          getPvpTurnName,
          setScreen,
          t,
        },
        ui: UI,
        pvp: pvpState,
        battleFields: battleFieldSetters,
      },
      pendingEvolutionInput: {
        pendingEvolveRef: pendingEvolve,
        battleFields: battleFieldSetters,
        setScreen,
        tryUnlock,
        getStageMaxHp,
        getStarterMaxHp,
        maxMoveLvl: MAX_MOVE_LVL,
      },
    });
  };

  // --- Continue from evolve screen → start next battle ---
  const continueAfterEvolve = () => {
    continueFromVictory();
  };

  const toggleCoopActive = () => {
    runToggleCoopActiveController({
      sr,
      canSwitchCoopActiveSlot,
      setCoopActiveSlot,
    });
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
  const state = {
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
    gamePaused,
    questionTimerSec,
    dailyChallengeFeedback,
    expNext, chargeReady,
    achUnlocked, achPopup, encData,
  };

  const actions = {
    dismissAch,
    setTimedMode, setBattleMode, setScreen, queueDailyChallenge, clearChallengeRun,
    setStarter: setStarterLocalized, setPvpStarter2: setPvpStarter2Localized,
    startGame, selectMove, onAns, advance, continueAfterEvolve,
    quitGame, togglePause, toggleCoopActive,
    rmD, rmP,
  };

  const view = {
    timerSubscribe: subscribeTimerLeft,
    getTimerLeft,
    getPow, dualEff,
    sfx,
  };

  return {
    state,
    actions,
    view,
  };
}
