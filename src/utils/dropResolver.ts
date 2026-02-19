import {
  DROP_TABLES,
  WEIGHTED_DROP_TABLES,
  type DropRarity,
  type WeightedDropEntry,
} from '../data/dropTables.ts';
import { DROP_TABLE_BY_MONSTER_ID } from '../data/monsterConfigs.ts';
import { readJson, writeJson } from './storage.ts';

const DROP_PITY_KEY = 'mathMonsterBattle_dropPity';

type CampaignBranch = 'left' | 'right';

type DropPityState = Record<string, number>;

type WeightedRollEntry = WeightedDropEntry & {
  rollWeight: number;
};

export type ResolveBattleDropArgs = {
  enemyId?: string | null;
  enemyDrops?: string[] | null;
  campaignBranch?: CampaignBranch | null;
  sceneType?: string | null;
  randInt: (min: number, max: number) => number;
};

export type BattleDropResult = {
  drop: string;
  tableKey: string | null;
  rarity: DropRarity | null;
  pityHit: boolean;
  pityGroup: string | null;
};

const RARITY_ORDER: Record<DropRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

const BRANCH_WEIGHT_BONUS: Record<CampaignBranch, Record<string, number>> = {
  left: {
    '🔥': 1.35,
    '🪨': 1.3,
    '⚔️': 1.15,
  },
  right: {
    '💧': 1.35,
    '👻': 1.25,
    '⭐': 1.2,
  },
};

const SCENE_WEIGHT_BONUS: Record<string, Record<string, number>> = {
  fire: { '🔥': 1.35, '💎': 0.88 },
  water: { '💧': 1.35 },
  ghost: { '👻': 1.3, '⭐': 1.18 },
  electric: { '⚡': 1.3 },
  rock: { '🪨': 1.28, '💎': 1.15 },
  dark: { '💀': 1.22, '👑': 1.1 },
  heaven: { '⚔️': 1.2, '👑': 1.12 },
  light: { '⚔️': 1.2, '👑': 1.12 },
  burnt_warplace: { '🔥': 1.22, '👑': 1.1 },
};

const DROP_TABLE_KEY_BY_POOL_SIGNATURE = Object.fromEntries(
  Object.entries(DROP_TABLES).map(([key, pool]) => [poolSignature(pool), key]),
) as Record<string, string>;
const WARNED_DROP_FALLBACK_KEYS = new Set<string>();

function poolSignature(pool: readonly string[]): string {
  return [...pool].sort().join('|');
}

function clampRoll(randInt: (min: number, max: number) => number, min: number, max: number): number {
  const raw = Number(randInt(min, max));
  if (!Number.isFinite(raw)) return min;
  return Math.max(min, Math.min(max, Math.trunc(raw)));
}

function normalizeEnemyId(enemyId?: string | null): string {
  if (!enemyId) return '';
  return enemyId.startsWith('pvp_') ? enemyId.slice(4) : enemyId;
}

function resolveDropTableKey(enemyId?: string | null, enemyDrops?: string[] | null): string | null {
  const normalizedEnemyId = normalizeEnemyId(enemyId);
  if (normalizedEnemyId && DROP_TABLE_BY_MONSTER_ID[normalizedEnemyId]) {
    return DROP_TABLE_BY_MONSTER_ID[normalizedEnemyId];
  }
  if (!Array.isArray(enemyDrops) || enemyDrops.length <= 0) return null;
  return DROP_TABLE_KEY_BY_POOL_SIGNATURE[poolSignature(enemyDrops)] || null;
}

function normalizeWeightedEntries(
  entries: readonly WeightedDropEntry[],
  campaignBranch?: CampaignBranch | null,
  sceneType?: string | null,
): WeightedRollEntry[] {
  const branchBonus = campaignBranch ? BRANCH_WEIGHT_BONUS[campaignBranch] : undefined;
  const sceneBonus = sceneType ? SCENE_WEIGHT_BONUS[sceneType] : undefined;
  return entries.map((entry) => {
    const branchScale = branchBonus?.[entry.emoji] ?? 1;
    const sceneScale = sceneBonus?.[entry.emoji] ?? 1;
    return {
      ...entry,
      rollWeight: Math.max(1, Math.round(entry.weight * branchScale * sceneScale)),
    };
  });
}

function pickWeightedEntry(entries: readonly WeightedRollEntry[], randInt: ResolveBattleDropArgs['randInt']): WeightedRollEntry | null {
  if (entries.length <= 0) return null;
  let totalWeight = 0;
  for (const entry of entries) {
    totalWeight += Math.max(0, Math.round(entry.rollWeight));
  }
  if (totalWeight <= 0) return entries[0] || null;
  const roll = clampRoll(randInt, 1, totalWeight);
  let cursor = 0;
  for (const entry of entries) {
    cursor += Math.max(0, Math.round(entry.rollWeight));
    if (roll <= cursor) return entry;
  }
  return entries[entries.length - 1] || null;
}

function pickGuaranteedEntry(
  entries: readonly WeightedRollEntry[],
  targetRarity: DropRarity,
  randInt: ResolveBattleDropArgs['randInt'],
): WeightedRollEntry | null {
  const directCandidates = entries.filter((entry) => entry.rarity === targetRarity);
  if (directCandidates.length > 0) return pickWeightedEntry(directCandidates, randInt);
  const highestRank = entries.reduce((best, entry) => Math.max(best, RARITY_ORDER[entry.rarity]), 0);
  const fallbackCandidates = entries.filter((entry) => RARITY_ORDER[entry.rarity] === highestRank);
  return pickWeightedEntry(fallbackCandidates.length > 0 ? fallbackCandidates : entries, randInt);
}

function pickFallbackDrop(enemyDrops: string[] | null | undefined, randInt: ResolveBattleDropArgs['randInt']): string {
  if (!Array.isArray(enemyDrops) || enemyDrops.length <= 0) return '';
  const idx = clampRoll(randInt, 0, enemyDrops.length - 1);
  return enemyDrops[idx] || '';
}

function warnDropFallbackOnce(reason: string, context: {
  enemyId?: string | null;
  tableKey?: string | null;
  enemyDrops?: string[] | null;
}): void {
  if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
  const normalizedEnemyId = normalizeEnemyId(context.enemyId);
  const key = `${reason}|${normalizedEnemyId}|${context.tableKey || ''}|${poolSignature(context.enemyDrops || [])}`;
  if (WARNED_DROP_FALLBACK_KEYS.has(key)) return;
  WARNED_DROP_FALLBACK_KEYS.add(key);
  console.warn('[dropResolver] fallback drop used:', {
    reason,
    enemyId: normalizedEnemyId || null,
    tableKey: context.tableKey || null,
    fallbackPoolSize: Array.isArray(context.enemyDrops) ? context.enemyDrops.length : 0,
  });
}

function loadDropPityState(): DropPityState {
  return readJson<DropPityState>(DROP_PITY_KEY, {});
}

function saveDropPityState(state: DropPityState): void {
  writeJson(DROP_PITY_KEY, state);
}

export function resetDropPityState(): void {
  saveDropPityState({});
}

export function resolveBattleDrop({
  enemyId,
  enemyDrops,
  campaignBranch = null,
  sceneType = null,
  randInt,
}: ResolveBattleDropArgs): BattleDropResult {
  const tableKey = resolveDropTableKey(enemyId, enemyDrops);
  if (!tableKey) {
    warnDropFallbackOnce('missing_table_key', {
      enemyId,
      tableKey: null,
      enemyDrops,
    });
    return {
      drop: pickFallbackDrop(enemyDrops, randInt),
      tableKey: null,
      rarity: null,
      pityHit: false,
      pityGroup: null,
    };
  }

  const table = WEIGHTED_DROP_TABLES[tableKey];
  if (!table || !Array.isArray(table.entries) || table.entries.length <= 0) {
    warnDropFallbackOnce('missing_weighted_table', {
      enemyId,
      tableKey,
      enemyDrops,
    });
    return {
      drop: pickFallbackDrop(enemyDrops, randInt),
      tableKey,
      rarity: null,
      pityHit: false,
      pityGroup: null,
    };
  }

  const normalizedEntries = normalizeWeightedEntries(table.entries, campaignBranch, sceneType);
  const pityRule = table.pity;
  if (!pityRule) {
    const picked = pickWeightedEntry(normalizedEntries, randInt);
    return {
      drop: picked?.emoji || pickFallbackDrop(enemyDrops, randInt),
      tableKey,
      rarity: picked?.rarity || null,
      pityHit: false,
      pityGroup: null,
    };
  }

  const pityState = loadDropPityState();
  const pityGroup = pityRule.group || tableKey;
  const misses = Math.max(0, Number(pityState[pityGroup] || 0));
  if (misses + 1 >= pityRule.threshold) {
    const guaranteed = pickGuaranteedEntry(normalizedEntries, pityRule.rarity, randInt);
    pityState[pityGroup] = 0;
    saveDropPityState(pityState);
    return {
      drop: guaranteed?.emoji || pickFallbackDrop(enemyDrops, randInt),
      tableKey,
      rarity: guaranteed?.rarity || pityRule.rarity,
      pityHit: true,
      pityGroup,
    };
  }

  const picked = pickWeightedEntry(normalizedEntries, randInt);
  const hitTargetRarity = Boolean(picked && picked.rarity === pityRule.rarity);
  pityState[pityGroup] = hitTargetRarity ? 0 : misses + 1;
  saveDropPityState(pityState);
  return {
    drop: picked?.emoji || pickFallbackDrop(enemyDrops, randInt),
    tableKey,
    rarity: picked?.rarity || null,
    pityHit: false,
    pityGroup,
  };
}
