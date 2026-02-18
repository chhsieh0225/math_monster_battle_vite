type PhaseSetter = (value: string) => void;
type TextSetter = (value: string) => void;
type SafeTo = (fn: () => void, ms: number) => void;

type ResetStateLike = {
  phase?: unknown;
  screen?: unknown;
};

function asResetState(state: unknown): ResetStateLike | null {
  if (!state || typeof state !== 'object') return null;
  return {
    phase: Reflect.get(state, 'phase'),
    screen: Reflect.get(state, 'screen'),
  };
}

export function shouldSkipMenuReset(state: unknown): boolean {
  const current = asResetState(state);
  if (!current) return false;
  if (typeof current.screen === 'string' && current.screen !== 'battle') return true;
  return current.phase === 'ko' || current.phase === 'victory';
}

export function isBattleActiveState(state: unknown): boolean {
  return !shouldSkipMenuReset(state);
}

export function scheduleIfBattleActive(
  safeTo: SafeTo,
  getState: () => unknown,
  fn: () => void,
  ms: number,
): void {
  safeTo(() => {
    if (!isBattleActiveState(getState())) return;
    fn();
  }, ms);
}

export function tryReturnToMenu(
  getState: () => unknown,
  setPhase: PhaseSetter,
  setBText: TextSetter,
): boolean {
  if (shouldSkipMenuReset(getState())) return false;
  setPhase('menu');
  setBText('');
  return true;
}
