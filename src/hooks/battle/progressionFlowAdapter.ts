import {
  buildVictoryFlowArgs,
  buildContinueFromVictoryFlowArgs,
} from './progressionDepsBuilder.ts';
import {
  continueFromVictoryFlow,
} from './advanceFlow.ts';
import { runVictoryFlow } from './victoryFlow.ts';

type BuildVictoryFlowArgsInput = Parameters<typeof buildVictoryFlowArgs>[0];
type BuildContinueFromVictoryFlowArgsInput = Parameters<typeof buildContinueFromVictoryFlowArgs>[0];

type RunBattleVictoryArgs = {
  victoryInput: BuildVictoryFlowArgsInput;
  buildVictoryFlowArgsFn?: typeof buildVictoryFlowArgs;
  runVictoryFlowFn?: typeof runVictoryFlow;
};

export function runBattleVictory({
  victoryInput,
  buildVictoryFlowArgsFn = buildVictoryFlowArgs,
  runVictoryFlowFn = runVictoryFlow,
}: RunBattleVictoryArgs): void {
  runVictoryFlowFn(buildVictoryFlowArgsFn(victoryInput));
}

type RunBattleContinueFromVictoryArgs = {
  continueFromVictoryInput: BuildContinueFromVictoryFlowArgsInput;
  buildContinueFromVictoryFlowArgsFn?: typeof buildContinueFromVictoryFlowArgs;
  continueFromVictoryFlowFn?: typeof continueFromVictoryFlow;
};

export function runBattleContinueFromVictory({
  continueFromVictoryInput,
  buildContinueFromVictoryFlowArgsFn = buildContinueFromVictoryFlowArgs,
  continueFromVictoryFlowFn = continueFromVictoryFlow,
}: RunBattleContinueFromVictoryArgs): void {
  continueFromVictoryFlowFn(buildContinueFromVictoryFlowArgsFn(continueFromVictoryInput));
}
