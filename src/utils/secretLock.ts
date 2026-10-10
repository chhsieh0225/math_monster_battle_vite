/** The math lock on a hidden spot: one question at the child's grade. */
import { SECRET_LOCK_SKILLS } from '../data/worldSecrets.ts';
import type { Grade } from '../data/gradeCurriculum.ts';
import { alignOpsToGrade } from '../data/gradeCurriculum.ts';
import { alignOptionsToGrade } from '../hooks/battle/useGenBattleQuestion.ts';
import { genQ, type GeneratedQuestion, type QuestionGeneratorOptions } from './questionGenerator.ts';
import { withRandomSource } from './prng.ts';

export function createSecretQuestion(
  grade: Grade | null,
  rand: () => number,
  t?: QuestionGeneratorOptions['t'],
): GeneratedQuestion {
  const skills = SECRET_LOCK_SKILLS[grade ?? 3];
  const skill = skills[Math.min(skills.length - 1, Math.floor(rand() * skills.length))];
  const ops = grade ? alignOpsToGrade([skill.op], grade) : [skill.op];
  return withRandomSource(rand, () => genQ({ range: skill.range, ops }, 1, alignOptionsToGrade({ t }, grade)));
}
