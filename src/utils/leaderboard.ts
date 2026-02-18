import type { LeaderboardEntry } from '../types/game';
import { readJson, writeJson } from './storage.ts';

const LB_KEY = 'mathMonsterBattle_lb';
const LB_MAX = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calcStreakBonus(maxStreak: number): number {
  const streak = Math.max(0, Math.floor(maxStreak));
  let bonus = streak * 12;
  if (streak >= 5) bonus += 30;
  if (streak >= 10) bonus += 80;
  return bonus;
}

/**
 * 計分公式：
 *   1) 基礎分 = (擊倒數 × 100) + (等級 × 30)
 *   2) 準確率分數 = 正確率% × 50 × 作答樣本權重
 *      - 樣本越少，準確率加分越保守，避免開局少量答題就衝高分。
 *   3) 連擊獎勵 = 連擊線性分 + 里程碑加成（5 / 10 連擊）
 *   4) 進度校正 = 依「擊倒數 + 作答量」縮放總分
 *      - 用於校正初始退出或超短局的分數膨脹。
 *   5) 計時加成 = 整體 × 1.5（計時模式）
 */
export function calcScore(
  defeated: number,
  correct: number,
  wrong: number,
  level: number,
  timed: boolean,
  maxStreak = 0,
): number {
  const safeDefeated = Math.max(0, Number(defeated) || 0);
  const safeCorrect = Math.max(0, Number(correct) || 0);
  const safeWrong = Math.max(0, Number(wrong) || 0);
  const safeLevel = Math.max(1, Number(level) || 1);
  const attempts = safeCorrect + safeWrong;
  const acc = attempts > 0 ? Math.round((safeCorrect / attempts) * 100) : 0;

  // Few attempts should not generate an outsized accuracy bonus.
  const sampleWeight = clamp(attempts / 20, 0.12, 1);
  const accuracyScore = Math.round(acc * 50 * sampleWeight);
  const streakBonus = calcStreakBonus(maxStreak);
  const baseScore = safeDefeated * 100 + safeLevel * 30 + accuracyScore + streakBonus;

  // Early-exit calibration: low defeated + low attempt runs are scaled down.
  const progressWeight = clamp((safeDefeated + attempts / 6) / 10, 0.18, 1);
  const timedMultiplier = timed ? 1.5 : 1;
  return Math.round(baseScore * progressWeight * timedMultiplier);
}

export function loadScores(): LeaderboardEntry[] {
  return readJson<LeaderboardEntry[]>(LB_KEY, []);
}

export function saveScore(entry: LeaderboardEntry): number {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > LB_MAX) scores.length = LB_MAX;
  writeJson(LB_KEY, scores);
  return scores.indexOf(entry); // rank (0-based), -1 if not in top 10
}
