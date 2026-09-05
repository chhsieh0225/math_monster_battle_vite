import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { MoveVm } from '../../types/battle';
import {
  loadLearningProgress, saveLearningProgress, planLearningQuestion, recordLearningAnswer,
} from '../../utils/learningProgress.ts';
import type { LearningProgress, LearningQuestion, LearningQuestionPlan } from '../../utils/learningProgress.ts';
import {
  createAbilityModel,
  getDifficultyLevelForOps,
  updateAbilityModel,
} from '../../utils/battleEngine';

type UseBattleAbilityModelArgs = {
  baselineLevel?: number;
  onLevelChange: (nextLevel: number) => void;
  persistent?: boolean;
  onRecovered?: () => void;
  onStorageError?: () => void;
};

export type UseBattleAbilityModelResult = {
  abilityModelRef: MutableRefObject<ReturnType<typeof createAbilityModel>>;
  updateAbility: (op: string | undefined, correct: boolean, question?: LearningQuestion | null) => void;
  getMoveDiffLevel: (move: MoveVm | undefined) => number;
  prepareLearningQuestion: (move: MoveVm, random: () => number) => LearningQuestionPlan | null;
};

export function useBattleAbilityModel({
  baselineLevel = 2,
  onLevelChange,
  persistent = false,
  onRecovered,
  onStorageError,
}: UseBattleAbilityModelArgs): UseBattleAbilityModelResult {
  const abilityModelRef = useRef(createAbilityModel(baselineLevel));
  const learningRef = useRef<LearningProgress | undefined>(undefined);
  const unsavedLearning = useRef(false);
  const storageWarningShown = useRef(false);

  const prepareLearningQuestion = useCallback((move: MoveVm, random: () => number): LearningQuestionPlan | null => {
    if (!persistent) return null;
    // Read once per question, not per render. This also observes parent resets.
    if (!unsavedLearning.current) learningRef.current = loadLearningProgress(learningRef.current);
    if (!learningRef.current) learningRef.current = loadLearningProgress();
    return planLearningQuestion(learningRef.current, { range: move.range || [1, 10], ops: move.ops || ['+', '-'] }, random);
  }, [persistent]);

  const updateAbility = useCallback((op: string | undefined, correct: boolean, question?: LearningQuestion | null): void => {
    if (!op) return;
    if (persistent && question?.learning) {
      const before = unsavedLearning.current
        ? learningRef.current || loadLearningProgress()
        : loadLearningProgress(learningRef.current);
      const result = recordLearningAnswer(before, question, correct);
      if (result.progress === before) return;
      learningRef.current = result.progress;
      unsavedLearning.current = !saveLearningProgress(result.progress);
      if (unsavedLearning.current && !storageWarningShown.current) {
        storageWarningShown.current = true;
        onStorageError?.();
      }
      if (result.recovered) onRecovered?.();
      return;
    }
    const { nextModel, nextLevel } = updateAbilityModel({
      model: abilityModelRef.current,
      op,
      correct,
    });
    abilityModelRef.current = nextModel;
    onLevelChange(nextLevel);
  }, [onLevelChange, persistent, onRecovered, onStorageError]);

  const getMoveDiffLevel = useCallback((move: MoveVm | undefined): number => (
    persistent ? baselineLevel : getDifficultyLevelForOps(abilityModelRef.current, move?.ops, baselineLevel)
  ), [baselineLevel, persistent]);

  return {
    abilityModelRef,
    updateAbility,
    getMoveDiffLevel,
    prepareLearningQuestion,
  };
}
