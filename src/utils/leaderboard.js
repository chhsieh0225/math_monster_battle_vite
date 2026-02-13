const LB_KEY = "mathMonsterBattle_lb";
const LB_MAX = 10;

/**
 * 計分公式：
 *   基礎分 = (擊倒數 × 100) + (正確率% × 50) + (等級 × 30)
 *   連擊獎勵 = 最大連擊數 × 20（鼓勵持續答對）
 *   計時加成 = 整體 × 1.5（計時模式）
 */
export function calcScore(defeated, correct, wrong, level, timed, maxStreak = 0) {
  const acc = (correct + wrong > 0) ? Math.round(correct / (correct + wrong) * 100) : 0;
  const raw = defeated * 100 + acc * 50 + level * 30 + maxStreak * 20;
  return Math.round(raw * (timed ? 1.5 : 1));
}

export function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(LB_KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function saveScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > LB_MAX) scores.length = LB_MAX;
  try {
    localStorage.setItem(LB_KEY, JSON.stringify(scores));
  } catch (e) {}
  return scores.indexOf(entry); // rank (0-based), -1 if not in top 10
}
