import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer(timerSec, onTimeoutCallback) {
  const [timerLeft, setTimerLeft] = useState(timerSec);
  const timerRef = useRef(null);
  const timerStartRef = useRef(null);
  const onTimeoutRef = useRef(onTimeoutCallback);

  // Keep callback ref updated
  useEffect(() => {
    onTimeoutRef.current = onTimeoutCallback;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimerLeft(timerSec);
    timerStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - timerStartRef.current) / 1000;
      const left = Math.max(0, timerSec - elapsed);
      setTimerLeft(left);
      if (left <= 0) {
        clearTimer();
        if (onTimeoutRef.current) onTimeoutRef.current();
      }
    }, 100);
  }, [timerSec, clearTimer]);

  return { timerLeft, startTimer, clearTimer };
}
