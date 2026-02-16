import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Keeps a ref synchronized with the latest committed snapshot so async
 * callbacks always read fresh battle state.
 */
export function useBattleStateRef(snapshot) {
  const stateRef = useRef(snapshot);
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
export function useBattleAsyncGate() {
  const asyncGateRef = useRef(0);
  const activeTimers = useRef(new Set());

  const invalidateAsyncWork = useCallback(() => {
    asyncGateRef.current += 1;
    activeTimers.current.forEach(clearTimeout);
    activeTimers.current.clear();
  }, []);

  const safeTo = useCallback((fn, ms) => {
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
