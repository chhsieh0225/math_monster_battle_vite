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
  WrongQuestionReviewVm,
  ScreenName,
  StarterVm,
} from '../types/battle';

import { SCENE_NAMES } from '../data/scenes';
import {
  MAX_MOVE_LVL,
  TIMER_SEC,
  PVP_TIMER_SEC,
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
import { resolveModifiers } from '../utils/challengeModifiers.ts';
import {
  runBattleStart,
} from './battle/startFlowAdapter.ts';
import {
  runBattleVictory,
} from './battle/progressionFlowAdapter.ts';
import { useCoopTurnRotation } from './useCoopTurnRotation';
import { useBattleAsyncGate, useBattleStateRef, useStableCallback } from './useBattleRuntime';
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
import {
  clearSave,
} from '../utils/savegame.ts';
import { useBattleAbilityModel } from './battle/useBattleAbilityModel.ts';
import { useBattleItemActions } from './battle/useBattleItemActions.ts';
import {
  useBattleOrchestrationState,
  useBattlePauseState,
} from './battle/useBattleOrchestrationState.ts';
import { useBattleFlowState } from './battle/useBattleFlowState.ts';
import { useBattleSaveFlow } from './battle/useBattleSaveFlow.ts';

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
  const pvpStore = usePvpState();
  const {
    pvpState: pvpStructuredState,
    pvpStarter2, setPvpStarter2,
    pvpHp2,
  } = pvpStore;

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
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionReviewVm[]>([]);

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
    setShattered: _SetShattered,
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

  useEffect(() => {
    if (!fb || fb.correct) return;
    const display = typeof q?.display === 'string' && q.display.trim().length > 0
      ? q.display.trim()
      : '?';
    const answerLabel = typeof q?.answerLabel === 'string' && q.answerLabel.trim().length > 0
      ? q.answerLabel.trim()
      : null;
    const answer = answerLabel
      || (fb.answer != null ? String(fb.answer) : (q?.answer != null ? String(q.answer) : '?'));
    const steps = Array.isArray(fb.steps)
      ? fb.steps
        .filter((step): step is string => typeof step === 'string')
        .map((step) => step.trim())
        .filter(Boolean)
        .slice(0, 6)
      : [];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- this effect appends review entries after answer feedback is committed
    setWrongQuestions((prev) => {
      const nextId = (prev.at(-1)?.id ?? 0) + 1;
      const next = [...prev, { id: nextId, display, answer, steps }];
      return next.length > 120 ? next.slice(next.length - 120) : next;
    });
  }, [fb, q]);

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
    pvpStarter2, pvpHp2, pvpState: pvpStructuredState,
    inventory,
  });
  const uiRef = useBattleStateRef(UI);
  const battleFieldSettersRef = useBattleStateRef(battleFieldSetters);
  const pvpStoreRef = useBattleStateRef(pvpStore);

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
  const challengeModsResolved = useMemo(
    () => resolveModifiers(currentChallengeBattleRule?.modifierTags),
    [currentChallengeBattleRule],
  );
  const challengeDamageMult = challengeModsResolved.playerDamageMult;
  const challengeComboMult = challengeModsResolved.comboScaleMult;
  const { questionTimerSec: baseQuestionTimerSec, questionAllowedOps } = useMemo(
    () => resolveBattleQuestionConfig(currentChallengeBattleRule, TIMER_SEC),
    [currentChallengeBattleRule],
  );
  const questionTimerSec = battleMode === 'pvp' ? PVP_TIMER_SEC : baseQuestionTimerSec;

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
  const onTimeoutContextRef = useBattleStateRef({
    sr,
    t,
    getPvpTurnName,
    getOtherPvpTurn,
    logAns,
    updateAbility: _updateAbility,
    getActingStarter,
    appendSessionEvent,
    markCoopRotatePending,
    safeTo,
    doEnemyTurnRef,
    uiRef,
    pvpStoreRef,
    battleFieldSettersRef,
  });
  const onTimeoutImpl = useCallback(() => {
    const ctx = onTimeoutContextRef.current;
    runTimeoutController(buildTimeoutControllerArgs({
      runtime: {
        sr: ctx.sr,
        t: ctx.t,
        getPvpTurnName: ctx.getPvpTurnName,
        getOtherPvpTurn: ctx.getOtherPvpTurn,
        sfx,
        logAns: ctx.logAns,
        updateAbility: ctx.updateAbility,
        getActingStarter: ctx.getActingStarter,
        appendSessionEvent: ctx.appendSessionEvent,
        markCoopRotatePending: ctx.markCoopRotatePending,
        safeTo: ctx.safeTo,
        doEnemyTurnRef: ctx.doEnemyTurnRef,
      },
      ui: ctx.uiRef.current,
      pvp: ctx.pvpStoreRef.current,
      battleFields: ctx.battleFieldSettersRef.current,
    }));
  }, [onTimeoutContextRef]);
  const onTimeout = useStableCallback(onTimeoutImpl);

  const {
    paused: _PAUSED,
    startTimer, clearTimer, pauseTimer, resumeTimer,
    subscribeTimerLeft, getTimerLeft,
  } = useTimer(TIMER_SEC, onTimeout);

  const setScreenContextRef = useBattleStateRef({
    clearChallengeRun,
    clearRecentQuestionDisplays,
    setPendingTextAdvanceAction,
    sr,
    clearTimer,
    invalidateAsyncWork,
    setScreenState,
  });
  const setScreenImpl = useCallback((nextScreen: ScreenName) => {
    const ctx = setScreenContextRef.current;
    if (nextScreen === 'title') {
      ctx.clearChallengeRun();
      ctx.clearRecentQuestionDisplays();
    }
    ctx.setPendingTextAdvanceAction(null);
    runScreenTransition({
      prevScreen: ctx.sr.current.screen,
      nextScreen,
      clearTimer: ctx.clearTimer,
      invalidateAsyncWork: ctx.invalidateAsyncWork,
      setScreenState: ctx.setScreenState,
    });
  }, [setScreenContextRef]);
  const setScreen = useStableCallback(setScreenImpl);
  const setScreenFromString = useStableCallback((nextScreen: string) => {
    setScreen(nextScreen as ScreenName);
  });

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

  const playBattleIntroContextRef = useBattleStateRef({
    safeTo,
    setEAnim,
    setPAnim,
  });
  const playBattleIntroImpl = useCallback(() => {
    const ctx = playBattleIntroContextRef.current;
    effectOrchestrator.playBattleIntro({
      safeTo: ctx.safeTo,
      setEAnim: ctx.setEAnim,
      setPAnim: ctx.setPAnim,
    });
  }, [playBattleIntroContextRef]);
  const playBattleIntro = useStableCallback(playBattleIntroImpl);

  // ── Finalize and persist session log ──
  const endSessionContextRef = useBattleStateRef({
    sr,
    endSessionOnce,
    settleRunAsFailed,
  });
  const endSessionImpl = useCallback((isCompleted: boolean, reasonOverride: string | null = null) => {
    const ctx = endSessionContextRef.current;
    clearSave(); // Wipe mid-run save on any session end (victory, KO, quit)
    if (!isCompleted) {
      ctx.settleRunAsFailed(ctx.sr.current?.defeated || 0);
    }
    runEndSessionController({
      sr: ctx.sr,
      endSessionOnce: ctx.endSessionOnce,
      isCompleted,
      reasonOverride,
    });
  }, [endSessionContextRef]);
  const _endSession = useStableCallback(endSessionImpl);

  // --- Shared game-completion logic (achievements + session save) ---
  const finishGameContextRef = useBattleStateRef({
    settleRunAsCleared,
    sr,
    tryUnlock,
    setEncData,
    endSession: _endSession,
    setScreen,
  });
  const finishGameImpl = useCallback(() => {
    const ctx = finishGameContextRef.current;
    ctx.settleRunAsCleared();
    runFinishGameController({
      sr: ctx.sr,
      tryUnlock: ctx.tryUnlock,
      setEncData: ctx.setEncData,
      encTotal: ENC_TOTAL,
      endSession: ctx.endSession,
      setScreen: ctx.setScreen,
    });
  }, [finishGameContextRef]);
  const _finishGame = useStableCallback(finishGameImpl);

  // --- Start a battle against enemies[idx], optionally from a fresh roster ---
  const startBattleContextRef = useBattleStateRef({
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
    finishGame: _finishGame,
    frozenRef: frozenR,
    playBattleIntro,
    setCoopActiveSlot,
    pickIndex,
    getCampaignNodeMeta,
  });
  const startBattleImpl = useCallback((idx: number, roster?: EnemyVm[]) => {
    const ctx = startBattleContextRef.current;
    runBattleStart({
      idx,
      roster,
      invalidateAsyncWork: ctx.invalidateAsyncWork,
      clearTimer: ctx.clearTimer,
      startBattleSharedArgsInput: {
        sr: ctx.sr,
        enemies: ctx.enemies,
        locale: ctx.locale,
        fallbackBattleMode: ctx.battleMode,
        starter: ctx.starter,
        t: ctx.t,
        sceneNames: SCENE_NAMES,
        localizeEnemy,
        localizeSceneName,
        dispatchBattle: ctx.dispatchBattle,
        updateEnc: ctx.updateEnc,
        setPhase: ctx.setPhase,
        setBText: ctx.setBText,
        setScreen: ctx.setScreen,
        finishGame: ctx.finishGame,
        resetFrozen: () => { ctx.frozenRef.current = false; },
        playBattleIntro: ctx.playBattleIntro,
        setCoopActiveSlot: ctx.setCoopActiveSlot,
        pickIndex: ctx.pickIndex,
        getCampaignNodeMeta: ctx.getCampaignNodeMeta,
      },
    });
  }, [startBattleContextRef]);
  const startBattle = useStableCallback(startBattleImpl);

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

  const startGameContextRef = useBattleStateRef({
    setCollectionPopup,
    setWrongQuestions,
    clearRecentQuestionDisplays,
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
    getStarterMaxHp,
    t,
    setEnemies,
    setTimedMode,
    setCoopActiveSlot,
    dispatchBattle,
    appendSessionEvent,
    initSession,
    setScreenFromString,
    playBattleIntro,
    pvpStoreRef,
    uiRef,
    resetRunRuntimeState,
    startBattle,
    sr,
    battleMode,
    pvpStarter2,
    locale,
    pickIndex,
    getPlayerMaxHp,
    activateQueuedChallenge,
  });
  const startGameImpl = useCallback((
    starterOverride?: StarterVm | null,
    modeOverride: BattleMode | null = null,
    allyOverride: StarterVm | null = null,
  ) => {
    const ctx = startGameContextRef.current;
    const pvp = ctx.pvpStoreRef.current;
    const ui = ctx.uiRef.current;
    ctx.setCollectionPopup(null);
    ctx.setWrongQuestions([]);
    ctx.clearRecentQuestionDisplays();
    runStartGameWithContext({
      setDailyChallengeFeedback: ctx.setDailyChallengeFeedback,
      setTowerChallengeFeedback: ctx.setTowerChallengeFeedback,
      queuedChallenge: ctx.queuedChallenge,
      activeChallenge: ctx.activeChallenge,
      buildNewRoster: ctx.buildNewRoster,
      startGameOrchestratorArgs: {
        invalidateAsyncWork: ctx.invalidateAsyncWork,
        beginRun: ctx.beginRun,
        clearTimer: ctx.clearTimer,
        resetCoopRotatePending: ctx.resetCoopRotatePending,
        pvpStartDepsArgs: {
          runtime: {
            chance: ctx.chance,
            getStarterMaxHp: ctx.getStarterMaxHp,
            t: ctx.t,
            setEnemies: ctx.setEnemies,
            setTimedMode: ctx.setTimedMode,
            setCoopActiveSlot: ctx.setCoopActiveSlot,
            dispatchBattle: ctx.dispatchBattle,
            appendSessionEvent: ctx.appendSessionEvent,
            initSession: ctx.initSession,
            createPvpEnemyFromStarter,
            setScreen: ctx.setScreenFromString,
            playBattleIntro: ctx.playBattleIntro,
          },
          pvp,
          ui,
          resetRunRuntimeState: ctx.resetRunRuntimeState,
        },
        standardStartDepsArgs: {
          runtime: {
            getStarterMaxHp: ctx.getStarterMaxHp,
            setEnemies: ctx.setEnemies,
            setCoopActiveSlot: ctx.setCoopActiveSlot,
            dispatchBattle: ctx.dispatchBattle,
            appendSessionEvent: ctx.appendSessionEvent,
            initSession: ctx.initSession,
            setScreen: ctx.setScreenFromString,
            startBattle: ctx.startBattle,
          },
          pvp,
          resetRunRuntimeState: ctx.resetRunRuntimeState,
        },
        startGameControllerArgs: {
          sr: ctx.sr,
          battleMode: ctx.battleMode,
          pvpStarter2: ctx.pvpStarter2,
          locale: ctx.locale,
          localizeStarter,
          pickPartnerStarter: (mainStarter) => pickPartnerStarter(mainStarter, ctx.pickIndex, ctx.locale),
          getStarterStageIdx,
          getStageMaxHp: ctx.getPlayerMaxHp,
        },
      },
      activateQueuedChallenge: ctx.activateQueuedChallenge,
    }, starterOverride, modeOverride, allyOverride);
  }, [startGameContextRef]);
  const startGame = useStableCallback(startGameImpl);

  const quitGameContextRef = useBattleStateRef({
    clearTimer,
    appendQuitEventIfOpen,
    sr,
    endSession: _endSession,
    setScreenFromString,
  });
  const quitGameImpl = useCallback(() => {
    const ctx = quitGameContextRef.current;
    runQuitGameWithContext({
      clearTimer: ctx.clearTimer,
      appendQuitEventIfOpen: ctx.appendQuitEventIfOpen,
      sr: ctx.sr,
      endSession: ctx.endSession,
      setScreen: ctx.setScreenFromString,
    });
  }, [quitGameContextRef]);
  const quitGame = useStableCallback(quitGameImpl);

  const handlePlayerPartyKoContextRef = useBattleStateRef({
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
    setScreenFromString,
    t,
  });
  const handlePlayerPartyKoImpl = useCallback(({
    target = 'main',
    reason,
  }: { target?: 'main' | 'sub'; reason?: string } = {}) => {
    const ctx = handlePlayerPartyKoContextRef.current;
    const resolvedReason = reason ?? ctx.t('battle.ally.ko', 'Your partner has fallen...');
    return runPlayerPartyKoWithContext({
      sr: ctx.sr,
      setStarter: ctx.setStarter,
      setPStg: ctx.setPStg,
      setPHp: ctx.setPHp,
      setAllySub: ctx.setAllySub,
      setPHpSub: ctx.setPHpSub,
      setCoopActiveSlot: ctx.setCoopActiveSlot,
      setPhase: ctx.setPhase,
      setBText: ctx.setBText,
      safeTo: ctx.safeTo,
      endSession: ctx.endSession,
      setScreen: ctx.setScreenFromString,
      t: ctx.t,
    }, { target, reason: resolvedReason });
  }, [handlePlayerPartyKoContextRef]);
  const handlePlayerPartyKo = useStableCallback(handlePlayerPartyKoImpl);

  // --- Handle a defeated enemy ---
  const handleVictoryContextRef = useBattleStateRef({
    sr,
    randInt,
    getPlayerMaxHp,
    tryUnlock,
    updateEncDefeated,
    battleFieldSettersRef,
    uiRef,
    frozenRef: frozenR,
    pendingEvolveRef: pendingEvolve,
    t,
  });
  const handleVictoryImpl = useCallback((verb?: string) => {
    const ctx = handleVictoryContextRef.current;
    const resolvedVerb = verb ?? ctx.t("battle.victory.verb.defeated", "was defeated");
    runBattleVictory({
      victoryInput: {
        verb: resolvedVerb,
        sr: ctx.sr,
        runtime: {
          randInt: ctx.randInt,
          resolveLevelProgress,
          getStageMaxHp: ctx.getPlayerMaxHp,
          tryUnlock: ctx.tryUnlock,
          applyVictoryAchievements,
          updateEncDefeated: ctx.updateEncDefeated,
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
              ? ctx.t(firstTitle.nameKey, firstTitle.nameFallback)
              : '';
            const desc = firstTitle
              ? ctx.t('collection.popup.desc.title', 'Unlocked title: {title}', { title: localizedTitle })
              : unlockedCount > 1
                ? ctx.t('collection.popup.desc.multi', 'Unlocked {count} new collection rewards.', { count: unlockedCount })
                : ctx.t('collection.popup.desc.single', 'Unlocked 1 new collection reward.');
            setCollectionPopup({
              id: Date.now(),
              icon: firstMilestone?.emoji || (firstTitle ? '🏅' : '🎁'),
              title: ctx.t('collection.popup.title', 'Collection Milestone!'),
              desc,
            });
          },
          sfx,
          t: ctx.t,
        },
        battleFields: ctx.battleFieldSettersRef.current,
        ui: ctx.uiRef.current,
        frozenRef: ctx.frozenRef,
        pendingEvolveRef: ctx.pendingEvolveRef,
      },
    });
  }, [handleVictoryContextRef]);
  const handleVictory = useStableCallback(handleVictoryImpl);

  const runAllySupportTurnContextRef = useBattleStateRef({
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
    handleVictory,
    t,
  });
  const runAllySupportTurnImpl = useCallback(({ delayMs = 850, onDone }: { delayMs?: number; onDone?: () => void } = {}) => {
    const ctx = runAllySupportTurnContextRef.current;
    return runAllySupportTurnWithContext({
      sr: ctx.sr,
      safeTo: ctx.safeTo,
      chance: ctx.chance,
      rand: ctx.rand,
      setBText: ctx.setBText,
      setPhase: ctx.setPhase,
      setEAnim: ctx.setEAnim,
      setEHp: ctx.setEHp,
      addD: ctx.addD,
      addP: ctx.addP,
      sfx,
      handleVictory: ctx.handleVictory,
      t: ctx.t,
    }, { delayMs, onDone });
  }, [runAllySupportTurnContextRef]);
  const runAllySupportTurn = useStableCallback(runAllySupportTurnImpl);

  // --- Frozen enemy skips turn ---
  const handleFreezeContextRef = useBattleStateRef({
    sr,
    frozenRef: frozenR,
    setFrozen,
    setBText,
    setPhase,
    safeTo,
    t,
  });
  const handleFreezeImpl = useCallback(() => {
    const ctx = handleFreezeContextRef.current;
    runHandleFreezeWithContext({
      sr: ctx.sr,
      frozenRef: ctx.frozenRef,
      setFrozen: ctx.setFrozen,
      setBText: ctx.setBText,
      setPhase: ctx.setPhase,
      safeTo: ctx.safeTo,
      t: ctx.t,
    });
  }, [handleFreezeContextRef]);
  const handleFreeze = useStableCallback(handleFreezeImpl);

  // --- Player selects a move ---
  const selectMoveContextRef = useBattleStateRef({
    sr,
    timedMode,
    questionTimerSec,
    questionAllowedOps,
    t,
    getActingStarter,
    getMoveDiffLevel: _getMoveDiffLevel,
    genBattleQuestion,
    startTimer,
    markQStart,
    sfx,
    uiRef,
    battleFieldSettersRef,
  });
  const selectMoveImpl = useCallback((i: number) => {
    const ctx = selectMoveContextRef.current;
    runSelectMoveWithContext({
      sr: ctx.sr,
      runtime: {
        timedMode: ctx.timedMode,
        questionTimeLimitSec: ctx.questionTimerSec,
        questionAllowedOps: ctx.questionAllowedOps,
        diffMods: DIFF_MODS,
        t: ctx.t,
        getActingStarter: ctx.getActingStarter,
        getMoveDiffLevel: ctx.getMoveDiffLevel,
        genQuestion: ctx.genBattleQuestion,
        startTimer: ctx.startTimer,
        markQStart: ctx.markQStart,
        sfx: ctx.sfx,
      },
      ui: ctx.uiRef.current,
      battleFields: ctx.battleFieldSettersRef.current,
    }, i);
  }, [selectMoveContextRef]);
  const selectMove = useStableCallback(selectMoveImpl);

  // --- Enemy turn logic (reads from stateRef) ---
  const doEnemyTurnContextRef = useBattleStateRef({
    sr,
    safeTo,
    rand,
    randInt,
    chance,
    setScreenFromString,
    t,
    battleFieldSettersRef,
    uiRef,
    _endSession,
    handleVictory,
    handlePlayerPartyKo,
  });
  const doEnemyTurnImpl = useCallback(() => {
    const ctx = doEnemyTurnContextRef.current;
    runBattleEnemyTurn({
      enemyTurnInput: {
        sr: ctx.sr,
        runtime: {
          safeTo: ctx.safeTo,
          rand: ctx.rand,
          randInt: ctx.randInt,
          chance: ctx.chance,
          sfx,
          setScreen: ctx.setScreenFromString,
          t: ctx.t,
        },
        battleFields: ctx.battleFieldSettersRef.current,
        ui: ctx.uiRef.current,
        callbacks: {
          _endSession: ctx._endSession,
          handleVictory: ctx.handleVictory,
          handlePlayerPartyKo: ctx.handlePlayerPartyKo,
        },
      },
    });
  }, [doEnemyTurnContextRef]);
  const doEnemyTurn = useStableCallback(doEnemyTurnImpl);
  useEffect(() => { doEnemyTurnRef.current = doEnemyTurn; }, [doEnemyTurn, doEnemyTurnRef]);

  // --- Player answers a question ---
  const onAnsContextRef = useBattleStateRef({
    answered,
    setAnswered,
    clearTimer,
    sr,
    rand,
    chance,
    safeTo,
    getOtherPvpTurn,
    setScreenFromString,
    t,
    uiRef,
    pvpStoreRef,
    battleFieldSettersRef,
    getCollectionDamageScale,
    challengeDamageMult,
    challengeComboMult,
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
    updateAbility: _updateAbility,
    markCoopRotatePending,
  });
  const onAnsImpl = useCallback((choice: number) => {
    const ctx = onAnsContextRef.current;
    runAnswerWithContext({
      answered: ctx.answered,
      setAnswered: ctx.setAnswered,
      clearTimer: ctx.clearTimer,
      pvpAnswerDepsInput: {
        runtime: {
          sr: ctx.sr,
          rand: ctx.rand,
          chance: ctx.chance,
          safeTo: ctx.safeTo,
          sfx,
          getOtherPvpTurn: ctx.getOtherPvpTurn,
          setScreen: ctx.setScreenFromString,
          t: ctx.t,
        },
        ui: ctx.uiRef.current,
        pvp: ctx.pvpStoreRef.current,
        battleFields: ctx.battleFieldSettersRef.current,
      },
      playerDepsArgs: {
        runtime: {
          sr: ctx.sr,
          safeTo: ctx.safeTo,
          chance: ctx.chance,
          sfx,
          getCollectionDamageScale: ctx.getCollectionDamageScale,
          challengeDamageMult: ctx.challengeDamageMult,
          challengeComboMult: ctx.challengeComboMult,
          t: ctx.t,
        },
        ui: ctx.uiRef.current,
        battleFields: ctx.battleFieldSettersRef.current,
        callbacks: {
          tryUnlock: ctx.tryUnlock,
          frozenR: ctx.frozenR,
          doEnemyTurn: ctx.doEnemyTurn,
          handleVictory: ctx.handleVictory,
          handleFreeze: ctx.handleFreeze,
          _endSession: ctx._endSession,
          setScreen: ctx.setScreenFromString,
          handlePlayerPartyKo: ctx.handlePlayerPartyKo,
          runAllySupportTurn: ctx.runAllySupportTurn,
          setPendingTextAdvanceAction: ctx.setPendingTextAdvanceAction,
        },
      },
      answerControllerArgsInput: {
        sr: ctx.sr,
        getActingStarter: ctx.getActingStarter,
        logAns: ctx.logAns,
        appendSessionEvent: ctx.appendSessionEvent,
        updateAbility: ctx.updateAbility,
        markCoopRotatePending: ctx.markCoopRotatePending,
      },
    }, choice);
  }, [onAnsContextRef]);
  const onAns = useStableCallback(onAnsImpl);

  const { startBattleWithSave, resumeFromSave } = useBattleSaveFlow({
    battleMode,
    hasChallengeRun,
    starter,
    timedMode,
    battle,
    coopActiveSlot,
    enemies,
    sr,
    setBattleMode,
    setTimedMode,
    setEnemies,
    setStarter,
    setCoopActiveSlot,
    dispatchBattle,
    invalidateAsyncWork,
    beginRun,
    clearTimer,
    resetRunRuntimeState,
    initSession,
    setScreen,
    startBattle,
  });

  // --- Advance from text / victory phase ---
  const continueFromVictoryContextRef = useBattleStateRef({
    sr,
    enemiesLength: enemies.length,
    setScreenFromString,
    dispatchBattle,
    locale,
    getPlayerMaxHp,
    getStarterMaxHp,
    t,
    battleFieldSettersRef,
    uiRef,
    _finishGame,
    startBattleWithSave,
  });
  const continueFromVictoryImpl = useCallback(() => {
    const ctx = continueFromVictoryContextRef.current;
    runContinueWithContext({
      continueFromVictoryInput: {
        sr: ctx.sr,
        enemiesLength: ctx.enemiesLength,
        runtime: {
          setScreen: ctx.setScreenFromString,
          dispatchBattle: ctx.dispatchBattle,
          localizeEnemy,
          locale: ctx.locale,
          getStageMaxHp: ctx.getPlayerMaxHp,
          getStarterMaxHp: ctx.getStarterMaxHp,
          t: ctx.t,
        },
        battleFields: ctx.battleFieldSettersRef.current,
        ui: ctx.uiRef.current,
        callbacks: {
          finishGame: ctx._finishGame,
          startBattle: ctx.startBattleWithSave,
        },
      },
    });
  }, [continueFromVictoryContextRef]);
  const continueFromVictory = useStableCallback(continueFromVictoryImpl);

  const advanceContextRef = useBattleStateRef({
    phase,
    sr,
    setPhase,
    setBText,
    continueFromVictory,
    consumePendingTextAdvanceAction,
    safeTo,
    getOtherPvpTurn,
    getPvpTurnName,
    setScreenFromString,
    t,
    uiRef,
    pvpStoreRef,
    battleFieldSettersRef,
    pendingEvolve,
    setScreen,
    tryUnlock,
    getPlayerMaxHp,
    getStarterMaxHp,
  });
  const advanceImpl = useCallback(() => {
    const ctx = advanceContextRef.current;
    runAdvanceWithContext({
      phase: ctx.phase,
      sr: ctx.sr,
      setPhase: ctx.setPhase,
      setBText: ctx.setBText,
      continueFromVictory: ctx.continueFromVictory,
      consumePendingTextAdvanceAction: ctx.consumePendingTextAdvanceAction,
      advancePvpDepsInput: {
        runtime: {
          sr: ctx.sr,
          safeTo: ctx.safeTo,
          getOtherPvpTurn: ctx.getOtherPvpTurn,
          getPvpTurnName: ctx.getPvpTurnName,
          setScreen: ctx.setScreenFromString,
          t: ctx.t,
        },
        ui: ctx.uiRef.current,
        pvp: ctx.pvpStoreRef.current,
        battleFields: ctx.battleFieldSettersRef.current,
      },
        pendingEvolutionInput: {
          pendingEvolveRef: ctx.pendingEvolve,
          battleFields: ctx.battleFieldSettersRef.current,
          setScreen: ctx.setScreen,
          tryUnlock: ctx.tryUnlock,
          getStageMaxHp: ctx.getPlayerMaxHp,
          getStarterMaxHp: ctx.getStarterMaxHp,
          maxMoveLvl: MAX_MOVE_LVL,
        },
    });
  }, [advanceContextRef]);
  const advance = useStableCallback(advanceImpl);

  // --- Continue from evolve screen → start next battle ---
  const continueAfterEvolve = useStableCallback(() => {
    continueFromVictory();
  });

  const toggleCoopActiveContextRef = useBattleStateRef({
    sr,
    setCoopActiveSlot,
  });
  const toggleCoopActiveImpl = useCallback(() => {
    const ctx = toggleCoopActiveContextRef.current;
    runToggleCoopActiveWithContext({
      sr: ctx.sr,
      canSwitchCoopActiveSlot,
      setCoopActiveSlot: ctx.setCoopActiveSlot,
    });
  }, [toggleCoopActiveContextRef]);
  const toggleCoopActive = useStableCallback(toggleCoopActiveImpl);

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
    pvpStarter2, pvpHp2,
    pvpState: pvpStructuredState,
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
    wrongQuestions,
  });

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
    resumeFromSave,
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
