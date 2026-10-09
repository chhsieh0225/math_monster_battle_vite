/**
 * Placement check: two representative questions for the stated grade and for
 * the grades on either side (4-6 questions, about two minutes). The child's
 * grade moves at most one step up, or down by up to two, from what they said.
 */
import { GRADES, type Grade } from '../data/gradeCurriculum.ts';
import type { QuestionGeneratorMove } from './questionGenerator.ts';

export type PlacementItem = { grade: Grade; move: QuestionGeneratorMove };

/** Typical end-of-grade skills, easiest first. */
const GRADE_ITEMS: Record<Grade, QuestionGeneratorMove[]> = {
  1: [{ ops: ['+'], range: [2, 9] }, { ops: ['-'], range: [3, 18] }],
  2: [{ ops: ['+'], range: [15, 80] }, { ops: ['×'], range: [2, 9] }],
  3: [{ ops: ['÷'], range: [2, 9] }, { ops: ['-'], range: [120, 900] }],
  4: [{ ops: ['frac_same'], range: [3, 9] }, { ops: ['mixed4'], range: [2, 9] }],
  5: [{ ops: ['frac_diff'], range: [2, 8] }, { ops: ['dec_mul'], range: [2, 9] }],
  6: [{ ops: ['frac_muldiv'], range: [2, 9] }, { ops: ['unknown4'], range: [2, 9] }],
};

function clampGrade(value: number): Grade {
  return Math.max(1, Math.min(6, Math.round(value))) as Grade;
}

export function buildPlacementPlan(selfGrade: Grade): PlacementItem[] {
  const grades = [...new Set([selfGrade - 1, selfGrade, selfGrade + 1].map(clampGrade))]
    .filter((grade) => GRADES.includes(grade));
  return grades.flatMap((grade) => GRADE_ITEMS[grade].map((move) => ({ grade, move })));
}

export type PlacementAnswer = { grade: Grade; correct: boolean };

export function scorePlacement(selfGrade: Grade, answers: readonly PlacementAnswer[]): Grade {
  const correctAt = (grade: number) => answers.filter((answer) => answer.grade === grade && answer.correct).length;
  const askedAt = (grade: number) => answers.filter((answer) => answer.grade === grade).length;
  const at = correctAt(selfGrade);
  if (askedAt(selfGrade + 1) > 0 && correctAt(selfGrade + 1) === askedAt(selfGrade + 1) && at === askedAt(selfGrade)) {
    return clampGrade(selfGrade + 1);
  }
  if (askedAt(selfGrade) > 0 && at === 0) {
    const below = askedAt(selfGrade - 1) > 0 ? correctAt(selfGrade - 1) : null;
    return clampGrade(below === 0 ? selfGrade - 2 : selfGrade - 1);
  }
  return selfGrade;
}
