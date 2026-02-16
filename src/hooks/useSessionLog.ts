/**
 * useSessionLog — Per-session learning analytics.
 *
 * Extracted from useBattle to reduce God Hook complexity.
 * Owns: sessionRef, qStartRef, initSession, logAns, endSession.
 */
import { useRef } from 'react';
import {
  initSessionLog,
  logAnswer as _logAnswer,
  finalizeSession,
  saveSession,
} from '../utils/sessionLogger';

type StarterForSession = {
  id?: string;
  name?: string;
  selectedStageIdx?: number;
} | null;

type SessionQuestion = {
  op?: string;
  display?: string;
  answer?: number | string;
  [key: string]: unknown;
};

type SessionFinalizeStats = {
  defeated: number;
  finalLevel: number;
  maxStreak: number;
  pHp: number;
  completed: boolean;
};

type SessionLog = Record<string, unknown>;

type UseSessionLogResult = {
  initSession: (starter: StarterForSession, timedMode?: boolean) => void;
  markQStart: () => void;
  logAns: (question: SessionQuestion | null | undefined, isCorrect: boolean) => number;
  endSession: (stats: SessionFinalizeStats) => void;
};

const initSessionLogTyped = initSessionLog as (
  starter: StarterForSession,
  timedMode?: boolean,
) => SessionLog;

const logAnswerTyped = _logAnswer as (
  session: SessionLog | null,
  question: SessionQuestion | null | undefined,
  isCorrect: boolean,
  timeMs: number,
) => void;

const finalizeSessionTyped = finalizeSession as (
  session: SessionLog | null,
  stats: SessionFinalizeStats,
) => SessionLog | null;

const saveSessionTyped = saveSession as (session: SessionLog) => void;

export function useSessionLog(): UseSessionLogResult {
  const sessionRef = useRef<SessionLog | null>(null);
  const qStartRef = useRef(0);

  /** Start a new session log. Call at game start. */
  const initSession = (starter: StarterForSession, timedMode?: boolean): void => {
    sessionRef.current = initSessionLogTyped(starter, timedMode);
  };

  /** Mark question start time. Call when a question is shown. */
  const markQStart = (): void => {
    qStartRef.current = Date.now();
  };

  /** Log one answer. Returns elapsed ms. */
  const logAns = (question: SessionQuestion | null | undefined, isCorrect: boolean): number => {
    const ansTimeMs = Date.now() - qStartRef.current;
    logAnswerTyped(sessionRef.current, question, isCorrect, ansTimeMs);
    return ansTimeMs;
  };

  /** Finalize and persist session. Call at game end. */
  const endSession = (stats: SessionFinalizeStats): void => {
    const done = finalizeSessionTyped(sessionRef.current, stats);
    if (done) saveSessionTyped(done);
    sessionRef.current = null;
  };

  return { initSession, markQStart, logAns, endSession };
}
