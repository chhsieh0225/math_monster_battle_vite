import type { useBattleUIState } from '../useBattleUIState.ts';
import type { usePvpState } from '../usePvpState.ts';
import type { createBattleFieldSetters } from './battleFieldSetters.ts';
import type { runAdvanceController } from './advanceController.ts';

type RunAdvanceControllerArgs = Parameters<typeof runAdvanceController>[0];
type PvpTurnStartHandlers = RunAdvanceControllerArgs['pvpTurnStartHandlerDeps'];
type PendingEvolutionArgs = RunAdvanceControllerArgs['pendingEvolutionArgs'];

type BattleUiState = ReturnType<typeof useBattleUIState>;
type PvpState = ReturnType<typeof usePvpState>;
type BattleFieldSetters = ReturnType<typeof createBattleFieldSetters>;

type AdvanceRuntimeDeps = Pick<
  PvpTurnStartHandlers,
  'sr' | 'safeTo' | 'getOtherPvpTurn' | 'getPvpTurnName' | 'setScreen' | 't'
>;

type BuildAdvancePvpTurnStartDepsArgs = {
  runtime: AdvanceRuntimeDeps;
  ui: BattleUiState;
  pvp: PvpState;
  battleFields: BattleFieldSetters;
};

type BuildPendingEvolutionArgsArgs = {
  pendingEvolveRef: PendingEvolutionArgs['pendingEvolveRef'];
  battleFields: BattleFieldSetters;
  setScreen: PendingEvolutionArgs['setScreen'];
  tryUnlock: PendingEvolutionArgs['tryUnlock'];
  getStageMaxHp: PendingEvolutionArgs['getStageMaxHp'];
  getStarterMaxHp: PendingEvolutionArgs['getStarterMaxHp'];
  maxMoveLvl: PendingEvolutionArgs['maxMoveLvl'];
};

export function buildAdvancePvpTurnStartDeps({
  runtime,
  ui,
  pvp,
  battleFields,
  }: BuildAdvancePvpTurnStartDepsArgs): PvpTurnStartHandlers {
  return {
    sr: runtime.sr,
    safeTo: runtime.safeTo,
    getOtherPvpTurn: runtime.getOtherPvpTurn,
    getPvpTurnName: runtime.getPvpTurnName,
    setPHp: battleFields.setPHp,
    setPvpBurnP1: pvp.setPvpBurnP1,
    setPAnim: ui.setPAnim,
    addD: ui.addD,
    setPvpWinner: pvp.setPvpWinner,
    setScreen: runtime.setScreen,
    setPvpHp2: pvp.setPvpHp2,
    setEHp: battleFields.setEHp,
    setPvpBurnP2: pvp.setPvpBurnP2,
    setEAnim: ui.setEAnim,
    setBText: ui.setBText,
    setPhase: ui.setPhase,
    setPvpParalyzeP1: pvp.setPvpParalyzeP1,
    setPvpParalyzeP2: pvp.setPvpParalyzeP2,
    setPvpTurn: pvp.setPvpTurn,
    setPvpFreezeP1: pvp.setPvpFreezeP1,
    setPvpFreezeP2: pvp.setPvpFreezeP2,
    t: runtime.t,
  };
}

export function buildPendingEvolutionArgs({
  pendingEvolveRef,
  battleFields,
  setScreen,
  tryUnlock,
  getStageMaxHp,
  getStarterMaxHp,
  maxMoveLvl,
}: BuildPendingEvolutionArgsArgs): PendingEvolutionArgs {
  return {
    pendingEvolveRef,
    setPStg: battleFields.setPStg,
    tryUnlock,
    getStageMaxHp,
    setPHp: battleFields.setPHp,
    setAllySub: battleFields.setAllySub,
    setPHpSub: battleFields.setPHpSub,
    getStarterMaxHp,
    setMLvls: battleFields.setMLvls,
    maxMoveLvl,
    setScreen,
  };
}
