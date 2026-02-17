import type { DailyChallengeRunState } from '../useDailyChallengeRun.ts';
import {
  buildDailyChallengeRoster,
  getDailyChallengeSeed,
} from './challengeRuntime.ts';
import { runStartBattleController } from './startBattleController.ts';
import {
  buildStartBattleSharedArgs,
} from './startDepsBuilder.ts';
import { runStartBattleFlow } from './startBattleFlow.ts';
import { runStartGameOrchestrator } from './startGameOrchestrator.ts';

type RunStartBattleControllerArgs = Parameters<typeof runStartBattleController>[0];
type BuildStartBattleSharedArgsInput = Parameters<typeof buildStartBattleSharedArgs>[0];
type RunStartGameOrchestratorArgs = Parameters<typeof runStartGameOrchestrator>[0];
type StandardStartDepsArgs = RunStartGameOrchestratorArgs['standardStartDepsArgs'];
type BuildNewRoster = StandardStartDepsArgs['runtime']['buildNewRoster'];

type RunBattleStartArgs = {
  idx: RunStartBattleControllerArgs['idx'];
  roster: RunStartBattleControllerArgs['roster'];
  invalidateAsyncWork: RunStartBattleControllerArgs['invalidateAsyncWork'];
  clearTimer: RunStartBattleControllerArgs['clearTimer'];
  startBattleSharedArgsInput: BuildStartBattleSharedArgsInput;
  runStartBattleControllerFn?: typeof runStartBattleController;
  buildStartBattleSharedArgsFn?: typeof buildStartBattleSharedArgs;
  runStartBattleFlowFn?: typeof runStartBattleFlow;
};

export function runBattleStart({
  idx,
  roster,
  invalidateAsyncWork,
  clearTimer,
  startBattleSharedArgsInput,
  runStartBattleControllerFn = runStartBattleController,
  buildStartBattleSharedArgsFn = buildStartBattleSharedArgs,
  runStartBattleFlowFn = runStartBattleFlow,
}: RunBattleStartArgs): void {
  runStartBattleControllerFn({
    idx,
    roster,
    invalidateAsyncWork,
    clearTimer,
    startBattleSharedArgs: buildStartBattleSharedArgsFn(startBattleSharedArgsInput),
    runStartBattleFlow: runStartBattleFlowFn,
  });
}

type StartGameOrchestratorArgsWithoutOverrides = Omit<
  RunStartGameOrchestratorArgs,
  'starterOverride' | 'modeOverride' | 'allyOverride' | 'runSeed' | 'standardStartDepsArgs'
>;

type RunBattleStartGameArgs = {
  starterOverride?: RunStartGameOrchestratorArgs['starterOverride'];
  modeOverride?: RunStartGameOrchestratorArgs['modeOverride'];
  allyOverride?: RunStartGameOrchestratorArgs['allyOverride'];
  setDailyChallengeFeedback: (value: null) => void;
  queuedChallenge: DailyChallengeRunState | null;
  activeChallenge: DailyChallengeRunState | null;
  buildNewRoster: BuildNewRoster;
  startGameOrchestratorArgs: StartGameOrchestratorArgsWithoutOverrides & {
    standardStartDepsArgs: Omit<StandardStartDepsArgs, 'runtime'> & {
      runtime: Omit<StandardStartDepsArgs['runtime'], 'buildNewRoster'>;
    };
  };
  activateQueuedChallenge: () => void;
  runStartGameOrchestratorFn?: typeof runStartGameOrchestrator;
  buildDailyChallengeRosterFn?: typeof buildDailyChallengeRoster;
  getDailyChallengeSeedFn?: typeof getDailyChallengeSeed;
};

export function runBattleStartGame({
  starterOverride,
  modeOverride = null,
  allyOverride = null,
  setDailyChallengeFeedback,
  queuedChallenge,
  activeChallenge,
  buildNewRoster,
  startGameOrchestratorArgs,
  activateQueuedChallenge,
  runStartGameOrchestratorFn = runStartGameOrchestrator,
  buildDailyChallengeRosterFn = buildDailyChallengeRoster,
  getDailyChallengeSeedFn = getDailyChallengeSeed,
}: RunBattleStartGameArgs): void {
  setDailyChallengeFeedback(null);

  const challengeContext = queuedChallenge || activeChallenge;
  const runSeed = challengeContext?.kind === 'daily'
    ? getDailyChallengeSeedFn(challengeContext.plan)
    : null;

  const buildRosterForRun: BuildNewRoster = (mode) => {
    const baseRoster = buildNewRoster(mode) as Array<Record<string, unknown>>;
    if (challengeContext?.kind !== 'daily') return baseRoster;
    return buildDailyChallengeRosterFn(baseRoster, challengeContext.plan);
  };

  runStartGameOrchestratorFn({
    ...startGameOrchestratorArgs,
    starterOverride,
    modeOverride,
    allyOverride,
    runSeed,
    standardStartDepsArgs: {
      ...startGameOrchestratorArgs.standardStartDepsArgs,
      runtime: {
        ...startGameOrchestratorArgs.standardStartDepsArgs.runtime,
        buildNewRoster: buildRosterForRun,
      },
    },
  });

  activateQueuedChallenge();
}
