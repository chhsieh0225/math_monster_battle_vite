/**
 * sessionLogger.js — Per-session learning analytics persistence.
 *
 * Each completed game session is logged with:
 *   - timestamp, starter, mode, result
 *   - per-operation-type accuracy & average response time
 *   - per-answer detail log (question, correct/wrong, time)
 *
 * localStorage key: "mathMonsterBattle_sessions"
 * Retention: last 100 sessions (FIFO).
 */

const SESSIONS_KEY = "mathMonsterBattle_sessions";
const PIN_KEY      = "mathMonsterBattle_dashPin";
const MAX_SESSIONS = 100;

// ─── Session CRUD ───

export function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []; }
  catch { return []; }
}

export function saveSession(session) {
  try {
    const all = loadSessions();
    all.push(session);
    // Keep only last MAX_SESSIONS
    while (all.length > MAX_SESSIONS) all.shift();
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
  } catch {}
}

export function clearSessions() {
  try { localStorage.removeItem(SESSIONS_KEY); } catch {}
}

// ─── PIN ───

const DEFAULT_PIN = "1234";

export function loadPin() {
  try { return localStorage.getItem(PIN_KEY) || DEFAULT_PIN; }
  catch { return DEFAULT_PIN; }
}

export function savePin(pin) {
  try { localStorage.setItem(PIN_KEY, pin); } catch {}
}

// ─── Session builder (used inside useBattle) ───

/** Create a fresh session log object at game start. */
export function initSessionLog(starter, timedMode) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    startTime: Date.now(),
    endTime: null,
    starterId: starter?.id || null,
    starterName: starter?.name || null,
    timedMode: !!timedMode,
    completed: false,      // beat all 10 enemies
    defeated: 0,
    finalLevel: 1,
    maxStreak: 0,
    tC: 0,
    tW: 0,
    pHp: 100,              // HP at end
    // Per-operation breakdown { "+": { attempted, correct, totalMs }, ... }
    opStats: { "+": s(), "-": s(), "×": s(), "÷": s() },
    // Detailed answer log
    answers: [],
  };
}

function s() { return { attempted: 0, correct: 0, totalMs: 0 }; }

/** Record one answered question into the session log. */
export function logAnswer(session, question, isCorrect, timeMs) {
  if (!session || !question) return;
  const op = question.op || "?";
  // Update op stats
  if (session.opStats[op]) {
    session.opStats[op].attempted++;
    if (isCorrect) session.opStats[op].correct++;
    session.opStats[op].totalMs += timeMs;
  }
  // Append to detail log (cap at 200 per session to avoid bloat)
  if (session.answers.length < 200) {
    session.answers.push({
      display: question.display,
      answer: question.answer,
      correct: isCorrect,
      op,
      timeMs,
    });
  }
  // Update aggregates
  if (isCorrect) session.tC++;
  else session.tW++;
}

/** Finalize a session at game end. */
export function finalizeSession(session, { defeated, finalLevel, maxStreak, pHp, completed }) {
  if (!session) return null;
  session.endTime = Date.now();
  session.defeated = defeated;
  session.finalLevel = finalLevel;
  session.maxStreak = maxStreak;
  session.pHp = pHp;
  session.completed = completed;
  return session;
}
