import { readJson, readText, removeKey, writeJson, writeText } from './storage.ts';
import { randomToken } from './prng.ts';

/**
 * sessionLogger.ts — Per-session learning analytics persistence.
 *
 * Each completed game session is logged with:
 *   - timestamp, starter, mode, result
 *   - per-operation-type accuracy & average response time
 *   - per-answer detail log (question, correct/wrong, time)
 *
 * localStorage key: "mathMonsterBattle_sessions"
 * Retention: last 100 sessions (FIFO).
 */

const SESSIONS_KEY = 'mathMonsterBattle_sessions';
const PIN_KEY = 'mathMonsterBattle_dashPin';
const MAX_SESSIONS = 100;
const OPS = [
  '+', '-', '×', '÷',
  'mixed2', 'mixed3', 'mixed4',
  'unknown1', 'unknown2', 'unknown3', 'unknown4',
  'frac_cmp', 'frac_same', 'frac_diff', 'frac_muldiv',
] as const;

type SessionOp = (typeof OPS)[number];

export type SessionOpStat = {
  attempted: number;
  correct: number;
  totalMs: number;
};

export type SessionAnswer = {
  display?: unknown;
  answer?: unknown;
  correct: boolean;
  op: string;
  timeMs: number;
};

export type SessionLog = {
  id: string;
  startTime: number;
  endTime: number | null;
  starterId: string | null;
  starterName: string | null;
  starterStageIdx: number | null;
  timedMode: boolean;
  completed: boolean;
  defeated: number;
  finalLevel: number;
  maxStreak: number;
  tC: number;
  tW: number;
  pHp: number;
  opStats: Record<SessionOp, SessionOpStat>;
  answers: SessionAnswer[];
};

type StarterForSession = {
  id?: string;
  name?: string;
  selectedStageIdx?: number;
} | null;

type SessionQuestion = {
  op?: string;
  display?: unknown;
  answer?: unknown;
} | null | undefined;

export type SessionFinalizeStats = {
  defeated: number;
  finalLevel: number;
  maxStreak: number;
  pHp: number;
  completed: boolean;
};

// ─── Session CRUD ───

export function loadSessions(): SessionLog[] {
  return readJson<SessionLog[]>(SESSIONS_KEY, []);
}

export function saveSession(session: SessionLog): void {
  const all = loadSessions();
  all.push(session);
  while (all.length > MAX_SESSIONS) all.shift();
  writeJson(SESSIONS_KEY, all);
}

export function clearSessions(): void {
  removeKey(SESSIONS_KEY);
}

// ─── PIN ───

const DEFAULT_PIN = '1234';

export function loadPin(): string {
  return readText(PIN_KEY, DEFAULT_PIN);
}

export function savePin(pin: string): void {
  writeText(PIN_KEY, pin);
}

// ─── Session builder (used inside useBattle) ───

function newOpStat(): SessionOpStat {
  return { attempted: 0, correct: 0, totalMs: 0 };
}

function isSessionOp(op: string): op is SessionOp {
  return OPS.some((value) => value === op);
}

function buildOpStats(): Record<SessionOp, SessionOpStat> {
  return {
    '+': newOpStat(),
    '-': newOpStat(),
    '×': newOpStat(),
    '÷': newOpStat(),
    mixed2: newOpStat(),
    mixed3: newOpStat(),
    mixed4: newOpStat(),
    unknown1: newOpStat(),
    unknown2: newOpStat(),
    unknown3: newOpStat(),
    unknown4: newOpStat(),
    frac_cmp: newOpStat(),
    frac_same: newOpStat(),
    frac_diff: newOpStat(),
    frac_muldiv: newOpStat(),
  };
}

/** Create a fresh session log object at game start. */
export function initSessionLog(starter: StarterForSession, timedMode?: boolean): SessionLog {
  const opStats = buildOpStats();
  const starterStageIdx = Number.isFinite(starter?.selectedStageIdx)
    ? Number(starter?.selectedStageIdx)
    : null;

  return {
    id: Date.now().toString(36) + randomToken(4),
    startTime: Date.now(),
    endTime: null,
    starterId: starter?.id || null,
    starterName: starter?.name || null,
    starterStageIdx,
    timedMode: !!timedMode,
    completed: false, // beat all enemies
    defeated: 0,
    finalLevel: 1,
    maxStreak: 0,
    tC: 0,
    tW: 0,
    pHp: 100, // HP at end
    opStats,
    answers: [],
  };
}

/** Record one answered question into the session log. */
export function logAnswer(
  session: SessionLog | null | undefined,
  question: SessionQuestion,
  isCorrect: boolean,
  timeMs: number,
): void {
  if (!session || !question) return;

  const op = question.op || '?';
  const opStat = isSessionOp(op) ? session.opStats[op] : null;

  // Update op stats
  if (opStat) {
    opStat.attempted += 1;
    if (isCorrect) opStat.correct += 1;
    opStat.totalMs += timeMs;
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
  if (isCorrect) session.tC += 1;
  else session.tW += 1;
}

/** Finalize a session at game end. */
export function finalizeSession(
  session: SessionLog | null | undefined,
  { defeated, finalLevel, maxStreak, pHp, completed }: SessionFinalizeStats,
): SessionLog | null {
  if (!session) return null;
  session.endTime = Date.now();
  session.defeated = defeated;
  session.finalLevel = finalLevel;
  session.maxStreak = maxStreak;
  session.pHp = pHp;
  session.completed = completed;
  return session;
}
