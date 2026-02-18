import type { UseBattleView } from '../../types/battle';

export type BuildUseBattleViewArgs = UseBattleView;

/**
 * Typed view-slice builder used by useBattle.js.
 * Keeps API composition aligned with UseBattleView while preserving runtime behavior.
 */
export function buildUseBattleView(args: BuildUseBattleViewArgs): UseBattleView {
  return args;
}
