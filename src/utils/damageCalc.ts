/**
 * Pure damage calculation functions.
 * Extracted from App.jsx for testability and clarity.
 */
import { POWER_CAPS } from '../data/constants.ts';
import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
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
const DAMAGE_BALANCE = BALANCE_CONFIG.damage;

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
  let dmg = Math.round(basePow * randomFloat(
    DAMAGE_BALANCE.playerAttackVariance.min,
    DAMAGE_BALANCE.playerAttackVariance.max,
  ));
  // Streak bonus
  if (streak >= DAMAGE_BALANCE.streak.high.threshold) dmg = Math.round(dmg * DAMAGE_BALANCE.streak.high.multiplier);
  else if (streak >= DAMAGE_BALANCE.streak.medium.threshold) dmg = Math.round(dmg * DAMAGE_BALANCE.streak.medium.multiplier);
  // Evolution stage bonus
  dmg = Math.round(dmg * (1 + stageBonus * DAMAGE_BALANCE.stageBonusPerStage));
  // Type effectiveness
  dmg = Math.round(dmg * effMult);
  return dmg;
}

/**
 * Calculate enemy attack damage against the player.
 */
export function calcEnemyDamage(atkStat: number, defEff: number): number {
  const raw = Math.round(atkStat * randomFloat(
    DAMAGE_BALANCE.enemyAttackVariance.min,
    DAMAGE_BALANCE.enemyAttackVariance.max,
  ));
  return Math.round(raw * defEff);
}

/**
 * Calculate freeze chance for water-type player.
 */
export function freezeChance(moveLvl: number): number {
  return DAMAGE_BALANCE.freezeChance.base + moveLvl * DAMAGE_BALANCE.freezeChance.perMoveLevel;
}
