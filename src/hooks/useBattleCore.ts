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
import { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react';
import { useI18n } from '../i18n';
import type {
  SpringResult,
  BattleMode,
  BossTactic,
  CollectionPopupVm,
  EnemyVm,
  MoveVm,
  WrongQuestionReviewVm,
  ScreenName,
  StarterVm,
} from '../types/battle';

import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import { isSoloLearningMode, getLearningHintSteps, getLearningHintCost } from '../utils/learningProgress.ts';
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
} from '../utils/contentLocalization.ts';

import {
  movePower,
  bestEffectiveness,
} from '../utils/damageCalc';
import {
  getLevelMaxHp,
  getStarterMaxHp,
} from '../utils/playerHp';
import { useTimer } from './useTimer';
import { useAchievements } from './useAchievements';
import { useEncyclopedia } from './useEncyclopedia';
import { useSessionLog } from './useSessionLog';
import { getCollectionPerks, loadCollection, type CollectionPerks } from '../utils/collectionStore.ts';
import { getChallengePerks, type ChallengeClaim, type ChallengePerks } from '../utils/challengeRewards.ts';
import { loadPlayerProfile, savePlayerProfile, type PlayerProfile } from '../utils/playerProfile.ts';
import { appendEvent } from '../utils/eventLogger.ts';
import { routeMatchup } from '../utils/expeditionPlanner.ts';
import {
  applyItemGrants,
  loadInventory,
  saveInventory,
} from '../utils/inventoryStore.ts';
import { getSecret, type SecretId } from '../data/worldSecrets.ts';
import { useBattleRng } from './useBattleRng';
import { useBattleUIState } from './useBattleUIState';
import { useDailyChallengeRun } from './useDailyChallengeRun';
import { usePvpState } from './usePvpState';
import { useBattleSessionLifecycle } from './useBattleSessionLifecycle';
import { ENC_TOTAL } from '../data/encyclopedia.ts';
import sfx from '../utils/sfx.ts';
import { useBattleRosterState } from './battle/useBattleRosterState.ts';
import { useChallengeBattleModifiers } from './battle/useChallengeBattleModifiers.ts';
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
  canSwitchCoopActiveSlot,
  isCoopBattleMode,
} from './battle/coopFlow';
import { isBattleActiveState } from './battle/menuResetGuard.ts';
import {
  applyVictoryAchievements,
} from './battle/achievementFlow';
import { DIFF_MODS } from './battle/partnerStarter.ts';
import { useVictoryRewardCallbacks } from './battle/useVictoryRewardCallbacks.ts';
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
  runContinueWithContext,
  runSelectMoveWithContext,
} from './battle/actionFlowDelegates.ts';
import { useOnAnsWiring } from './battle/useOnAnsWiring.ts';
import { useStartGameWiring } from './battle/useStartGameWiring.ts';
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
import { EXPEDITION_FLOORS, REGION_IDS, START_REGION, getExpedition, type ExpeditionId, type RegionId } from '../data/worldMap.ts';
import {
  arriveAtMap,
  chooseExpeditionRoute,
  chosenOption,
  expeditionRoster,
  isExpeditionEnemy,
  isSpringOption,
  unlockExpeditionSideRoutes,
} from '../utils/expeditionRun.ts';
import { springRewards } from '../utils/reviewSpring.ts';
import {
  isExpeditionUnlocked,
  loadWorldProgress,
  recordExpeditionClear,
  recordExpeditionFloor,
  recordRegionVisit,
  recordRegionWin,
  recordSideRouteClear,
  recordSecretFound,
  isSecretFound,
  saveWorldProgress,
  type WorldProgress,
} from '../utils/worldProgress.ts';
import { useBattleAbilityModel } from './battle/useBattleAbilityModel.ts';
import { useBattleItemActions } from './battle/useBattleItemActions.ts';
import {
  useBattleOrchestrationState,
  useBattlePauseState,
} from './battle/useBattleOrchestrationState.ts';
import { useBattleFlowState } from './battle/useBattleFlowState.ts';
import { useBattleSaveFlow } from './battle/useBattleSaveFlow.ts';
import { useGenBattleQuestion } from './battle/useGenBattleQuestion.ts';

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
  // Daily challenge / streak tower badges and titles: permanent damage and post-win healing.
  const [challengePerks, setChallengePerks] = useState<ChallengePerks>(() => getChallengePerks());
  const onRewardsClaimed = useCallback((claim: ChallengeClaim) => {
    setChallengePerks(claim.perks);
    setInventory(claim.inventory);
  }, []);
  const [worldProgress, setWorldProgress] = useState<WorldProgress>(() => loadWorldProgress());
  // The child's grade keeps every PvE question inside their curriculum.
  const [playerProfile, setPlayerProfileState] = useState<PlayerProfile | null>(() => loadPlayerProfile());
  const playerProfileRef = useBattleStateRef(playerProfile);
  const setPlayerProfile = useStableCallback((profile: PlayerProfile) => {
    appendEvent('placement_done', { grade: profile.grade, selfGrade: profile.selfGrade, method: profile.method, quiz: profile.quiz });
    savePlayerProfile(profile);
    playerProfileRef.current = profile;
    setPlayerProfileState(profile);
  });
  const worldProgressRef = useBattleStateRef(worldProgress);
  const updateWorldProgress = useCallback((change: (prev: WorldProgress) => WorldProgress) => {
    const prev = worldProgressRef.current;
    const next = change(prev);
    if (next === prev) return;
    worldProgressRef.current = next;
    saveWorldProgress(next);
    setWorldProgress(next);
  }, [worldProgressRef]);

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
  } = useDailyChallengeRun({ onRewardsClaimed });
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
    expeditionRun,
    expeditionRunRef,
    setExpeditionRun,
    queueExpedition,
  } = useBattleRosterState({
    pickIndex,
    locale,
    hasChallengeRun,
    discoveredSecrets: worldProgress.secrets,
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
    burnStack, tideStack, enemyExposed, enemyBehavior, enemySkillState, frozen, shattered, staticStack, specDef, defAnim, cursed,
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
    hintsRevealed,
    dmgs, setDmgs,
    parts, setParts,
    eAnim, setEAnim,
    pAnim, setPAnim,
    eSubAnim, pSubAnim,
    atkEffect, setAtkEffect,
    enemyFinisherType,
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
    prepareLearningQuestion,
  } = useBattleAbilityModel({
    baselineLevel: 2,
    onLevelChange: setDiffLevel,
    persistent: isSoloLearningMode(battleMode, timedMode, hasChallengeRun),
    onRecovered: () => {
      setEffMsg({ text: t('battle.learning.recovered', 'Solved independently!'), color: '#22c55e' });
      safeTo(() => setEffMsg(null), 1500);
    },
    onStorageError: () => {
      setEffMsg({ text: t('battle.learning.storageError', 'Learning progress could not be saved on this device.'), color: '#f59e0b' });
      safeTo(() => setEffMsg(null), 2500);
    },
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
    streak, passiveCount, charge, burnStack, tideStack, enemyExposed, enemyBehavior, enemySkillState, frozen, shattered, staticStack, specDef, cursed,
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

  const getPlayerMaxHp = useStableCallback((stageIdx: number = 0, levelOverride?: number): number => {
    const resolvedLevel = Number.isFinite(levelOverride)
      ? Number(levelOverride)
      : Number(sr.current?.pLvl || 1);
    return getLevelMaxHp(resolvedLevel, stageIdx);
  });

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
    return 1 + allBonus + typeBonus + challengePerks.damageBonus;
  }, [collectionPerks, challengePerks]);

  const {
    challengeDamageMult,
    challengeComboMult,
    questionTimerSec,
    questionAllowedOps,
  } = useChallengeBattleModifiers({ dailyPlan, towerPlan, round, battleMode });


  const getQuestionGrade = useStableCallback(
    () => (sr.current.battleMode === 'pvp' ? null : playerProfileRef.current?.grade ?? null),
  );
  const genBattleQuestion = useGenBattleQuestion({
    rand, recentQuestionDisplaysRef, prepareLearningQuestion, getGrade: getQuestionGrade,
  });

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
    setPendingTextAdvanceAction,
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
        setPendingTextAdvanceAction: ctx.setPendingTextAdvanceAction,
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
  const isGamePaused = useStableCallback(() => gamePaused);
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
  const battleIntroPending = useRef(false);
  const playBattleIntroImpl = useCallback(() => { battleIntroPending.current = true; }, []);
  const playBattleIntro = useStableCallback(playBattleIntroImpl);
  const presentBattle = useStableCallback(() => {
    if (!battleIntroPending.current) return;
    battleIntroPending.current = false;
    // Start the slide-in clock only after the prepared battlefield has mounted.
    const ctx = playBattleIntroContextRef.current;
    effectOrchestrator.playBattleIntro({
      safeTo: ctx.safeTo,
      setEAnim: ctx.setEAnim,
      setPAnim: ctx.setPAnim,
    });
  });

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
    expeditionRunRef,
    updateWorldProgress,
    sr,
    tryUnlock,
    setEncData,
    endSession: _endSession,
    setScreen,
  });
  const finishGameImpl = useCallback(() => {
    const ctx = finishGameContextRef.current;
    ctx.settleRunAsCleared();
    const run = ctx.expeditionRunRef.current;
    if (run && ctx.sr.current.battleMode === 'single' && run.path.length >= EXPEDITION_FLOORS) {
      // Beating the boss clears the expedition and unlocks the next one.
      ctx.updateWorldProgress((prev) => recordExpeditionClear(prev, run.expeditionId));
    }
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

  const startGame = useStartGameWiring({
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
  const { onDropResolved, onCollectionUpdated } = useVictoryRewardCallbacks({
    setInventory, setCollectionPerks, setCollectionPopup, t,
  });

  const handleVictoryContextRef = useBattleStateRef({
    expeditionRunRef,
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
    onDropResolved,
    onCollectionUpdated,
    updateWorldProgress,
  });
  const handleVictoryImpl = useCallback((verb?: string) => {
    const ctx = handleVictoryContextRef.current;
    const resolvedVerb = verb ?? ctx.t("battle.victory.verb.defeated", "was defeated");
    const defeatedEnemy = ctx.sr.current.enemy;
    const region = defeatedEnemy?.campaignRegion as RegionId | undefined;
    if (ctx.sr.current.battleMode === 'single' && isExpeditionEnemy(defeatedEnemy) && region && REGION_IDS.includes(region)) {
      const run = ctx.expeditionRunRef.current;
      const branch = run ? chosenOption(run, ctx.sr.current.round)?.sideRouteId : undefined;
      ctx.updateWorldProgress((prev) => {
        const next = recordRegionWin(prev, region);
        return branch ? recordSideRouteClear(next, branch) : next;
      });
    }
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
          onDropResolved: ctx.onDropResolved,
          onCollectionUpdated: ctx.onCollectionUpdated,
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
    setPAnim,
    setAtkEffect,
    setEHp,
    addD,
    addP,
    handleVictory,
    t,
  });
  const runAllySupportTurnImpl = useCallback(({ delayMs = 850, onDone, linkActive }: { delayMs?: number; onDone?: () => void; linkActive?: boolean } = {}) => {
    const ctx = runAllySupportTurnContextRef.current;
    return runAllySupportTurnWithContext({
      sr: ctx.sr,
      safeTo: ctx.safeTo,
      chance: ctx.chance,
      rand: ctx.rand,
      setBText: ctx.setBText,
      setPhase: ctx.setPhase,
      setEAnim: ctx.setEAnim,
      setPAnim: ctx.setPAnim,
      setAtkEffect: ctx.setAtkEffect,
      setEHp: ctx.setEHp,
      addD: ctx.addD,
      addP: ctx.addP,
      sfx,
      handleVictory: ctx.handleVictory,
      t: ctx.t,
    }, { delayMs, onDone, linkActive });
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
  const selectMoveImpl = useCallback((i: number, bossTactic?: BossTactic) => {
    const ctx = selectMoveContextRef.current;
    const selectMoveInput = {
      bossTactic,
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
    };
    runSelectMoveWithContext(selectMoveInput, i);
  }, [selectMoveContextRef]);
  const selectMove = useStableCallback(selectMoveImpl);

  // --- Player requests a hint step ---
  const requestHintContextRef = useBattleStateRef({
    sr,
    uiRef,
    battleFieldSettersRef,
    t,
  });
  const requestHintImpl = useCallback(() => {
    const ctx = requestHintContextRef.current;
    const s = ctx.sr.current;
    if (s.phase !== 'question' || ctx.uiRef.current.answered || !s.q) return;
    const revealed = ctx.uiRef.current.hintsRevealed;
    const steps = getLearningHintSteps(s.q, ctx.t);
    if (revealed >= steps.length) return;
    const cost = getLearningHintCost(s.q, revealed, BALANCE_CONFIG.hint.costPerStep);
    if ((s.pExp || 0) < cost) return;
    const question = { ...s.q, hintsUsed: revealed + 1 };
    const nextXp = (s.pExp || 0) - cost;
    // Keep immediate hint/answer clicks consistent before React commits.
    ctx.sr.current = { ...s, q: question, pExp: nextXp };
    ctx.uiRef.current = { ...ctx.uiRef.current, hintsRevealed: revealed + 1 };
    ctx.uiRef.current.setQ(question);
    if (cost > 0) ctx.battleFieldSettersRef.current.setPExp(nextXp);
    ctx.uiRef.current.setHintsRevealed(revealed + 1);
  }, [requestHintContextRef]);
  const requestHint = useStableCallback(requestHintImpl);

  // --- Enemy turn logic (reads from stateRef) ---
  const doEnemyTurnContextRef = useBattleStateRef({
    sr,
    pendingTextAdvanceActionRef,
    isGamePaused,
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
    const enemyTurnInput = {
      sr: ctx.sr,
      runtime: {
        pendingTextAdvanceActionRef: ctx.pendingTextAdvanceActionRef,
        isGamePaused: ctx.isGamePaused,
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
    };
    runBattleEnemyTurn({
      enemyTurnInput,
    });
  }, [doEnemyTurnContextRef]);
  const doEnemyTurn = useStableCallback(doEnemyTurnImpl);
  useEffect(() => { doEnemyTurnRef.current = doEnemyTurn; }, [doEnemyTurn, doEnemyTurnRef]);

  // --- Player answers a question ---
  const onAns = useOnAnsWiring({
    answered, setAnswered, clearTimer, sr, rand, chance, safeTo,
    getOtherPvpTurn, setScreenFromString, t, uiRef, pvpStoreRef,
    battleFieldSettersRef, getCollectionDamageScale, challengeDamageMult,
    challengeComboMult, tryUnlock, frozenR, doEnemyTurn, handleVictory,
    handleFreeze, _endSession, handlePlayerPartyKo, runAllySupportTurn,
    setPendingTextAdvanceAction, getActingStarter, logAns, appendSessionEvent,
    updateAbility: _updateAbility, markCoopRotatePending, sfx,
  });

  const getExpeditionRun = useCallback(() => expeditionRunRef.current, [expeditionRunRef]);
  const { startBattleWithSave, saveMidRun, resumeFromSave } = useBattleSaveFlow({
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
    getExpeditionRun,
    setExpeditionRun,
  });

  // ═══════════════════════════════════════════════════════════════
  //  WORLD MAP EXPEDITIONS (normal + timed single play)
  // ═══════════════════════════════════════════════════════════════
  const worldMapEnabled = battleMode === 'single' && !hasChallengeRun;

  // After a win the expedition returns to the map instead of the next battle.
  const nextBattleContextRef = useBattleStateRef({
    sr,
    expeditionRunRef,
    setExpeditionRun,
    setScreen,
    startBattleWithSave,
  });
  const startNextBattleImpl = useCallback((nextRound: number) => {
    const ctx = nextBattleContextRef.current;
    const run = ctx.expeditionRunRef.current;
    if (run && ctx.sr.current.battleMode === 'single' && nextRound === run.path.length && nextRound < EXPEDITION_FLOORS) {
      ctx.setExpeditionRun(arriveAtMap(run));
      ctx.setScreen('worldmap');
      return;
    }
    ctx.startBattleWithSave(nextRound);
  }, [nextBattleContextRef]);
  const startNextBattle = useStableCallback(startNextBattleImpl);

  // Save on arrival at the map, once the post-victory heal has rendered.
  useEffect(() => {
    if (screen !== 'worldmap' || !expeditionRun?.atMap || battleMode !== 'single') return;
    saveMidRun(expeditionRun.path.length, expeditionRoster(expeditionRun));
  }, [screen, expeditionRun, battleMode, saveMidRun]);

  const openWorldMap = useStableCallback(() => {
    // Opening the map from selection / game over starts fresh; an in-progress run lives in the save.
    queueExpedition(null);
    setExpeditionRun(null);
    setScreen('worldmap');
  });

  const startExpeditionContextRef = useBattleStateRef({
    sr,
    appendSessionEvent,
    worldProgressRef,
    hasChallengeRun,
    queueExpedition,
    updateWorldProgress,
    startGame,
  });
  const startExpeditionImpl = useCallback((id: ExpeditionId) => {
    const ctx = startExpeditionContextRef.current;
    const expedition = getExpedition(id);
    if (!expedition || ctx.hasChallengeRun || !ctx.sr.current.starter) return;
    if (!isExpeditionUnlocked(ctx.worldProgressRef.current, expedition.id)) return;
    ctx.updateWorldProgress((prev) => recordExpeditionFloor(recordRegionVisit(prev, START_REGION), expedition.id, 1));
    ctx.queueExpedition(expedition.id);
    ctx.startGame(ctx.sr.current.starter, 'single');
    ctx.appendSessionEvent('expedition_started', { expeditionId: expedition.id });
  }, [startExpeditionContextRef]);
  const startExpedition = useStableCallback(startExpeditionImpl);

  const chooseRouteContextRef = useBattleStateRef({
    sr,
    appendSessionEvent,
    expeditionRunRef,
    setExpeditionRun,
    setEnemies,
    updateWorldProgress,
    startBattleWithSave,
    setScreen,
  });
  const chooseRouteImpl = useCallback((lane: number) => {
    const ctx = chooseRouteContextRef.current;
    const run = ctx.expeditionRunRef.current;
    if (!run || ctx.sr.current.screen !== 'worldmap' || ctx.sr.current.battleMode !== 'single') return;
    const next = chooseExpeditionRoute(run, lane);
    if (!next) return;
    const floor = next.path.length - 1;
    const option = chosenOption(next, floor);
    const roster = expeditionRoster(next);
    const starterType = ctx.sr.current.starter?.type;
    const describe = (laneIndex: number) => {
      const routeOption = next.plan.floors[floor].options[laneIndex];
      const enemy = next.lanes[laneIndex]?.[floor];
      return {
        lane: laneIndex, kind: routeOption.kind ?? 'battle', region: routeOption.region, tier: routeOption.tier,
        event: routeOption.event, enemyId: enemy?.id ?? null,
        matchup: isSpringOption(routeOption) ? null : routeMatchup(starterType, enemy).verdict,
      };
    };
    ctx.appendSessionEvent('route_chosen', {
      expeditionId: next.expeditionId,
      floor: floor + 1,
      hp: ctx.sr.current.pHp,
      chosen: describe(lane),
      offered: next.plan.floors[floor].options.map((_, laneIndex) => describe(laneIndex)),
    });
    ctx.setExpeditionRun(next);
    ctx.setEnemies(roster);
    if (option) {
      ctx.updateWorldProgress((prev) => recordExpeditionFloor(recordRegionVisit(prev, option.region), next.expeditionId, floor + 1));
    }
    if (isSpringOption(option)) {
      // Review spring: no battle on this floor; the spring screen returns to the map.
      ctx.setScreen('spring');
      return;
    }
    ctx.startBattleWithSave(floor, roster);
  }, [chooseRouteContextRef]);
  const chooseRoute = useStableCallback(chooseRouteImpl);

  // Leaving the review spring: heal and EXP for correct answers, then back to the map.
  const finishSpringContextRef = useBattleStateRef({
    sr,
    expeditionRunRef,
    setExpeditionRun,
    setScreen,
    getPlayerMaxHp,
    battleFieldSettersRef,
    appendSessionEvent,
  });
  const finishSpringImpl = useCallback((result: SpringResult) => {
    const ctx = finishSpringContextRef.current;
    const run = ctx.expeditionRunRef.current;
    if (!run || ctx.sr.current.screen !== 'spring') return;
    const s = ctx.sr.current;
    const correct = result.answers.filter((answer) => answer.correct).length;
    const maxHp = ctx.getPlayerMaxHp(s.pStg || 0);
    const reward = springRewards(correct, maxHp, s.pLvl || 1);
    const fields = ctx.battleFieldSettersRef.current;
    fields.setPHp((prev) => Math.min(maxHp, prev + reward.heal));
    // EXP stops just short of a level-up; the next victory settles levels and evolution.
    fields.setPExp((prev) => Math.min(Math.max(0, (s.pLvl || 1) * 30 - 1), prev + reward.exp));
    fields.setTC((prev) => prev + correct);
    fields.setTW((prev) => prev + (result.answers.length - correct));
    result.answers.forEach((answer) => ctx.appendSessionEvent('question_answered', {
      outcome: answer.correct ? 'correct' : 'wrong',
      correct: answer.correct,
      op: answer.op,
      display: answer.display,
      answerTimeMs: answer.answerTimeMs,
      source: 'review_spring',
      reason: answer.reason,
    }));
    ctx.appendSessionEvent('spring_finished', {
      expeditionId: run.expeditionId, correct, total: result.answers.length, heal: reward.heal, exp: reward.exp,
    });
    ctx.setExpeditionRun(arriveAtMap(run));
    ctx.setScreen('worldmap');
  }, [finishSpringContextRef]);
  const finishSpring = useStableCallback(finishSpringImpl);

  // A hidden spot opened on the map: remember it and pay its one-time reward.
  const discoverSecret = useStableCallback((id: SecretId) => {
    const secret = getSecret(id);
    if (!secret || isSecretFound(worldProgressRef.current, secret.id)) return;
    updateWorldProgress((prev) => recordSecretFound(prev, secret.id));
    const run = expeditionRunRef.current;
    if (run) {
      const next = unlockExpeditionSideRoutes(run, worldProgressRef.current.secrets, [sr.current.starter?.id ?? ''], pickIndex);
      if (next !== run) setExpeditionRun({ ...next, lanes: next.lanes.map((lane) => localizeEnemyRoster(lane, locale)) });
    }
    const result = applyItemGrants(loadInventory(), secret.reward, `secret:${secret.id}`);
    if (result.changed) saveInventory(result.inventory);
    setInventory(result.inventory);
    appendEvent('secret_found', { id: secret.id, reward: secret.reward });
  });

  // Leave the map mid-expedition: keep the save (resume from the title) but close the learning session.
  const pauseExpeditionContextRef = useBattleStateRef({
    sr,
    endSessionOnce,
    setScreen,
  });
  const pauseExpeditionImpl = useCallback(() => {
    const ctx = pauseExpeditionContextRef.current;
    runEndSessionController({
      sr: ctx.sr,
      endSessionOnce: ctx.endSessionOnce,
      isCompleted: false,
      reasonOverride: 'map_pause',
    });
    ctx.setScreen('title');
  }, [pauseExpeditionContextRef]);
  const pauseExpedition = useStableCallback(pauseExpeditionImpl);

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
    startNextBattle,
    victoryHealBonus: challengePerks.victoryHeal,
  });
  const continueFromVictoryImpl = useCallback(() => {
    const ctx = continueFromVictoryContextRef.current;
    const continueFromVictoryInput = {
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
        victoryHealBonus: ctx.victoryHealBonus,
      },
      battleFields: ctx.battleFieldSettersRef.current,
      ui: ctx.uiRef.current,
      callbacks: {
        finishGame: ctx._finishGame,
        startBattle: ctx.startNextBattle,
      },
    };
    runContinueWithContext({ continueFromVictoryInput });
  }, [continueFromVictoryContextRef]);
  const continueFromVictory = useStableCallback(continueFromVictoryImpl);

  const advanceContextRef = useBattleStateRef({
    phase,
    isGamePaused,
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
    const advanceInput = {
      phase: ctx.phase,
      isGamePaused: ctx.isGamePaused,
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
    };
    runAdvanceWithContext(advanceInput);
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

  // Using an item spends the turn: after the player reads the result, the enemy acts.
  const endTurnAfterItemContextRef = useBattleStateRef({
    sr,
    frozenR,
    setPhase,
    setPendingTextAdvanceAction,
    markCoopRotatePending,
    handleFreeze,
    doEnemyTurn,
  });
  const endTurnAfterItemImpl = useCallback(() => {
    const ctx = endTurnAfterItemContextRef.current;
    if (isCoopBattleMode(ctx.sr.current.battleMode)) ctx.markCoopRotatePending();
    ctx.setPhase('text');
    ctx.setPendingTextAdvanceAction(() => {
      if (!isBattleActiveState(ctx.sr.current)) return;
      if (ctx.frozenR.current) ctx.handleFreeze();
      else ctx.doEnemyTurn();
    });
  }, [endTurnAfterItemContextRef]);
  const endTurnAfterItem = useStableCallback(endTurnAfterItemImpl);
  const logItemUsed = useStableCallback((itemId: string) => {
    const s = sr.current;
    appendSessionEvent('item_used', { itemId, round: s.round ?? 0, pHp: s.pHp, enemyId: s.enemy?.id ?? null, bossCharging: Boolean(s.bossCharging) });
  });

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
    endTurn: endTurnAfterItem,
    onItemUsed: logItemUsed,
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
    dmgs, parts, eAnim, pAnim, eSubAnim, pSubAnim, atkEffect, effMsg,
    burnStack, tideStack, enemyExposed, enemyBehavior, enemySkillState, frozen, shattered, staticStack, specDef, defAnim, cursed,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns, shadowShieldCD, furyRegenUsed, diffLevel,
    gamePaused,
    questionTimerSec,
    dailyChallengeFeedback,
    towerChallengeFeedback,
    expNext, chargeReady,
    inventory,
    achUnlocked, achPopup, collectionPopup, encData,
    wrongQuestions,
    hintsRevealed,
    worldMapEnabled,
    worldProgress,
    expeditionRun,
    enemyFinisherType,
    playerGrade: playerProfile?.grade ?? null,
  });

  const actions = buildUseBattleActions({
    presentBattle,
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
    requestHint,
    advance,
    continueAfterEvolve,
    quitGame,
    togglePause,
    toggleCoopActive,
    rmD,
    rmP,
    resumeFromSave,
    openWorldMap,
    startExpedition,
    chooseRoute,
    pauseExpedition,
    setPlayerProfile,
    finishSpring,
    discoverSecret,
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
