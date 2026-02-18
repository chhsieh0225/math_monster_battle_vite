import type { UseBattleState } from '../../types/battle';

export type BuildUseBattleStateArgs = UseBattleState;

/**
 * Typed state-slice builder used by useBattle.js.
 * Keeps the giant public state mapping centralized and easier to migrate.
 */
export function buildUseBattleState(args: BuildUseBattleStateArgs): UseBattleState {
  return args;
}
