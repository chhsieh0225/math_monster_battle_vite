import { useCallback, useRef } from 'react';

const DEFAULT_SEED = 0x6d2b79f5;

function step(state) {
  let t = (state + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return {
    state: t >>> 0,
    value: ((t ^ (t >>> 14)) >>> 0) / 4294967296,
  };
}

export function useBattleRng(seed = DEFAULT_SEED) {
  const stateRef = useRef(seed >>> 0);

  const reseed = useCallback((nextSeed) => {
    stateRef.current = (nextSeed >>> 0) || DEFAULT_SEED;
  }, []);

  const rand = useCallback(() => {
    const next = step(stateRef.current);
    stateRef.current = next.state;
    return next.value;
  }, []);

  const randInt = useCallback((min, max) => (
    Math.floor(rand() * (max - min + 1)) + min
  ), [rand]);

  const chance = useCallback((p) => rand() < p, [rand]);

  const pickIndex = useCallback((length) => {
    if (length <= 1) return 0;
    return randInt(0, length - 1);
  }, [randInt]);

  return { rand, randInt, chance, pickIndex, reseed };
}
