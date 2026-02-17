import type { StarterVm } from '../../types/battle';
import type { StarterLite } from '../../types/game';
import { STARTERS } from '../../data/starters.ts';
import { localizeStarter } from '../../utils/contentLocalization';

const PARTNER_BY_STARTER: Record<string, string> = {
  fire: 'water',
  water: 'electric',
  grass: 'fire',
  electric: 'grass',
  lion: 'water',
};

export const DIFF_MODS = [0.7, 0.85, 1.0, 1.15, 1.3] as const;

type PickIndexFn = (size: number) => number;

export function pickPartnerStarter(
  mainStarter: StarterVm | null,
  pickIndex: PickIndexFn,
  locale: string,
): StarterLite | null {
  if (!mainStarter) return null;
  const preferId = PARTNER_BY_STARTER[mainStarter.id || ''];
  const preferred = STARTERS.find((s) => s.id === preferId);
  if (preferred) return localizeStarter(preferred, locale) as StarterLite;
  const pool = STARTERS.filter((s) => s.id !== mainStarter.id);
  if (pool.length <= 0) return null;
  return localizeStarter(pool[pickIndex(pool.length)], locale) as StarterLite;
}
