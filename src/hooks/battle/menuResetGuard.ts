type PhaseSetter = (value: string) => void;
type TextSetter = (value: string) => void;

type ResetStateLike = {
  phase?: unknown;
  screen?: unknown;
};

function asResetState(state: unknown): ResetStateLike | null {
  if (!state || typeof state !== 'object') return null;
  return state as ResetStateLike;
}

export function shouldSkipMenuReset(state: unknown): boolean {
  const current = asResetState(state);
  if (!current) return false;
  if (typeof current.screen === 'string' && current.screen !== 'battle') return true;
  return current.phase === 'ko' || current.phase === 'victory';
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
