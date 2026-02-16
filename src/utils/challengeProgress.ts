import { STREAK_TOWER_BLUEPRINT } from '../data/challengeCatalog.ts';
import type { DailyChallengePlan, DailyChallengeProgress, DailyRunRecord, TowerProgress } from '../types/challenges.ts';
import { randomToken } from './prng.ts';
import { readChallenge, writeChallenge } from './storage.ts';

const DAILY_SCOPE = 'daily_progress_v1';
const TOWER_SCOPE = 'tower_progress_v1';

const DEFAULT_DAILY_PROGRESS: DailyChallengeProgress = {
  version: 1,
  streakCount: 0,
  totalClears: 0,
  lastClearedDate: null,
  lastPlayedDate: null,
  runs: {},
};

const DEFAULT_TOWER_PROGRESS: TowerProgress = {
  version: 1,
  seasonId: STREAK_TOWER_BLUEPRINT.seasonId,
  currentRunId: null,
  currentFloor: 1,
  bestFloor: 0,
  winStreak: 0,
  totalClears: 0,
  totalRuns: 0,
  lastPlayedAt: null,
};

function parseDateKey(dateKey: string): number | null {
  const parts = dateKey.split('-').map((v) => Number(v));
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return Date.UTC(year, month - 1, day);
}

function dayDiff(fromKey: string | null, toKey: string): number | null {
  if (!fromKey) return null;
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (from == null || to == null) return null;
  return Math.round((to - from) / 86400000);
}

function normalizeDailyProgress(raw: DailyChallengeProgress): DailyChallengeProgress {
  return {
    version: 1,
    streakCount: Math.max(0, Number(raw.streakCount) || 0),
    totalClears: Math.max(0, Number(raw.totalClears) || 0),
    lastClearedDate: raw.lastClearedDate || null,
    lastPlayedDate: raw.lastPlayedDate || null,
    runs: { ...(raw.runs || {}) },
  };
}

function normalizeTowerProgress(raw: TowerProgress): TowerProgress {
  return {
    version: 1,
    seasonId: raw.seasonId || STREAK_TOWER_BLUEPRINT.seasonId,
    currentRunId: raw.currentRunId || null,
    currentFloor: Math.max(1, Number(raw.currentFloor) || 1),
    bestFloor: Math.max(0, Number(raw.bestFloor) || 0),
    winStreak: Math.max(0, Number(raw.winStreak) || 0),
    totalClears: Math.max(0, Number(raw.totalClears) || 0),
    totalRuns: Math.max(0, Number(raw.totalRuns) || 0),
    lastPlayedAt: Number.isFinite(raw.lastPlayedAt) ? Number(raw.lastPlayedAt) : null,
  };
}

export function loadDailyChallengeProgress(): DailyChallengeProgress {
  const raw = readChallenge<DailyChallengeProgress>(DAILY_SCOPE, DEFAULT_DAILY_PROGRESS);
  return normalizeDailyProgress(raw);
}

export function saveDailyChallengeProgress(progress: DailyChallengeProgress): DailyChallengeProgress {
  const normalized = normalizeDailyProgress(progress);
  writeChallenge(DAILY_SCOPE, normalized);
  return normalized;
}

export function beginDailyChallengeRun(plan: DailyChallengePlan, now = Date.now()): DailyChallengeProgress {
  const progress = loadDailyChallengeProgress();
  const prevRun = progress.runs[plan.dateKey];
  const run: DailyRunRecord = {
    dateKey: plan.dateKey,
    challengeId: plan.challengeId,
    status: 'in_progress',
    attempts: Math.max(0, prevRun?.attempts || 0) + 1,
    startedAt: now,
    clearedAt: prevRun?.status === 'cleared' ? prevRun.clearedAt : null,
    battlesCleared: prevRun?.status === 'cleared' ? prevRun.battlesCleared : 0,
  };

  return saveDailyChallengeProgress({
    ...progress,
    lastPlayedDate: plan.dateKey,
    runs: {
      ...progress.runs,
      [plan.dateKey]: run,
    },
  });
}

export function markDailyChallengeCleared(
  plan: DailyChallengePlan,
  battlesCleared = plan.battles.length,
  now = Date.now(),
): DailyChallengeProgress {
  const progress = loadDailyChallengeProgress();
  const prevRun = progress.runs[plan.dateKey];
  const wasCleared = prevRun?.status === 'cleared';
  const prevClearDate = progress.lastClearedDate;
  const clearGap = dayDiff(prevClearDate, plan.dateKey);
  let nextStreak = progress.streakCount;

  if (!wasCleared) {
    if (clearGap === 1) nextStreak += 1;
    else nextStreak = 1;
  }

  const run: DailyRunRecord = {
    dateKey: plan.dateKey,
    challengeId: plan.challengeId,
    status: 'cleared',
    attempts: Math.max(1, prevRun?.attempts || 0),
    startedAt: prevRun?.startedAt || now,
    clearedAt: now,
    battlesCleared: Math.max(1, battlesCleared),
  };

  return saveDailyChallengeProgress({
    ...progress,
    streakCount: nextStreak,
    totalClears: wasCleared ? progress.totalClears : progress.totalClears + 1,
    lastClearedDate: plan.dateKey,
    lastPlayedDate: plan.dateKey,
    runs: {
      ...progress.runs,
      [plan.dateKey]: run,
    },
  });
}

export function markDailyChallengeFailed(
  plan: DailyChallengePlan,
  battlesCleared = 0,
  now = Date.now(),
): DailyChallengeProgress {
  const progress = loadDailyChallengeProgress();
  const prevRun = progress.runs[plan.dateKey];
  if (prevRun?.status === 'cleared') {
    return saveDailyChallengeProgress({
      ...progress,
      lastPlayedDate: plan.dateKey,
    });
  }

  const run: DailyRunRecord = {
    dateKey: plan.dateKey,
    challengeId: plan.challengeId,
    status: 'failed',
    attempts: Math.max(1, prevRun?.attempts || 0),
    startedAt: prevRun?.startedAt || now,
    clearedAt: null,
    battlesCleared: Math.max(0, Math.floor(battlesCleared)),
  };

  return saveDailyChallengeProgress({
    ...progress,
    lastPlayedDate: plan.dateKey,
    runs: {
      ...progress.runs,
      [plan.dateKey]: run,
    },
  });
}

export function loadTowerProgress(): TowerProgress {
  const raw = readChallenge<TowerProgress>(TOWER_SCOPE, DEFAULT_TOWER_PROGRESS);
  return normalizeTowerProgress(raw);
}

export function saveTowerProgress(progress: TowerProgress): TowerProgress {
  const normalized = normalizeTowerProgress(progress);
  writeChallenge(TOWER_SCOPE, normalized);
  return normalized;
}

export function startTowerRun(startFloor = 1, now = Date.now()): TowerProgress {
  const current = loadTowerProgress();
  const runId = `tower-${now.toString(36)}-${randomToken(4)}`;
  return saveTowerProgress({
    ...current,
    seasonId: STREAK_TOWER_BLUEPRINT.seasonId,
    currentRunId: runId,
    currentFloor: Math.max(1, Math.floor(startFloor)),
    totalRuns: current.totalRuns + 1,
    lastPlayedAt: now,
  });
}

export function recordTowerFloorClear(clearedFloor: number, now = Date.now()): TowerProgress {
  const current = loadTowerProgress();
  const floor = Math.max(1, Math.floor(clearedFloor));
  return saveTowerProgress({
    ...current,
    currentFloor: floor + 1,
    bestFloor: Math.max(current.bestFloor, floor),
    winStreak: current.winStreak + 1,
    totalClears: current.totalClears + 1,
    lastPlayedAt: now,
  });
}

export function recordTowerDefeat(now = Date.now()): TowerProgress {
  const current = loadTowerProgress();
  return saveTowerProgress({
    ...current,
    winStreak: 0,
    lastPlayedAt: now,
  });
}
