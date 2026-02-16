function hashSeed(seed: unknown): number {
  const text = String(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seedRandom(seed: unknown): number {
  let x = hashSeed(seed);
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  x = Math.imul(x, 0x297a2d39);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

export function seedRange(seed: unknown, min: number, max: number): number {
  return min + seedRandom(seed) * (max - min);
}

export function seedInt(seed: unknown, min: number, max: number): number {
  return Math.floor(seedRange(seed, min, max + 1));
}
