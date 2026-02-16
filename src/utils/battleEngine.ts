export type AdaptiveDifficultyParams = {
  currentLevel: number;
  recentAnswers: boolean[];
  correct: boolean;
  windowSize?: number;
  minLevel?: number;
  maxLevel?: number;
};

export type AdaptiveDifficultyResult = {
  nextLevel: number;
  nextRecent: boolean[];
};

export function updateAdaptiveDifficulty({
  currentLevel,
  recentAnswers,
  correct,
  windowSize = 6,
  minLevel = 0,
  maxLevel = 4,
}: AdaptiveDifficultyParams): AdaptiveDifficultyResult {
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
  '+': 'add',
  '-': 'sub',
  '×': 'mul',
  '÷': 'div',
  mixed2: 'mixed',
  mixed3: 'mixed',
  mixed4: 'mixed',
  unknown1: 'unknown',
  unknown2: 'unknown',
  unknown3: 'unknown',
  unknown4: 'unknown',
} as const;

export type AbilityGroup = 'add' | 'sub' | 'mul' | 'div' | 'unknown' | 'mixed';
export type OperationKey = keyof typeof OP_TO_GROUP;

export const ABILITY_GROUPS: AbilityGroup[] = ['add', 'sub', 'mul', 'div', 'unknown', 'mixed'];

export type AbilityBucket = {
  level: number;
  recent: boolean[];
};

export type AbilityModel = Record<AbilityGroup, AbilityBucket>;

export function mapOpToAbilityGroup(op: string | null | undefined): AbilityGroup {
  const group = OP_TO_GROUP[(op || 'mixed') as OperationKey];
  return group || 'mixed';
}

export function createAbilityModel(initialLevel = 2): AbilityModel {
  const clamped = Math.max(0, Math.min(4, initialLevel));
  const model = {} as AbilityModel;
  for (const group of ABILITY_GROUPS) {
    model[group] = { level: clamped, recent: [] };
  }
  return model;
}

function getBucket(model: Partial<AbilityModel> | null | undefined, group: AbilityGroup, fallbackLevel = 2): AbilityBucket {
  const bucket = model?.[group];
  if (!bucket) return { level: fallbackLevel, recent: [] };
  return {
    level: typeof bucket.level === 'number' ? bucket.level : fallbackLevel,
    recent: Array.isArray(bucket.recent) ? bucket.recent : [],
  };
}

export function getDifficultyLevelForOp(
  model: Partial<AbilityModel> | null | undefined,
  op: string | null | undefined,
  fallbackLevel = 2,
): number {
  const group = mapOpToAbilityGroup(op);
  return getBucket(model, group, fallbackLevel).level;
}

export function getDifficultyLevelForOps(
  model: Partial<AbilityModel> | null | undefined,
  ops: Array<string | null | undefined> | null | undefined,
  fallbackLevel = 2,
): number {
  if (!Array.isArray(ops) || ops.length === 0) return fallbackLevel;
  const levels = ops.map((op) => getDifficultyLevelForOp(model, op, fallbackLevel));
  const avg = levels.reduce((sum, lv) => sum + lv, 0) / levels.length;
  return Math.max(0, Math.min(4, Math.round(avg)));
}

export type UpdateAbilityModelParams = {
  model: Partial<AbilityModel> | null | undefined;
  op: string | null | undefined;
  correct: boolean;
  windowSize?: number;
  minLevel?: number;
  maxLevel?: number;
  fallbackLevel?: number;
};

export type UpdateAbilityModelResult = {
  group: AbilityGroup;
  nextLevel: number;
  nextRecent: boolean[];
  nextModel: AbilityModel;
};

export function updateAbilityModel({
  model,
  op,
  correct,
  windowSize = 6,
  minLevel = 0,
  maxLevel = 4,
  fallbackLevel = 2,
}: UpdateAbilityModelParams): UpdateAbilityModelResult {
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
    } as AbilityModel,
  };
}

export type ResolveLevelProgressParams = {
  currentExp: number;
  currentLevel: number;
  currentStage: number;
  gainExp: number;
  maxStage?: number;
  evolveEvery?: number;
  hpBonusPerLevel?: number;
};

export type ResolveLevelProgressResult = {
  nextExp: number;
  nextLevel: number;
  hpBonus: number;
  evolveCount: number;
};

export function resolveLevelProgress({
  currentExp,
  currentLevel,
  currentStage,
  gainExp,
  maxStage = 2,
  evolveEvery = 3,
  hpBonusPerLevel = 20,
}: ResolveLevelProgressParams): ResolveLevelProgressResult {
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
