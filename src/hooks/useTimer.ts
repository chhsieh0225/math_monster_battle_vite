import { useState, useRef, useCallback, useEffect } from 'react';

type TimerListener = () => void;

type TimerHookApi = {
  paused: boolean;
  startTimer: () => void;
  clearTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  subscribeTimerLeft: (listener: TimerListener) => () => void;
  getTimerLeft: () => number;
};

export function useTimer(timerSec: number, onTimeoutCallback?: () => void): TimerHookApi {
  const [paused, setPaused] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);
  const timerStartRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(timerSec);
  const timerLeftRef = useRef<number>(timerSec);
  const onTimeoutRef = useRef<(() => void) | undefined>(onTimeoutCallback);
  const listenersRef = useRef<Set<TimerListener>>(new Set());

  useEffect(() => {
    onTimeoutRef.current = onTimeoutCallback;
  }, [onTimeoutCallback]);

  const subscribeTimerLeft = useCallback((listener: TimerListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
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

  const setTimerLeft = useCallback((next: number) => {
    const safe = Number.isFinite(next) ? Math.max(0, next) : 0;
    if (Math.abs(safe - timerLeftRef.current) < 0.001) return;
    timerLeftRef.current = safe;
    notifyTimerLeft();
  }, [notifyTimerLeft]);

  const getTimerLeft = useCallback(() => timerLeftRef.current, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    remainingRef.current = timerLeftRef.current;
    setPaused(false);
  }, []);

  const runInterval = useCallback((startSeconds: number) => {
    timerStartRef.current = Date.now();
    remainingRef.current = startSeconds;
    timerRef.current = window.setInterval(() => {
      if (timerStartRef.current === null) return;
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
    if (timerRef.current === null || paused) return;
    if (timerStartRef.current === null) return;
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

  useEffect(() => () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
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
