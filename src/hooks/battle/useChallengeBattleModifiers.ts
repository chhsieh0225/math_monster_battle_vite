import { useMemo } from 'react';
import type { BattleMode } from '../../types/battle';
import type { DailyChallengePlan, StreakTowerPlan } from '../../types/challenges.ts';
import {
  resolveDailyBattleRule,
  resolveTowerBattleRule,
} from './challengeRuntime.ts';
import { resolveBattleQuestionConfig } from './questionConfig.ts';
import { resolveModifiers } from '../../utils/challengeModifiers.ts';
import { TIMER_SEC, PVP_TIMER_SEC } from '../../data/constants';

interface ChallengeBattleModifiersInput {
  dailyPlan: DailyChallengePlan | null;
  towerPlan: StreakTowerPlan | null;
  round: number;
  battleMode: BattleMode;
}

export function useChallengeBattleModifiers({
  dailyPlan,
  towerPlan,
  round,
  battleMode,
}: ChallengeBattleModifiersInput) {
  const currentDailyBattleRule = useMemo(
    () => resolveDailyBattleRule(dailyPlan, round),
    [dailyPlan, round],
  );
  const currentTowerBattleRule = useMemo(
    () => resolveTowerBattleRule(towerPlan, round),
    [towerPlan, round],
  );
  const currentChallengeBattleRule = currentDailyBattleRule || currentTowerBattleRule;
  const challengeModsResolved = useMemo(
    () => resolveModifiers(currentChallengeBattleRule?.modifierTags),
    [currentChallengeBattleRule],
  );
  const challengeDamageMult = challengeModsResolved.playerDamageMult;
  const challengeComboMult = challengeModsResolved.comboScaleMult;
  const { questionTimerSec: baseQuestionTimerSec, questionAllowedOps } = useMemo(
    () => resolveBattleQuestionConfig(currentChallengeBattleRule, TIMER_SEC),
    [currentChallengeBattleRule],
  );
  const questionTimerSec = battleMode === 'pvp' ? PVP_TIMER_SEC : baseQuestionTimerSec;

  return {
    currentChallengeBattleRule,
    challengeDamageMult,
    challengeComboMult,
    questionTimerSec,
    questionAllowedOps,
  };
}
