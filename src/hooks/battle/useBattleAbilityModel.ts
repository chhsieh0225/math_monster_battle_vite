import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { MoveVm } from '../../types/battle';
import {
  createAbilityModel,
  getDifficultyLevelForOps,
  updateAbilityModel,
} from '../../utils/battleEngine';

type UseBattleAbilityModelArgs = {
  baselineLevel?: number;
  onLevelChange: (nextLevel: number) => void;
};

export type UseBattleAbilityModelResult = {
  abilityModelRef: MutableRefObject<ReturnType<typeof createAbilityModel>>;
  updateAbility: (op: string | undefined, correct: boolean) => void;
  getMoveDiffLevel: (move: MoveVm | undefined) => number;
};

export function useBattleAbilityModel({
  baselineLevel = 2,
  onLevelChange,
}: UseBattleAbilityModelArgs): UseBattleAbilityModelResult {
  const abilityModelRef = useRef(createAbilityModel(baselineLevel));

  const updateAbility = useCallback((op: string | undefined, correct: boolean): void => {
    if (!op) return;
    const { nextModel, nextLevel } = updateAbilityModel({
      model: abilityModelRef.current,
      op,
      correct,
    });
    abilityModelRef.current = nextModel;
    onLevelChange(nextLevel);
  }, [onLevelChange]);

  const getMoveDiffLevel = useCallback((move: MoveVm | undefined): number => (
    getDifficultyLevelForOps(abilityModelRef.current, move?.ops, baselineLevel)
  ), [baselineLevel]);

  return {
    abilityModelRef,
    updateAbility,
    getMoveDiffLevel,
  };
}
