export function updateAdaptiveDifficulty({
  currentLevel,
  recentAnswers,
  correct,
  windowSize = 6,
  minLevel = 0,
  maxLevel = 4,
}) {
  const nextRecent = [...recentAnswers, correct].slice(-windowSize);
  if (nextRecent.length < 4) {
    return { nextLevel: currentLevel, nextRecent };
  }

  const rate = nextRecent.filter(Boolean).length / nextRecent.length;
  let nextLevel = currentLevel;
  if (rate >= 0.8 && nextLevel < maxLevel) nextLevel += 1;
  else if (rate <= 0.35 && nextLevel > minLevel) nextLevel -= 1;
  return { nextLevel, nextRecent };
}

export function resolveLevelProgress({
  currentExp,
  currentLevel,
  currentStage,
  gainExp,
  maxStage = 2,
  evolveEvery = 3,
  hpBonusPerLevel = 20,
}) {
  let nextExp = currentExp + gainExp;
  let nextLevel = currentLevel;
  let stageTracker = currentStage;
  let hpBonus = 0;
  let evolveCount = 0;

  while (nextExp >= nextLevel * 30) {
    nextExp -= nextLevel * 30;
    nextLevel += 1;
    if (stageTracker < maxStage && nextLevel % evolveEvery === 0) {
      stageTracker += 1;
      evolveCount += 1;
    } else {
      hpBonus += hpBonusPerLevel;
    }
  }

  return { nextExp, nextLevel, hpBonus, evolveCount };
}
