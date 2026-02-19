import { EVOLVED_SLIME_VARIANTS, MONSTERS, SLIME_VARIANTS } from '../data/monsters.ts';
import {
  BOSS_IDS,
  BOSS_ID_LIST,
  BOSS_SCENE_BY_ID,
  RANDOM_ENCOUNTER_VARIANTS_BY_BASE_ID,
} from '../data/monsterConfigs.ts';
import {
  DOUBLE_STAGE_WAVES,
  STAGE_RANDOM_SWAP_CANDIDATES,
  STAGE_RANDOM_SWAP_END_INDEX_EXCLUSIVE_FROM_TAIL,
  STAGE_RANDOM_SWAP_START_INDEX,
  STAGE_SCALE_BASE,
  STAGE_SCALE_STEP,
  STAGE_WAVES,
  type StageWave,
} from '../data/stageConfigs.ts';
import { STARTERS } from '../data/starters.ts';
import type {
  HydratedMonster,
  HydratedSlimeVariant,
  MonsterType,
  PlayerStarterId,
} from '../types/game';

type MonsterBase = HydratedMonster;
type SlimeVariant = HydratedSlimeVariant;

export type BattleRosterMonster = MonsterBase & {
  sceneMType: string;
  maxHp: number;
  lvl: number;
  isEvolved: boolean;
};

type PickIndex = (length: number) => number;
type BuildRosterOptions = {
  singleWaves?: StageWave[];
  disableRandomSwap?: boolean;
  enableStarterEncounters?: boolean;
  excludedStarterIds?: readonly string[];
};

const MONSTER_BY_ID = new Map<string, MonsterBase>(MONSTERS.map((mon) => [mon.id, mon]));
const STARTER_MIRROR_WAVE_PREFIX = 'starter_mirror:';
const STARTER_IDS: readonly PlayerStarterId[] = ['fire', 'water', 'grass', 'electric', 'lion', 'wolf'];
const STARTER_ENCOUNTER_SCENE_BY_ID: Readonly<Record<PlayerStarterId, string>> = {
  fire: 'fire',
  water: 'water',
  grass: 'grass',
  electric: 'electric',
  lion: 'grass',
  wolf: 'steel',
};
const STARTER_BASE_STATS_BY_ID: Readonly<Record<PlayerStarterId, { hp: number; atk: number }>> = {
  fire: { hp: 54, atk: 9 },
  water: { hp: 50, atk: 8 },
  grass: { hp: 49, atk: 8 },
  electric: { hp: 51, atk: 9 },
  lion: { hp: 56, atk: 9 },
  wolf: { hp: 58, atk: 9 },
};
const STARTER_DROPS_BY_ID: Readonly<Record<PlayerStarterId, readonly string[]>> = {
  fire: ['🔥', '💎'],
  water: ['💧', '🍬'],
  grass: ['🍬', '🧪'],
  electric: ['⚡', '🍬'],
  lion: ['⭐', '👑'],
  wolf: ['🛡️', '⚔️'],
};
const STARTER_TYPE_NAME_FALLBACK: Readonly<Record<PlayerStarterId, string>> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '雷',
  lion: '光',
  wolf: '鋼',
};
const STARTER_MONSTER_TYPE_BY_ID: Readonly<Record<PlayerStarterId, MonsterType>> = {
  fire: 'fire',
  water: 'water',
  grass: 'grass',
  electric: 'electric',
  lion: 'light',
  wolf: 'steel',
};
const STARTER_ENCOUNTER_STAGE_STAT_SCALE = [1, 1.12, 1.24] as const;
const STARTER_ENCOUNTER_MID_STAGE_MIN_LEVEL = 4;
const STARTER_ENCOUNTER_FINAL_STAGE_MIN_LEVEL = 8;
const STARTER_BY_ID = new Map<PlayerStarterId, (typeof STARTERS)[number]>(
  STARTERS
    .map((starter) => {
      const id = toPlayerStarterId(starter.id);
      return id ? [id, starter] as const : null;
    })
    .filter((entry): entry is readonly [PlayerStarterId, (typeof STARTERS)[number]] => entry !== null),
);

function toPlayerStarterId(id: string | undefined | null): PlayerStarterId | null {
  if (!id) return null;
  if ((STARTER_IDS as readonly string[]).includes(id)) return id as PlayerStarterId;
  return null;
}

function resolveStarterEncounterStageIdx(
  starter: (typeof STARTERS)[number],
  waveIndex: number,
  pickIndex: PickIndex,
): number {
  const maxStage = Math.max(0, (starter.stages?.length || 1) - 1);
  if (maxStage <= 0) return 0;

  const level = waveIndex + 1;
  let stageWeights: number[] = [4, 1, 0];

  if (level >= STARTER_ENCOUNTER_FINAL_STAGE_MIN_LEVEL) {
    stageWeights = [0, 2, 3];
  } else if (level >= STARTER_ENCOUNTER_MID_STAGE_MIN_LEVEL) {
    stageWeights = [1, 3, 1];
  }

  stageWeights = stageWeights.slice(0, maxStage + 1);
  const totalWeight = stageWeights.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (totalWeight <= 0) return 0;

  const rawRoll = Number(pickIndex(totalWeight));
  const roll = Number.isFinite(rawRoll)
    ? Math.max(0, Math.min(totalWeight - 1, Math.trunc(rawRoll)))
    : 0;

  let cursor = 0;
  for (let stageIdx = 0; stageIdx < stageWeights.length; stageIdx += 1) {
    cursor += Math.max(0, stageWeights[stageIdx] || 0);
    if (roll < cursor) return stageIdx;
  }

  return 0;
}

function resolveStarterStageStatScale(stageIdx: number): number {
  const normalized = Math.max(
    0,
    Math.min(STARTER_ENCOUNTER_STAGE_STAT_SCALE.length - 1, Math.trunc(stageIdx)),
  );
  return STARTER_ENCOUNTER_STAGE_STAT_SCALE[normalized] || 1;
}

function buildStarterEncounterWaves(excludedStarterIds: ReadonlySet<string>): StageWave[] {
  const candidates: StageWave[] = [];
  for (const starterId of STARTER_IDS) {
    if (excludedStarterIds.has(starterId)) continue;
    candidates.push({
      monsterId: `${STARTER_MIRROR_WAVE_PREFIX}${starterId}`,
      sceneType: STARTER_ENCOUNTER_SCENE_BY_ID[starterId] || 'grass',
    });
  }
  return candidates;
}

function resolveStarterMirrorId(monsterId: string): PlayerStarterId | null {
  if (typeof monsterId !== 'string' || !monsterId.startsWith(STARTER_MIRROR_WAVE_PREFIX)) return null;
  return toPlayerStarterId(monsterId.slice(STARTER_MIRROR_WAVE_PREFIX.length));
}

function pickSlimeVariant({
  pool,
  preferredType,
  pick,
}: {
  pool: SlimeVariant[];
  preferredType?: string;
  pick: (arr: SlimeVariant[]) => SlimeVariant;
}): SlimeVariant {
  if (!preferredType) return pick(pool);
  const typedPool = pool.filter((v) => v.mType === preferredType);
  return pick(typedPool.length > 0 ? typedPool : pool);
}

function getVariantPool(baseId: string): readonly string[] | null {
  return RANDOM_ENCOUNTER_VARIANTS_BY_BASE_ID[baseId] || null;
}

function resolveVariantMonsterId(baseId: string, pickIndex: PickIndex): string {
  const pool = getVariantPool(baseId);
  if (!pool || pool.length === 0) return baseId;
  const rawIdx = Number(pickIndex(pool.length));
  const idx = Number.isFinite(rawIdx)
    ? Math.min(pool.length - 1, Math.max(0, Math.trunc(rawIdx)))
    : 0;
  const picked = pool[idx];
  return typeof picked === 'string' ? picked : baseId;
}

export function buildRoster(
  pickIndex: PickIndex,
  mode: 'single' | 'double' = 'single',
  options: BuildRosterOptions = {},
): BattleRosterMonster[] {
  const excludedStarterIds = new Set(
    (options.excludedStarterIds || [])
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  );
  const pick = (arr: SlimeVariant[]): SlimeVariant => arr[pickIndex(arr.length)];
  const useSingleWaveOverride = mode === 'single' && Array.isArray(options.singleWaves) && options.singleWaves.length > 0;
  const baseWaves: StageWave[] = useSingleWaveOverride
    ? options.singleWaves || []
    : (mode === 'double' ? DOUBLE_STAGE_WAVES : STAGE_WAVES);

  // Deep-copy waves so we can mutate safely
  const waves: StageWave[] = baseWaves.map(w => ({ ...w }));
  const protectedTailWaves = mode === 'double'
    ? STAGE_RANDOM_SWAP_END_INDEX_EXCLUSIVE_FROM_TAIL + 1
    : STAGE_RANDOM_SWAP_END_INDEX_EXCLUSIVE_FROM_TAIL;

  // Randomly inject one swap candidate into a mid-game slot (indices 1..8)
  if (!options.disableRandomSwap && STAGE_RANDOM_SWAP_CANDIDATES.length > 0) {
    const candidate = STAGE_RANDOM_SWAP_CANDIDATES[pickIndex(STAGE_RANDOM_SWAP_CANDIDATES.length)];
    const swappableUpperExclusive = Math.max(
      STAGE_RANDOM_SWAP_START_INDEX,
      waves.length - protectedTailWaves,
    );
    const swappable = waves
      .map((w, idx) => ({ w, idx }))
      .filter(({ idx }) => idx >= STAGE_RANDOM_SWAP_START_INDEX && idx < swappableUpperExclusive);
    if (swappable.length > 0) {
      const chosen = swappable[pickIndex(swappable.length)];
      waves[chosen.idx] = { ...candidate };
    }
  }

  // Optional: spawn one "wild starter" encounter (unselected player characters only).
  if (options.enableStarterEncounters) {
    const starterCandidates = buildStarterEncounterWaves(excludedStarterIds);
    if (starterCandidates.length > 0) {
      const swappableUpperExclusive = Math.max(
        STAGE_RANDOM_SWAP_START_INDEX,
        waves.length - protectedTailWaves,
      );
      const swappable = waves
        .map((w, idx) => ({ w, idx }))
        .filter(({ idx }) => idx >= STAGE_RANDOM_SWAP_START_INDEX && idx < swappableUpperExclusive);
      // Not every run has a starter encounter; this keeps variety.
      const shouldInjectStarterEncounter = Number(pickIndex(100)) < 65;
      if (swappable.length > 0 && shouldInjectStarterEncounter) {
        const chosenSlot = swappable[pickIndex(swappable.length)];
        const chosenStarter = starterCandidates[pickIndex(starterCandidates.length)];
        waves[chosenSlot.idx] = { ...chosenStarter };
      }
    }
  }

  return waves.map((wave, i) => {
    const starterMirrorId = resolveStarterMirrorId(wave.monsterId);
    if (starterMirrorId) {
      const starter = STARTER_BY_ID.get(starterMirrorId);
      if (starter) {
        const sc = STAGE_SCALE_BASE + i * STAGE_SCALE_STEP;
        const baseStats = STARTER_BASE_STATS_BY_ID[starterMirrorId] || { hp: 50, atk: 8 };
        const sceneMType = wave.sceneType || STARTER_ENCOUNTER_SCENE_BY_ID[starterMirrorId] || 'grass';
        const starterType = STARTER_MONSTER_TYPE_BY_ID[starterMirrorId];
        const stageIdx = resolveStarterEncounterStageIdx(starter, i, pickIndex);
        const stage = starter.stages?.[stageIdx] || starter.stages?.[0];
        const stageScale = resolveStarterStageStatScale(stageIdx);
        const starterSvgFn = stage?.svgFn;
        if (typeof starterSvgFn !== 'function') {
          throw new Error(`[rosterBuilder] starter ${starterMirrorId} missing stage svgFn`);
        }
        return {
          id: `wild_starter_${starterMirrorId}`,
          name: stage?.name || starter.name,
          hp: Math.round(baseStats.hp * sc * stageScale),
          maxHp: Math.round(baseStats.hp * sc * stageScale),
          atk: Math.round(baseStats.atk * sc * stageScale),
          c1: starter.c1,
          c2: starter.c2,
          svgFn: starterSvgFn,
          drops: [...(STARTER_DROPS_BY_ID[starterMirrorId] || ['🍬', '🧪'])],
          mType: starterType,
          typeIcon: starter.typeIcon || '✨',
          typeName: starter.typeName || STARTER_TYPE_NAME_FALLBACK[starterMirrorId] || '屬性',
          sceneMType,
          lvl: i + 1,
          isEvolved: stageIdx > 0,
          selectedStageIdx: stageIdx,
        };
      }
    }

    // If wave requests a boss, randomly pick from the boss pool
    const bossOrBaseId = BOSS_IDS.has(wave.monsterId)
      ? BOSS_ID_LIST[pickIndex(BOSS_ID_LIST.length)]
      : wave.monsterId;
    const resolvedId = resolveVariantMonsterId(bossOrBaseId, pickIndex);
    const b = MONSTER_BY_ID.get(resolvedId);
    if (!b) throw new Error(`[rosterBuilder] unknown monsterId: ${resolvedId}`);
    const sc = STAGE_SCALE_BASE + i * STAGE_SCALE_STEP;
    const isEvolved = Boolean(b.evolveLvl && (i + 1) >= b.evolveLvl);

    let variant: SlimeVariant | null = null;
    let evolvedVariant: SlimeVariant | null = null;
    if (b.id === 'slime' && !isEvolved) {
      variant = pickSlimeVariant({
        pool: SLIME_VARIANTS,
        preferredType: wave.slimeType,
        pick,
      });
    }
    if (b.id === 'slime' && isEvolved) {
      evolvedVariant = pickSlimeVariant({
        pool: EVOLVED_SLIME_VARIANTS,
        preferredType: wave.slimeType,
        pick,
      });
    }

    const activeVariant = evolvedVariant || variant;
    const hm = activeVariant ? (activeVariant.hpMult || 1) : 1;
    const am = activeVariant ? (activeVariant.atkMult || 1) : 1;

    const name = evolvedVariant
      ? evolvedVariant.name
      : (isEvolved && b.evolvedName ? b.evolvedName : (variant ? variant.name : b.name));

    const svgFn = evolvedVariant
      ? evolvedVariant.svgFn
      : (isEvolved && b.evolvedSvgFn ? b.evolvedSvgFn : (variant ? variant.svgFn : b.svgFn));
    const resolvedMonsterType = evolvedVariant?.mType || variant?.mType || b.mType;
    const bossSceneType = BOSS_SCENE_BY_ID[resolvedId];
    // Scene should follow the actual spawned monster type after random replacement.
    const resolvedSceneType = bossSceneType || resolvedMonsterType;

    return {
      ...b,
      ...(variant && {
        id: variant.id,
        name: variant.name,
        svgFn: variant.svgFn,
        c1: variant.c1,
        c2: variant.c2,
        mType: variant.mType,
        typeIcon: variant.typeIcon,
        typeName: variant.typeName,
        drops: variant.drops,
        trait: variant.trait,
        traitName: variant.traitName,
      }),
      ...(evolvedVariant && {
        id: evolvedVariant.id,
        name: evolvedVariant.name,
        svgFn: evolvedVariant.svgFn,
        c1: evolvedVariant.c1,
        c2: evolvedVariant.c2,
        mType: evolvedVariant.mType,
        typeIcon: evolvedVariant.typeIcon,
        typeName: evolvedVariant.typeName,
        drops: evolvedVariant.drops,
        trait: evolvedVariant.trait,
        traitName: evolvedVariant.traitName,
      }),
      name,
      svgFn,
      sceneMType: resolvedSceneType,
      hp: Math.round(b.hp * sc * hm),
      maxHp: Math.round(b.hp * sc * hm),
      atk: Math.round(b.atk * sc * am),
      lvl: i + 1,
      isEvolved,
    };
  });
}
