import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer(timerSec, onTimeoutCallback) {
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const timerStartRef = useRef(null);
  const remainingRef = useRef(timerSec);   // 暫停時記住剩餘秒數
  const timerLeftRef = useRef(timerSec);
  const onTimeoutRef = useRef(onTimeoutCallback);
  const listenersRef = useRef(new Set());

  // Keep callback ref updated
  useEffect(() => {
    onTimeoutRef.current = onTimeoutCallback;
  }, [onTimeoutCallback]);

  const subscribeTimerLeft = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const notifyTimerLeft = useCallback(() => {
    listenersRef.current.forEach((listener) => {
      try {
        listener();
      } catch {
        // best-effort subscriber notification
      }
    });
  }, []);

  const setTimerLeft = useCallback((next) => {
    const safe = Number.isFinite(next) ? Math.max(0, next) : 0;
    if (Math.abs(safe - timerLeftRef.current) < 0.001) return;
    timerLeftRef.current = safe;
    notifyTimerLeft();
  }, [notifyTimerLeft]);

  const getTimerLeft = useCallback(() => timerLeftRef.current, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    remainingRef.current = timerLeftRef.current;
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
  }, [clearTimer, setTimerLeft]);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimerLeft(timerSec);
    remainingRef.current = timerSec;
    setPaused(false);
    runInterval(timerSec);
  }, [timerSec, clearTimer, runInterval, setTimerLeft]);

  const pauseTimer = useCallback(() => {
    if (!timerRef.current || paused) return;
    // 算出目前剩餘時間並記下來
    const elapsed = (Date.now() - timerStartRef.current) / 1000;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearInterval(timerRef.current);
    timerRef.current = null;
    setTimerLeft(remainingRef.current);
    setPaused(true);
  }, [paused, setTimerLeft]);

  const resumeTimer = useCallback(() => {
    if (!paused) return;
    setPaused(false);
    runInterval(remainingRef.current);
  }, [paused, runInterval]);

  // Cleanup on unmount to prevent leaked intervals
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    listenersRef.current.clear();
  }, []);

  return {
    paused,
    startTimer,
    clearTimer,
    pauseTimer,
    resumeTimer,
    subscribeTimerLeft,
    getTimerLeft,
  };
}
