import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  ChallengeRunState,
  DailyChallengeFeedback,
  DailyChallengePlan,
  StreakTowerPlan,
  TowerChallengeFeedback,
} from '../types/challenges.ts';
import {
  loadDailyChallengeProgress,
  loadTowerProgress,
  markDailyChallengeCleared,
  markDailyChallengeFailed,
  recordTowerDefeat,
  recordTowerFloorClear,
} from '../utils/challengeProgress.ts';
import {
  createDailyChallengeFeedback,
  createTowerChallengeFeedback,
  getDailyChallengeEnemyTotal,
} from './battle/challengeRuntime.ts';

export type DailyChallengeRunState = Extract<ChallengeRunState, { kind: 'daily' }>;
export type TowerChallengeRunState = Extract<ChallengeRunState, { kind: 'tower' }>;

type UseDailyChallengeRunApi = {
  queuedChallenge: ChallengeRunState | null;
  activeChallenge: ChallengeRunState | null;
  dailyChallengeFeedback: DailyChallengeFeedback | null;
  towerChallengeFeedback: TowerChallengeFeedback | null;
  setDailyChallengeFeedback: Dispatch<SetStateAction<DailyChallengeFeedback | null>>;
  setTowerChallengeFeedback: Dispatch<SetStateAction<TowerChallengeFeedback | null>>;
  clearChallengeRun: () => void;
  queueDailyChallengePlan: (plan: DailyChallengePlan | null | undefined) => void;
  queueTowerChallengePlan: (plan: StreakTowerPlan | null | undefined) => void;
  activateQueuedChallenge: () => void;
  dailyPlan: DailyChallengePlan | null;
  towerPlan: StreakTowerPlan | null;
  settleRunAsFailed: (battlesCleared: number) => void;
  settleRunAsCleared: () => void;
};

function resolveTowerStartFloor(plan: StreakTowerPlan): number {
  const floor = Number(plan.floors?.[0]?.floor);
  if (Number.isFinite(floor) && floor > 0) return Math.floor(floor);
  return Math.max(1, Math.floor(Number(plan.startFloor) || 1));
}

export function useDailyChallengeRun(): UseDailyChallengeRunApi {
  const [queuedChallenge, setQueuedChallenge] = useState<ChallengeRunState | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeRunState | null>(null);
  const [dailyChallengeFeedback, setDailyChallengeFeedback] = useState<DailyChallengeFeedback | null>(null);
  const [towerChallengeFeedback, setTowerChallengeFeedback] = useState<TowerChallengeFeedback | null>(null);

  const clearChallengeRun = useCallback(() => {
    setQueuedChallenge(null);
    setActiveChallenge(null);
    setDailyChallengeFeedback(null);
    setTowerChallengeFeedback(null);
  }, []);

  const queueDailyChallengePlan = useCallback((plan: DailyChallengePlan | null | undefined) => {
    if (!plan) return;
    setQueuedChallenge({ kind: 'daily', plan });
  }, []);

  const queueTowerChallengePlan = useCallback((plan: StreakTowerPlan | null | undefined) => {
    if (!plan) return;
    setQueuedChallenge({ kind: 'tower', plan });
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

  const towerPlan = useMemo(() => {
    if (activeChallenge?.kind === 'tower' && activeChallenge.plan) return activeChallenge.plan;
    if (queuedChallenge?.kind === 'tower' && queuedChallenge.plan) return queuedChallenge.plan;
    return null;
  }, [activeChallenge, queuedChallenge]);

  const settleRunAsFailed = useCallback((battlesCleared: number) => {
    if (!activeChallenge) return;

    if (activeChallenge.kind === 'daily' && activeChallenge.plan) {
      const progressBefore = loadDailyChallengeProgress();
      const progressAfter = markDailyChallengeFailed(activeChallenge.plan, battlesCleared);
      setDailyChallengeFeedback(createDailyChallengeFeedback({
        plan: activeChallenge.plan,
        before: progressBefore,
        after: progressAfter,
        outcome: 'failed',
        battlesCleared,
      }));
      setTowerChallengeFeedback(null);
    }

    if (activeChallenge.kind === 'tower' && activeChallenge.plan) {
      const floor = resolveTowerStartFloor(activeChallenge.plan);
      const progressBefore = loadTowerProgress();
      const progressAfter = recordTowerDefeat();
      setTowerChallengeFeedback(createTowerChallengeFeedback({
        plan: activeChallenge.plan,
        before: progressBefore,
        after: progressAfter,
        outcome: 'failed',
        floor,
      }));
      setDailyChallengeFeedback(null);
    }

    setActiveChallenge(null);
    setQueuedChallenge(null);
  }, [activeChallenge]);

  const settleRunAsCleared = useCallback(() => {
    if (!activeChallenge) return;

    if (activeChallenge.kind === 'daily' && activeChallenge.plan) {
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
      setTowerChallengeFeedback(null);
    }

    if (activeChallenge.kind === 'tower' && activeChallenge.plan) {
      const floor = resolveTowerStartFloor(activeChallenge.plan);
      const progressBefore = loadTowerProgress();
      const progressAfter = recordTowerFloorClear(floor);
      setTowerChallengeFeedback(createTowerChallengeFeedback({
        plan: activeChallenge.plan,
        before: progressBefore,
        after: progressAfter,
        outcome: 'cleared',
        floor,
      }));
      setDailyChallengeFeedback(null);
    }

    setActiveChallenge(null);
    setQueuedChallenge(null);
  }, [activeChallenge]);

  return {
    queuedChallenge,
    activeChallenge,
    dailyChallengeFeedback,
    towerChallengeFeedback,
    setDailyChallengeFeedback,
    setTowerChallengeFeedback,
    clearChallengeRun,
    queueDailyChallengePlan,
    queueTowerChallengePlan,
    activateQueuedChallenge,
    dailyPlan,
    towerPlan,
    settleRunAsFailed,
    settleRunAsCleared,
  };
}
