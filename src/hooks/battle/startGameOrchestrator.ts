import { buildPvpStartDeps, buildStandardStartDeps } from './startDepsBuilder.ts';
import { runStartGameController } from './startGameController.ts';

type BuildPvpStartDepsArgs = Parameters<typeof buildPvpStartDeps>[0];
type BuildStandardStartDepsArgs = Parameters<typeof buildStandardStartDeps>[0];
type RunStartGameControllerArgs = Parameters<typeof runStartGameController>[0];

type RunStartGameOrchestratorArgs = {
  starterOverride?: RunStartGameControllerArgs['starterOverride'];
  modeOverride?: RunStartGameControllerArgs['modeOverride'];
  allyOverride?: RunStartGameControllerArgs['allyOverride'];
  invalidateAsyncWork: () => void;
  beginRun: () => void;
  clearTimer: () => void;
  resetCoopRotatePending: () => void;
  pvpStartDepsArgs: BuildPvpStartDepsArgs;
  standardStartDepsArgs: BuildStandardStartDepsArgs;
  startGameControllerArgs: Omit<
    RunStartGameControllerArgs,
    'starterOverride' | 'modeOverride' | 'allyOverride' | 'pvpStartDeps' | 'standardStartDeps'
  >;
  buildPvpStartDepsFn?: typeof buildPvpStartDeps;
  buildStandardStartDepsFn?: typeof buildStandardStartDeps;
  runStartGameControllerFn?: typeof runStartGameController;
};

export function runStartGameOrchestrator({
  starterOverride,
  modeOverride = null,
  allyOverride = null,
  invalidateAsyncWork,
  beginRun,
  clearTimer,
  resetCoopRotatePending,
  pvpStartDepsArgs,
  standardStartDepsArgs,
  startGameControllerArgs,
  buildPvpStartDepsFn = buildPvpStartDeps,
  buildStandardStartDepsFn = buildStandardStartDeps,
  runStartGameControllerFn = runStartGameController,
}: RunStartGameOrchestratorArgs): void {
  invalidateAsyncWork();
  beginRun();
  clearTimer();
  resetCoopRotatePending();

  const pvpStartDeps = buildPvpStartDepsFn(pvpStartDepsArgs);
  const standardStartDeps = buildStandardStartDepsFn(standardStartDepsArgs);

  runStartGameControllerFn({
    ...startGameControllerArgs,
    starterOverride,
    modeOverride,
    allyOverride,
    pvpStartDeps,
    standardStartDeps,
  });
}
