import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { buildPlacementPlan, scorePlacement } from './placementQuiz.ts';
import { createPlayerProfile, loadPlayerProfile, normalizePlayerProfile, savePlayerProfile } from './playerProfile.ts';
import { genQ } from './questionGenerator.ts';

let previousStorage;
beforeEach(() => {
  previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
});
afterEach(() => { globalThis.localStorage = previousStorage; });

const answers = (plan, correctFor) => plan.map((item) => ({ grade: item.grade, correct: correctFor(item.grade) }));

test('the check asks around the stated grade and every item generates', () => {
  assert.deepEqual([...new Set(buildPlacementPlan(3).map((i) => i.grade))], [2, 3, 4]);
  assert.deepEqual([...new Set(buildPlacementPlan(1).map((i) => i.grade))], [1, 2]);
  assert.deepEqual([...new Set(buildPlacementPlan(6).map((i) => i.grade))], [5, 6]);
  for (let grade = 1; grade <= 6; grade += 1) {
    for (const item of buildPlacementPlan(grade)) {
      const q = genQ(item.move, 1);
      assert.equal(q.choices.length, 4);
      assert.ok(q.choices.includes(q.answer), q.display);
    }
  }
});

test('placement moves up one grade at most and down when the grade is not yet secure', () => {
  const plan = buildPlacementPlan(3);
  assert.equal(scorePlacement(3, answers(plan, () => true)), 4, 'aced everything');
  assert.equal(scorePlacement(3, answers(plan, (g) => g <= 3)), 3, 'solid at grade');
  assert.equal(scorePlacement(3, answers(plan, (g) => g === 2)), 2, 'grade items missed');
  assert.equal(scorePlacement(3, answers(plan, () => false)), 1, 'nothing yet: two grades down');
  assert.equal(scorePlacement(1, answers(buildPlacementPlan(1), () => false)), 1, 'never below grade 1');
  assert.equal(scorePlacement(6, answers(buildPlacementPlan(6), () => true)), 6, 'never above grade 6');
  const mixed = plan.map((item, i) => ({ grade: item.grade, correct: item.grade === 3 ? i % 2 === 0 : true }));
  assert.equal(scorePlacement(3, mixed), 3, 'half right at grade stays');
});

test('the profile survives storage and rejects bad data', () => {
  const profile = createPlayerProfile({ grade: 2, selfGrade: 3, method: 'quiz', quiz: { correct: 2, total: 6 }, now: new Date(0) });
  assert.equal(savePlayerProfile(profile), true);
  assert.deepEqual(loadPlayerProfile(), profile);
  assert.equal(normalizePlayerProfile({ ...profile, grade: 9 }), null);
  assert.equal(normalizePlayerProfile('x'), null);
  assert.equal(normalizePlayerProfile({ ...profile, quiz: { correct: 5, total: 2 } }).quiz, null);
});
