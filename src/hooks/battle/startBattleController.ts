import type { runStartBattleFlow } from './startBattleFlow.ts';

type RunStartBattleFlowArgs = Parameters<typeof runStartBattleFlow>[0];
type StartBattleSharedArgs = Omit<RunStartBattleFlowArgs, 'idx' | 'roster'>;

type RunStartBattleControllerArgs = {
  idx: RunStartBattleFlowArgs['idx'];
  roster: RunStartBattleFlowArgs['roster'];
  invalidateAsyncWork: () => void;
  clearTimer: () => void;
  startBattleSharedArgs: StartBattleSharedArgs;
  runStartBattleFlow: (args: RunStartBattleFlowArgs) => void;
};

export function runStartBattleController({
  idx,
  roster,
  invalidateAsyncWork,
  clearTimer,
  startBattleSharedArgs,
  runStartBattleFlow: runFlow,
}: RunStartBattleControllerArgs): void {
  invalidateAsyncWork();
  clearTimer();
  runFlow({
    idx,
    roster,
    ...startBattleSharedArgs,
  });
}
