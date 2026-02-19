import { runAdvanceController } from './advanceController.ts';
import {
  buildAdvancePvpTurnStartDeps,
  buildPendingEvolutionArgs,
} from './advanceDepsBuilder.ts';
import { buildPvpAnswerHandlerDeps } from './answerDepsBuilder.ts';
import { runAnswerOrchestrator } from './answerOrchestrator.ts';

type RunAnswerOrchestratorArgs = Parameters<typeof runAnswerOrchestrator>[0];
type BuildPvpAnswerHandlerDepsArgs = Parameters<typeof buildPvpAnswerHandlerDeps>[0];
type RunAdvanceControllerArgs = Parameters<typeof runAdvanceController>[0];
type BuildAdvancePvpTurnStartDepsArgs = Parameters<typeof buildAdvancePvpTurnStartDeps>[0];
type BuildPendingEvolutionArgsArgs = Parameters<typeof buildPendingEvolutionArgs>[0];

type RunBattleAnswerArgs = {
  choice: RunAnswerOrchestratorArgs['choice'];
  answered: RunAnswerOrchestratorArgs['answered'];
  setAnswered: RunAnswerOrchestratorArgs['setAnswered'];
  clearTimer: RunAnswerOrchestratorArgs['clearTimer'];
  pvpAnswerDepsInput: BuildPvpAnswerHandlerDepsArgs;
  playerDepsArgs: RunAnswerOrchestratorArgs['playerDepsArgs'];
  answerControllerArgsInput: Omit<
    RunAnswerOrchestratorArgs['answerControllerArgs'],
    'pvpHandlerDeps'
  >;
  buildPvpAnswerHandlerDepsFn?: typeof buildPvpAnswerHandlerDeps;
  runAnswerOrchestratorFn?: typeof runAnswerOrchestrator;
};

export function runBattleAnswer({
  choice,
  answered,
  setAnswered,
  clearTimer,
  pvpAnswerDepsInput,
  playerDepsArgs,
  answerControllerArgsInput,
  buildPvpAnswerHandlerDepsFn = buildPvpAnswerHandlerDeps,
  runAnswerOrchestratorFn = runAnswerOrchestrator,
}: RunBattleAnswerArgs): void {
  const pvpHandlerDeps = buildPvpAnswerHandlerDepsFn(pvpAnswerDepsInput);

  runAnswerOrchestratorFn({
    choice,
    answered,
    setAnswered,
    clearTimer,
    playerDepsArgs,
    answerControllerArgs: {
      ...answerControllerArgsInput,
      pvpHandlerDeps,
    },
  });
}

type RunBattleAdvanceArgs = {
  phase: RunAdvanceControllerArgs['phase'];
  sr: RunAdvanceControllerArgs['sr'];
  setPhase: RunAdvanceControllerArgs['setPhase'];
  setBText: RunAdvanceControllerArgs['setBText'];
  continueFromVictory: RunAdvanceControllerArgs['continueFromVictory'];
  consumePendingTextAdvanceAction?: RunAdvanceControllerArgs['consumePendingTextAdvanceAction'];
  advancePvpDepsInput: BuildAdvancePvpTurnStartDepsArgs;
  pendingEvolutionInput: BuildPendingEvolutionArgsArgs;
  buildAdvancePvpTurnStartDepsFn?: typeof buildAdvancePvpTurnStartDeps;
  buildPendingEvolutionArgsFn?: typeof buildPendingEvolutionArgs;
  runAdvanceControllerFn?: typeof runAdvanceController;
};

export function runBattleAdvance({
  phase,
  sr,
  setPhase,
  setBText,
  continueFromVictory,
  consumePendingTextAdvanceAction,
  advancePvpDepsInput,
  pendingEvolutionInput,
  buildAdvancePvpTurnStartDepsFn = buildAdvancePvpTurnStartDeps,
  buildPendingEvolutionArgsFn = buildPendingEvolutionArgs,
  runAdvanceControllerFn = runAdvanceController,
}: RunBattleAdvanceArgs): void {
  const pvpTurnStartHandlerDeps = buildAdvancePvpTurnStartDepsFn(advancePvpDepsInput);
  const pendingEvolutionArgs = buildPendingEvolutionArgsFn(pendingEvolutionInput);

  runAdvanceControllerFn({
    phase,
    sr,
    pvpTurnStartHandlerDeps,
    setPhase,
    setBText,
    pendingEvolutionArgs,
    continueFromVictory,
    consumePendingTextAdvanceAction,
  });
}
