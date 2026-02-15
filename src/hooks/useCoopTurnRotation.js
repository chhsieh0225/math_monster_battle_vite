import { useEffect, useRef } from 'react';

export function useCoopTurnRotation({
  phase,
  safeTo,
  sr,
  setCoopActiveSlot,
}) {
  const pendingRef = useRef(false);

  const markPending = () => {
    pendingRef.current = true;
  };

  const resetPending = () => {
    pendingRef.current = false;
  };

  useEffect(() => {
    if (phase !== "menu" || !pendingRef.current) return;
    pendingRef.current = false;
    const s = sr.current;
    const canSwitch = (
      (s.battleMode === "coop" || s.battleMode === "double")
      && s.allySub
      && (s.pHpSub || 0) > 0
    );
    safeTo(() => {
      if (!canSwitch) {
        setCoopActiveSlot("main");
        return;
      }
      setCoopActiveSlot((prev) => (prev === "main" ? "sub" : "main"));
    }, 0);
  }, [phase, safeTo, sr, setCoopActiveSlot]);

  return {
    markPending,
    resetPending,
  };
}
