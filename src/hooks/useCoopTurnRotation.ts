import { useEffect, useRef } from 'react';
import { resolveCoopTurnRotationDecision } from './battle/coopTurnRotationFlow';

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
    const decision = resolveCoopTurnRotationDecision({
      phase,
      pending: pendingRef.current,
      state: sr.current,
    });
    if (!decision.consumePending) return;
    pendingRef.current = false;

    safeTo(() => {
      if (decision.action === 'set-main') {
        setCoopActiveSlot('main');
        return;
      }
      if (decision.action === 'toggle') {
        setCoopActiveSlot((prev) => (prev === 'main' ? 'sub' : 'main'));
      }
    }, 0);
  }, [phase, safeTo, sr, setCoopActiveSlot]);

  return {
    markPending,
    resetPending,
  };
}
