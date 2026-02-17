export type DailyBattleRuleLite = {
  timeLimitSec?: number | null;
  questionFocus?: string[] | null;
} | null | undefined;

export type BattleQuestionConfig = {
  questionTimerSec: number;
  questionAllowedOps: string[] | null;
};

export function resolveBattleQuestionConfig(
  rule: DailyBattleRuleLite,
  fallbackTimerSec: number,
): BattleQuestionConfig {
  const raw = Number(rule?.timeLimitSec);
  const questionTimerSec = Number.isFinite(raw) && raw > 0 ? raw : fallbackTimerSec;
  const questionAllowedOps = Array.isArray(rule?.questionFocus) && rule.questionFocus.length > 0
    ? [...rule.questionFocus]
    : null;
  return {
    questionTimerSec,
    questionAllowedOps,
  };
}
