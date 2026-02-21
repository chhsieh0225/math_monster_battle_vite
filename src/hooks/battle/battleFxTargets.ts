/**
 * Module-level singleton holding the current FX target coordinates.
 *
 * Updated by BattleScreen whenever sprite positions change (via layout or DOM measurement).
 * Read by flow functions (enemyFlow, playerFlow, coopFlow, pvpStrikeResolver, pvpStatusResolver)
 * to position damage popups and particle effects dynamically instead of using hardcoded pixels.
 *
 * Why a singleton?  There is only ever one active battle at a time, and the flow functions
 * are called asynchronously (via setTimeout) with no React context.  Passing a ref through
 * the 10+ handler-bag files would be a large mechanical diff with zero semantic benefit.
 */
import type { BattleFxTargets } from '../../types/battleFx';
import { DEFAULT_FX_TARGETS } from '../../types/battleFx';

const _ref: { current: BattleFxTargets } = { current: DEFAULT_FX_TARGETS };

/** Called by BattleScreen to push updated target positions. */
export function updateBattleFxTargets(t: BattleFxTargets): void {
  _ref.current = t;
}

/** Read by flow functions to get current target positions. */
export function fxt(): BattleFxTargets {
  return _ref.current;
}

/** Reset to defaults (e.g. when leaving battle). */
export function resetBattleFxTargets(): void {
  _ref.current = DEFAULT_FX_TARGETS;
}
