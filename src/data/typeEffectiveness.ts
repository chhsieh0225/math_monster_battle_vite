export const TYPE_EFF = {
  fire: { grass: 1.5, fire: 0.6, water: 0.6, electric: 1.0, ghost: 1.5, steel: 0.6, dark: 1.0, light: 1.0 },
  electric: { grass: 1.0, fire: 1.0, water: 1.5, electric: 0.6, ghost: 0.6, steel: 1.5, dark: 1.0, light: 1.0 },
  water: { grass: 0.6, fire: 1.5, water: 0.6, electric: 0.6, ghost: 1.0, steel: 1.0, dark: 1.5, light: 1.0 },
  grass: { grass: 0.6, fire: 0.6, water: 1.5, electric: 1.5, ghost: 1.0, steel: 0.6, dark: 1.0, light: 1.0 },
  dark: { grass: 1.0, fire: 1.0, water: 1.0, electric: 1.0, ghost: 1.5, steel: 0.6, dark: 0.6, light: 0.6 },
  light: { grass: 1.0, fire: 1.0, water: 1.0, electric: 1.0, ghost: 1.5, steel: 0.6, dark: 1.5, light: 0.6 },
} as const;

type AttackType = keyof typeof TYPE_EFF;
type DefendType = keyof (typeof TYPE_EFF)[AttackType];

export function getEff(moveType: string | null | undefined, monType: string | null | undefined): number {
  if (!moveType || !monType) return 1.0;
  const atk = moveType as AttackType;
  const def = monType as DefendType;
  const row = TYPE_EFF[atk];
  if (!row) return 1.0;
  return row[def] || 1.0;
}
