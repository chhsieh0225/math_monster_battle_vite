import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLevelProgress, updateAdaptiveDifficulty } from './battleEngine.js';

test('updateAdaptiveDifficulty raises and lowers level by recent accuracy window', () => {
  const hard = updateAdaptiveDifficulty({
    currentLevel: 2,
    recentAnswers: [true, true, true, true, false],
    correct: true,
  });
  assert.equal(hard.nextLevel, 3);

  const easy = updateAdaptiveDifficulty({
    currentLevel: 3,
    recentAnswers: [false, false, true, false, false],
    correct: false,
  });
  assert.equal(easy.nextLevel, 2);
});

test('updateAdaptiveDifficulty keeps level when sample is too small', () => {
  const res = updateAdaptiveDifficulty({
    currentLevel: 2,
    recentAnswers: [true, false],
    correct: true,
  });
  assert.equal(res.nextLevel, 2);
  assert.deepEqual(res.nextRecent, [true, false, true]);
});

test('resolveLevelProgress returns exp, level, hp bonus, and evolve count', () => {
  const res = resolveLevelProgress({
    currentExp: 50,
    currentLevel: 2,
    currentStage: 0,
    gainExp: 120,
  });
  assert.equal(res.nextLevel, 4);
  assert.equal(res.nextExp, 20);
  assert.equal(res.evolveCount, 1);
  assert.equal(res.hpBonus, 20);
});
