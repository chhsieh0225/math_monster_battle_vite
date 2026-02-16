import { createEnemyTurnHandlers } from './flowHandlers.ts';
import { runEnemyTurn } from './enemyFlow.ts';

type RunEnemyTurnArgs = Parameters<typeof runEnemyTurn>[0];

/**
 * runEnemyTurnController
 *
 * Builds the enemy-turn handler bag and executes the shared enemy turn flow.
 */
export function runEnemyTurnController(deps: RunEnemyTurnArgs): void {
  const handlers = createEnemyTurnHandlers(deps);
  runEnemyTurn(handlers);
}
