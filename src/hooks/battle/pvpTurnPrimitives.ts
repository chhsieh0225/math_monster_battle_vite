import { scheduleIfBattleActive } from './menuResetGuard.ts';
import { getResolvedPvpCombatant, type PvpStateReadLike } from './pvpStateSelectors.ts';

export type PvpTurn = 'p1' | 'p2';
export type PvpWinner = PvpTurn | null;

export type NumberSetter = (value: number | ((prev: number) => number)) => void;
export type BoolSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
export type PhaseSetter = (value: string) => void;

type SafeTo = (fn: () => void, ms: number) => void;

type SwapPvpTurnToTextArgs = {
  nextTurn: PvpTurn;
  setPvpTurn: (turn: PvpTurn) => void;
  setPvpActionCount: NumberSetter;
  setPhase: PhaseSetter;
};

export function swapPvpTurnToText({
  nextTurn,
  setPvpTurn,
  setPvpActionCount,
  setPhase,
}: SwapPvpTurnToTextArgs): void {
  setPvpTurn(nextTurn);
  setPvpActionCount((c) => c + 1);
  setPhase('text');
}

type DeclarePvpWinnerArgs = {
  winner: PvpWinner;
  setPvpWinner: (winner: PvpWinner) => void;
  setScreen: (screen: string) => void;
};

export function declarePvpWinner({
  winner,
  setPvpWinner,
  setScreen,
}: DeclarePvpWinnerArgs): void {
  setPvpWinner(winner);
  setScreen('pvp_result');
}

type ResetCurrentTurnResourcesArgs = {
  currentTurn: PvpTurn;
  setPvpChargeP1: NumberSetter;
  setPvpComboP1: NumberSetter;
  setPvpChargeP2: NumberSetter;
  setPvpComboP2: NumberSetter;
};

export function resetCurrentTurnResources({
  currentTurn,
  setPvpChargeP1,
  setPvpComboP1,
  setPvpChargeP2,
  setPvpComboP2,
}: ResetCurrentTurnResourcesArgs): void {
  if (currentTurn === 'p1') {
    setPvpChargeP1(0);
    setPvpComboP1(0);
    return;
  }
  setPvpChargeP2(0);
  setPvpComboP2(0);
}

type PvpCorrectProgressState = PvpStateReadLike;

type ApplyCorrectTurnProgressArgs = {
  currentTurn: PvpTurn;
  state: PvpCorrectProgressState;
  pvpSpecDefTrigger: number;
  setPvpChargeP1: NumberSetter;
  setPvpChargeP2: NumberSetter;
  setPvpComboP1: NumberSetter;
  setPvpComboP2: NumberSetter;
  setPvpSpecDefP1: BoolSetter;
  setPvpSpecDefP2: BoolSetter;
};

export function applyCorrectTurnProgress({
  currentTurn,
  state,
  pvpSpecDefTrigger,
  setPvpChargeP1,
  setPvpChargeP2,
  setPvpComboP1,
  setPvpComboP2,
  setPvpSpecDefP1,
  setPvpSpecDefP2,
}: ApplyCorrectTurnProgressArgs): boolean {
  const acting = getResolvedPvpCombatant(state, currentTurn);
  let unlockedSpecDef = false;
  if (currentTurn === 'p1') {
    setPvpChargeP1((c) => Math.min(c + 1, 3));
    if (!acting.specDef) {
      const nextCombo = acting.combo + 1;
      if (nextCombo >= pvpSpecDefTrigger) {
        setPvpComboP1(0);
        setPvpSpecDefP1(true);
        unlockedSpecDef = true;
      } else {
        setPvpComboP1(nextCombo);
      }
    }
    return unlockedSpecDef;
  }

  setPvpChargeP2((c) => Math.min(c + 1, 3));
  if (!acting.specDef) {
    const nextCombo = acting.combo + 1;
    if (nextCombo >= pvpSpecDefTrigger) {
      setPvpComboP2(0);
      setPvpSpecDefP2(true);
      unlockedSpecDef = true;
    } else {
      setPvpComboP2(nextCombo);
    }
  }
  return unlockedSpecDef;
}

type CreateBattleActiveSchedulerArgs<TState> = {
  safeTo: SafeTo;
  getState: () => TState;
};

export function createBattleActiveScheduler<TState>({
  safeTo,
  getState,
}: CreateBattleActiveSchedulerArgs<TState>): (fn: () => void, ms: number) => void {
  return (fn: () => void, ms: number) => (
    scheduleIfBattleActive(safeTo, getState, fn, ms)
  );
}
