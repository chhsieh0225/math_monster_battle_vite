/**
 * The child's grade, set by a short placement check (or chosen directly).
 * Questions in every PvE mode stay inside this grade's curriculum.
 */
import { isGrade, type Grade } from '../data/gradeCurriculum.ts';
import { readJson, writeJson } from './storage.ts';

const STORAGE_KEY = 'mathMonsterBattle_player_v1';

export type PlacementMethod = 'quiz' | 'self';

export type PlayerProfile = {
  version: 1;
  grade: Grade;
  /** The grade the child (or parent) said before the check. */
  selfGrade: Grade;
  method: PlacementMethod;
  placedAt: string;
  quiz: { correct: number; total: number } | null;
};

export function normalizePlayerProfile(raw: unknown): PlayerProfile | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (record.version !== 1 || !isGrade(record.grade) || !isGrade(record.selfGrade)) return null;
  const method: PlacementMethod = record.method === 'quiz' ? 'quiz' : 'self';
  const quizRaw = record.quiz as Record<string, unknown> | null | undefined;
  const quiz = quizRaw && Number.isSafeInteger(quizRaw.correct) && Number.isSafeInteger(quizRaw.total)
    && Number(quizRaw.correct) >= 0 && Number(quizRaw.total) >= Number(quizRaw.correct)
    ? { correct: Number(quizRaw.correct), total: Number(quizRaw.total) }
    : null;
  return {
    version: 1,
    grade: record.grade,
    selfGrade: record.selfGrade,
    method,
    placedAt: typeof record.placedAt === 'string' ? record.placedAt.slice(0, 40) : '',
    quiz,
  };
}

export function loadPlayerProfile(): PlayerProfile | null {
  return normalizePlayerProfile(readJson<unknown>(STORAGE_KEY, null));
}

export function savePlayerProfile(profile: PlayerProfile): boolean {
  return writeJson(STORAGE_KEY, profile);
}

export function createPlayerProfile(args: {
  grade: Grade;
  selfGrade: Grade;
  method: PlacementMethod;
  quiz?: { correct: number; total: number } | null;
  now?: Date;
}): PlayerProfile {
  return {
    version: 1,
    grade: args.grade,
    selfGrade: args.selfGrade,
    method: args.method,
    placedAt: (args.now ?? new Date()).toISOString(),
    quiz: args.quiz ?? null,
  };
}
