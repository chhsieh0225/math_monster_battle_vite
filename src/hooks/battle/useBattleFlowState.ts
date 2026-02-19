import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { BattleMode, ScreenName } from '../../types/battle.ts';
import type { DailyChallengePlan, StreakTowerPlan } from '../../types/challenges.ts';

type UseBattleFlowStateArgs = {
  queueDailyChallengePlan: (plan: DailyChallengePlan | null | undefined) => void;
  queueTowerChallengePlan: (plan: StreakTowerPlan | null | undefined) => void;
};

type UseBattleFlowStateApi = {
  screen: ScreenName;
  timedMode: boolean;
  battleMode: BattleMode;
  setScreenState: Dispatch<SetStateAction<ScreenName>>;
  setTimedMode: Dispatch<SetStateAction<boolean>>;
  setBattleMode: Dispatch<SetStateAction<BattleMode>>;
  queueDailyChallenge: (plan: DailyChallengePlan) => void;
  queueTowerChallenge: (plan: StreakTowerPlan) => void;
};

export function useBattleFlowState({
  queueDailyChallengePlan,
  queueTowerChallengePlan,
}: UseBattleFlowStateArgs): UseBattleFlowStateApi {
  const [screen, setScreenState] = useState<ScreenName>('title');
  const [timedMode, setTimedMode] = useState(false);
  const [battleMode, setBattleMode] = useState<BattleMode>('single');

  const queueDailyChallenge = useCallback((plan: DailyChallengePlan) => {
    queueDailyChallengePlan(plan);
    setTimedMode(true);
    setBattleMode('single');
  }, [queueDailyChallengePlan]);

  const queueTowerChallenge = useCallback((plan: StreakTowerPlan) => {
    queueTowerChallengePlan(plan);
    setTimedMode(true);
    setBattleMode('single');
  }, [queueTowerChallengePlan]);

  return {
    screen,
    timedMode,
    battleMode,
    setScreenState,
    setTimedMode,
    setBattleMode,
    queueDailyChallenge,
    queueTowerChallenge,
  };
}
