const DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
const CHALLENGE_PREFIX = 'mathMonsterBattle_challenge_';

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function warn(action: string, key: string, error: unknown): void {
  if (!DEV) return;
  console.warn(`[storage] ${action} failed for "${key}"`, error);
}

function cloneFallback<T extends unknown[]>(fallback: T): T;
function cloneFallback<T extends Record<string, unknown>>(fallback: T): T;
function cloneFallback<T>(fallback: T): T;
function cloneFallback(fallback: unknown): unknown {
  if (isUnknownArray(fallback)) return [...fallback];
  if (fallback && typeof fallback === 'object') return { ...fallback };
  return fallback;
}

function challengeKey(scope: string): string {
  return `${CHALLENGE_PREFIX}${scope}`;
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return cloneFallback(fallback);
    const parsed = JSON.parse(raw) as T | null;
    return parsed ?? cloneFallback(fallback);
  } catch (error) {
    warn('readJson', key, error);
    return cloneFallback(fallback);
  }
}

export function writeJson<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    warn('writeJson', key, error);
    return false;
  }
}

export function readText(key: string, fallback = ''): string {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch (error) {
    warn('readText', key, error);
    return fallback;
  }
}

export function writeText(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    warn('writeText', key, error);
    return false;
  }
}

export function removeKey(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    warn('removeKey', key, error);
    return false;
  }
}

export function readChallenge<T>(scope: string, fallback: T): T {
  return readJson<T>(challengeKey(scope), fallback);
}

export function writeChallenge<T>(scope: string, value: T): boolean {
  return writeJson<T>(challengeKey(scope), value);
}

export function removeChallenge(scope: string): boolean {
  return removeKey(challengeKey(scope));
}
