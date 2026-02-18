export function isEnglishLocale(locale: unknown): boolean;
export function isZhLocale(locale: unknown): boolean;

export function localizeTypeName(
  typeNameOrId: string | null | undefined,
  locale: string | null | undefined,
): string;

export function localizeSceneName(
  sceneType: string | null | undefined,
  fallback?: string,
  locale?: string | null,
): string;

export function localizeStarter<T>(
  starter: T,
  locale: string | null | undefined,
): T;

export function localizeStarterList<T>(
  starters: T,
  locale: string | null | undefined,
): T;

export function localizeStarterDisplayName(
  name: string | null | undefined,
  starterId: string | null | undefined,
  locale: string | null | undefined,
  stageIdx?: number | null,
): string;

export function localizeEnemy<T>(
  enemy: T,
  locale: string | null | undefined,
): T;

export function localizeEnemyRoster<T>(
  roster: T,
  locale: string | null | undefined,
): T;

export function localizeEncyclopediaEnemyEntry<T>(
  entry: T,
  locale: string | null | undefined,
): T;

export function localizeEncyclopediaEnemyEntries<T>(
  entries: T,
  locale: string | null | undefined,
): T;

export function localizeEncyclopediaStarterEntry<T>(
  entry: T,
  locale: string | null | undefined,
): T;

export function localizeEncyclopediaStarterEntries<T>(
  entries: T,
  locale: string | null | undefined,
): T;
