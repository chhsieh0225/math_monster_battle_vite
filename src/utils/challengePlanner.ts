import {
  DAILY_CHALLENGE_BLUEPRINTS,
  STREAK_TOWER_BLUEPRINT,
} from '../data/challengeCatalog.ts';
import type {
  ChallengeBattleRule,
  DailyChallengeBlueprint,
  DailyChallengePlan,
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
      const bossExtra = floor.floor % 5 === 0 ? randomInt(0, 1) : 0;
      const floorRamp = Math.floor((floor.floor - 1) / 5);
      const battle = {
        ...baseRule,
        enemyLevelOffset: baseRule.enemyLevelOffset + floorRamp + bossExtra,
        timeLimitSec: Math.max(3, baseRule.timeLimitSec - (floor.floor >= 10 ? 1 : 0)),
        questionFocus: shuffled(baseRule.questionFocus),
        modifierTags: shuffled(baseRule.modifierTags),
      };
      return {
        ...floor,
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
