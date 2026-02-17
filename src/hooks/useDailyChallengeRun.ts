import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DailyChallengeFeedback, DailyChallengePlan } from '../types/challenges.ts';
import {
  loadDailyChallengeProgress,
  markDailyChallengeCleared,
  markDailyChallengeFailed,
} from '../utils/challengeProgress.ts';
import {
  createDailyChallengeFeedback,
  getDailyChallengeEnemyTotal,
} from './battle/challengeRuntime.ts';

export type DailyChallengeRunState = {
  kind: 'daily';
  plan: DailyChallengePlan;
};

type UseDailyChallengeRunApi = {
  queuedChallenge: DailyChallengeRunState | null;
  activeChallenge: DailyChallengeRunState | null;
  dailyChallengeFeedback: DailyChallengeFeedback | null;
  setDailyChallengeFeedback: Dispatch<SetStateAction<DailyChallengeFeedback | null>>;
  clearChallengeRun: () => void;
  queueChallengePlan: (plan: DailyChallengePlan | null | undefined) => void;
  activateQueuedChallenge: () => void;
  dailyPlan: DailyChallengePlan | null;
  settleRunAsFailed: (battlesCleared: number) => void;
  settleRunAsCleared: () => void;
};

export function useDailyChallengeRun(): UseDailyChallengeRunApi {
  const [queuedChallenge, setQueuedChallenge] = useState<DailyChallengeRunState | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<DailyChallengeRunState | null>(null);
  const [dailyChallengeFeedback, setDailyChallengeFeedback] = useState<DailyChallengeFeedback | null>(null);

  const clearChallengeRun = useCallback(() => {
    setQueuedChallenge(null);
    setActiveChallenge(null);
    setDailyChallengeFeedback(null);
  }, []);

  const queueChallengePlan = useCallback((plan: DailyChallengePlan | null | undefined) => {
    if (!plan) return;
    setQueuedChallenge({ kind: 'daily', plan });
  }, []);

  const activateQueuedChallenge = useCallback(() => {
    setQueuedChallenge((queued) => {
      if (!queued) return queued;
      setActiveChallenge(queued);
      return null;
    });
  }, []);

  const dailyPlan = useMemo(() => {
    if (activeChallenge?.kind === 'daily' && activeChallenge.plan) return activeChallenge.plan;
    if (queuedChallenge?.kind === 'daily' && queuedChallenge.plan) return queuedChallenge.plan;
    return null;
  }, [activeChallenge, queuedChallenge]);

  const settleRunAsFailed = useCallback((battlesCleared: number) => {
    if (!activeChallenge || activeChallenge.kind !== 'daily' || !activeChallenge.plan) return;
    const progressBefore = loadDailyChallengeProgress();
    const progressAfter = markDailyChallengeFailed(activeChallenge.plan, battlesCleared);
    setDailyChallengeFeedback(createDailyChallengeFeedback({
      plan: activeChallenge.plan,
      before: progressBefore,
      after: progressAfter,
      outcome: 'failed',
      battlesCleared,
    }));
    setActiveChallenge(null);
    setQueuedChallenge(null);
  }, [activeChallenge]);

  const settleRunAsCleared = useCallback(() => {
    if (!activeChallenge || activeChallenge.kind !== 'daily' || !activeChallenge.plan) return;
    const totalBattles = Math.max(1, getDailyChallengeEnemyTotal(activeChallenge.plan));
    const progressBefore = loadDailyChallengeProgress();
    const progressAfter = markDailyChallengeCleared(activeChallenge.plan, totalBattles);
    setDailyChallengeFeedback(createDailyChallengeFeedback({
      plan: activeChallenge.plan,
      before: progressBefore,
      after: progressAfter,
      outcome: 'cleared',
      battlesCleared: totalBattles,
    }));
    setActiveChallenge(null);
    setQueuedChallenge(null);
  }, [activeChallenge]);

  return {
    queuedChallenge,
    activeChallenge,
    dailyChallengeFeedback,
    setDailyChallengeFeedback,
    clearChallengeRun,
    queueChallengePlan,
    activateQueuedChallenge,
    dailyPlan,
    settleRunAsFailed,
    settleRunAsCleared,
  };
}
