/**
 * Pure damage calculation functions.
 * Extracted from App.jsx for testability and clarity.
 */
import { POWER_CAPS } from '../data/constants.ts';
import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import { getDualEff } from '../data/typeEffectiveness.ts';
import { randomFloat } from './prng.ts';

type MoveLite = {
  basePower: number;
  growth: number;
  type: string;
  type2?: string;
};

type EnemyLite = {
  mType: string;
  mType2?: string;
};

const getDualEffTyped = getDualEff as (moveType?: string, monType?: string, monType2?: string) => number;
const DAMAGE_BALANCE = BALANCE_CONFIG.damage;

/**
 * Compute effective power of a move at its current level.
 */
export function movePower(move: MoveLite, lvl: number, idx: number): number {
  return Math.min(move.basePower + (lvl - 1) * move.growth, POWER_CAPS[idx]);
}

/**
 * For a dual-type move, pick the type with better effectiveness.
 * Also considers dual-type defenders (mType + mType2).
 */
export function bestAttackType(move: MoveLite, enemy: EnemyLite | null): string {
  if (!move.type2 || !enemy) return move.type;
  const eff1 = getDualEffTyped(move.type, enemy.mType, enemy.mType2);
  const eff2 = getDualEffTyped(move.type2, enemy.mType, enemy.mType2);
  return eff2 > eff1 ? move.type2 : move.type;
}

/**
 * For a dual-type move vs potentially dual-type defender,
 * get the better effectiveness multiplier.
 */
export function bestEffectiveness(move: MoveLite, enemy: EnemyLite | null): number {
  const e1 = enemy ? getDualEffTyped(move.type, enemy.mType, enemy.mType2) : 1;
  if (!move.type2 || !enemy) return e1;
  return Math.max(e1, getDualEffTyped(move.type2, enemy.mType, enemy.mType2));
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
