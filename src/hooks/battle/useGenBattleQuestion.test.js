import assert from 'node:assert/strict';
import test from 'node:test';
import { generateBattleQuestion } from './useGenBattleQuestion.ts';
import { createLearningProgress, planLearningQuestion } from '../../utils/learningProgress.ts';
import { createSeededRandom } from '../../utils/prng.ts';
import { STARTERS } from '../../data/starters.ts';

const move = { range: [1, 10], ops: ['+', '-'] };
function generate(overrides = {}) {
  return generateBattleQuestion({ rand: createSeededRandom('learning'), historyMap: new Map(), move, diffMod: 1, ...overrides });
}

test('generation uses planned operation and level, not legacy wrong-streak debuffs', () => {
  const plan = { ...planLearningQuestion(createLearningProgress(), move, () => 0), level: 4 };
  const q = generate({ learningPlan: plan, diffMod: 0.7 });
  const expected = generate({ move: { ...move, ops: ['+'] }, diffMod: 1.3 });
  assert.equal(q.display, expected.display);
  assert.equal(q.answer, expected.answer);
  assert.equal(q.learning.level, 4);
  assert.equal(q.op, '+');
});

test('a retry excludes the failed display even with empty history after reload', () => {
  const plan = planLearningQuestion(createLearningProgress(), move, () => 0);
  const first = generate({ learningPlan: plan });
  const retry = generate({ learningPlan: { ...plan, isRecovery: true, avoidDisplay: first.display } });
  assert.notEqual(retry.display, first.display);
  assert.equal(retry.learning.isRecovery, true);
});

test('bounded generation never grants recovery when fresh questions are unavailable', () => {
  const plan = planLearningQuestion(createLearningProgress(), move, () => 0);
  const first = generate({ rand: () => 0, learningPlan: plan });
  const retry = generate({ rand: () => 0, learningPlan: { ...plan, isRecovery: true, avoidDisplay: first.display } });
  assert.equal(retry.display, first.display);
  assert.equal(retry.learning.isRecovery, false);
});

test('restricted challenge questions ignore learning metadata and preserve allowed operations', () => {
  const plan = planLearningQuestion(createLearningProgress(), move, () => 0);
  const q = generate({ learningPlan: plan, options: { allowedOps: ['-'] } });
  const expected = generate({ options: { allowedOps: ['-'] } });
  assert.deepEqual(q, expected);
  assert.equal(q.op, '-');
  assert.equal(q.learning, undefined);
});

test('every shipped starter move can produce a skill-keyed solo question', () => {
  for (const starter of STARTERS) {
    for (const move of starter.moves) {
      const plan = planLearningQuestion(createLearningProgress(), move, () => 0);
      assert.ok(plan, `${starter.id}: ${move.name}`);
      const q = generate({ move, learningPlan: plan });
      assert.equal(q.op, plan.op);
      assert.ok(q.choices.includes(q.answer));
    }
  }
  assert.equal(generate({ move: undefined }), null);
});
