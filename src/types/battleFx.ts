/**
 * Pixel coordinates (left, top) relative to `.battle-root` container.
 * Used by particle effects and damage popups for absolute positioning.
 */
export type FxPoint = { x: number; y: number };

/**
 * Pre-computed FX target coordinates for each sprite zone.
 * Stored in a ref and read by battle flow functions to position
 * damage popups and particle effects dynamically.
 */
export type BattleFxTargets = {
  /** Center of the active (main or promoted) player sprite. */
  playerMain: FxPoint;
  /** Center of the co-op sub ally sprite. Falls back to playerMain when no sub exists. */
  playerSub: FxPoint;
  /** Center of the main enemy sprite. */
  enemyMain: FxPoint;
  /** Above the enemy center — used for status tags (parry, shatter, regen). */
  enemyAbove: FxPoint;
  /** Slightly above the player — used for curse, status effects. */
  playerAbove: FxPoint;
};

/** Default fallback targets matching legacy hardcoded coordinates. */
export const DEFAULT_FX_TARGETS: BattleFxTargets = {
  playerMain: { x: 60, y: 170 },
  playerSub: { x: 112, y: 146 },
  enemyMain: { x: 148, y: 55 },
  enemyAbove: { x: 155, y: 30 },
  playerAbove: { x: 60, y: 140 },
};
