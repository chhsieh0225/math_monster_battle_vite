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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStarterLite(value: unknown): value is StarterLite {
  if (!isRecord(value)) return false;
  const name = value.name;
  const c1 = value.c1;
  const c2 = value.c2;
  const stages = value.stages;
  return (
    typeof name === 'string'
    && typeof c1 === 'string'
    && typeof c2 === 'string'
    && Array.isArray(stages)
    && stages.length > 0
  );
}

function localizeStarterSafe(starter: StarterLite, locale: string): StarterLite {
  const localized = localizeStarter(starter, locale);
  return isStarterLite(localized) ? localized : starter;
}

export function pickPartnerStarter(
  mainStarter: StarterVm | null,
  pickIndex: PickIndexFn,
  locale: string,
): StarterLite | null {
  if (!mainStarter) return null;
  const preferId = PARTNER_BY_STARTER[mainStarter.id || ''];
  const preferred = STARTERS.find((s) => s.id === preferId);
  if (preferred) return localizeStarterSafe(preferred, locale);
  const pool = STARTERS.filter((s) => s.id !== mainStarter.id);
  if (pool.length <= 0) return null;
  return localizeStarterSafe(pool[pickIndex(pool.length)], locale);
}
