import {
  createPlayerAnswerHandlers,
  createPvpAnswerHandlers,
} from './flowHandlers.ts';
import {
  runStandardAnswerFlow,
  tryHandlePvpAnswer,
} from './answerFlow.ts';

type RunStandardAnswerFlowArgs = Parameters<typeof runStandardAnswerFlow>[0];
type TryHandlePvpAnswerArgs = Parameters<typeof tryHandlePvpAnswer>[0];

type StateRef = {
  current: RunStandardAnswerFlowArgs['state'];
};

type PvpAnswerHandlers = TryHandlePvpAnswerArgs['handlers'];
type PlayerAnswerHandlers = RunStandardAnswerFlowArgs['handlers'];

type RunAnswerControllerArgs = {
  choice: number;
  answered: boolean;
  setAnswered: (value: boolean) => void;
  clearTimer: () => void;
  sr: StateRef;
  pvpHandlerDeps: PvpAnswerHandlers;
  playerHandlerDeps: PlayerAnswerHandlers;
  getActingStarter: RunStandardAnswerFlowArgs['getActingStarter'];
  logAns: RunStandardAnswerFlowArgs['logAns'];
  appendSessionEvent: RunStandardAnswerFlowArgs['appendSessionEvent'];
  updateAbility: RunStandardAnswerFlowArgs['updateAbility'];
  markCoopRotatePending: RunStandardAnswerFlowArgs['markCoopRotatePending'];
};

/**
 * runAnswerController
 *
 * Keeps PvP/PvE answer dispatch logic out of useBattle coordinator.
 * No gameplay behavior change: this is an extraction-only step.
 */
export function runAnswerController({
  choice,
  answered,
  setAnswered,
  clearTimer,
  sr,
  pvpHandlerDeps,
  playerHandlerDeps,
  getActingStarter,
  logAns,
  appendSessionEvent,
  updateAbility,
  markCoopRotatePending,
}: RunAnswerControllerArgs): void {
  const state = sr.current;
  const phase = (state as { phase?: unknown }).phase;
  if (typeof phase === 'string' && phase !== 'question') return;
  if (answered) return;

  setAnswered(true);
  clearTimer();

  const pvpHandlers = createPvpAnswerHandlers(pvpHandlerDeps);
  const pvpHandled = tryHandlePvpAnswer({
    choice,
    state: state as TryHandlePvpAnswerArgs['state'],
    handlers: pvpHandlers,
  });
  if (state.battleMode === 'pvp') {
    if (!pvpHandled) {
      // Defensive unlock: invalid PvP transient state should not freeze question UI.
      setAnswered(false);
    }
    return;
  }
  if (pvpHandled) return;

  const playerHandlers = createPlayerAnswerHandlers(playerHandlerDeps);
  const handled = runStandardAnswerFlow({
    choice,
    state,
    getActingStarter,
    logAns,
    appendSessionEvent,
    updateAbility,
    markCoopRotatePending,
    handlers: playerHandlers,
  });
  if (!handled) {
    // Defensive unlock: avoid freezing the question UI when answer flow cannot proceed.
    setAnswered(false);
  }
}
