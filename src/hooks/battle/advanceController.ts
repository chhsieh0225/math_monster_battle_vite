import { createPvpTurnStartHandlers } from './flowHandlers.ts';
import {
  handlePendingEvolution,
  tryProcessPvpTextAdvance,
} from './advanceFlow.ts';

type TryProcessPvpTextAdvanceArgs = Parameters<typeof tryProcessPvpTextAdvance>[0];
type HandlePendingEvolutionArgs = Parameters<typeof handlePendingEvolution>[0];
type PvpTurnStartHandlers = TryProcessPvpTextAdvanceArgs['handlers'];

type RunAdvanceControllerArgs = {
  phase: string;
  sr: { current: TryProcessPvpTextAdvanceArgs['state'] & { phase?: string; screen?: string } };
  isGamePaused: () => boolean;
  pvpTurnStartHandlerDeps: PvpTurnStartHandlers;
  setPhase: (value: string) => void;
  setBText: (value: string) => void;
  pendingEvolutionArgs: Omit<HandlePendingEvolutionArgs, 'state'>;
  continueFromVictory: () => void;
  consumePendingTextAdvanceAction?: () => (() => void) | null;
};

/**
 * runAdvanceController
 *
 * Centralizes advance() branching for text/victory phases.
 * This extraction keeps useBattle as a coordinator.
 */
export function runAdvanceController({
  phase: renderedPhase,
  sr,
  isGamePaused = () => false,
  pvpTurnStartHandlerDeps,
  setPhase,
  setBText,
  pendingEvolutionArgs,
  continueFromVictory,
  consumePendingTextAdvanceAction,
}: RunAdvanceControllerArgs): void {
  const state = sr.current;
  if (isGamePaused() || (state.screen && state.screen !== 'battle')) return;
  const phase = state.phase ?? renderedPhase;
  // Boss intro overlay completed → reveal text phase
  if (phase === 'bossIntro') {
    setPhase('text');
    return;
  }

  // Boss victory cinematic completed → transition to normal victory phase
  if (phase === 'bossVictory') {
    setPhase('victory');
    return;
  }

  if (phase === 'text') {
    const pendingAction = consumePendingTextAdvanceAction?.() || null;
    if (pendingAction) {
      pendingAction();
      return;
    }

    const handlers = createPvpTurnStartHandlers(pvpTurnStartHandlerDeps);
    if (tryProcessPvpTextAdvance({
      state: sr.current,
      handlers,
    })) {
      return;
    }

    setPhase('menu');
    setBText('');
    return;
  }

  if (phase !== 'victory') return;

  if (handlePendingEvolution({
    ...pendingEvolutionArgs,
    state: sr.current,
  })) {
    return;
  }

  continueFromVictory();
}
