/**
 * Pure damage calculation functions.
 * Extracted from App.jsx for testability and clarity.
 */
import { POWER_CAPS, MAX_MOVE_LVL } from '../data/constants';
import { getEff } from '../data/monsters';

/**
 * Compute effective power of a move at its current level.
 * @param {Object} move - Move definition from starters.js
 * @param {number} lvl  - Current move level (1..MAX_MOVE_LVL)
 * @param {number} idx  - Move index (0..3) for POWER_CAPS lookup
 * @returns {number}
 */
export function movePower(move, lvl, idx) {
  return Math.min(move.basePower + (lvl - 1) * move.growth, POWER_CAPS[idx]);
}

/**
 * For a dual-type move, pick the type with better effectiveness.
 * @param {Object} move     - Move definition (has .type, optionally .type2)
 * @param {Object|null} enemy - Enemy monster (has .mType)
 * @returns {string} The effective type to use
 */
export function bestAttackType(move, enemy) {
  if (!move.type2 || !enemy) return move.type;
  return getEff(move.type2, enemy.mType) > getEff(move.type, enemy.mType)
    ? move.type2
    : move.type;
}

/**
 * For a dual-type move, get the better effectiveness multiplier.
 * @param {Object} move     - Move definition
 * @param {Object|null} enemy - Enemy monster
 * @returns {number} Effectiveness multiplier (0.6, 1.0, or 1.5)
 */
export function bestEffectiveness(move, enemy) {
  const e1 = enemy ? getEff(move.type, enemy.mType) : 1;
  if (!move.type2 || !enemy) return e1;
  return Math.max(e1, getEff(move.type2, enemy.mType));
}

/**
 * Whether a move has reached its power cap.
 * @param {Object} move - Move definition
 * @param {number} lvl  - Current level
 * @param {number} idx  - Move index
 * @returns {boolean}
 */
export function isAtCap(move, lvl, idx) {
  return lvl >= MAX_MOVE_LVL || move.basePower + lvl * move.growth > POWER_CAPS[idx];
}

/**
 * Calculate raw damage for a correct-answer attack.
 * @param {Object} params
 * @param {number} params.basePow    - Move power at current level
 * @param {number} params.streak     - Current streak count
 * @param {number} params.stageBonus - Player evolution stage (0,1,2)
 * @param {number} params.effMult    - Type effectiveness multiplier
 * @returns {number} Final damage (integer)
 */
export function calcAttackDamage({ basePow, streak, stageBonus, effMult }) {
  let dmg = Math.round(basePow * (0.85 + Math.random() * 0.15));
  // Streak bonus
  if (streak >= 5) dmg = Math.round(dmg * 1.8);
  else if (streak >= 3) dmg = Math.round(dmg * 1.5);
  // Evolution stage bonus
  dmg = Math.round(dmg * (1 + stageBonus * 0.15));
  // Type effectiveness
  dmg = Math.round(dmg * effMult);
  return dmg;
}

/**
 * Calculate enemy attack damage against the player.
 * @param {number} atkStat - Enemy ATK stat
 * @param {number} defEff  - Type effectiveness of enemy vs player
 * @returns {number}
 */
export function calcEnemyDamage(atkStat, defEff) {
  const raw = Math.round(atkStat * (0.8 + Math.random() * 0.4));
  return Math.round(raw * defEff);
}

/**
 * Calculate freeze chance for water-type player.
 * @param {number} moveLvl - Current move level
 * @returns {number} Probability in [0, 1]
 */
export function freezeChance(moveLvl) {
  return 0.25 + moveLvl * 0.03;
}
