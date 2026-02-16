/**
 * Pure damage calculation functions.
 * Extracted from App.jsx for testability and clarity.
 */
import { POWER_CAPS } from '../data/constants.ts';
import { getEff } from '../data/typeEffectiveness.ts';
import { randomFloat } from './prng.ts';

type MoveLite = {
  basePower: number;
  growth: number;
  type: string;
  type2?: string;
};

type EnemyLite = {
  mType: string;
};

const getEffTyped = getEff as (moveType?: string, monType?: string) => number;

/**
 * Compute effective power of a move at its current level.
 */
export function movePower(move: MoveLite, lvl: number, idx: number): number {
  return Math.min(move.basePower + (lvl - 1) * move.growth, POWER_CAPS[idx]);
}

/**
 * For a dual-type move, pick the type with better effectiveness.
 */
export function bestAttackType(move: MoveLite, enemy: EnemyLite | null): string {
  if (!move.type2 || !enemy) return move.type;
  return getEffTyped(move.type2, enemy.mType) > getEffTyped(move.type, enemy.mType)
    ? move.type2
    : move.type;
}

/**
 * For a dual-type move, get the better effectiveness multiplier.
 */
export function bestEffectiveness(move: MoveLite, enemy: EnemyLite | null): number {
  const e1 = enemy ? getEffTyped(move.type, enemy.mType) : 1;
  if (!move.type2 || !enemy) return e1;
  return Math.max(e1, getEffTyped(move.type2, enemy.mType));
}

type AttackDamageParams = {
  basePow: number;
  streak: number;
  stageBonus: number;
  effMult: number;
};

/**
 * Calculate raw damage for a correct-answer attack.
 */
export function calcAttackDamage({ basePow, streak, stageBonus, effMult }: AttackDamageParams): number {
  let dmg = Math.round(basePow * randomFloat(0.85, 1));
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
 */
export function calcEnemyDamage(atkStat: number, defEff: number): number {
  const raw = Math.round(atkStat * randomFloat(0.8, 1.2));
  return Math.round(raw * defEff);
}

/**
 * Calculate freeze chance for water-type player.
 */
export function freezeChance(moveLvl: number): number {
  return 0.25 + moveLvl * 0.03;
}
