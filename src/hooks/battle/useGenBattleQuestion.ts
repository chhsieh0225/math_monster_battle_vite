import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { QuestionGeneratorOptions, QuestionGeneratorMove } from '../../utils/questionGenerator.ts';
import type { MoveVm } from '../../types/battle';
import type { LearningQuestionPlan } from '../../utils/learningProgress.ts';
import { DIFF_MODS } from './partnerStarter.ts';
import { genQ } from '../../utils/questionGenerator.ts';
import { withRandomSource } from '../../utils/prng.ts';
import {
  resolveQuestionRecentWindowSize,
  buildQuestionHistoryKey,
  deduplicateQuestion,
} from './questionDedup.ts';

type RandFn = () => number;

type GenerateArgs = {
  rand: RandFn;
  historyMap: Map<string, string[]>;
  move: MoveVm | undefined;
  diffMod: number;
  options?: QuestionGeneratorOptions;
  learningPlan?: LearningQuestionPlan | null;
};

export function generateBattleQuestion({ rand, historyMap, move, diffMod, options, learningPlan }: GenerateArgs) {
  if (!move) return null;
  const allowedOps = Array.isArray(options?.allowedOps) && options?.allowedOps.length > 0
    ? options.allowedOps
    : null;
  // Challenge restrictions take precedence, and never acquire solo learning metadata.
  if (allowedOps) learningPlan = null;
  const moveConfig: QuestionGeneratorMove = {
    range: move.range || [1, 10],
    ops: learningPlan ? [learningPlan.op] : move.ops || ['+', '-'],
  };
  // Solo mastery already lowers difficulty after mistakes; do not stack the old debuff.
  if (learningPlan) diffMod = DIFF_MODS[learningPlan.level];
  const generateQuestion = () => withRandomSource(rand, () => genQ(moveConfig, diffMod, options));
  const dedupWindow = resolveQuestionRecentWindowSize(moveConfig, diffMod, allowedOps);
  const historyKey = buildQuestionHistoryKey(moveConfig, diffMod, allowedOps);

  const question = deduplicateQuestion({
    generate: generateQuestion,
    historyMap,
    historyKey,
    dedupWindow,
    excludeDisplays: learningPlan?.avoidDisplay ? [learningPlan.avoidDisplay] : [],
  });
  if (!learningPlan) return question;
  const { avoidDisplay, ...learning } = learningPlan;
  return { ...question, learning: {
    ...learning, isRecovery: learning.isRecovery && question.display !== avoidDisplay,
  } };
}

export function useGenBattleQuestion({ rand, recentQuestionDisplaysRef, prepareLearningQuestion }: {
  rand: RandFn;
  recentQuestionDisplaysRef: MutableRefObject<Map<string, string[]>>;
  prepareLearningQuestion?: (move: MoveVm, random: RandFn) => LearningQuestionPlan | null;
}) {
  return useCallback(
    (move: MoveVm | undefined, diffMod: number, options?: QuestionGeneratorOptions) => generateBattleQuestion({
      rand, historyMap: recentQuestionDisplaysRef.current, move, diffMod, options,
      learningPlan: move && !options?.allowedOps?.length ? prepareLearningQuestion?.(move, rand) : null,
    }),
    [rand, recentQuestionDisplaysRef, prepareLearningQuestion],
  );
}
