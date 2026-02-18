import type { ChallengeRunState } from '../../types/challenges.ts';
import {
  buildDailyChallengeRoster,
  getDailyChallengeSeed,
  buildTowerChallengeRoster,
  getTowerChallengeSeed,
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
type RosterEntry = Record<string, unknown>;

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
  setTowerChallengeFeedback: (value: null) => void;
  queuedChallenge: ChallengeRunState | null;
  activeChallenge: ChallengeRunState | null;
  buildNewRoster: BuildNewRoster;
  startGameOrchestratorArgs: StartGameOrchestratorArgsWithoutOverrides & {
    standardStartDepsArgs: Omit<StandardStartDepsArgs, 'runtime'> & {
      runtime: Omit<StandardStartDepsArgs['runtime'], 'buildNewRoster'>;
    };
  };
  activateQueuedChallenge: () => void;
  runStartGameOrchestratorFn?: typeof runStartGameOrchestrator;
  buildDailyChallengeRosterFn?: typeof buildDailyChallengeRoster;
  buildTowerChallengeRosterFn?: typeof buildTowerChallengeRoster;
  getDailyChallengeSeedFn?: typeof getDailyChallengeSeed;
  getTowerChallengeSeedFn?: typeof getTowerChallengeSeed;
};

export function runBattleStartGame({
  starterOverride,
  modeOverride = null,
  allyOverride = null,
  setDailyChallengeFeedback,
  setTowerChallengeFeedback,
  queuedChallenge,
  activeChallenge,
  buildNewRoster,
  startGameOrchestratorArgs,
  activateQueuedChallenge,
  runStartGameOrchestratorFn = runStartGameOrchestrator,
  buildDailyChallengeRosterFn = buildDailyChallengeRoster,
  buildTowerChallengeRosterFn = buildTowerChallengeRoster,
  getDailyChallengeSeedFn = getDailyChallengeSeed,
  getTowerChallengeSeedFn = getTowerChallengeSeed,
}: RunBattleStartGameArgs): void {
  setDailyChallengeFeedback(null);
  setTowerChallengeFeedback(null);

  const challengeContext = queuedChallenge || activeChallenge;
  const runSeed = challengeContext?.kind === 'daily'
    ? getDailyChallengeSeedFn(challengeContext.plan)
    : challengeContext?.kind === 'tower'
      ? getTowerChallengeSeedFn(challengeContext.plan)
      : null;

  const toRosterEntries = (value: unknown[]): RosterEntry[] => (
    value.filter((entry): entry is RosterEntry => Boolean(entry) && typeof entry === 'object')
  );

  const buildRosterForRun: BuildNewRoster = (mode) => {
    const baseRoster = toRosterEntries(buildNewRoster(mode));
    if (challengeContext?.kind === 'daily') {
      return buildDailyChallengeRosterFn(baseRoster, challengeContext.plan);
    }
    if (challengeContext?.kind === 'tower') {
      return buildTowerChallengeRosterFn(baseRoster, challengeContext.plan);
    }
    return baseRoster;
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
