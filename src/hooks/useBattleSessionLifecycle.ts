import { useCallback, useRef } from 'react';
import { appendEvent, createEventSessionId } from '../utils/eventLogger.ts';
import { hashSeed } from '../utils/prng.ts';
import { nowMs } from '../utils/time.ts';
import {
  buildBattleResultPayload,
  buildQuitPayload,
  buildSessionFinalizeStats,
} from './battle/sessionLifecycleModel';

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
  enemy?: {
    id?: string;
    name?: string;
  } | null;
  [key: string]: unknown;
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
type BeginRunSeed = string | number | null | undefined;

type UseBattleSessionLifecycleResult = {
  beginRun: (seed?: BeginRunSeed) => void;
  appendSessionEvent: (name: string, payload: SessionPayload) => void;
  endSessionOnce: (
    state: SessionStateSnapshot,
    isCompleted: boolean,
    reasonOverride?: string | null,
  ) => void;
  appendQuitEventIfOpen: (state: SessionStateSnapshot) => void;
};

type CryptoLike = {
  getRandomValues?: (values: Uint32Array) => Uint32Array;
};

function getEntropySeed(runCount: number): number {
  const entropyBase = hashSeed(`${runCount}:${nowMs()}`) || (runCount * 2654435761);
  const cryptoLike = (globalThis as { crypto?: CryptoLike }).crypto;
  if (cryptoLike?.getRandomValues) {
    const buffer = new Uint32Array(1);
    cryptoLike.getRandomValues(buffer);
    return ((buffer[0] ^ entropyBase) >>> 0) || DEFAULT_FALLBACK_SEED;
  }
  return (entropyBase >>> 0) || DEFAULT_FALLBACK_SEED;
}

const DEFAULT_FALLBACK_SEED = 0x9e3779b9;

export function useBattleSessionLifecycle({
  reseed,
  endSession,
}: UseBattleSessionLifecycleArgs): UseBattleSessionLifecycleResult {
  const runSeedRef = useRef(0);
  const eventSessionIdRef = useRef<string | null>(null);
  const sessionClosedRef = useRef(false);
  const sessionStartRef = useRef(0);

  const beginRun = useCallback((seed: BeginRunSeed = null) => {
    runSeedRef.current += 1;
    // Deterministic modes (daily challenge) keep explicit seed behavior.
    // Non-seeded runs use high-entropy seed to avoid repeated encounter patterns.
    const explicitSeed = seed == null ? 0 : hashSeed(seed);
    const nextSeed = explicitSeed || getEntropySeed(runSeedRef.current);
    reseed(nextSeed >>> 0);
    sessionClosedRef.current = false;
    sessionStartRef.current = nowMs();
    eventSessionIdRef.current = createEventSessionId();
  }, [reseed]);

  const appendSessionEvent = useCallback((name: string, payload: SessionPayload) => {
    appendEvent(name, payload, { sessionId: eventSessionIdRef.current });
  }, []);

  const endSessionOnce = useCallback((
    state: SessionStateSnapshot,
    isCompleted: boolean,
    reasonOverride: string | null = null,
  ) => {
    if (sessionClosedRef.current) return;
    sessionClosedRef.current = true;

    const durationMs = sessionStartRef.current > 0
      ? nowMs() - sessionStartRef.current
      : null;
    const resultPayload = buildBattleResultPayload({
      state,
      isCompleted,
      reasonOverride,
      durationMs,
    });

    appendSessionEvent('battle_result', resultPayload);

    endSession(buildSessionFinalizeStats(state, isCompleted));
  }, [appendSessionEvent, endSession]);

  const appendQuitEventIfOpen = useCallback((state: SessionStateSnapshot) => {
    if (sessionClosedRef.current) return;
    appendSessionEvent('game_exit', buildQuitPayload(state));
  }, [appendSessionEvent]);

  return {
    beginRun,
    appendSessionEvent,
    endSessionOnce,
    appendQuitEventIfOpen,
  };
}
