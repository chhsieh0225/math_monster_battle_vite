import { BALANCE_CONFIG } from './balanceConfig.ts';

export const TYPE_EFF = {
  fire: { grass: 1.5, fire: 0.6, water: 0.6, electric: 1.0, ghost: 1.5, steel: 0.6, dark: 1.0, light: 1.0, poison: 1.0, rock: 0.6 },
  electric: { grass: 1.0, fire: 1.0, water: 1.5, electric: 0.6, ghost: 0.6, steel: 1.5, dark: 1.0, light: 1.0, poison: 1.0, rock: 0.6 },
  water: { grass: 0.6, fire: 1.5, water: 0.6, electric: 0.6, ghost: 1.0, steel: 1.0, dark: 1.5, light: 1.0, poison: 1.0, rock: 1.5 },
  grass: { grass: 0.6, fire: 0.6, water: 1.5, electric: 1.5, ghost: 1.0, steel: 0.6, dark: 1.0, light: 1.0, poison: 0.6, rock: 1.5 },
  dark: { grass: 1.0, fire: 1.0, water: 1.0, electric: 1.0, ghost: 1.5, steel: 0.6, dark: 0.6, light: 0.6, poison: 1.0, rock: 1.0 },
  light: { grass: 1.0, fire: 1.0, water: 1.0, electric: 1.0, ghost: 1.5, steel: 0.6, dark: 1.5, light: 0.6, poison: 1.5, rock: 1.0 },
  poison: { grass: 1.5, fire: 1.0, water: 1.5, electric: 1.0, ghost: 0.6, steel: 0.6, dark: 1.0, light: 0.6, poison: 0.6, rock: 0.6 },
  rock: { grass: 0.6, fire: 1.5, water: 0.6, electric: 1.5, ghost: 1.0, steel: 0.6, dark: 1.0, light: 1.0, poison: 1.5, rock: 0.6 },
} as const;

type AttackType = keyof typeof TYPE_EFF;

function isAttackType(value: string): value is AttackType {
  return value in TYPE_EFF;
}

function hasOwnKey<T extends object>(obj: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function getEff(moveType: string | null | undefined, monType: string | null | undefined): number {
  if (!moveType || !monType) return 1.0;
  if (!isAttackType(moveType)) return 1.0;
  const row = TYPE_EFF[moveType];
  if (!hasOwnKey(row, monType)) return 1.0;
  const eff = row[monType];
  return typeof eff === 'number' ? eff : 1.0;
}

/**
 * Dual-type defense effectiveness: multiply the attacker's effectiveness
 * against both defender types (like Pokemon dual-type).
 *
 * Capped at BALANCE_CONFIG.dualTypeEffCap (default 1.8×) to prevent
 * degenerate 1.5 × 1.5 = 2.25× one-shot scenarios.
 * Single-type matchups are unaffected (max 1.5×, below cap).
 */
export function getDualEff(
  moveType: string | null | undefined,
  monType: string | null | undefined,
  monType2: string | null | undefined,
): number {
  const eff1 = getEff(moveType, monType);
  if (!monType2) return eff1;
  const raw = eff1 * getEff(moveType, monType2);
  return Math.min(raw, BALANCE_CONFIG.dualTypeEffCap);
}
