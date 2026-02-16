import type { useBattleUIState } from '../useBattleUIState.ts';
import type { usePvpState } from '../usePvpState.ts';
import type { runStartBattleFlow } from './startBattleFlow.ts';
import type { runStartGameController } from './startGameController.ts';

type RunStartBattleFlowArgs = Parameters<typeof runStartBattleFlow>[0];
type RunStartGameControllerArgs = Parameters<typeof runStartGameController>[0];
type PvpStartDeps = RunStartGameControllerArgs['pvpStartDeps'];
type StandardStartDeps = RunStartGameControllerArgs['standardStartDeps'];
type StartBattleSharedArgs = Omit<RunStartBattleFlowArgs, 'idx' | 'roster'>;

type BattleUiState = ReturnType<typeof useBattleUIState>;
type PvpState = ReturnType<typeof usePvpState>;

type BuildStartBattleSharedArgsArgs = Omit<StartBattleSharedArgs, 'battleMode' | 'allySub'> & {
  sr: {
    current: {
      battleMode?: string;
      allySub?: StartBattleSharedArgs['allySub'];
    };
  };
  fallbackBattleMode: string;
};

type BuildPvpStartDepsArgs = {
  runtime: Pick<
    PvpStartDeps,
    | 'chance'
    | 'getStarterMaxHp'
    | 't'
    | 'setEnemies'
    | 'setTimedMode'
    | 'setCoopActiveSlot'
    | 'dispatchBattle'
    | 'appendSessionEvent'
    | 'initSession'
    | 'createPvpEnemyFromStarter'
    | 'setScreen'
    | 'playBattleIntro'
  >;
  pvp: Pick<PvpState, 'setPvpStarter2' | 'setPvpHp2' | 'setPvpTurn' | 'resetPvpRuntime'>;
  ui: Pick<BattleUiState, 'setPhase' | 'setBText'>;
  resetRunRuntimeState: PvpStartDeps['resetRunRuntimeState'];
};

type BuildStandardStartDepsArgs = {
  runtime: Pick<
    StandardStartDeps,
    | 'buildNewRoster'
    | 'getStarterMaxHp'
    | 'setEnemies'
    | 'setCoopActiveSlot'
    | 'dispatchBattle'
    | 'appendSessionEvent'
    | 'initSession'
    | 'setScreen'
    | 'startBattle'
  >;
  pvp: Pick<PvpState, 'resetPvpRuntime'>;
  resetRunRuntimeState: StandardStartDeps['resetRunRuntimeState'];
};

export function buildStartBattleSharedArgs({
  sr,
  fallbackBattleMode,
  ...rest
}: BuildStartBattleSharedArgsArgs): StartBattleSharedArgs {
  return {
    ...rest,
    battleMode: sr.current.battleMode || fallbackBattleMode,
    allySub: sr.current.allySub ?? null,
  };
}

export function buildPvpStartDeps({
  runtime,
  pvp,
  ui,
  resetRunRuntimeState,
}: BuildPvpStartDepsArgs): PvpStartDeps {
  return {
    chance: runtime.chance,
    getStarterMaxHp: runtime.getStarterMaxHp,
    t: runtime.t,
    setEnemies: runtime.setEnemies,
    setTimedMode: runtime.setTimedMode,
    setCoopActiveSlot: runtime.setCoopActiveSlot,
    dispatchBattle: runtime.dispatchBattle,
    setPvpStarter2: pvp.setPvpStarter2,
    setPvpHp2: pvp.setPvpHp2,
    setPvpTurn: pvp.setPvpTurn,
    resetPvpRuntime: pvp.resetPvpRuntime,
    resetRunRuntimeState,
    appendSessionEvent: runtime.appendSessionEvent,
    initSession: runtime.initSession,
    createPvpEnemyFromStarter: runtime.createPvpEnemyFromStarter,
    setPhase: ui.setPhase,
    setBText: ui.setBText,
    setScreen: runtime.setScreen,
    playBattleIntro: runtime.playBattleIntro,
  };
}

export function buildStandardStartDeps({
  runtime,
  pvp,
  resetRunRuntimeState,
}: BuildStandardStartDepsArgs): StandardStartDeps {
  return {
    buildNewRoster: runtime.buildNewRoster,
    getStarterMaxHp: runtime.getStarterMaxHp,
    setEnemies: runtime.setEnemies,
    setCoopActiveSlot: runtime.setCoopActiveSlot,
    resetPvpRuntime: pvp.resetPvpRuntime,
    dispatchBattle: runtime.dispatchBattle,
    resetRunRuntimeState,
    appendSessionEvent: runtime.appendSessionEvent,
    initSession: runtime.initSession,
    setScreen: runtime.setScreen,
    startBattle: runtime.startBattle,
  };
}
