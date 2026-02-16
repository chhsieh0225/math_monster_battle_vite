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
  if (answered) return;

  setAnswered(true);
  clearTimer();

  const state = sr.current;

  const pvpHandlers = createPvpAnswerHandlers(pvpHandlerDeps);
  if (tryHandlePvpAnswer({
    choice,
    state: state as TryHandlePvpAnswerArgs['state'],
    handlers: pvpHandlers,
  })) {
    return;
  }

  const playerHandlers = createPlayerAnswerHandlers(playerHandlerDeps);
  runStandardAnswerFlow({
    choice,
    state,
    getActingStarter,
    logAns,
    appendSessionEvent,
    updateAbility,
    markCoopRotatePending,
    handlers: playerHandlers,
  });
}
