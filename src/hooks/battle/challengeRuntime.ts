import type { DailyChallengeBattlePlan, DailyChallengePlan } from '../../types/challenges.ts';

type RosterEnemy = {
  lvl?: number;
  hp?: number;
  maxHp?: number;
  atk?: number;
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

  return {
    ...enemy,
    lvl: baseLvl + levelBonus,
    hp: nextMaxHp,
    maxHp: nextMaxHp,
    atk: nextAtk,
    challengeBattleIndex: battle.index,
    challengeBattleSeed: battle.battleSeed,
  } as T;
}

export function getDailyChallengeSeed(plan: DailyChallengePlan | null | undefined): string | null {
  if (!plan) return null;
  if (typeof plan.seedKey === 'string' && plan.seedKey.length > 0) return plan.seedKey;
  return typeof plan.dateKey === 'string' ? `daily:${plan.dateKey}` : null;
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
