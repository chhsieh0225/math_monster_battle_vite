import { EVOLVED_SLIME_VARIANTS, MONSTERS, SLIME_VARIANTS } from '../data/monsters.ts';
import { applyEnemyPersonality, rollEnemyPersonality, type EnemyPersonality } from '../data/enemyPersonalities.ts';
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
  MonsterRace,
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
  /** SVG export name of the currently active sprite (for size compensation). */
  activeSpriteKey: string;
  selectedStageIdx?: number;
  personality?: EnemyPersonality;
};

type PickIndex = (length: number) => number;
type BuildRosterOptions = {
  singleWaves?: StageWave[];
  disableRandomSwap?: boolean;
  enableStarterEncounters?: boolean;
  excludedStarterIds?: readonly string[];
};

function normalizePickIndex(raw: number, length: number): number {
  if (length <= 1) return 0;
  return Number.isFinite(raw)
    ? Math.min(length - 1, Math.max(0, Math.trunc(raw)))
    : 0;
}

const MONSTER_BY_ID = new Map<string, MonsterBase>(MONSTERS.map((mon) => [mon.id, mon]));
const STARTER_MIRROR_WAVE_PREFIX = 'starter_mirror:';
const STARTER_IDS: readonly PlayerStarterId[] = ['fire', 'water', 'grass', 'tiger', 'electric', 'lion', 'wolf'];
const STARTER_ENCOUNTER_SCENE_BY_ID: Readonly<Record<PlayerStarterId, string>> = {
  fire: 'fire',
  water: 'water',
  grass: 'grass',
  tiger: 'water',
  electric: 'electric',
  lion: 'grass',
  wolf: 'steel',
};
const STARTER_BASE_STATS_BY_ID: Readonly<Record<PlayerStarterId, { hp: number; atk: number }>> = {
  fire: { hp: 54, atk: 9 },
  water: { hp: 50, atk: 8 },
  grass: { hp: 49, atk: 8 },
  tiger: { hp: 53, atk: 9 },
  electric: { hp: 51, atk: 9 },
  lion: { hp: 56, atk: 9 },
  wolf: { hp: 58, atk: 9 },
};
const STARTER_DROPS_BY_ID: Readonly<Record<PlayerStarterId, readonly string[]>> = {
  fire: ['🔥', '💎'],
  water: ['💧', '🍬'],
  grass: ['🍬', '🧪'],
  tiger: ['🧊', '🍬'],
  electric: ['⚡', '🍬'],
  lion: ['⭐', '👑'],
  wolf: ['🛡️', '⚔️'],
};
const STARTER_TYPE_NAME_FALLBACK: Readonly<Record<PlayerStarterId, string>> = {
  fire: '火',
  water: '水',
  grass: '草',
  tiger: '冰',
  electric: '雷',
  lion: '光',
  wolf: '鋼',
};
const STARTER_MONSTER_TYPE_BY_ID: Readonly<Record<PlayerStarterId, MonsterType>> = {
  fire: 'fire',
  water: 'water',
  grass: 'grass',
  tiger: 'ice',
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

/**
 * Maps visual scene names to the MonsterType (mType) they correspond to.
 * Used to filter random encounter variants so the spawned monster always
 * matches the scene's intended element.
 */
const SCENE_MTYPE_MAP: Readonly<Record<string, string>> = {
  grass: 'grass',
  fire: 'fire',
  water: 'water',
  electric: 'electric',
  ghost: 'ghost',
  dark: 'dark',
  steel: 'steel',
  rock: 'rock',
  candy: 'dream',
  poison: 'poison',
  burnt_warplace: 'fire',
  heaven: 'light',
};

/**
 * mType → non-boss monster IDs reverse index.
 * Used when a wave specifies sceneType but omits monsterId — the
 * rosterBuilder draws randomly from all monsters whose mType matches.
 */
/** @internal — exported for testing only */
export const MONSTERS_BY_MTYPE = new Map<string, string[]>();
for (const mon of MONSTERS) {
  if (BOSS_IDS.has(mon.id)) continue; // bosses are never in the scene pool
  const list = MONSTERS_BY_MTYPE.get(mon.mType) || [];
  list.push(mon.id);
  MONSTERS_BY_MTYPE.set(mon.mType, list);
}
// Slime can appear in any scene that has a matching slime variant.
// Add 'slime' to every mType that has a typed variant (water, fire, electric, dark, steel).
for (const sv of SLIME_VARIANTS) {
  if (sv.mType === 'grass') continue; // already covered by base slime
  const list = MONSTERS_BY_MTYPE.get(sv.mType) || [];
  if (!list.includes('slime')) {
    list.push('slime');
    MONSTERS_BY_MTYPE.set(sv.mType, list);
  }
}
// Starters (player characters) also appear as wild encounters in matching scenes.
// E.g. fire scene → 小火獸, water scene → 小水獸, steel scene → 小鋼狼.
// Uses the starter_mirror: prefix so the existing starter-mirror code path handles
// stage selection, stat scaling, and sprite resolution.
for (const starterId of STARTER_IDS) {
  const mType = STARTER_MONSTER_TYPE_BY_ID[starterId];
  if (!mType) continue;
  const mirrorId = `${STARTER_MIRROR_WAVE_PREFIX}${starterId}`;
  const list = MONSTERS_BY_MTYPE.get(mType) || [];
  if (!list.includes(mirrorId)) {
    list.push(mirrorId);
    MONSTERS_BY_MTYPE.set(mType, list);
  }
}

/**
 * Resolve a monsterId for a wave that only specifies sceneType.
 * Returns a random non-boss monster whose mType matches the scene,
 * with optional dedup against the previous race to increase variety.
 *
 * @param excludedIds  IDs to exclude (e.g. player's selected starter as starter_mirror:fire)
 */
function resolveMonsterIdByScene(
  sceneType: string,
  pickIndex: PickIndex,
  previousRace?: string,
  excludedIds?: ReadonlySet<string>,
): string {
  const mType = SCENE_MTYPE_MAP[sceneType] || sceneType;
  let pool = MONSTERS_BY_MTYPE.get(mType);
  if (!pool || pool.length === 0) {
    throw new Error(`[rosterBuilder] no monsters found for sceneType=${sceneType} (mType=${mType})`);
  }
  // Filter out excluded IDs (e.g. player's own starter shouldn't appear as wild enemy)
  if (excludedIds && excludedIds.size > 0) {
    const filtered = pool.filter((id) => !excludedIds.has(id));
    if (filtered.length > 0) pool = filtered;
  }
  // Prefer a different race than the previous wave for variety
  if (previousRace && pool.length > 1) {
    const diversePool = pool.filter((id) => {
      const m = MONSTER_BY_ID.get(id);
      // starter_mirror: IDs aren't in MONSTER_BY_ID — look up their actual race
      const race = m ? m.race : (() => {
        const sid = resolveStarterMirrorId(id);
        return sid ? STARTER_BY_ID.get(sid)?.race : undefined;
      })();
      return race !== previousRace;
    });
    if (diversePool.length > 0) {
      return diversePool[pickIndex(diversePool.length)];
    }
  }
  return pool[pickIndex(pool.length)];
}

function getVariantPool(baseId: string): readonly string[] | null {
  return RANDOM_ENCOUNTER_VARIANTS_BY_BASE_ID[baseId] || null;
}

/**
 * When a wave specifies an explicit sceneType, only variants whose mType
 * matches the scene's expected element are eligible.  This guarantees
 * "monsters are bound to their type" — e.g. ghost scene → only ghost-type
 * variants, never poison-type mushroom.
 */
function resolveVariantMonsterId(
  baseId: string,
  pickIndex: PickIndex,
  requiredMType?: string,
): string {
  const pool = getVariantPool(baseId);
  if (!pool || pool.length === 0) return baseId;
  // Filter by requiredMType when the wave has an explicit scene constraint.
  const candidates = requiredMType
    ? pool.filter((id) => {
      const m = MONSTER_BY_ID.get(id);
      return m && m.mType === requiredMType;
    })
    : pool;
  // When requiredMType is set but no variant matches, fall back to baseId
  // rather than the full pool — this prevents type-mismatched variants
  // (e.g. mushroom(poison) appearing in a ghost scene).
  if (requiredMType && candidates.length === 0) return baseId;
  const effectivePool = candidates.length > 0 ? candidates : pool;
  const rawIdx = Number(pickIndex(effectivePool.length));
  const idx = Number.isFinite(rawIdx)
    ? Math.min(effectivePool.length - 1, Math.max(0, Math.trunc(rawIdx)))
    : 0;
  const picked = effectivePool[idx];
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
  // Build mirror-prefixed exclusion set so the scene pool won't draw the player's own starter
  const excludedMirrorIds = new Set(
    [...excludedStarterIds].map((id) => `${STARTER_MIRROR_WAVE_PREFIX}${id}`),
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

  // Co-op / double final gate: last two boss placeholders must resolve to
  // two distinct bosses (sample without replacement).
  const forcedDoubleFinalBossByWaveIndex = new Map<number, string>();
  if (mode === 'double' && BOSS_ID_LIST.length > 0) {
    const bossWaveIndices = waves
      .map((wave, idx) => (wave.monsterId && BOSS_IDS.has(wave.monsterId) ? idx : -1))
      .filter((idx) => idx >= 0);
    if (bossWaveIndices.length >= 2) {
      const finalMainWaveIndex = bossWaveIndices[bossWaveIndices.length - 2];
      const finalSubWaveIndex = bossWaveIndices[bossWaveIndices.length - 1];

      const firstBossIdx = normalizePickIndex(pickIndex(BOSS_ID_LIST.length), BOSS_ID_LIST.length);
      const firstBossId = BOSS_ID_LIST[firstBossIdx] || BOSS_ID_LIST[0];

      let secondBossId = firstBossId;
      if (BOSS_ID_LIST.length > 1) {
        const offsetPoolLength = BOSS_ID_LIST.length - 1;
        const offsetIdx = normalizePickIndex(pickIndex(offsetPoolLength), offsetPoolLength);
        const secondBossIdx = (firstBossIdx + 1 + offsetIdx) % BOSS_ID_LIST.length;
        secondBossId = BOSS_ID_LIST[secondBossIdx] || firstBossId;
      }

      forcedDoubleFinalBossByWaveIndex.set(finalMainWaveIndex, firstBossId);
      forcedDoubleFinalBossByWaveIndex.set(finalSubWaveIndex, secondBossId);
    }
  }

  let previousRace: string | undefined;
  return waves.map((wave, i) => {
    // Resolve monsterId: explicit → boss pool → scene-based random draw
    let baseMonsterId: string;
    if (wave.monsterId) {
      baseMonsterId = BOSS_IDS.has(wave.monsterId)
        ? (forcedDoubleFinalBossByWaveIndex.get(i)
          || BOSS_ID_LIST[normalizePickIndex(pickIndex(BOSS_ID_LIST.length), BOSS_ID_LIST.length)]
          || wave.monsterId)
        : wave.monsterId;
    } else if (wave.sceneType) {
      baseMonsterId = resolveMonsterIdByScene(wave.sceneType, pickIndex, previousRace, excludedMirrorIds);
    } else {
      throw new Error(`[rosterBuilder] wave[${i}] has neither monsterId nor sceneType`);
    }

    // If resolved ID is a starter mirror (from explicit wave or scene pool), build via starter path
    const starterMirrorId = resolveStarterMirrorId(baseMonsterId);
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
        previousRace = starter.race;
        const starterActiveSpriteKey = `player${starterMirrorId}${stageIdx}SVG`;
        const starterEnemy: BattleRosterMonster = {
          id: `wild_starter_${starterMirrorId}`,
          name: stage?.name || starter.name,
          hp: Math.round(baseStats.hp * sc * stageScale),
          maxHp: Math.round(baseStats.hp * sc * stageScale),
          atk: Math.round(baseStats.atk * sc * stageScale),
          c1: starter.c1,
          c2: starter.c2,
          svgFn: starterSvgFn,
          spriteKey: starterActiveSpriteKey,
          activeSpriteKey: starterActiveSpriteKey,
          drops: [...(STARTER_DROPS_BY_ID[starterMirrorId] || ['🍬', '🧪'])],
          race: starter.race,
          mType: starterType,
          typeIcon: starter.typeIcon || '✨',
          typeName: starter.typeName || STARTER_TYPE_NAME_FALLBACK[starterMirrorId] || '屬性',
          sceneMType,
          lvl: i + 1,
          isEvolved: stageIdx > 0,
          selectedStageIdx: stageIdx,
        };
        return applyEnemyPersonality(starterEnemy, rollEnemyPersonality(pickIndex));
      }
    }
    // When the wave has an explicit sceneType, constrain variants to matching mType.
    const sceneRequiredMType = wave.sceneType ? SCENE_MTYPE_MAP[wave.sceneType] : undefined;
    const resolvedId = resolveVariantMonsterId(baseMonsterId, pickIndex, sceneRequiredMType);
    const b = MONSTER_BY_ID.get(resolvedId);
    if (!b) throw new Error(`[rosterBuilder] unknown monsterId: ${resolvedId}`);
    const sc = STAGE_SCALE_BASE + i * STAGE_SCALE_STEP;
    const isEvolved = Boolean(b.evolveLvl && (i + 1) >= b.evolveLvl);

    let variant: SlimeVariant | null = null;
    let evolvedVariant: SlimeVariant | null = null;
    // For slime: prefer wave.slimeType if set, otherwise match scene mType
    const slimePreferredType = wave.slimeType || sceneRequiredMType;
    if (b.id === 'slime' && !isEvolved) {
      variant = pickSlimeVariant({
        pool: SLIME_VARIANTS,
        preferredType: slimePreferredType,
        pick,
      });
    }
    if (b.id === 'slime' && isEvolved) {
      evolvedVariant = pickSlimeVariant({
        pool: EVOLVED_SLIME_VARIANTS,
        preferredType: slimePreferredType,
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
    const activeSpriteKey = evolvedVariant
      ? evolvedVariant.spriteKey
      : (isEvolved && b.evolvedSpriteKey ? b.evolvedSpriteKey : (variant ? variant.spriteKey : b.spriteKey));
    const resolvedMonsterType = evolvedVariant?.mType || variant?.mType || b.mType;
    const bossSceneType = BOSS_SCENE_BY_ID[resolvedId];
    // Bosses should always use their dedicated battlefield from config.
    // For non-boss enemies, keep wave-level override behavior.
    const resolvedSceneType = bossSceneType || wave.sceneType || resolvedMonsterType;

    previousRace = activeVariant?.race || b.race;

    const baseEnemy: BattleRosterMonster = {
      ...b,
      ...(variant && {
        id: variant.id,
        name: variant.name,
        svgFn: variant.svgFn,
        c1: variant.c1,
        c2: variant.c2,
        race: variant.race,
        mType: variant.mType,
        typeIcon: variant.typeIcon,
        typeName: variant.typeName,
        drops: variant.drops,
        trait: variant.trait,
        traitName: variant.traitName,
        traitDesc: variant.traitDesc,
      }),
      ...(evolvedVariant && {
        id: evolvedVariant.id,
        name: evolvedVariant.name,
        svgFn: evolvedVariant.svgFn,
        c1: evolvedVariant.c1,
        c2: evolvedVariant.c2,
        race: evolvedVariant.race,
        mType: evolvedVariant.mType,
        typeIcon: evolvedVariant.typeIcon,
        typeName: evolvedVariant.typeName,
        drops: evolvedVariant.drops,
        trait: evolvedVariant.trait,
        traitName: evolvedVariant.traitName,
        traitDesc: evolvedVariant.traitDesc,
      }),
      name,
      svgFn,
      activeSpriteKey,
      sceneMType: resolvedSceneType,
      hp: Math.round(b.hp * sc * hm),
      maxHp: Math.round(b.hp * sc * hm),
      atk: Math.round(b.atk * sc * am),
      lvl: i + 1,
      isEvolved,
    };

    if (BOSS_IDS.has(resolvedId)) return baseEnemy;
    return applyEnemyPersonality(baseEnemy, rollEnemyPersonality(pickIndex));
  });
}
