import type { useBattleUIState } from '../useBattleUIState.ts';
import type { usePvpState } from '../usePvpState.ts';
import type { createBattleFieldSetters } from './battleFieldSetters.ts';
import type { runTimeoutController } from './timeoutController.ts';

type RunTimeoutControllerArgs = Parameters<typeof runTimeoutController>[0];
type BattleUiState = ReturnType<typeof useBattleUIState>;
type PvpState = ReturnType<typeof usePvpState>;
type BattleFieldSetters = ReturnType<typeof createBattleFieldSetters>;

type TimeoutRuntimeDeps = Pick<
  RunTimeoutControllerArgs,
  | 'sr'
  | 't'
  | 'getPvpTurnName'
  | 'getOtherPvpTurn'
  | 'sfx'
  | 'logAns'
  | 'updateAbility'
  | 'getActingStarter'
  | 'appendSessionEvent'
  | 'markCoopRotatePending'
  | 'safeTo'
  | 'doEnemyTurnRef'
>;

type BuildTimeoutControllerArgsArgs = {
  runtime: TimeoutRuntimeDeps;
  ui: Pick<BattleUiState, 'setAnswered' | 'setFb' | 'setBText' | 'setPhase'>;
  pvp: Pick<
    PvpState,
    | 'setPvpChargeP1'
    | 'setPvpChargeP2'
    | 'setPvpComboP1'
    | 'setPvpComboP2'
    | 'setPvpTurn'
    | 'setPvpActionCount'
  >;
  battleFields: Pick<BattleFieldSetters, 'setTW' | 'setStreak' | 'setPassiveCount' | 'setCharge'>;
};

export function buildTimeoutControllerArgs({
  runtime,
  ui,
  pvp,
  battleFields,
}: BuildTimeoutControllerArgsArgs): RunTimeoutControllerArgs {
  return {
    sr: runtime.sr,
    t: runtime.t,
    getPvpTurnName: runtime.getPvpTurnName,
    getOtherPvpTurn: runtime.getOtherPvpTurn,
    setAnswered: ui.setAnswered,
    setFb: ui.setFb,
    setTW: battleFields.setTW,
    setPvpChargeP1: pvp.setPvpChargeP1,
    setPvpChargeP2: pvp.setPvpChargeP2,
    setPvpComboP1: pvp.setPvpComboP1,
    setPvpComboP2: pvp.setPvpComboP2,
    setBText: ui.setBText,
    setPvpTurn: pvp.setPvpTurn,
    setPvpActionCount: pvp.setPvpActionCount,
    setPhase: ui.setPhase,
    sfx: runtime.sfx,
    setStreak: battleFields.setStreak,
    setPassiveCount: battleFields.setPassiveCount,
    setCharge: battleFields.setCharge,
    logAns: runtime.logAns,
    updateAbility: runtime.updateAbility,
    getActingStarter: runtime.getActingStarter,
    appendSessionEvent: runtime.appendSessionEvent,
    markCoopRotatePending: runtime.markCoopRotatePending,
    safeTo: runtime.safeTo,
    doEnemyTurnRef: runtime.doEnemyTurnRef,
  };
}

