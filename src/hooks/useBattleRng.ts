import { useCallback, useRef } from 'react';

const DEFAULT_SEED = 0x6d2b79f5;

type StepOut = {
  state: number;
  value: number;
};

function step(state: number): StepOut {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return {
    state: nextState,
    value: ((t ^ (t >>> 14)) >>> 0) / 4294967296,
  };
}

export type BattleRngApi = {
  rand: () => number;
  randInt: (min: number, max: number) => number;
  chance: (p: number) => boolean;
  pickIndex: (length: number) => number;
  reseed: (nextSeed: number) => void;
};

export function useBattleRng(seed: number = DEFAULT_SEED): BattleRngApi {
  const stateRef = useRef<number>(seed >>> 0);

  const reseed = useCallback((nextSeed: number) => {
    stateRef.current = (nextSeed >>> 0) || DEFAULT_SEED;
  }, []);

  const rand = useCallback(() => {
    const next = step(stateRef.current);
    stateRef.current = next.state;
    return next.value;
  }, []);

  const randInt = useCallback((min: number, max: number) => (
    Math.floor(rand() * (max - min + 1)) + min
  ), [rand]);

  const chance = useCallback((p: number) => rand() < p, [rand]);

  const pickIndex = useCallback((length: number) => {
    if (length <= 1) return 0;
    return randInt(0, length - 1);
  }, [randInt]);

  return { rand, randInt, chance, pickIndex, reseed };
}
