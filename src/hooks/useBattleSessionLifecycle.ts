import { useCallback, useRef } from 'react';
import { appendEvent, createEventSessionId } from '../utils/eventLogger';
import { nowMs } from '../utils/time';

type SessionStateSnapshot = {
  screen?: string;
  phase?: string;
  round?: number;
  defeated?: number;
  pLvl?: number;
  maxStreak?: number;
  pHp?: number;
  tC?: number;
  tW?: number;
  timedMode?: boolean;
};

type SessionFinalizeStats = {
  defeated: number;
  finalLevel: number;
  maxStreak: number;
  pHp: number;
  completed: boolean;
};

type UseBattleSessionLifecycleArgs = {
  reseed: (seed: number) => void;
  endSession: (stats: SessionFinalizeStats) => void;
};

type SessionPayload = Record<string, unknown>;

type UseBattleSessionLifecycleResult = {
  beginRun: () => void;
  appendSessionEvent: (name: string, payload: SessionPayload) => void;
  endSessionOnce: (
    state: SessionStateSnapshot,
    isCompleted: boolean,
    reasonOverride?: string | null,
  ) => void;
  appendQuitEventIfOpen: (state: SessionStateSnapshot) => void;
};

const appendEventTyped = appendEvent as (
  name: string,
  payload?: SessionPayload,
  options?: { sessionId?: string | null; ts?: number },
) => unknown;

const createEventSessionIdTyped = createEventSessionId as () => string;
const nowMsTyped = nowMs as () => number;

export function useBattleSessionLifecycle({
  reseed,
  endSession,
}: UseBattleSessionLifecycleArgs): UseBattleSessionLifecycleResult {
  const runSeedRef = useRef(0);
  const eventSessionIdRef = useRef<string | null>(null);
  const sessionClosedRef = useRef(false);
  const sessionStartRef = useRef(0);

  const beginRun = useCallback(() => {
    runSeedRef.current += 1;
    reseed(runSeedRef.current * 2654435761);
    sessionClosedRef.current = false;
    sessionStartRef.current = nowMsTyped();
    eventSessionIdRef.current = createEventSessionIdTyped();
  }, [reseed]);

  const appendSessionEvent = useCallback((name: string, payload: SessionPayload) => {
    appendEventTyped(name, payload, { sessionId: eventSessionIdRef.current });
  }, []);

  const endSessionOnce = useCallback((
    state: SessionStateSnapshot,
    isCompleted: boolean,
    reasonOverride: string | null = null,
  ) => {
    if (sessionClosedRef.current) return;
    sessionClosedRef.current = true;

    const reason = reasonOverride || (isCompleted ? 'clear' : 'player_ko');
    const result = isCompleted ? 'win' : reason === 'quit' ? 'quit' : 'lose';

    appendSessionEvent('battle_result', {
      result,
      reason,
      defeated: state.defeated || 0,
      finalLevel: state.pLvl || 1,
      maxStreak: state.maxStreak || 0,
      pHp: state.pHp || 0,
      tC: state.tC || 0,
      tW: state.tW || 0,
      timedMode: !!state.timedMode,
      durationMs: sessionStartRef.current > 0 ? nowMsTyped() - sessionStartRef.current : null,
    });

    endSession({
      defeated: state.defeated || 0,
      finalLevel: state.pLvl || 1,
      maxStreak: state.maxStreak || 0,
      pHp: state.pHp || 0,
      completed: !!isCompleted,
    });
  }, [appendSessionEvent, endSession]);

  const appendQuitEventIfOpen = useCallback((state: SessionStateSnapshot) => {
    if (sessionClosedRef.current) return;
    appendSessionEvent('game_exit', {
      reason: 'quit_button',
      screen: state.screen || null,
      phase: state.phase || null,
      round: state.round || 0,
      defeated: state.defeated || 0,
      pHp: state.pHp || 0,
    });
  }, [appendSessionEvent]);

  return {
    beginRun,
    appendSessionEvent,
    endSessionOnce,
    appendQuitEventIfOpen,
  };
}
