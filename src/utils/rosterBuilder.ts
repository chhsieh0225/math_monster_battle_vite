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

export function buildRoster(pickIndex: PickIndex, mode: 'single' | 'double' = 'single'): BattleRosterMonster[] {
  const pick = (arr: SlimeVariant[]): SlimeVariant => arr[pickIndex(arr.length)];
  const waves: StageWave[] = mode === 'double' ? DOUBLE_STAGE_WAVES : STAGE_WAVES;

  return waves.map((wave, i) => {
    // If wave requests a boss, randomly pick from the boss pool
    const resolvedId = BOSS_IDS.has(wave.monsterId)
      ? BOSS_ID_LIST[pickIndex(BOSS_ID_LIST.length)]
      : wave.monsterId;
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
      sceneMType: wave.sceneType || b.mType,
      hp: Math.round(b.hp * sc * hm),
      maxHp: Math.round(b.hp * sc * hm),
      atk: Math.round(b.atk * sc * am),
      lvl: i + 1,
      isEvolved,
    };
  });
}
