import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAbilityModel,
  getDifficultyLevelForOp,
  getDifficultyLevelForOps,
  mapOpToAbilityGroup,
  resolveLevelProgress,
  updateAbilityModel,
  updateAdaptiveDifficulty,
} from './battleEngine.js';

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

test('ability model maps ops into grouped skills and updates only target group', () => {
  const model = createAbilityModel(2);
  const res = updateAbilityModel({
    model,
    op: "unknown3",
    correct: false,
    windowSize: 4,
  });

  assert.equal(res.group, "unknown");
  assert.equal(mapOpToAbilityGroup("mixed4"), "mixed");
  assert.equal(getDifficultyLevelForOp(res.nextModel, "unknown1"), 2);
  assert.equal(getDifficultyLevelForOp(res.nextModel, "+"), 2);
});

test('ability model raises and lowers per-op level independently', () => {
  let model = createAbilityModel(2);

  // Push multiplication up
  for (const ans of [true, true, true, true]) {
    model = updateAbilityModel({ model, op: "×", correct: ans, windowSize: 4 }).nextModel;
  }
  assert.equal(getDifficultyLevelForOp(model, "×"), 3);
  assert.equal(getDifficultyLevelForOp(model, "÷"), 2);

  // Push unknown down
  for (const ans of [false, false, false, false]) {
    model = updateAbilityModel({ model, op: "unknown2", correct: ans, windowSize: 4 }).nextModel;
  }
  assert.equal(getDifficultyLevelForOp(model, "unknown4"), 1);
  assert.equal(getDifficultyLevelForOp(model, "mixed2"), 2);
});

test('getDifficultyLevelForOps averages move ops to one runtime difficulty', () => {
  let model = createAbilityModel(2);
  model = {
    ...model,
    mul: { level: 4, recent: [true, true, true, true] },
    div: { level: 0, recent: [false, false, false, false] },
  };
  assert.equal(getDifficultyLevelForOps(model, ["×", "÷"]), 2);
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
