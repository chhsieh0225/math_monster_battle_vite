import type {
  DailyChallengeBattlePlan,
  DailyChallengeFeedback,
  DailyChallengePlan,
  DailyChallengeProgress,
  DailyRunStatus,
  StreakTowerFloorPlan,
  StreakTowerPlan,
  TowerChallengeFeedback,
  TowerProgress,
} from '../../types/challenges.ts';

type RosterEnemy = {
  lvl?: number;
  hp?: number;
  maxHp?: number;
  atk?: number;
  challengeBattleIndex?: number;
  challengeBattleSeed?: string;
  challengeTowerFloor?: number;
  [key: string]: unknown;
};

const ENEMY_TIER_SCALE: Record<string, number> = {
  normal: 1,
  elite: 1.14,
  boss: 1.28,
};

function clampEnemyCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function clampOffset(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function clampScale(value: unknown, fallback = 1): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(0.2, n);
}

function tuneChallengeEnemy<T extends RosterEnemy>(
  enemy: T,
  battle: DailyChallengeBattlePlan,
  slotInBattle: number,
): T {
  const offset = clampOffset(battle.enemyLevelOffset);
  const tierScale = ENEMY_TIER_SCALE[battle.enemyTier] || 1;
  const paceScale = 1 + Math.max(0, battle.index - 1) * 0.08 + Math.max(0, slotInBattle) * 0.03;
  const hpScale = (1 + offset * 0.1) * tierScale * paceScale;
  const atkScale = (1 + offset * 0.08) * tierScale * paceScale;

  const baseMaxHp = Math.max(1, Number(enemy.maxHp || enemy.hp || 1));
  const baseAtk = Math.max(1, Number(enemy.atk || 1));
  const baseLvl = Math.max(1, Number(enemy.lvl || 1));

  const nextMaxHp = Math.max(1, Math.round(baseMaxHp * hpScale));
  const nextAtk = Math.max(1, Math.round(baseAtk * atkScale));
  const levelBonus = offset + (battle.enemyTier === 'boss' ? 2 : battle.enemyTier === 'elite' ? 1 : 0);

  const tunedEnemy: T = { ...enemy };
  tunedEnemy.lvl = baseLvl + levelBonus;
  tunedEnemy.hp = nextMaxHp;
  tunedEnemy.maxHp = nextMaxHp;
  tunedEnemy.atk = nextAtk;
  tunedEnemy.challengeBattleIndex = battle.index;
  tunedEnemy.challengeBattleSeed = battle.battleSeed;
  return tunedEnemy;
}

function tuneTowerEnemy<T extends RosterEnemy>(
  enemy: T,
  floor: StreakTowerFloorPlan,
  slotInBattle: number,
): T {
  const battle = floor.battle;
  const offset = clampOffset(battle?.enemyLevelOffset);
  const tierScale = ENEMY_TIER_SCALE[battle?.enemyTier || 'normal'] || 1;
  const slotScale = 1 + Math.max(0, slotInBattle) * 0.03;
  const hpScale = clampScale(floor?.levelScale, 1) * tierScale * slotScale;
  const atkScale = clampScale(floor?.atkScale ?? floor?.levelScale, 1) * tierScale * slotScale;

  const baseMaxHp = Math.max(1, Number(enemy.maxHp || enemy.hp || 1));
  const baseAtk = Math.max(1, Number(enemy.atk || 1));
  const baseLvl = Math.max(1, Number(enemy.lvl || 1));

  const nextMaxHp = Math.max(1, Math.round(baseMaxHp * hpScale));
  const nextAtk = Math.max(1, Math.round(baseAtk * atkScale));
  const levelBonus = offset + (battle.enemyTier === 'boss' ? 2 : battle.enemyTier === 'elite' ? 1 : 0);

  const tunedEnemy: T = { ...enemy };
  tunedEnemy.lvl = baseLvl + levelBonus;
  tunedEnemy.hp = nextMaxHp;
  tunedEnemy.maxHp = nextMaxHp;
  tunedEnemy.atk = nextAtk;
  tunedEnemy.challengeTowerFloor = floor.floor;
  tunedEnemy.challengeBattleIndex = floor.floor;
  tunedEnemy.challengeBattleSeed = floor.floorSeed;
  return tunedEnemy;
}

function resolveTowerFloorPlan(
  plan: StreakTowerPlan | null | undefined,
  roundIndex: number,
): StreakTowerFloorPlan | null {
  if (!plan || !Array.isArray(plan.floors) || plan.floors.length <= 0) return null;
  let remaining = Math.max(0, Math.floor(Number(roundIndex) || 0));
  for (const floor of plan.floors) {
    const slots = clampEnemyCount(floor?.battle?.enemyCount);
    if (remaining < slots) return floor;
    remaining -= slots;
  }
  return plan.floors[plan.floors.length - 1] || null;
}

export function getDailyChallengeSeed(plan: DailyChallengePlan | null | undefined): string | null {
  if (!plan) return null;
  if (typeof plan.seedKey === 'string' && plan.seedKey.length > 0) return plan.seedKey;
  return typeof plan.dateKey === 'string' ? `daily:${plan.dateKey}` : null;
}

export function resolveDailyBattleRule(
  plan: DailyChallengePlan | null | undefined,
  roundIndex: number,
): DailyChallengeBattlePlan | null {
  if (!plan || !Array.isArray(plan.battles) || plan.battles.length <= 0) return null;
  let remaining = Math.max(0, Math.floor(Number(roundIndex) || 0));
  for (const battle of plan.battles) {
    const slots = clampEnemyCount(battle?.enemyCount);
    if (remaining < slots) return battle;
    remaining -= slots;
  }
  return plan.battles[plan.battles.length - 1] || null;
}

export function resolveTowerBattleRule(
  plan: StreakTowerPlan | null | undefined,
  roundIndex: number,
): StreakTowerFloorPlan['battle'] | null {
  return resolveTowerFloorPlan(plan, roundIndex)?.battle || null;
}

export function buildDailyChallengeRoster<T extends RosterEnemy>(
  baseRoster: T[],
  plan: DailyChallengePlan | null | undefined,
): T[] {
  if (!Array.isArray(baseRoster) || baseRoster.length <= 0) return [];
  if (!plan || !Array.isArray(plan.battles) || plan.battles.length <= 0) return [...baseRoster];

  const tuned: T[] = [];
  let cursor = 0;

  for (const battle of plan.battles) {
    const slots = clampEnemyCount(battle?.enemyCount);
    for (let slot = 0; slot < slots; slot += 1) {
      const enemy = baseRoster[cursor % baseRoster.length];
      cursor += 1;
      if (!enemy) continue;
      tuned.push(tuneChallengeEnemy(enemy, battle, slot));
    }
  }

  return tuned.length > 0 ? tuned : [...baseRoster];
}

export function buildTowerChallengeRoster<T extends RosterEnemy>(
  baseRoster: T[],
  plan: StreakTowerPlan | null | undefined,
): T[] {
  if (!Array.isArray(baseRoster) || baseRoster.length <= 0) return [];
  const activeFloor = resolveTowerFloorPlan(plan, 0);
  if (!activeFloor) return [...baseRoster];

  const slots = clampEnemyCount(activeFloor?.battle?.enemyCount);
  const tuned: T[] = [];
  for (let slot = 0; slot < slots; slot += 1) {
    const enemy = baseRoster[slot % baseRoster.length];
    if (!enemy) continue;
    tuned.push(tuneTowerEnemy(enemy, activeFloor, slot));
  }
  return tuned.length > 0 ? tuned : [...baseRoster];
}

export function getDailyChallengeEnemyTotal(plan: DailyChallengePlan | null | undefined): number {
  if (!plan || !Array.isArray(plan.battles) || plan.battles.length <= 0) return 0;
  return plan.battles.reduce((total, battle) => total + clampEnemyCount(battle?.enemyCount), 0);
}

export function getTowerChallengeSeed(plan: StreakTowerPlan | null | undefined): string | null {
  if (!plan) return null;
  const activeFloor = resolveTowerFloorPlan(plan, 0);
  if (activeFloor?.floorSeed) return activeFloor.floorSeed;
  if (plan.runId && plan.seasonId) return `tower:${plan.seasonId}:${plan.runId}:${plan.startFloor || 1}`;
  return null;
}

function normalizeDailyRunStatus(status: unknown, fallback: DailyRunStatus): DailyRunStatus {
  if (status === 'cleared' || status === 'failed' || status === 'in_progress' || status === 'idle') {
    return status;
  }
  return fallback;
}

function clampBattleCount(value: unknown, fallback = 0): number {
  if (!Number.isFinite(Number(value))) return Math.max(0, fallback);
  return Math.max(0, Math.floor(Number(value)));
}

export function createDailyChallengeFeedback({
  plan,
  before,
  after,
  outcome,
  battlesCleared = 0,
}: {
  plan: DailyChallengePlan;
  before: DailyChallengeProgress | null | undefined;
  after: DailyChallengeProgress | null | undefined;
  outcome: 'cleared' | 'failed';
  battlesCleared?: number;
}): DailyChallengeFeedback {
  const streakBefore = Math.max(0, Number(before?.streakCount) || 0);
  const streakAfter = Math.max(0, Number(after?.streakCount) || 0);
  const streakDelta = streakAfter - streakBefore;
  const run = after?.runs?.[plan.dateKey];
  const persistedStatus = normalizeDailyRunStatus(run?.status, outcome);
  const streakWindowDays = Math.max(1, Math.floor(Number(plan.streakWindowDays) || 1));
  const battlesTotal = Math.max(1, getDailyChallengeEnemyTotal(plan));
  const resolvedBattles = clampBattleCount(run?.battlesCleared, battlesCleared);
  const boundedBattles = Math.max(0, Math.min(battlesTotal, resolvedBattles));
  const streakRewardUnlocked = outcome === 'cleared'
    && streakDelta > 0
    && streakAfter > 0
    && streakAfter % streakWindowDays === 0;
  const rewardLabels = outcome === 'cleared'
    ? [
      ...(Array.isArray(plan.rewards?.clear) ? plan.rewards.clear : []).map((reward) => reward.label),
      ...(streakRewardUnlocked
        ? (Array.isArray(plan.rewards?.streak) ? plan.rewards.streak : []).map((reward) => reward.label)
        : []),
    ]
    : [];

  return {
    challengeId: plan.challengeId,
    dateKey: plan.dateKey,
    outcome,
    persistedStatus,
    battlesCleared: boundedBattles,
    battlesTotal,
    streakBefore,
    streakAfter,
    streakDelta,
    streakWindowDays,
    rewardLabels,
    streakRewardUnlocked,
    preservedClear: outcome === 'failed' && persistedStatus === 'cleared',
  };
}

export function createTowerChallengeFeedback({
  plan,
  before,
  after,
  outcome,
  floor,
}: {
  plan: StreakTowerPlan;
  before: TowerProgress | null | undefined;
  after: TowerProgress | null | undefined;
  outcome: 'cleared' | 'failed';
  floor: number;
}): TowerChallengeFeedback {
  const resolvedFloor = Math.max(1, Math.floor(Number(floor) || Number(plan.startFloor) || 1));
  const activeFloor = plan.floors.find((item) => item.floor === resolvedFloor) || null;
  const winStreakBefore = Math.max(0, Number(before?.winStreak) || 0);
  const winStreakAfter = Math.max(0, Number(after?.winStreak) || 0);
  const bestFloorBefore = Math.max(0, Number(before?.bestFloor) || 0);
  const bestFloorAfter = Math.max(0, Number(after?.bestFloor) || 0);
  const totalClearsBefore = Math.max(0, Number(before?.totalClears) || 0);
  const totalClearsAfter = Math.max(0, Number(after?.totalClears) || 0);

  return {
    seasonId: plan.seasonId,
    runId: plan.runId,
    floor: resolvedFloor,
    outcome,
    nextFloor: Math.max(1, Number(after?.currentFloor) || resolvedFloor),
    winStreakBefore,
    winStreakAfter,
    winStreakDelta: winStreakAfter - winStreakBefore,
    bestFloorBefore,
    bestFloorAfter,
    bestFloorDelta: bestFloorAfter - bestFloorBefore,
    totalClearsBefore,
    totalClearsAfter,
    totalClearsDelta: totalClearsAfter - totalClearsBefore,
    rewardLabels: outcome === 'cleared'
      ? (Array.isArray(activeFloor?.rewards) ? activeFloor.rewards : []).map((reward) => reward.label)
      : [],
    checkpointReached: outcome === 'cleared' && Boolean(activeFloor?.checkpoint),
  };
}
