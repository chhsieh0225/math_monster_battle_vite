import { readJson, writeJson } from './storage.ts';
import type { QuestionGeneratorMove } from './questionGenerator.ts';

const STORAGE_KEY = 'mathMonsterBattle_learning_v1';
const MAX_SKILLS = 128;
const PROOF_COUNT = 4;
const RECOVERY_GAP = 2;
const OPERATIONS = new Set([
  '+', '-', '\u00d7', '\u00f7', 'dec_add', 'dec_frac', 'dec_mul', 'dec_div',
  'mixed2', 'mixed3', 'mixed4', 'unknown1', 'unknown2', 'unknown3', 'unknown4',
  'frac_cmp', 'frac_same', 'frac_diff', 'frac_muldiv',
]);

export type LearningSkill = {
  op: string;
  range: [number, number];
  level: number;
  proof: number;
  independentCorrect: number;
  assistedCorrect: number;
  incorrect: number;
  recovered: number;
  recovery: { dueAfter: number; previousDisplay: string } | null;
};

export type LearningProgress = {
  version: 1;
  answered: number;
  skills: Record<string, LearningSkill>;
};

export type LearningQuestionMeta = {
  skillKey: string;
  op: string;
  range: [number, number];
  level: number;
  sequence: number;
  isRecovery: boolean;
};

export type LearningQuestion = {
  op?: string;
  display?: string;
  steps?: string[];
  hintsUsed?: number;
  learning?: LearningQuestionMeta;
};

export type LearningQuestionPlan = LearningQuestionMeta & { avoidDisplay?: string };

export function isSoloLearningMode(battleMode: string, timedMode: boolean, hasChallengeRun: boolean): boolean {
  return battleMode === 'single' && !timedMode && !hasChallengeRun;
}

export function createLearningProgress(): LearningProgress {
  return { version: 1, answered: 0, skills: {} };
}

export function learningSkillKey(op: string, range: readonly number[]): string {
  return `${op}:${range[0]}:${range[1]}`;
}

function newSkill(op: string, range: [number, number]): LearningSkill {
  return { op, range: [...range], level: 2, proof: 0, independentCorrect: 0,
    assistedCorrect: 0, incorrect: 0, recovered: 0, recovery: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRange(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(isCount)
    && value[0] >= 1 && value[1] >= value[0] && value[1] <= 10000;
}

export function normalizeLearningProgress(raw: unknown, fallback = createLearningProgress()): LearningProgress {
  if (!isRecord(raw) || raw.version !== 1 || !isCount(raw.answered) || !isRecord(raw.skills)) return fallback;
  const progress = createLearningProgress();
  progress.answered = raw.answered;
  for (const [key, value] of Object.entries(raw.skills).slice(0, MAX_SKILLS)) {
    if (!isRecord(value) || typeof value.op !== 'string' || !OPERATIONS.has(value.op) || !isRange(value.range)) continue;
    if (learningSkillKey(value.op, value.range) !== key || !isCount(value.level) || value.level > 4) continue;
    if (!['proof', 'independentCorrect', 'assistedCorrect', 'incorrect', 'recovered'].every((name) => isCount(value[name]))) continue;
    const skill = newSkill(value.op, value.range);
    skill.level = value.level;
    skill.proof = Math.min(PROOF_COUNT - 1, Number(value.proof));
    skill.independentCorrect = Number(value.independentCorrect);
    skill.assistedCorrect = Number(value.assistedCorrect);
    skill.incorrect = Number(value.incorrect);
    skill.recovered = Number(value.recovered);
    if (isRecord(value.recovery) && isCount(value.recovery.dueAfter) && typeof value.recovery.previousDisplay === 'string') {
      skill.recovery = { dueAfter: Math.min(value.recovery.dueAfter, progress.answered + RECOVERY_GAP),
        previousDisplay: value.recovery.previousDisplay.slice(0, 300) };
    }
    progress.skills[key] = skill;
  }
  return progress;
}

export function loadLearningProgress(fallback = createLearningProgress()): LearningProgress {
  return normalizeLearningProgress(readJson<unknown>(STORAGE_KEY, null), fallback);
}

export function saveLearningProgress(progress: LearningProgress): boolean {
  return writeJson(STORAGE_KEY, progress);
}

export function resetLearningProgress(): boolean {
  // Keep an explicit empty record so a mounted game can observe a parent reset.
  return saveLearningProgress(createLearningProgress());
}

export function planLearningQuestion(
  progress: LearningProgress,
  move: QuestionGeneratorMove,
  random: () => number,
): LearningQuestionPlan | null {
  if (!isRange(move.range)) return null;
  const ops = [...new Set(move.ops)].filter((op) => OPERATIONS.has(op));
  if (ops.length === 0) return null;
  const candidates = ops.map((op) => {
    const key = learningSkillKey(op, move.range);
    return { key, skill: progress.skills[key] || newSkill(op, move.range) };
  });
  const due = candidates.filter(({ skill }) => skill.recovery && skill.recovery.dueAfter <= progress.answered)
    .sort((a, b) => a.skill.recovery!.dueAfter - b.skill.recovery!.dueAfter);
  const roll = random();
  const index = Number.isFinite(roll) ? Math.max(0, Math.min(candidates.length - 1, Math.floor(roll * candidates.length))) : 0;
  const selected = due[0] || candidates[index];
  return {
    skillKey: selected.key, op: selected.skill.op, range: [...move.range],
    level: selected.skill.level, sequence: progress.answered + 1,
    isRecovery: due.length > 0,
    avoidDisplay: due.length > 0 ? selected.skill.recovery?.previousDisplay : undefined,
  };
}

export function recordLearningAnswer(progress: LearningProgress, question: LearningQuestion, correct: boolean): {
  progress: LearningProgress; recovered: boolean;
} {
  const meta = question.learning;
  if (!meta || meta.sequence !== progress.answered + 1 || meta.op !== question.op
    || !OPERATIONS.has(meta.op) || !isRange(meta.range) || !isCount(meta.level) || meta.level > 4
    || meta.skillKey !== learningSkillKey(meta.op, meta.range)) return { progress, recovered: false };
  if (!progress.skills[meta.skillKey] && Object.keys(progress.skills).length >= MAX_SKILLS) return { progress, recovered: false };
  const skill = { ...(progress.skills[meta.skillKey] || newSkill(meta.op, meta.range)) };
  const answered = progress.answered + 1;
  const assisted = (question.hintsUsed || 0) > 0;
  const recovered = Boolean(correct && !assisted && meta.isRecovery && skill.recovery
    && skill.recovery.dueAfter <= progress.answered && question.display
    && question.display !== skill.recovery.previousDisplay);
  if (!correct || assisted) {
    if (correct) skill.assistedCorrect += 1;
    else { skill.incorrect += 1; skill.level = Math.max(0, skill.level - 1); }
    skill.proof = 0;
    skill.recovery = {
      dueAfter: skill.recovery && !meta.isRecovery ? skill.recovery.dueAfter : answered + RECOVERY_GAP,
      previousDisplay: (question.display || '').slice(0, 300),
    };
  } else {
    skill.independentCorrect += 1;
    // Require fresh evidence at this level, not a repeatedly reused accuracy window.
    if (meta.level >= skill.level) skill.proof += 1;
    if (skill.proof >= PROOF_COUNT) { skill.level = Math.min(4, skill.level + 1); skill.proof = 0; }
    if (recovered) { skill.recovery = null; skill.recovered += 1; }
  }
  return { progress: { version: 1, answered, skills: { ...progress.skills, [meta.skillKey]: skill } }, recovered };
}

type Translate = (key: string, fallback: string) => string;

export function getLearningHintSteps(question: LearningQuestion, t: Translate): string[] {
  const steps = question.steps || [];
  if (!question.learning) return steps;
  const op = question.op || '+';
  let kind = 'mixed';
  let fallback = 'Work through parentheses first, then multiplication and division, then addition and subtraction.';
  if (op === '+') { kind = 'add'; fallback = 'Start with the larger number, then count on by the smaller number.'; }
  else if (op === '-') { kind = 'sub'; fallback = 'Find the distance between the two numbers. You can count up from the smaller one.'; }
  else if (op === '\u00d7') { kind = 'mul'; fallback = 'Think of equal groups. Add one group at a time, or use a multiplication fact you know.'; }
  else if (op === '\u00f7') { kind = 'div'; fallback = 'Think backwards: what number multiplied by the divisor gives the total?'; }
  else if (op.startsWith('dec_')) { kind = 'decimal'; fallback = 'Check place values and the decimal point. Write equivalent values before calculating.'; }
  else if (op.startsWith('frac_')) { kind = 'fraction'; fallback = 'Check the denominators. Use equivalent fractions when comparing, adding, or subtracting.'; }
  else if (op.startsWith('unknown')) { kind = 'unknown'; fallback = 'Keep both sides equal. Use the opposite operation to work backwards to the missing number.'; }
  return [t(`battle.learning.hint.${kind}`, fallback), ...steps];
}

export function getLearningHintCost(question: LearningQuestion, revealed: number, paidCost: number): number {
  return question.learning && revealed === 0 ? 0 : paidCost;
}

export function summarizeLearningProgress(progress: LearningProgress) {
  return Object.values(progress.skills).reduce((summary, skill) => ({
    independent: summary.independent + skill.independentCorrect,
    assisted: summary.assisted + skill.assistedCorrect,
    recovered: summary.recovered + skill.recovered,
    pending: summary.pending + (skill.recovery ? 1 : 0),
  }), { independent: 0, assisted: 0, recovered: 0, pending: 0 });
}
