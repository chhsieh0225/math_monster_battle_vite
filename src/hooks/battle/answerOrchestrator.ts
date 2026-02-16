import { buildPlayerAnswerHandlerDeps } from './answerDepsBuilder.ts';
import { runAnswerController } from './answerController.ts';

type BuildPlayerAnswerHandlerDepsArgs = Parameters<typeof buildPlayerAnswerHandlerDeps>[0];
type RunAnswerControllerArgs = Parameters<typeof runAnswerController>[0];

type RunAnswerOrchestratorArgs = {
  choice: RunAnswerControllerArgs['choice'];
  answered: RunAnswerControllerArgs['answered'];
  setAnswered: RunAnswerControllerArgs['setAnswered'];
  clearTimer: RunAnswerControllerArgs['clearTimer'];
  playerDepsArgs: BuildPlayerAnswerHandlerDepsArgs;
  answerControllerArgs: Omit<
    RunAnswerControllerArgs,
    'choice' | 'answered' | 'setAnswered' | 'clearTimer' | 'playerHandlerDeps'
  >;
  buildPlayerAnswerHandlerDepsFn?: typeof buildPlayerAnswerHandlerDeps;
  runAnswerControllerFn?: typeof runAnswerController;
};

/**
 * runAnswerOrchestrator
 *
 * Assembles per-answer player handler deps and forwards to answer controller.
 * Extraction-only; no gameplay behavior changes.
 */
export function runAnswerOrchestrator({
  choice,
  answered,
  setAnswered,
  clearTimer,
  playerDepsArgs,
  answerControllerArgs,
  buildPlayerAnswerHandlerDepsFn = buildPlayerAnswerHandlerDeps,
  runAnswerControllerFn = runAnswerController,
}: RunAnswerOrchestratorArgs): void {
  const playerHandlerDeps = buildPlayerAnswerHandlerDepsFn(playerDepsArgs);

  runAnswerControllerFn({
    ...answerControllerArgs,
    choice,
    answered,
    setAnswered,
    clearTimer,
    playerHandlerDeps,
  });
}
