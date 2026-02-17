import { runEnemyTurnController } from './enemyTurnController.ts';
import { runSelectMoveFlow } from './selectMoveFlow.ts';
import {
  buildEnemyTurnArgs,
  buildSelectMoveFlowArgs,
} from './turnActionDepsBuilder.ts';

type BuildSelectMoveFlowArgsInput = Parameters<typeof buildSelectMoveFlowArgs>[0];
type BuildEnemyTurnArgsInput = Parameters<typeof buildEnemyTurnArgs>[0];

type RunBattleSelectMoveArgs = {
  selectMoveInput: BuildSelectMoveFlowArgsInput;
  buildSelectMoveFlowArgsFn?: typeof buildSelectMoveFlowArgs;
  runSelectMoveFlowFn?: typeof runSelectMoveFlow;
};

export function runBattleSelectMove({
  selectMoveInput,
  buildSelectMoveFlowArgsFn = buildSelectMoveFlowArgs,
  runSelectMoveFlowFn = runSelectMoveFlow,
}: RunBattleSelectMoveArgs): void {
  runSelectMoveFlowFn(buildSelectMoveFlowArgsFn(selectMoveInput));
}

type RunBattleEnemyTurnArgs = {
  enemyTurnInput: BuildEnemyTurnArgsInput;
  buildEnemyTurnArgsFn?: typeof buildEnemyTurnArgs;
  runEnemyTurnControllerFn?: typeof runEnemyTurnController;
};

export function runBattleEnemyTurn({
  enemyTurnInput,
  buildEnemyTurnArgsFn = buildEnemyTurnArgs,
  runEnemyTurnControllerFn = runEnemyTurnController,
}: RunBattleEnemyTurnArgs): void {
  runEnemyTurnControllerFn(buildEnemyTurnArgsFn(enemyTurnInput));
}
