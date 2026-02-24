import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { QuestionGeneratorOptions, QuestionGeneratorMove } from '../../utils/questionGenerator.ts';
import type { MoveVm } from '../../types/battle';
import { genQ } from '../../utils/questionGenerator.ts';
import { withRandomSource } from '../../utils/prng.ts';
import {
  resolveQuestionRecentWindowSize,
  buildQuestionHistoryKey,
  deduplicateQuestion,
} from './questionDedup.ts';

type RandFn = () => number;

export function useGenBattleQuestion({
  rand,
  recentQuestionDisplaysRef,
}: {
  rand: RandFn;
  recentQuestionDisplaysRef: MutableRefObject<Map<string, string[]>>;
}) {
  return useCallback(
    (
      move: MoveVm | undefined,
      diffMod: number,
      options?: QuestionGeneratorOptions,
    ) => {
      if (!move) return null;
      const allowedOps = Array.isArray(options?.allowedOps) && options?.allowedOps.length > 0
        ? options.allowedOps
        : null;
      const moveConfig: QuestionGeneratorMove = {
        range: move.range || [1, 10],
        ops: move.ops || ['+', '-'],
      };
      const generateQuestion = () => withRandomSource(rand, () => genQ(moveConfig, diffMod, options));
      const dedupWindow = resolveQuestionRecentWindowSize(moveConfig, diffMod, allowedOps);
      const historyKey = buildQuestionHistoryKey(moveConfig, diffMod, allowedOps);

      return deduplicateQuestion({
        generate: generateQuestion,
        historyMap: recentQuestionDisplaysRef.current,
        historyKey,
        dedupWindow,
      });
    },
    [rand, recentQuestionDisplaysRef],
  );
}
