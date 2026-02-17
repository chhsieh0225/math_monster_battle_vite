import {
  buildContinueFromVictoryFlowArgs,
} from './progressionDepsBuilder.ts';
import {
  continueFromVictoryFlow,
} from './advanceFlow.ts';

type BuildContinueFromVictoryFlowArgsInput = Parameters<typeof buildContinueFromVictoryFlowArgs>[0];

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
