import { resolveModifiers } from '../../utils/challengeModifiers.ts';

export type DailyBattleRuleLite = {
  timeLimitSec?: number | null;
  questionFocus?: string[] | null;
  modifierTags?: string[] | null;
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
  const baseTimer = Number.isFinite(raw) && raw > 0 ? raw : fallbackTimerSec;
  const mods = resolveModifiers(rule?.modifierTags);
  const questionTimerSec = Math.max(1, Math.round(baseTimer * mods.timerMult * 10) / 10);
  const questionAllowedOps = Array.isArray(rule?.questionFocus) && rule.questionFocus.length > 0
    ? [...rule.questionFocus]
    : null;
  return {
    questionTimerSec,
    questionAllowedOps,
  };
}
