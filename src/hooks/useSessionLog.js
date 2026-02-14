/**
 * useSessionLog — Per-session learning analytics.
 *
 * Extracted from useBattle to reduce God Hook complexity.
 * Owns: sessionRef, qStartRef, initSession, logAns, endSession.
 */
import { useRef } from 'react';
import {
  initSessionLog, logAnswer as _logAnswer,
  finalizeSession, saveSession,
} from '../utils/sessionLogger';

export function useSessionLog() {
  const sessionRef = useRef(null);
  const qStartRef  = useRef(0);

  /** Start a new session log. Call at game start. */
  const initSession = (starter, timedMode) => {
    sessionRef.current = initSessionLog(starter, timedMode);
  };

  /** Mark question start time. Call when a question is shown. */
  const markQStart = () => {
    qStartRef.current = Date.now();
  };

  /** Log one answer. Returns elapsed ms. */
  const logAns = (question, isCorrect) => {
    const ansTimeMs = Date.now() - qStartRef.current;
    _logAnswer(sessionRef.current, question, isCorrect, ansTimeMs);
    return ansTimeMs;
  };

  /** Finalize and persist session. Call at game end. */
  const endSession = (stats) => {
    const done = finalizeSession(sessionRef.current, stats);
    if (done) saveSession(done);
    sessionRef.current = null;
  };

  return { initSession, markQStart, logAns, endSession };
}
