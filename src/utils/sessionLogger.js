import { readJson, readText, removeKey, writeJson, writeText } from './storage';

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
const OPS = ["+", "-", "×", "÷", "mixed2", "mixed3", "mixed4", "unknown1", "unknown2", "unknown3", "unknown4"];

// ─── Session CRUD ───

export function loadSessions() {
  return readJson(SESSIONS_KEY, []);
}

export function saveSession(session) {
  const all = loadSessions();
  all.push(session);
  while (all.length > MAX_SESSIONS) all.shift();
  writeJson(SESSIONS_KEY, all);
}

export function clearSessions() {
  removeKey(SESSIONS_KEY);
}

// ─── PIN ───

const DEFAULT_PIN = "1234";

export function loadPin() {
  return readText(PIN_KEY, DEFAULT_PIN);
}

export function savePin(pin) {
  writeText(PIN_KEY, pin);
}

// ─── Session builder (used inside useBattle) ───

/** Create a fresh session log object at game start. */
export function initSessionLog(starter, timedMode) {
  const opStats = {};
  for (const op of OPS) opStats[op] = s();

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
    opStats,
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
