import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Keeps a ref synchronized with the latest committed snapshot so async
 * callbacks always read fresh battle state.
 */
export function useBattleStateRef<T>(snapshot: T) {
  const stateRef = useRef<T>(snapshot);
  useLayoutEffect(() => {
    stateRef.current = snapshot;
  });
  return stateRef;
}

/**
 * Async guard for battle timer chains.
 * - `safeTo` schedules guarded callbacks.
 * - `invalidateAsyncWork` cancels and invalidates all pending callbacks.
 */
export function useBattleAsyncGate(): {
  safeTo: (fn: () => void, ms: number) => void;
  invalidateAsyncWork: () => void;
} {
  const asyncGateRef = useRef(0);
  const activeTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const invalidateAsyncWork = useCallback(() => {
    asyncGateRef.current += 1;
    activeTimers.current.forEach(clearTimeout);
    activeTimers.current.clear();
  }, []);

  const safeTo = useCallback((fn: () => void, ms: number) => {
    const gate = asyncGateRef.current;
    const timerId = setTimeout(() => {
      activeTimers.current.delete(timerId);
      if (gate === asyncGateRef.current) fn();
    }, ms);
    activeTimers.current.add(timerId);
  }, []);

  useEffect(
    () => () => {
      activeTimers.current.forEach(clearTimeout);
      activeTimers.current.clear();
    },
    [],
  );

  return {
    safeTo,
    invalidateAsyncWork,
  };
}

/**
 * Stable callback identity with latest implementation.
 * Useful for high-fanout battle handlers to avoid callback dependency churn.
 */
export function useStableCallback<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  const fnRef = useRef(fn);

  useLayoutEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback((...args: TArgs) => fnRef.current(...args), []);
}
