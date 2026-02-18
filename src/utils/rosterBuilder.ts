import { EVOLVED_SLIME_VARIANTS, MONSTERS, SLIME_VARIANTS } from '../data/monsters.ts';
import { BOSS_IDS, BOSS_ID_LIST } from '../data/monsterConfigs.ts';
import {
  DOUBLE_STAGE_WAVES,
  STAGE_SCALE_BASE,
  STAGE_SCALE_STEP,
  STAGE_WAVES,
  type StageWave,
} from '../data/stageConfigs.ts';
import type { HydratedMonster, HydratedSlimeVariant } from '../types/game';

type MonsterBase = HydratedMonster;
type SlimeVariant = HydratedSlimeVariant;

export type BattleRosterMonster = MonsterBase & {
  sceneMType: string;
  maxHp: number;
  lvl: number;
  isEvolved: boolean;
};

type PickIndex = (length: number) => number;

const MONSTER_BY_ID = new Map<string, MonsterBase>(MONSTERS.map((mon) => [mon.id, mon]));

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
 * Candidate waves that can randomly replace one mid-game wave.
 * Each run, one of the swappable waves (indices 1–8, non-boss) is randomly
 * replaced by one of these candidates.
 */
const RANDOM_SWAP_CANDIDATES: StageWave[] = [
  { monsterId: 'golumn', sceneType: 'rock' },
];

/**
 * Optional visual/entry variants for specific monsters.
 * Used to diversify encounters while keeping base role/trait identity.
 */
const GHOST_VARIANTS = ['ghost', 'ghost_lantern'] as const;
const GOLUMN_VARIANTS = ['golumn', 'golumn_mud'] as const;

function getVariantPool(baseId: string): readonly string[] | null {
  if (baseId === 'ghost') return GHOST_VARIANTS;
  if (baseId === 'golumn') return GOLUMN_VARIANTS;
  return null;
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

export function buildRoster(pickIndex: PickIndex, mode: 'single' | 'double' = 'single'): BattleRosterMonster[] {
  const pick = (arr: SlimeVariant[]): SlimeVariant => arr[pickIndex(arr.length)];
  const baseWaves: StageWave[] = mode === 'double' ? DOUBLE_STAGE_WAVES : STAGE_WAVES;

  // Deep-copy waves so we can mutate safely
  const waves: StageWave[] = baseWaves.map(w => ({ ...w }));

  // Randomly inject one swap candidate into a mid-game slot (indices 1..8)
  if (RANDOM_SWAP_CANDIDATES.length > 0) {
    const candidate = RANDOM_SWAP_CANDIDATES[pickIndex(RANDOM_SWAP_CANDIDATES.length)];
    // Swappable = not first wave (0) and not boss wave (last)
    const swappable = waves
      .map((w, idx) => ({ w, idx }))
      .filter(({ idx }) => idx > 0 && idx < waves.length - 1);
    if (swappable.length > 0) {
      const chosen = swappable[pickIndex(swappable.length)];
      waves[chosen.idx] = { ...candidate };
    }
  }

  return waves.map((wave, i) => {
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
    const resolvedSceneType = resolvedId === 'boss_sword_god'
      ? 'heaven'
      : (wave.sceneType || b.mType);

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
