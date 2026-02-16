const UINT32_SCALE = 4294967296;
const DEFAULT_SEED = 0x6d2b79f5;
const TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export type RandomSource = () => number;

let randomSource: RandomSource = () => Math.random();

function normalizeUnit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1) return Number.EPSILON * 1024 > 0 ? 1 - Number.EPSILON * 1024 : 0.999999999;
  return value;
}

export function setRandomSource(source?: RandomSource | null): void {
  randomSource = typeof source === 'function' ? source : () => Math.random();
}

export function resetRandomSource(): void {
  randomSource = () => Math.random();
}

export function random(): number {
  return normalizeUnit(randomSource());
}

export function randomFloat(min = 0, max = 1): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  if (min === max) return min;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + random() * (hi - lo);
}

export function randomInt(min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  if (lo >= hi) return lo;
  return Math.floor(randomFloat(lo, hi + 1));
}

export function chance(probability = 0.5): boolean {
  if (probability <= 0) return false;
  if (probability >= 1) return true;
  return random() < probability;
}

export function pickOne<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[randomInt(0, items.length - 1)];
}

export function shuffleInPlace<T>(items: T[]): T[] {
  if (items.length <= 1) return items;
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function shuffled<T>(items: readonly T[]): T[] {
  return shuffleInPlace([...items]);
}

export function randomToken(length = 6): string {
  const size = Math.max(1, Math.floor(length));
  let out = '';
  for (let i = 0; i < size; i += 1) {
    out += TOKEN_CHARS[randomInt(0, TOKEN_CHARS.length - 1)];
  }
  return out;
}

export function hashSeed(seed: unknown): number {
  const text = String(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type StepOut = {
  state: number;
  value: number;
};

function step(state: number): StepOut {
  let t = (state + DEFAULT_SEED) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return {
    state: t >>> 0,
    value: ((t ^ (t >>> 14)) >>> 0) / UINT32_SCALE,
  };
}

export function createSeededRandom(seed: unknown): RandomSource {
  let state = hashSeed(seed) || DEFAULT_SEED;
  return () => {
    const next = step(state);
    state = next.state;
    return next.value;
  };
}

export function withRandomSource<T>(source: RandomSource, fn: () => T): T {
  const prev = randomSource;
  setRandomSource(source);
  try {
    return fn();
  } finally {
    setRandomSource(prev);
  }
}

export function seedRandom(seed: unknown): number {
  let x = hashSeed(seed);
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  x = Math.imul(x, 0x297a2d39);
  x ^= x >>> 15;
  return (x >>> 0) / UINT32_SCALE;
}

export function seedRange(seed: unknown, min: number, max: number): number {
  return min + seedRandom(seed) * (max - min);
}

export function seedInt(seed: unknown, min: number, max: number): number {
  return Math.floor(seedRange(seed, min, max + 1));
}
