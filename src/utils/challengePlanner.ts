import {
  DAILY_CHALLENGE_BLUEPRINTS,
  STREAK_TOWER_BLUEPRINT,
} from '../data/challengeCatalog.ts';
import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import type {
  ChallengeDifficulty,
  ChallengeBattleRule,
  DailyChallengeBlueprint,
  DailyChallengePlan,
  QuestionFocusTag,
  StreakTowerBlueprint,
  StreakTowerPlan,
} from '../types/challenges.ts';
import {
  createSeededRandom,
  pickOne,
  randomInt,
  shuffled,
  withRandomSource,
} from './prng.ts';

type TowerBalanceConfig = {
  hpScalePerFloor: number;
  atkScalePerFloor: number;
  levelOffsetPerFloor: number;
  timeTightenEveryFloors: number;
  minTimeLimitSec: number;
  enemyCountStepFloor: number;
  maxEnemyCount: number;
  expertStartsAtFloor: number;
  masterStartsAtFloor: number;
  rewardMultiplierPerFloor: number;
  pressureBands: {
    floors: number[];
    hpBonus: number[];
    atkBonus: number[];
    levelOffsetBonus: number[];
    rewardBonus: number[];
    extraTimePressure: number[];
    enemyCountBonus: number[];
  };
  focusUnlockFloor: Partial<Record<QuestionFocusTag, number>>;
  boss: {
    extraLevelOffset: number;
    hpBonusScale: number;
    atkBonusScale: number;
    extraTimePressure: number;
    rewardMultiplierBonus: number;
    enemyCount: number;
  };
};

const DEFAULT_TOWER_BALANCE: TowerBalanceConfig = {
  hpScalePerFloor: 0.08,
  atkScalePerFloor: 0.065,
  levelOffsetPerFloor: 0.55,
  timeTightenEveryFloors: 3,
  minTimeLimitSec: 10,
  enemyCountStepFloor: 4,
  maxEnemyCount: 3,
  expertStartsAtFloor: 6,
  masterStartsAtFloor: 11,
  rewardMultiplierPerFloor: 0.03,
  pressureBands: {
    floors: [1, 6, 11, 16],
    hpBonus: [0, 0.08, 0.2, 0.38],
    atkBonus: [0, 0.06, 0.16, 0.3],
    levelOffsetBonus: [0, 1, 3, 5],
    rewardBonus: [0, 0.08, 0.18, 0.34],
    extraTimePressure: [0, 0, 1, 1],
    enemyCountBonus: [0, 0, 1, 1],
  },
  focusUnlockFloor: {
    mixed4: 5,
    unknown1: 6,
    unknown2: 8,
    unknown3: 10,
    unknown4: 13,
  },
  boss: {
    extraLevelOffset: 2,
    hpBonusScale: 0.16,
    atkBonusScale: 0.14,
    extraTimePressure: 1,
    rewardMultiplierBonus: 0.22,
    enemyCount: 1,
  },
};

const towerBalanceRaw = BALANCE_CONFIG?.challenges?.tower || {};
const TOWER_BALANCE: TowerBalanceConfig = {
  ...DEFAULT_TOWER_BALANCE,
  ...towerBalanceRaw,
  pressureBands: {
    ...DEFAULT_TOWER_BALANCE.pressureBands,
    ...(towerBalanceRaw?.pressureBands || {}),
    floors: Array.isArray(towerBalanceRaw?.pressureBands?.floors) && towerBalanceRaw.pressureBands.floors.length > 0
      ? towerBalanceRaw.pressureBands.floors
      : DEFAULT_TOWER_BALANCE.pressureBands.floors,
    hpBonus: Array.isArray(towerBalanceRaw?.pressureBands?.hpBonus) && towerBalanceRaw.pressureBands.hpBonus.length > 0
      ? towerBalanceRaw.pressureBands.hpBonus
      : DEFAULT_TOWER_BALANCE.pressureBands.hpBonus,
    atkBonus: Array.isArray(towerBalanceRaw?.pressureBands?.atkBonus) && towerBalanceRaw.pressureBands.atkBonus.length > 0
      ? towerBalanceRaw.pressureBands.atkBonus
      : DEFAULT_TOWER_BALANCE.pressureBands.atkBonus,
    levelOffsetBonus:
      Array.isArray(towerBalanceRaw?.pressureBands?.levelOffsetBonus) && towerBalanceRaw.pressureBands.levelOffsetBonus.length > 0
        ? towerBalanceRaw.pressureBands.levelOffsetBonus
        : DEFAULT_TOWER_BALANCE.pressureBands.levelOffsetBonus,
    rewardBonus: Array.isArray(towerBalanceRaw?.pressureBands?.rewardBonus) && towerBalanceRaw.pressureBands.rewardBonus.length > 0
      ? towerBalanceRaw.pressureBands.rewardBonus
      : DEFAULT_TOWER_BALANCE.pressureBands.rewardBonus,
    extraTimePressure:
      Array.isArray(towerBalanceRaw?.pressureBands?.extraTimePressure) && towerBalanceRaw.pressureBands.extraTimePressure.length > 0
        ? towerBalanceRaw.pressureBands.extraTimePressure
        : DEFAULT_TOWER_BALANCE.pressureBands.extraTimePressure,
    enemyCountBonus:
      Array.isArray(towerBalanceRaw?.pressureBands?.enemyCountBonus) && towerBalanceRaw.pressureBands.enemyCountBonus.length > 0
        ? towerBalanceRaw.pressureBands.enemyCountBonus
        : DEFAULT_TOWER_BALANCE.pressureBands.enemyCountBonus,
  },
  focusUnlockFloor: {
    ...DEFAULT_TOWER_BALANCE.focusUnlockFloor,
    ...(towerBalanceRaw?.focusUnlockFloor || {}),
  },
  boss: {
    ...DEFAULT_TOWER_BALANCE.boss,
    ...(towerBalanceRaw?.boss || {}),
  },
};

const TOWER_FOCUS_UNLOCK_ORDER: QuestionFocusTag[] = [
  'mixed4',
  'unknown1',
  'unknown2',
  'unknown3',
  'unknown4',
];

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function resolveTowerDifficulty(floor: number, isBossFloor: boolean): ChallengeDifficulty {
  if (floor >= TOWER_BALANCE.masterStartsAtFloor || (isBossFloor && floor >= TOWER_BALANCE.expertStartsAtFloor)) {
    return 'master';
  }
  if (floor >= TOWER_BALANCE.expertStartsAtFloor || isBossFloor) return 'expert';
  return 'hard';
}

type TowerPressureProfile = {
  hpBonus: number;
  atkBonus: number;
  levelOffsetBonus: number;
  rewardBonus: number;
  extraTimePressure: number;
  enemyCountBonus: number;
};

function resolveTowerPressureProfile(floor: number): TowerPressureProfile {
  const starts = TOWER_BALANCE.pressureBands.floors;
  let index = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if (floor >= starts[i]) index = i;
  }
  const pick = (arr: number[], fallback = 0): number => {
    if (!Array.isArray(arr) || arr.length <= 0) return fallback;
    const value = Number(arr[Math.min(index, arr.length - 1)]);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    hpBonus: pick(TOWER_BALANCE.pressureBands.hpBonus),
    atkBonus: pick(TOWER_BALANCE.pressureBands.atkBonus),
    levelOffsetBonus: pick(TOWER_BALANCE.pressureBands.levelOffsetBonus),
    rewardBonus: pick(TOWER_BALANCE.pressureBands.rewardBonus),
    extraTimePressure: pick(TOWER_BALANCE.pressureBands.extraTimePressure),
    enemyCountBonus: pick(TOWER_BALANCE.pressureBands.enemyCountBonus),
  };
}

function resolveTowerEnemyCount(baseEnemyCount: number, floor: number, isBossFloor: boolean): number {
  if (isBossFloor) return Math.max(1, TOWER_BALANCE.boss.enemyCount);
  const stepFloor = Math.max(1, TOWER_BALANCE.enemyCountStepFloor);
  const extra = Math.floor(Math.max(0, floor - 1) / stepFloor);
  const pressure = resolveTowerPressureProfile(floor);
  return clampInt(baseEnemyCount + extra + Math.max(0, Math.floor(pressure.enemyCountBonus)), 1, Math.max(1, TOWER_BALANCE.maxEnemyCount));
}

function resolveTowerQuestionFocus(
  baseFocus: QuestionFocusTag[],
  floor: number,
  isBossFloor: boolean,
): QuestionFocusTag[] {
  const focusSet = new Set<QuestionFocusTag>(baseFocus);
  for (const tag of TOWER_FOCUS_UNLOCK_ORDER) {
    const unlockFloor = Number(TOWER_BALANCE.focusUnlockFloor[tag] || 999);
    if (floor >= unlockFloor) focusSet.add(tag);
  }
  if (isBossFloor) {
    focusSet.add('mixed4');
    if (floor >= TOWER_BALANCE.expertStartsAtFloor) focusSet.add('unknown2');
    if (floor >= TOWER_BALANCE.masterStartsAtFloor) focusSet.add('unknown4');
  }
  return [...focusSet];
}

function resolveTowerScales(floor: number, isBossFloor: boolean): { hpScale: number; atkScale: number } {
  const floorOffset = Math.max(0, floor - 1);
  const pressure = resolveTowerPressureProfile(floor);
  const hpScale = 1
    + floorOffset * TOWER_BALANCE.hpScalePerFloor
    + pressure.hpBonus
    + (isBossFloor ? TOWER_BALANCE.boss.hpBonusScale : 0);
  const atkScale = 1
    + floorOffset * TOWER_BALANCE.atkScalePerFloor
    + pressure.atkBonus
    + (isBossFloor ? TOWER_BALANCE.boss.atkBonusScale : 0);
  return {
    hpScale: round2(hpScale),
    atkScale: round2(atkScale),
  };
}

function resolveTowerTimeLimit(baseTimeLimitSec: number, floor: number, isBossFloor: boolean): number {
  const tightenStep = Math.max(1, TOWER_BALANCE.timeTightenEveryFloors);
  const floorPressure = Math.floor(Math.max(0, floor - 1) / tightenStep);
  const pressure = resolveTowerPressureProfile(floor);
  const bossPressure = isBossFloor ? TOWER_BALANCE.boss.extraTimePressure : 0;
  return clampInt(
    baseTimeLimitSec - floorPressure - bossPressure - Math.max(0, Math.floor(pressure.extraTimePressure)),
    Math.max(1, TOWER_BALANCE.minTimeLimitSec),
    Math.max(baseTimeLimitSec, 60),
  );
}

function resolveTowerLevelOffset(baseLevelOffset: number, floor: number, isBossFloor: boolean): number {
  const floorRamp = Math.floor(Math.max(0, floor - 1) * TOWER_BALANCE.levelOffsetPerFloor);
  const pressure = resolveTowerPressureProfile(floor);
  const bossBonus = isBossFloor ? TOWER_BALANCE.boss.extraLevelOffset : 0;
  return Math.max(0, baseLevelOffset + floorRamp + Math.max(0, Math.floor(pressure.levelOffsetBonus)) + bossBonus);
}

function resolveTowerRewardMultiplier(baseRewardMultiplier: number, floor: number, isBossFloor: boolean): number {
  const floorBonus = Math.max(0, floor - 1) * TOWER_BALANCE.rewardMultiplierPerFloor;
  const pressure = resolveTowerPressureProfile(floor);
  const bossBonus = isBossFloor ? TOWER_BALANCE.boss.rewardMultiplierBonus : 0;
  return round2(baseRewardMultiplier + floorBonus + pressure.rewardBonus + bossBonus);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function cloneRule(rule: ChallengeBattleRule): ChallengeBattleRule {
  return {
    ...rule,
    questionFocus: [...rule.questionFocus],
    modifierTags: [...rule.modifierTags],
    allowedStarters: rule.allowedStarters ? [...rule.allowedStarters] : undefined,
  };
}

function cloneDailyBlueprint(blueprint: DailyChallengeBlueprint): DailyChallengeBlueprint {
  return {
    ...blueprint,
    battles: blueprint.battles.map(cloneRule),
    rewards: {
      clear: blueprint.rewards.clear.map((reward) => ({ ...reward })),
      streak: blueprint.rewards.streak.map((reward) => ({ ...reward })),
    },
  };
}

export function toLocalDateKey(input: Date | number = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dailySeedKey(dateKey: string): string {
  return `daily:${dateKey}`;
}

function selectDailyBlueprint(): DailyChallengeBlueprint {
  const picked = pickOne(DAILY_CHALLENGE_BLUEPRINTS);
  return cloneDailyBlueprint(picked || DAILY_CHALLENGE_BLUEPRINTS[0]);
}

export function buildDailyChallengePlan(date: Date | number = new Date()): DailyChallengePlan {
  const dateKey = toLocalDateKey(date);
  const seedKey = dailySeedKey(dateKey);
  const rng = createSeededRandom(seedKey);

  return withRandomSource(rng, () => {
    const blueprint = selectDailyBlueprint();
    const orderedBattles = shuffled(blueprint.battles).slice(0, blueprint.battleCount);

    const battles = orderedBattles.map((battle, idx) => {
      const levelJitter = randomInt(0, Math.min(2, idx + 1));
      const timeTighten = idx > 0 ? randomInt(0, 1) : 0;
      return {
        ...battle,
        index: idx + 1,
        battleSeed: `${seedKey}:${battle.id}:${idx + 1}`,
        enemyLevelOffset: battle.enemyLevelOffset + levelJitter,
        timeLimitSec: Math.max(3, battle.timeLimitSec - timeTighten),
        modifierTags: shuffled(battle.modifierTags),
      };
    });

    return {
      challengeId: `daily-${dateKey}`,
      dateKey,
      seedKey,
      blueprintId: blueprint.id,
      label: blueprint.label,
      description: blueprint.description,
      streakWindowDays: blueprint.streakWindowDays,
      battles,
      rewards: blueprint.rewards,
    };
  });
}

export type BuildTowerPlanOptions = {
  season?: StreakTowerBlueprint;
  runId?: string;
  startFloor?: number;
  floorCount?: number;
};

function normalizeStartFloor(startFloor = 1, maxFloors = 1): number {
  if (!Number.isFinite(startFloor)) return 1;
  return Math.max(1, Math.min(maxFloors, Math.floor(startFloor)));
}

function normalizeFloorCount(floorCount = 5, maxFloors = 1): number {
  if (!Number.isFinite(floorCount)) return Math.min(5, maxFloors);
  return Math.max(1, Math.min(maxFloors, Math.floor(floorCount)));
}

export function buildStreakTowerPlan({
  season = STREAK_TOWER_BLUEPRINT,
  runId = `run-${toLocalDateKey()}`,
  startFloor = 1,
  floorCount = 5,
}: BuildTowerPlanOptions = {}): StreakTowerPlan {
  const maxFloors = season.maxFloors || season.floors.length;
  const normalizedStart = normalizeStartFloor(startFloor, maxFloors);
  const normalizedCount = normalizeFloorCount(floorCount, maxFloors - normalizedStart + 1);
  const pickedFloors = season.floors.slice(normalizedStart - 1, normalizedStart - 1 + normalizedCount);
  const ruleMap = new Map(season.rules.map((rule) => [rule.id, cloneRule(rule)]));

  const seedKey = `tower:${season.seasonId}:${runId}:${normalizedStart}`;
  const rng = createSeededRandom(seedKey);

  return withRandomSource(rng, () => {
    const floors = pickedFloors.map((floor) => {
      const baseRule = ruleMap.get(floor.ruleId) || cloneRule(season.rules[0]);
      const floorIndex = floor.floor;
      const isBossFloor = floorIndex % 5 === 0;
      const difficulty = resolveTowerDifficulty(floorIndex, isBossFloor);
      const enemyCount = resolveTowerEnemyCount(baseRule.enemyCount, floorIndex, isBossFloor);
      const questionFocus = resolveTowerQuestionFocus(baseRule.questionFocus, floorIndex, isBossFloor);
      const { hpScale, atkScale } = resolveTowerScales(floorIndex, isBossFloor);
      const levelJitter = floorIndex >= 8 ? randomInt(0, 1) : 0;
      const timeJitter = floorIndex >= 12 ? randomInt(0, 1) : 0;
      const battle = {
        ...baseRule,
        enemyCount,
        enemyLevelOffset: resolveTowerLevelOffset(baseRule.enemyLevelOffset, floorIndex, isBossFloor) + levelJitter,
        timeLimitSec: Math.max(
          TOWER_BALANCE.minTimeLimitSec,
          resolveTowerTimeLimit(baseRule.timeLimitSec, floorIndex, isBossFloor) - timeJitter,
        ),
        difficulty,
        rewardMultiplier: resolveTowerRewardMultiplier(baseRule.rewardMultiplier, floorIndex, isBossFloor),
        questionFocus: shuffled(questionFocus),
        modifierTags: shuffled([
          ...new Set([
            ...baseRule.modifierTags,
            `tower-floor-${floorIndex}`,
            `tower-difficulty-${difficulty}`,
            floorIndex >= 10 ? 'tower-high-pressure' : '',
            isBossFloor ? 'tower-boss-gate' : '',
          ].filter(Boolean)),
        ]),
      };
      return {
        ...floor,
        levelScale: hpScale,
        atkScale,
        battle,
        floorSeed: `${seedKey}:${floor.floor}`,
      };
    });

    return {
      runId,
      seasonId: season.seasonId,
      startFloor: normalizedStart,
      floors,
    };
  });
}

export function nextDailyReset(from: Date | number = new Date()): Date {
  const d = from instanceof Date ? new Date(from.getTime()) : new Date(from);
  d.setHours(24, 0, 0, 0);
  return d;
}
