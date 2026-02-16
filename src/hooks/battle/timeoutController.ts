import { handleTimeoutFlow } from './timeoutFlow.ts';

type HandleTimeoutFlowArgs = Parameters<typeof handleTimeoutFlow>[0];

type RunTimeoutControllerArgs = Omit<HandleTimeoutFlowArgs, 'doEnemyTurn'> & {
  doEnemyTurnRef: { current: () => void };
};

/**
 * runTimeoutController
 *
 * Keeps timer timeout wiring out of useBattle while preserving
 * current-state enemy turn execution via ref.
 */
export function runTimeoutController({
  doEnemyTurnRef,
  ...rest
}: RunTimeoutControllerArgs): void {
  handleTimeoutFlow({
    ...rest,
    doEnemyTurn: () => {
      const currentTurnRunner = doEnemyTurnRef?.current;
      if (typeof currentTurnRunner === 'function') {
        currentTurnRunner();
      }
    },
  });
}
