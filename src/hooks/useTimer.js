import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer(timerSec, onTimeoutCallback) {
  const [timerLeft, setTimerLeft] = useState(timerSec);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const timerStartRef = useRef(null);
  const remainingRef = useRef(timerSec);   // 暫停時記住剩餘秒數
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
    setPaused(false);
  }, []);

  const runInterval = useCallback((startSeconds) => {
    timerStartRef.current = Date.now();
    remainingRef.current = startSeconds;
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - timerStartRef.current) / 1000;
      const left = Math.max(0, remainingRef.current - elapsed);
      setTimerLeft(left);
      if (left <= 0) {
        clearTimer();
        if (onTimeoutRef.current) onTimeoutRef.current();
      }
    }, 100);
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimerLeft(timerSec);
    setPaused(false);
    runInterval(timerSec);
  }, [timerSec, clearTimer, runInterval]);

  const pauseTimer = useCallback(() => {
    if (!timerRef.current || paused) return;
    // 算出目前剩餘時間並記下來
    const elapsed = (Date.now() - timerStartRef.current) / 1000;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearInterval(timerRef.current);
    timerRef.current = null;
    setPaused(true);
  }, [paused]);

  const resumeTimer = useCallback(() => {
    if (!paused) return;
    setPaused(false);
    runInterval(remainingRef.current);
  }, [paused, runInterval]);

  // Cleanup on unmount to prevent leaked intervals
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { timerLeft, paused, startTimer, clearTimer, pauseTimer, resumeTimer };
}
