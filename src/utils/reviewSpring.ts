/**
 * Review spring: three questions drawn from what the child got wrong (pending
 * recovery), then their weakest skills, then the current monster's moves.
 * Correct answers heal and give EXP. Questions go through the same grade
 * alignment and learning records as battle questions, one at a time, so a
 * recovered skill counts exactly like a recovery in battle.
 */
import { DIFF_MODS } from '../hooks/battle/partnerStarter.ts';
import { alignMoveToGrade, alignOptionsToGrade, generateBattleQuestion } from '../hooks/battle/useGenBattleQuestion.ts';
import type { Grade } from '../data/gradeCurriculum.ts';
import type { MoveVm, QuestionVm } from '../types/battle';
import { planLearningQuestion, recordLearningAnswer, type LearningProgress } from './learningProgress.ts';
import type { QuestionGeneratorOptions } from './questionGenerator.ts';

export const SPRING_QUESTION_COUNT = 3;
export const SPRING_TUNING = {
  /** HP restored per correct answer, as a share of max HP. */
  healPerCorrect: 0.15,
  /** EXP per correct answer, per player level. */
  expPerCorrectPerLevel: 4,
} as const;

export type SpringTarget = {
  op: string;
  range: [number, number];
  /** Why this skill was picked; shown to the child. */
  reason: 'mistake' | 'weak' | 'practice';
};

/** Up to `count` distinct skills to review, most useful first. */
export function pickSpringTargets(
  progress: LearningProgress,
  moves: readonly Pick<MoveVm, 'ops' | 'range'>[],
  count = SPRING_QUESTION_COUNT,
): SpringTarget[] {
  const skills = Object.values(progress.skills);
  const mistakes = skills
    .filter((skill) => skill.recovery)
    .sort((a, b) => (a.recovery?.dueAfter ?? 0) - (b.recovery?.dueAfter ?? 0))
    .map((skill): SpringTarget => ({ op: skill.op, range: [...skill.range], reason: 'mistake' }));
  const weak = skills
    .filter((skill) => !skill.recovery && skill.incorrect > 0)
    .sort((a, b) => a.level - b.level || b.incorrect - a.incorrect)
    .map((skill): SpringTarget => ({ op: skill.op, range: [...skill.range], reason: 'weak' }));
  const practice = moves
    .filter((move) => Array.isArray(move.range) && Array.isArray(move.ops) && move.ops.length > 0)
    .flatMap((move) => move.ops!.map((op): SpringTarget => ({ op, range: [...move.range!] as [number, number], reason: 'practice' })));
  const picked: SpringTarget[] = [];
  const seen = new Set<string>();
  for (const target of [...mistakes, ...weak, ...practice]) {
    const key = `${target.op}:${target.range.join('-')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(target);
    if (picked.length >= count) break;
  }
  // Fewer distinct skills than questions: revisit the first ones.
  for (let i = 0; picked.length > 0 && picked.length < count; i += 1) picked.push(picked[i]);
  return picked;
}

export type SpringQuestion = QuestionVm & { springReason: SpringTarget['reason'] };

/**
 * One review question. With `progress` (persistent learning), the question
 * carries learning metadata so answering it updates mastery and recovery.
 */
export function createSpringQuestion({
  target, progress, grade, rand, historyMap, t,
}: {
  target: SpringTarget;
  progress: LearningProgress | null;
  grade: Grade | null;
  rand: () => number;
  historyMap: Map<string, string[]>;
  t?: QuestionGeneratorOptions['t'];
}): SpringQuestion | null {
  const move = alignMoveToGrade({ range: target.range, ops: [target.op] }, grade) as MoveVm;
  const plan = progress ? planLearningQuestion(progress, { range: move.range!, ops: move.ops! }, rand) : null;
  const level = plan?.level ?? 2;
  const question = generateBattleQuestion({
    rand,
    historyMap,
    move,
    diffMod: DIFF_MODS[Math.max(0, Math.min(DIFF_MODS.length - 1, level))],
    options: alignOptionsToGrade({ t }, grade),
    learningPlan: plan,
  });
  return question ? { ...(question as QuestionVm), springReason: target.reason } : null;
}

export function springRewards(correct: number, maxHp: number, level: number): { heal: number; exp: number } {
  const n = Math.max(0, Math.min(SPRING_QUESTION_COUNT, Math.floor(correct)));
  return {
    heal: Math.round(maxHp * SPRING_TUNING.healPerCorrect * n),
    exp: n * SPRING_TUNING.expPerCorrectPerLevel * Math.max(1, Math.floor(level)),
  };
}

/**
 * One visit to the spring. Holds the learning record between questions so each
 * question is planned from the answers before it.
 */
export class SpringSession {
  readonly targets: SpringTarget[];
  private progress: LearningProgress | null;
  private readonly history = new Map<string, string[]>();
  private startedAt = 0;
  private finished = false;

  constructor(private readonly args: {
    progress: LearningProgress | null;
    moves: readonly Pick<MoveVm, 'ops' | 'range'>[];
    grade: Grade | null;
    rand: () => number;
    save?: (progress: LearningProgress) => void;
    t?: QuestionGeneratorOptions['t'];
    now?: () => number;
  }) {
    this.progress = args.progress;
    this.targets = pickSpringTargets(args.progress ?? { version: 1, answered: 0, skills: {} }, args.moves)
      .slice(0, SPRING_QUESTION_COUNT);
  }

  question(index: number): SpringQuestion | null {
    const target = this.targets[index];
    if (!target) return null;
    this.startedAt = (this.args.now ?? (() => performance.now()))();
    return createSpringQuestion({
      target, progress: this.progress, grade: this.args.grade, rand: this.args.rand, historyMap: this.history, t: this.args.t,
    });
  }

  /** Grade an answer and update mastery / recovery when learning is persistent. */
  answer(question: SpringQuestion, choiceIndex: number) {
    const correct = question.choices?.[choiceIndex] === question.answer;
    if (this.progress && question.learning) {
      const result = recordLearningAnswer(this.progress, question, correct);
      if (result.progress !== this.progress) {
        this.progress = result.progress;
        this.args.save?.(result.progress);
      }
    }
    return {
      correct,
      op: question.op || '',
      display: question.display,
      answerTimeMs: Math.round((this.args.now ?? (() => performance.now()))() - this.startedAt),
      reason: question.springReason,
    };
  }

  /** True only the first time, so leaving twice cannot pay out twice. */
  claimFinish(): boolean {
    if (this.finished) return false;
    this.finished = true;
    return true;
  }
}
