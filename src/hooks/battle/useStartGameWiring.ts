import { useCallback } from 'react';
import { useBattleStateRef, useStableCallback } from '../useBattleRuntime.ts';
import { runStartGameWithContext } from './actionFlowDelegates.ts';
import { createPvpEnemyFromStarter } from './pvpFlow.ts';
import { pickPartnerStarter } from './partnerStarter.ts';
import { localizeStarter } from '../../utils/contentLocalization.ts';
import { getStarterStageIdx } from '../../utils/playerHp.ts';
import type { runBattleStartGame } from './startFlowAdapter.ts';
import type { runStartGameOrchestrator } from './startGameOrchestrator.ts';
import type { runStartGameController } from './startGameController.ts';
import type { StarterVm, BattleMode } from '../../types/battle';

/**
 * Types derived from the flow layer so this wiring hook stays in sync
 * without duplicating structural definitions.
 */
type RunBattleStartGameArgs = Parameters<typeof runBattleStartGame>[0];
type StartGameBaseArgs = Omit<RunBattleStartGameArgs, 'starterOverride' | 'modeOverride' | 'allyOverride'>;
type RunStartGameOrchestratorArgs = Parameters<typeof runStartGameOrchestrator>[0];
type RunStartGameControllerArgs = Parameters<typeof runStartGameController>[0];
type StandardStartDepsArgs = RunStartGameOrchestratorArgs['standardStartDepsArgs'];

type PvpStartRuntime = Parameters<typeof createPvpEnemyFromStarter> extends [infer _A, ...infer _B] ? never : never;

type UseStartGameWiringDeps = {
  setCollectionPopup: StartGameBaseArgs['setDailyChallengeFeedback'] extends (...args: infer _A) => infer _B ? (value: null) => void : never;
  setWrongQuestions: (value: never[]) => void;
  clearRecentQuestionDisplays: () => void;
  setDailyChallengeFeedback: StartGameBaseArgs['setDailyChallengeFeedback'];
  setTowerChallengeFeedback: StartGameBaseArgs['setTowerChallengeFeedback'];
  queuedChallenge: StartGameBaseArgs['queuedChallenge'];
  activeChallenge: StartGameBaseArgs['activeChallenge'];
  buildNewRoster: StartGameBaseArgs['buildNewRoster'];
  invalidateAsyncWork: RunStartGameOrchestratorArgs['invalidateAsyncWork'];
  beginRun: RunStartGameOrchestratorArgs['beginRun'];
  clearTimer: RunStartGameOrchestratorArgs['clearTimer'];
  resetCoopRotatePending: RunStartGameOrchestratorArgs['resetCoopRotatePending'];
  chance: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['chance'];
  getStarterMaxHp: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['getStarterMaxHp'];
  t: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['t'];
  setEnemies: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['setEnemies'];
  setTimedMode: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['setTimedMode'];
  setCoopActiveSlot: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['setCoopActiveSlot'];
  dispatchBattle: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['dispatchBattle'];
  appendSessionEvent: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['appendSessionEvent'];
  initSession: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['initSession'];
  setScreenFromString: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['setScreen'];
  playBattleIntro: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['runtime']['playBattleIntro'];
  pvpStoreRef: { current: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['pvp'] };
  uiRef: { current: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['ui'] };
  resetRunRuntimeState: RunStartGameOrchestratorArgs['pvpStartDepsArgs']['resetRunRuntimeState'];
  startBattle: StandardStartDepsArgs['runtime']['startBattle'];
  sr: RunStartGameControllerArgs['sr'];
  battleMode: RunStartGameControllerArgs['battleMode'];
  pvpStarter2: RunStartGameControllerArgs['pvpStarter2'];
  locale: RunStartGameControllerArgs['locale'];
  pickIndex: Parameters<typeof pickPartnerStarter>[1];
  getPlayerMaxHp: RunStartGameControllerArgs['getStageMaxHp'];
  activateQueuedChallenge: StartGameBaseArgs['activateQueuedChallenge'];
};

/**
 * useStartGameWiring — Extracted from useBattleCore.
 *
 * Captures the ~35 dependencies needed by the start-game flow into a
 * `useBattleStateRef`, assembles the four nested arg objects, and
 * delegates to `runStartGameWithContext`.
 *
 * Returns a stable `startGame(starterOverride?, modeOverride?, allyOverride?)` callback.
 */
export function useStartGameWiring(
  deps: UseStartGameWiringDeps,
): (starterOverride?: StarterVm | null, modeOverride?: BattleMode | null, allyOverride?: StarterVm | null) => void {
  const {
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
  } = deps;

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
    const pvpStartDepsArgs = {
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
    };

    const standardStartDepsArgs = {
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
    };

    const startGameControllerArgs = {
      sr: ctx.sr,
      battleMode: ctx.battleMode,
      pvpStarter2: ctx.pvpStarter2,
      locale: ctx.locale,
      localizeStarter,
      pickPartnerStarter: (mainStarter: StarterVm | null) => pickPartnerStarter(mainStarter, ctx.pickIndex, ctx.locale),
      getStarterStageIdx,
      getStageMaxHp: ctx.getPlayerMaxHp,
    };

    const startGameOrchestratorArgs = {
      invalidateAsyncWork: ctx.invalidateAsyncWork,
      beginRun: ctx.beginRun,
      clearTimer: ctx.clearTimer,
      resetCoopRotatePending: ctx.resetCoopRotatePending,
      pvpStartDepsArgs,
      standardStartDepsArgs,
      startGameControllerArgs,
    };

    const startGameInput = {
      setDailyChallengeFeedback: ctx.setDailyChallengeFeedback,
      setTowerChallengeFeedback: ctx.setTowerChallengeFeedback,
      queuedChallenge: ctx.queuedChallenge,
      activeChallenge: ctx.activeChallenge,
      buildNewRoster: ctx.buildNewRoster,
      startGameOrchestratorArgs,
      activateQueuedChallenge: ctx.activateQueuedChallenge,
    };

    runStartGameWithContext(startGameInput, starterOverride, modeOverride, allyOverride);
  }, [startGameContextRef]);
  return useStableCallback(startGameImpl);
}
