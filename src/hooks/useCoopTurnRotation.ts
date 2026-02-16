import { useEffect, useRef } from 'react';

type CoopActiveSlot = 'main' | 'sub';

type BattleStateRef = {
  current: {
    battleMode?: string;
    allySub?: unknown;
    pHpSub?: number;
  };
};

type SetCoopActiveSlot = (
  value: CoopActiveSlot | ((prev: CoopActiveSlot) => CoopActiveSlot),
) => void;

type UseCoopTurnRotationArgs = {
  phase: string;
  safeTo: (fn: () => void, ms: number) => void;
  sr: BattleStateRef;
  setCoopActiveSlot: SetCoopActiveSlot;
};

type UseCoopTurnRotationResult = {
  markPending: () => void;
  resetPending: () => void;
};

export function useCoopTurnRotation({
  phase,
  safeTo,
  sr,
  setCoopActiveSlot,
}: UseCoopTurnRotationArgs): UseCoopTurnRotationResult {
  const pendingRef = useRef(false);

  const markPending = (): void => {
    pendingRef.current = true;
  };

  const resetPending = (): void => {
    pendingRef.current = false;
  };

  useEffect(() => {
    if (phase !== 'menu' || !pendingRef.current) return;
    pendingRef.current = false;
    const s = sr.current;
    const canSwitch =
      (s.battleMode === 'coop' || s.battleMode === 'double')
      && Boolean(s.allySub)
      && (s.pHpSub || 0) > 0;

    safeTo(() => {
      if (!canSwitch) {
        setCoopActiveSlot('main');
        return;
      }
      setCoopActiveSlot((prev) => (prev === 'main' ? 'sub' : 'main'));
    }, 0);
  }, [phase, safeTo, sr, setCoopActiveSlot]);

  return {
    markPending,
    resetPending,
  };
}
