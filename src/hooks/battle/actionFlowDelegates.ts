import {
  runBattleStartGame,
} from './startFlowAdapter.ts';
import {
  runBattleSelectMove,
} from './turnFlowAdapter.ts';
import {
  runBattleAdvance,
  runBattleAnswer,
} from './interactionFlowAdapter.ts';
import {
  runBattleContinueFromVictory,
} from './progressionFlowAdapter.ts';

type RunBattleStartGameArgs = Parameters<typeof runBattleStartGame>[0];
type RunBattleSelectMoveArgs = Parameters<typeof runBattleSelectMove>[0];
type RunBattleAnswerArgs = Parameters<typeof runBattleAnswer>[0];
type RunBattleContinueArgs = Parameters<typeof runBattleContinueFromVictory>[0];
type RunBattleAdvanceArgs = Parameters<typeof runBattleAdvance>[0];

type RunBattleStartGameFn = (args: RunBattleStartGameArgs) => void;
type RunBattleSelectMoveFn = (args: RunBattleSelectMoveArgs) => void;
type RunBattleAnswerFn = (args: RunBattleAnswerArgs) => void;
type RunBattleContinueFn = (args: RunBattleContinueArgs) => void;
type RunBattleAdvanceFn = (args: RunBattleAdvanceArgs) => void;

type StartGameBaseArgs = Omit<RunBattleStartGameArgs, 'starterOverride' | 'modeOverride' | 'allyOverride'>;
type SelectMoveBaseInput = Omit<RunBattleSelectMoveArgs['selectMoveInput'], 'index'>;
type AnswerBaseArgs = Omit<RunBattleAnswerArgs, 'choice'>;

export function runStartGameWithContext(
  base: StartGameBaseArgs,
  starterOverride: RunBattleStartGameArgs['starterOverride'],
  modeOverride: RunBattleStartGameArgs['modeOverride'] = null,
  allyOverride: RunBattleStartGameArgs['allyOverride'] = null,
  runner: RunBattleStartGameFn = runBattleStartGame,
): void {
  runner({
    ...base,
    starterOverride,
    modeOverride,
    allyOverride,
  });
}

export function runSelectMoveWithContext(
  baseInput: SelectMoveBaseInput,
  index: number,
  runner: RunBattleSelectMoveFn = runBattleSelectMove,
): void {
  runner({
    selectMoveInput: {
      ...baseInput,
      index,
    },
  });
}

export function runAnswerWithContext(
  base: AnswerBaseArgs,
  choice: number,
  runner: RunBattleAnswerFn = runBattleAnswer,
): void {
  runner({
    ...base,
    choice,
  });
}

export function runContinueWithContext(
  args: RunBattleContinueArgs,
  runner: RunBattleContinueFn = runBattleContinueFromVictory,
): void {
  runner(args);
}

export function runAdvanceWithContext(
  args: RunBattleAdvanceArgs,
  runner: RunBattleAdvanceFn = runBattleAdvance,
): void {
  runner(args);
}
