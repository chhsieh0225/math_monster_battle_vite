/**
 * useBattle — Core game-state hook.
 *
 * Owns every piece of mutable state that was previously crammed into App.jsx.
 * Returns an explicit API contract:
 *   { state, actions, view }
 * so render layers can consume stable slices without flat-field coupling.
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
import { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { useI18n } from '../i18n';
import type {
  BattleMode,
  CollectionPopupVm,
  EnemyVm,
  MoveVm,
  ScreenName,
  StarterVm,
} from '../types/battle';

import { SCENE_NAMES } from '../data/scenes';
import {
  MAX_MOVE_LVL,
  TIMER_SEC,
} from '../data/constants';
import {
  localizeEnemy,
  localizeSceneName,
  localizeStarter,
} from '../utils/contentLocalization.ts';

import {
  genQ,
  type QuestionGeneratorMove,
  type QuestionGeneratorOptions,
} from '../utils/questionGenerator.ts';
import { withRandomSource } from '../utils/prng.ts';
import {
  movePower,
  bestEffectiveness,
} from '../utils/damageCalc';
import {
  getLevelMaxHp,
  getStarterMaxHp,
  getStarterStageIdx,
} from '../utils/playerHp';
import { useTimer } from './useTimer';
import { useAchievements } from './useAchievements';
import { useEncyclopedia } from './useEncyclopedia';
import { useSessionLog } from './useSessionLog';
import { getCollectionPerks, loadCollection, type CollectionPerks } from '../utils/collectionStore.ts';
import {
  applyDropsToInventory,
  loadInventory,
  saveInventory,
} from '../utils/inventoryStore.ts';
import { useBattleRng } from './useBattleRng';
import { useBattleUIState } from './useBattleUIState';
import { useDailyChallengeRun } from './useDailyChallengeRun';
import { usePvpState } from './usePvpState';
import { useBattleSessionLifecycle } from './useBattleSessionLifecycle';
import { ENC_TOTAL } from '../data/encyclopedia.ts';
import sfx from '../utils/sfx.ts';
import { useBattleRosterState } from './battle/useBattleRosterState.ts';
import {
  createAbilityModel,
  resolveLevelProgress,
} from '../utils/battleEngine';
import {
  battleReducer,
  createInitialBattleState,
} from './battle/battleReducer';
import { createBattleFieldSetters } from './battle/battleFieldSetters';
import { effectOrchestrator } from './battle/effectOrchestrator';
import { runTimeoutController } from './battle/timeoutController.ts';
import { buildTimeoutControllerArgs } from './battle/timeoutDepsBuilder.ts';
import {
  runBattleEnemyTurn,
} from './battle/turnFlowAdapter.ts';
import { runResetRuntimeState } from './battle/runtimeReset.ts';
import { runScreenTransition } from './battle/screenTransition.ts';
import {
  runEndSessionController,
  runFinishGameController,
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
  applyVictoryAchievements,
} from './battle/achievementFlow';
import {
  resolveDailyBattleRule,
  resolveTowerBattleRule,
} from './battle/challengeRuntime.ts';
import { DIFF_MODS, pickPartnerStarter } from './battle/partnerStarter.ts';
import { COLLECTION_MILESTONES } from '../data/collectionMilestones.ts';
import { resolveBattleQuestionConfig } from './battle/questionConfig.ts';
import {
  runBattleStart,
} from './battle/startFlowAdapter.ts';
import {
  runBattleVictory,
} from './battle/progressionFlowAdapter.ts';
import { useCoopTurnRotation } from './useCoopTurnRotation';
import { useBattleAsyncGate, useBattleStateRef } from './useBattleRuntime';
import { buildUseBattleState } from './battle/publicStateBuilder.ts';
import { buildUseBattleView } from './battle/publicViewBuilder.ts';
import { buildUseBattleActions } from './battle/publicActionsBuilder.ts';
import { buildUseBattlePublicApi } from './battle/publicApi.ts';
import {
  runAdvanceWithContext,
  runAnswerWithContext,
  runContinueWithContext,
  runSelectMoveWithContext,
  runStartGameWithContext,
} from './battle/actionFlowDelegates.ts';
import {
  runAllySupportTurnWithContext,
  runHandleFreezeWithContext,
  runPlayerPartyKoWithContext,
  runQuitGameWithContext,
  runToggleCoopActiveWithContext,
} from './battle/lifecycleActionDelegates.ts';
import { useBattleAbilityModel } from './battle/useBattleAbilityModel.ts';
import { useBattleItemActions } from './battle/useBattleItemActions.ts';
import {
  useBattleOrchestrationState,
  useBattlePauseState,
} from './battle/useBattleOrchestrationState.ts';
import { useBattleFlowState } from './battle/useBattleFlowState.ts';

const MAX_RECENT_QUESTION_WINDOW = 8;

function normalizeOps(ops: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(ops)) return [];
  const normalized = ops
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function resolveEffectiveQuestionOps(
  move: QuestionGeneratorMove,
  allowedOps: readonly string[] | null | undefined,
): string[] {
  const baseOps = normalizeOps(move.ops);
  const allowed = normalizeOps(allowedOps);
  if (allowed.length <= 0) return baseOps;
  const overlap = baseOps.filter((item) => allowed.includes(item));
  if (overlap.length > 0) return overlap;
  return allowed;
}

function estimateOpCombinationSpace(op: string, span: number): number {
  const safeSpan = Math.max(1, Math.trunc(span));
  switch (op) {
    case '+':
    case 'dec_add':
    case '×':
    case 'dec_mul':
    case '÷':
    case 'dec_div':
      return safeSpan * safeSpan;
    case 'dec_frac':
      return Math.max(14, safeSpan * safeSpan * 2);
    case '-':
      return safeSpan * Math.max(1, safeSpan - 1);
    case 'mixed2':
      return safeSpan * safeSpan * safeSpan * 4;
    case 'mixed3':
      return safeSpan * safeSpan * safeSpan * 2;
    case 'mixed4':
      return safeSpan * safeSpan * safeSpan * safeSpan * 3;
    case 'unknown1':
    case 'unknown2':
      return safeSpan * safeSpan * 2;
    case 'unknown3':
      return safeSpan * safeSpan * 3;
    case 'unknown4':
      return safeSpan * safeSpan * safeSpan * 2;
    case 'frac_cmp':
    case 'frac_diff':
    case 'frac_muldiv':
      return Math.max(16, safeSpan * safeSpan * safeSpan);
    case 'frac_same':
      return Math.max(12, safeSpan * safeSpan * 2);
    default:
      return safeSpan * safeSpan;
  }
}

function estimateMoveQuestionCombinationSpace(
  move: QuestionGeneratorMove,
  diffMod: number,
  allowedOps: readonly string[] | null | undefined,
): number {
  const lo = Number.isFinite(move.range?.[0]) ? Number(move.range[0]) : 1;
  const hi = Number.isFinite(move.range?.[1]) ? Number(move.range[1]) : lo;
  const scaledMin = Math.max(1, Math.round(Math.min(lo, hi) * diffMod));
  const scaledMax = Math.max(scaledMin, Math.round(Math.max(lo, hi) * diffMod));
  const span = Math.max(1, scaledMax - scaledMin + 1);
  const ops = resolveEffectiveQuestionOps(move, allowedOps);
  if (ops.length <= 0) return span;
  return ops.reduce((sum, op) => sum + estimateOpCombinationSpace(op, span), 0);
}

function resolveQuestionRecentWindowSize(
  move: QuestionGeneratorMove,
  diffMod: number,
  allowedOps: readonly string[] | null | undefined,
): number {
  const space = estimateMoveQuestionCombinationSpace(move, diffMod, allowedOps);
  return Math.max(0, Math.min(MAX_RECENT_QUESTION_WINDOW, Math.floor(space / 2)));
}

function buildQuestionHistoryKey(
  move: QuestionGeneratorMove,
  diffMod: number,
  allowedOps: readonly string[] | null | undefined,
): string {
  const [rangeLo = 1, rangeHi = 10] = move.range || [1, 10];
  const ops = resolveEffectiveQuestionOps(move, allowedOps);
  return `${rangeLo}:${rangeHi}:${Math.round(diffMod * 1000)}:${ops.join('|')}`;
}

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
  const [collectionPerks, setCollectionPerks] = useState<CollectionPerks>(() => getCollectionPerks(loadCollection()));
  const [collectionPopup, setCollectionPopup] = useState<CollectionPopupVm | null>(null);
  const [inventory, setInventory] = useState(() => loadInventory());

  const {
    queuedChallenge,
    activeChallenge,
    dailyChallengeFeedback,
    towerChallengeFeedback,
    setDailyChallengeFeedback,
    setTowerChallengeFeedback,
    clearChallengeRun,
    queueDailyChallengePlan,
    queueTowerChallengePlan,
    activateQueuedChallenge,
    dailyPlan,
    towerPlan,
    settleRunAsFailed,
    settleRunAsCleared,
  } = useDailyChallengeRun();
  const {
    screen,
    timedMode,
    battleMode,
    setScreenState,
    setTimedMode,
    setBattleMode,
    queueDailyChallenge,
    queueTowerChallenge,
  } = useBattleFlowState({
    queueDailyChallengePlan,
    queueTowerChallengePlan,
  });
  const hasChallengeRun = Boolean(queuedChallenge || activeChallenge);
  const {
    buildNewRoster,
    enemies,
    setEnemies,
    coopActiveSlot,
    setCoopActiveSlot,
    getCampaignNodeMeta,
  } = useBattleRosterState({
    pickIndex,
    locale,
    hasChallengeRun,
  });
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
  const [starter, setStarter] = useState<StarterVm | null>(null);
  const [battle, dispatchBattle] = useReducer(battleReducer, undefined, createInitialBattleState);
  const {
    pHp, allySub, pHpSub, pExp, pLvl, pStg,
    round, enemy, eHp, enemySub, eHpSub,
    streak, passiveCount, charge, tC, tW, defeated, maxStreak,
    mHits, mLvls, mLvlUp,
    burnStack, frozen, shattered, staticStack, specDef, defAnim, cursed,
    diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns, shadowShieldCD, furyRegenUsed,
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
    setShattered,
    setDiffLevel,
    setSpecDef,
    setDefAnim,
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

  const {
    frozenRef: frozenR,
    doEnemyTurnRef,
    pendingEvolveRef: pendingEvolve,
    pendingTextAdvanceActionRef,
    recentQuestionDisplaysRef,
    setPendingTextAdvanceAction,
    consumePendingTextAdvanceAction,
    clearRecentQuestionDisplays,
  } = useBattleOrchestrationState();

  // ──── Learning model 2.0: per-question-type adaptive difficulty ────
  const {
    abilityModelRef,
    updateAbility: _updateAbility,
    getMoveDiffLevel: _getMoveDiffLevel,
  } = useBattleAbilityModel({
    baselineLevel: 2,
    onLevelChange: setDiffLevel,
  });

  const getActingStarter = resolveActingStarter;
  const getPvpTurnName = useCallback(
    (
      state: Parameters<typeof resolvePvpTurnName>[0],
      turn: Parameters<typeof resolvePvpTurnName>[1],
    ) => resolvePvpTurnName(state, turn, t),
    [t],
  );

  // ──── State ref — always points at latest committed values ────
  const sr = useBattleStateRef({
    enemy, enemySub, starter, allySub, eHp, eHpSub, pHp, pHpSub, pExp, pLvl, pStg,
    streak, passiveCount, charge, burnStack, frozen, shattered, staticStack, specDef, cursed,
    mHits, mLvls, selIdx, phase, round, q,
    screen, timedMode, battleMode, diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns, shadowShieldCD, furyRegenUsed,
    tC, tW, maxStreak, defeated,
    coopActiveSlot,
    pvpStarter2, pvpHp2, pvpTurn, pvpWinner, pvpChargeP1, pvpChargeP2, pvpActionCount,
    pvpBurnP1, pvpBurnP2, pvpFreezeP1, pvpFreezeP2, pvpStaticP1, pvpStaticP2,
    pvpParalyzeP1, pvpParalyzeP2, pvpComboP1, pvpComboP2, pvpSpecDefP1, pvpSpecDefP2,
    inventory,
  });

  const {
    beginRun,
    appendSessionEvent,
    endSessionOnce,
    appendQuitEventIfOpen,
  } = useBattleSessionLifecycle({ reseed, endSession });

  const getPlayerMaxHp = useCallback((stageIdx = 0, levelOverride?: number) => {
    const resolvedLevel = Number.isFinite(levelOverride)
      ? Number(levelOverride)
      : Number(sr.current?.pLvl || 1);
    return getLevelMaxHp(resolvedLevel, stageIdx);
  }, [sr]);

  // ──── Computed ────
  const expNext = pLvl * 30;
  const chargeReady = charge >= 3;

  const getPow = useCallback(
    (i: number) => starter ? movePower(starter.moves[i], mLvls[i], i) : 0,
    [starter, mLvls],
  );

  const dualEff = useCallback(
    (move: MoveVm) => bestEffectiveness(move, enemy),
    [enemy],
  );
  const getCollectionDamageScale = useCallback((attackType: string) => {
    const normalizedType = String(attackType || '');
    const allBonus = Number(collectionPerks.allDamageBonus || 0);
    const typeBonus = Number(collectionPerks.damageBonusByType[normalizedType] || 0);
    return 1 + allBonus + typeBonus;
  }, [collectionPerks]);

  const currentDailyBattleRule = useMemo(
    () => resolveDailyBattleRule(dailyPlan, round),
    [dailyPlan, round],
  );
  const currentTowerBattleRule = useMemo(
    () => resolveTowerBattleRule(towerPlan, round),
    [towerPlan, round],
  );
  const currentChallengeBattleRule = currentDailyBattleRule || currentTowerBattleRule;
  const { questionTimerSec, questionAllowedOps } = useMemo(
    () => resolveBattleQuestionConfig(currentChallengeBattleRule, TIMER_SEC),
    [currentChallengeBattleRule],
  );

  const genBattleQuestion = useCallback(
    (
      move: MoveVm | undefined,
      diffMod: number,
      options?: QuestionGeneratorOptions,
    ) => {
      if (!move) return null;
      const allowedOps = Array.isArray(options?.allowedOps) && options?.allowedOps.length > 0
        ? options.allowedOps
        : null;
      const moveConfig: QuestionGeneratorMove = {
        range: move.range || [1, 10],
        ops: move.ops || ['+', '-'],
      };
      const generateQuestion = () => withRandomSource(rand, () => genQ(moveConfig, diffMod, options));
      const dedupWindow = resolveQuestionRecentWindowSize(moveConfig, diffMod, allowedOps);
      const questionHistoryKey = buildQuestionHistoryKey(moveConfig, diffMod, allowedOps);
      const questionHistoryByKey = recentQuestionDisplaysRef.current;
      const recentDisplays = questionHistoryByKey.get(questionHistoryKey) || [];

      let question = generateQuestion();
      if (dedupWindow > 0 && recentDisplays.length > 0) {
        let attempts = 0;
        const maxAttempts = Math.max(2, Math.min(12, dedupWindow * 2));
        while (attempts < maxAttempts && recentDisplays.includes(question.display)) {
          question = generateQuestion();
          attempts += 1;
        }
      }

      if (dedupWindow > 0 && typeof question.display === 'string' && question.display.trim().length > 0) {
        const nextHistory = [...recentDisplays, question.display];
        if (nextHistory.length > dedupWindow) {
          nextHistory.splice(0, nextHistory.length - dedupWindow);
        }
        questionHistoryByKey.set(questionHistoryKey, nextHistory);
      }

      return question;
    },
    [rand, recentQuestionDisplaysRef],
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

  const setScreen = useCallback((nextScreen: ScreenName) => {
    if (nextScreen === 'title') {
      clearChallengeRun();
      clearRecentQuestionDisplays();
    }
    setPendingTextAdvanceAction(null);
    runScreenTransition({
      prevScreen: sr.current.screen,
      nextScreen,
      clearTimer,
      invalidateAsyncWork,
      setScreenState,
    });
  }, [
    clearChallengeRun,
    clearRecentQuestionDisplays,
    clearTimer,
    invalidateAsyncWork,
    setPendingTextAdvanceAction,
    setScreenState,
    sr,
  ]);
  const setScreenFromString = useCallback((nextScreen: string) => {
    setScreen(nextScreen as ScreenName);
  }, [setScreen]);

  const { gamePaused, togglePause } = useBattlePauseState({
    pauseTimer,
    resumeTimer,
  });
  const dismissCollectionPopup = useCallback(() => {
    setCollectionPopup(null);
  }, []);

  // Cleanup timer when leaving question phase
  useEffect(() => { if (phase !== "question") clearTimer(); }, [phase, clearTimer]);

  // ═══════════════════════════════════════════════════════════════
  //  BATTLE FLOW
  // ═══════════════════════════════════════════════════════════════

  const playBattleIntro = useCallback(() => {
    effectOrchestrator.playBattleIntro({ safeTo, setEAnim, setPAnim });
  }, [safeTo, setEAnim, setPAnim]);

  // ── Finalize and persist session log ──
  const _endSession = useCallback((isCompleted: boolean, reasonOverride: string | null = null) => {
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
  const startBattle = useCallback((idx: number, roster?: EnemyVm[]) => {
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
        pickIndex,
        getCampaignNodeMeta,
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
    pickIndex,
    dispatchBattle,
    updateEnc,
    setPhase,
    setBText,
    setScreen,
    _finishGame,
    playBattleIntro,
    getCampaignNodeMeta,
    frozenR,
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
      pendingTextAdvanceActionRef,
    });
  }, [setDmgs, setParts, setAtkEffect, setEffMsg, abilityModelRef, frozenR, pendingEvolve, pendingTextAdvanceActionRef]);

  const startGame = useCallback((
    starterOverride?: StarterVm | null,
    modeOverride: BattleMode | null = null,
    allyOverride: StarterVm | null = null,
  ) => {
    setCollectionPopup(null);
    clearRecentQuestionDisplays();
    runStartGameWithContext({
      setDailyChallengeFeedback,
      setTowerChallengeFeedback,
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
            setScreen: setScreenFromString,
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
            setScreen: setScreenFromString,
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
          getStageMaxHp: getPlayerMaxHp,
        },
      },
      activateQueuedChallenge,
    }, starterOverride, modeOverride, allyOverride);
  }, [
    setDailyChallengeFeedback,
    setTowerChallengeFeedback,
    queuedChallenge,
    activeChallenge,
    buildNewRoster,
    invalidateAsyncWork,
    beginRun,
    clearTimer,
    resetCoopRotatePending,
    chance,
    t,
    setEnemies,
    setTimedMode,
    setCoopActiveSlot,
    dispatchBattle,
    appendSessionEvent,
    initSession,
    setScreenFromString,
    playBattleIntro,
    pvpState,
    UI,
    resetRunRuntimeState,
    startBattle,
    sr,
    battleMode,
    pvpStarter2,
    locale,
    pickIndex,
    getPlayerMaxHp,
    activateQueuedChallenge,
    clearRecentQuestionDisplays,
  ]);

  const quitGame = useCallback(() => {
    runQuitGameWithContext({
      clearTimer,
      appendQuitEventIfOpen,
      sr,
      endSession: _endSession,
      setScreen: setScreenFromString,
    });
  }, [clearTimer, appendQuitEventIfOpen, sr, _endSession, setScreenFromString]);

  const handlePlayerPartyKo = useCallback(({
    target = 'main',
    reason = t('battle.ally.ko', 'Your partner has fallen...'),
  }: { target?: 'main' | 'sub'; reason?: string } = {}) => {
    return runPlayerPartyKoWithContext({
      sr,
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
      setScreen: setScreenFromString,
      t,
    }, { target, reason });
  }, [
    sr,
    setStarter,
    setPStg,
    setPHp,
    setAllySub,
    setPHpSub,
    setCoopActiveSlot,
    setPhase,
    setBText,
    safeTo,
    _endSession,
    setScreenFromString,
    t,
  ]);

  // --- Handle a defeated enemy ---
  const handleVictory = useCallback((verb = t("battle.victory.verb.defeated", "was defeated")) => {
    runBattleVictory({
      victoryInput: {
        verb,
        sr,
        runtime: {
          randInt,
          resolveLevelProgress,
          getStageMaxHp: getPlayerMaxHp,
          tryUnlock,
          applyVictoryAchievements,
          updateEncDefeated,
          onDropResolved: (drop) => {
            if (!drop) return;
            setInventory((prev) => {
              const result = applyDropsToInventory(prev, [drop]);
              if (result.changed) {
                saveInventory(result.inventory);
              }
              return result.inventory;
            });
          },
          onCollectionUpdated: (result) => {
            if (!result) return;
            if (result.perks) setCollectionPerks(result.perks);
            const unlockedMilestones = Array.isArray(result.newlyUnlockedMilestoneIds)
              ? result.newlyUnlockedMilestoneIds
              : [];
            const unlockedTitles = Array.isArray(result.newlyUnlockedTitles)
              ? result.newlyUnlockedTitles
              : [];
            const unlockedCount = unlockedMilestones.length + unlockedTitles.length;
            if (unlockedCount <= 0) return;
            const firstMilestone = COLLECTION_MILESTONES.find(
              (milestone) => milestone.id === unlockedMilestones[0],
            );
            const firstTitle = unlockedTitles[0];
            const localizedTitle = firstTitle
              ? t(firstTitle.nameKey, firstTitle.nameFallback)
              : '';
            const desc = firstTitle
              ? t('collection.popup.desc.title', 'Unlocked title: {title}', { title: localizedTitle })
              : unlockedCount > 1
                ? t('collection.popup.desc.multi', 'Unlocked {count} new collection rewards.', { count: unlockedCount })
                : t('collection.popup.desc.single', 'Unlocked 1 new collection reward.');
            setCollectionPopup({
              id: Date.now(),
              icon: firstMilestone?.emoji || (firstTitle ? '🏅' : '🎁'),
              title: t('collection.popup.title', 'Collection Milestone!'),
              desc,
            });
          },
          sfx,
          t,
        },
        battleFields: battleFieldSetters,
        ui: UI,
        frozenRef: frozenR,
        pendingEvolveRef: pendingEvolve,
      },
    });
  }, [
    t,
    sr,
    randInt,
    getPlayerMaxHp,
    tryUnlock,
    updateEncDefeated,
    battleFieldSetters,
    UI,
    frozenR,
    pendingEvolve,
  ]);

  const runAllySupportTurn = useCallback(({ delayMs = 850, onDone }: { delayMs?: number; onDone?: () => void } = {}) => {
    return runAllySupportTurnWithContext({
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
      t,
    }, { delayMs, onDone });
  }, [sr, safeTo, chance, rand, setBText, setPhase, setEAnim, setEHp, addD, addP, handleVictory, t]);

  // --- Frozen enemy skips turn ---
  const handleFreeze = useCallback(() => {
    runHandleFreezeWithContext({
      sr,
      frozenRef: frozenR,
      setFrozen,
      setBText,
      setPhase,
      safeTo,
      t,
    });
  }, [sr, frozenR, setFrozen, setBText, setPhase, safeTo, t]);

  // --- Player selects a move ---
  const selectMove = useCallback((i: number) => {
    runSelectMoveWithContext({
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
    }, i);
  }, [
    sr,
    timedMode,
    questionTimerSec,
    questionAllowedOps,
    t,
    getActingStarter,
    _getMoveDiffLevel,
    genBattleQuestion,
    startTimer,
    markQStart,
    UI,
    battleFieldSetters,
  ]);

  // --- Enemy turn logic (reads from stateRef) ---
  const doEnemyTurn = useCallback(() => {
    runBattleEnemyTurn({
      enemyTurnInput: {
        sr,
        runtime: {
          safeTo,
          rand,
          randInt,
          chance,
          sfx,
      setScreen: setScreenFromString,
          t,
        },
        battleFields: battleFieldSetters,
        ui: UI,
        callbacks: {
          _endSession,
          handleVictory,
          handlePlayerPartyKo,
        },
      },
    });
  }, [
    sr,
    safeTo,
    rand,
    randInt,
    chance,
    setScreenFromString,
    t,
    battleFieldSetters,
    UI,
    _endSession,
    handleVictory,
    handlePlayerPartyKo,
  ]);
  useEffect(() => { doEnemyTurnRef.current = doEnemyTurn; }, [doEnemyTurn, doEnemyTurnRef]);

  // --- Player answers a question ---
  const onAns = useCallback((choice: number) => {
    runAnswerWithContext({
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
          setScreen: setScreenFromString,
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
          getCollectionDamageScale,
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
          setScreen: setScreenFromString,
          handlePlayerPartyKo,
          runAllySupportTurn,
          setPendingTextAdvanceAction,
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
    }, choice);
  }, [
    answered,
    setAnswered,
    clearTimer,
    sr,
    rand,
    chance,
    safeTo,
    setScreenFromString,
    t,
    UI,
    pvpState,
    battleFieldSetters,
    getCollectionDamageScale,
    tryUnlock,
    frozenR,
    doEnemyTurn,
    handleVictory,
    handleFreeze,
    _endSession,
    handlePlayerPartyKo,
    runAllySupportTurn,
    setPendingTextAdvanceAction,
    getActingStarter,
    logAns,
    appendSessionEvent,
    _updateAbility,
    markCoopRotatePending,
  ]);

  // --- Advance from text / victory phase ---
  const continueFromVictory = useCallback(() => {
    runContinueWithContext({
      continueFromVictoryInput: {
        sr,
        enemiesLength: enemies.length,
        runtime: {
          setScreen: setScreenFromString,
          dispatchBattle,
          localizeEnemy,
          locale,
          getStageMaxHp: getPlayerMaxHp,
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
  }, [
    sr,
    enemies.length,
    setScreenFromString,
    dispatchBattle,
    locale,
    getPlayerMaxHp,
    t,
    battleFieldSetters,
    UI,
    _finishGame,
    startBattle,
  ]);

  const advance = useCallback(() => {
    runAdvanceWithContext({
      phase,
      sr,
      setPhase,
      setBText,
      continueFromVictory,
      consumePendingTextAdvanceAction,
      advancePvpDepsInput: {
        runtime: {
          sr,
          safeTo,
          getOtherPvpTurn,
          getPvpTurnName,
          setScreen: setScreenFromString,
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
          getStageMaxHp: getPlayerMaxHp,
          getStarterMaxHp,
          maxMoveLvl: MAX_MOVE_LVL,
        },
    });
  }, [
    phase,
    sr,
    setPhase,
    setBText,
    continueFromVictory,
    consumePendingTextAdvanceAction,
    safeTo,
    getPvpTurnName,
    setScreenFromString,
    t,
    UI,
    pvpState,
    battleFieldSetters,
    pendingEvolve,
    setScreen,
    tryUnlock,
    getPlayerMaxHp,
  ]);

  // --- Continue from evolve screen → start next battle ---
  const continueAfterEvolve = useCallback(() => {
    continueFromVictory();
  }, [continueFromVictory]);

  const toggleCoopActive = useCallback(() => {
    runToggleCoopActiveWithContext({
      sr,
      canSwitchCoopActiveSlot,
      setCoopActiveSlot,
    });
  }, [sr, setCoopActiveSlot]);

  const useItem = useBattleItemActions({
    phase,
    battleMode,
    coopActiveSlot,
    allySub,
    pHpSub,
    pHp,
    pLvl,
    pStg,
    inventory,
    specDef,
    starter,
    sr,
    getActingStarter,
    getPlayerMaxHp,
    setPHpSub,
    setPHp,
    setBText,
    setEffMsg,
    setSpecDef,
    setDefAnim,
    safeTo,
    setInventory,
    t,
    sfx,
  });

  const setStarterLocalized = useCallback((nextStarter: StarterVm | null) => {
    setStarter(localizeStarter(nextStarter, locale));
  }, [locale]);

  const setPvpStarter2Localized = useCallback((nextStarter: StarterVm | null) => {
    setPvpStarter2(localizeStarter(nextStarter, locale));
  }, [locale, setPvpStarter2]);

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  const state = buildUseBattleState({
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
    burnStack, frozen, shattered, staticStack, specDef, defAnim, cursed,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns, shadowShieldCD, furyRegenUsed, diffLevel,
    gamePaused,
    questionTimerSec,
    dailyChallengeFeedback,
    towerChallengeFeedback,
    expNext, chargeReady,
    inventory,
    achUnlocked, achPopup, collectionPopup, encData,
  });

  // eslint-disable-next-line react-hooks/refs
  const actions = buildUseBattleActions({
    dismissAch,
    dismissCollectionPopup,
    setTimedMode,
    setBattleMode,
    setScreen,
    queueDailyChallenge,
    queueTowerChallenge,
    clearChallengeRun,
    setStarterLocalized,
    setPvpStarter2Localized,
    startGame,
    selectMove,
    useItem,
    onAns,
    advance,
    continueAfterEvolve,
    quitGame,
    togglePause,
    toggleCoopActive,
    rmD,
    rmP,
  });

  const view = useMemo(() => buildUseBattleView({
    timerSubscribe: subscribeTimerLeft,
    getTimerLeft,
    getPow, dualEff,
    sfx,
  }), [subscribeTimerLeft, getTimerLeft, getPow, dualEff]);

  const publicApi = buildUseBattlePublicApi({
    state,
    actions,
    view,
  });
  return publicApi;
}
