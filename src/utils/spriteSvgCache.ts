type SpriteSvgFactory = () => string;

const MAX_SPRITE_SVG_CACHE = 256;
const spriteSvgCache = new Map<string, string>();

function touchCacheEntry(key: string, value: string): string {
  // Refresh insertion order for simple LRU behavior.
  spriteSvgCache.delete(key);
  spriteSvgCache.set(key, value);
  return value;
}

export function getCachedSpriteSvg(cacheKey: string, factory: SpriteSvgFactory): string {
  const hit = spriteSvgCache.get(cacheKey);
  if (typeof hit === 'string') {
    return touchCacheEntry(cacheKey, hit);
  }

  const next = factory();
  spriteSvgCache.set(cacheKey, next);

  if (spriteSvgCache.size > MAX_SPRITE_SVG_CACHE) {
    const oldestKey = spriteSvgCache.keys().next().value;
    if (typeof oldestKey === 'string') {
      spriteSvgCache.delete(oldestKey);
    }
  }

  return next;
}

export function clearCachedSpriteSvgs(): void {
  spriteSvgCache.clear();
}

export function getCachedSpriteSvgCount(): number {
  return spriteSvgCache.size;
}
