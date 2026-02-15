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

const OP_TO_GROUP = {
  "+": "add",
  "-": "sub",
  "×": "mul",
  "÷": "div",
  mixed2: "mixed",
  mixed3: "mixed",
  mixed4: "mixed",
  unknown1: "unknown",
  unknown2: "unknown",
  unknown3: "unknown",
  unknown4: "unknown",
};

export const ABILITY_GROUPS = ["add", "sub", "mul", "div", "unknown", "mixed"];

export function mapOpToAbilityGroup(op) {
  return OP_TO_GROUP[op] || "mixed";
}

export function createAbilityModel(initialLevel = 2) {
  const clamped = Math.max(0, Math.min(4, initialLevel));
  const model = {};
  for (const group of ABILITY_GROUPS) {
    model[group] = { level: clamped, recent: [] };
  }
  return model;
}

function getBucket(model, group, fallbackLevel = 2) {
  const bucket = model?.[group];
  if (!bucket) return { level: fallbackLevel, recent: [] };
  return {
    level: typeof bucket.level === "number" ? bucket.level : fallbackLevel,
    recent: Array.isArray(bucket.recent) ? bucket.recent : [],
  };
}

export function getDifficultyLevelForOp(model, op, fallbackLevel = 2) {
  const group = mapOpToAbilityGroup(op);
  return getBucket(model, group, fallbackLevel).level;
}

export function getDifficultyLevelForOps(model, ops, fallbackLevel = 2) {
  if (!Array.isArray(ops) || ops.length === 0) return fallbackLevel;
  const levels = ops.map(op => getDifficultyLevelForOp(model, op, fallbackLevel));
  const avg = levels.reduce((sum, lv) => sum + lv, 0) / levels.length;
  return Math.max(0, Math.min(4, Math.round(avg)));
}

export function updateAbilityModel({
  model,
  op,
  correct,
  windowSize = 6,
  minLevel = 0,
  maxLevel = 4,
  fallbackLevel = 2,
}) {
  const group = mapOpToAbilityGroup(op);
  const bucket = getBucket(model, group, fallbackLevel);
  const { nextLevel, nextRecent } = updateAdaptiveDifficulty({
    currentLevel: bucket.level,
    recentAnswers: bucket.recent,
    correct,
    windowSize,
    minLevel,
    maxLevel,
  });

  return {
    group,
    nextLevel,
    nextRecent,
    nextModel: {
      ...(model || createAbilityModel(fallbackLevel)),
      [group]: { level: nextLevel, recent: nextRecent },
    },
  };
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
