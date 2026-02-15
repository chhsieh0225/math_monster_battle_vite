import { MONSTERS, SLIME_VARIANTS, EVOLVED_SLIME_VARIANTS } from '../data/monsters.js';
import { STAGE_SCALE_BASE, STAGE_SCALE_STEP, STAGE_WAVES } from '../data/stageConfigs.js';

const MONSTER_BY_ID = new Map(MONSTERS.map(mon => [mon.id, mon]));

export function buildRoster(pickIndex) {
  const pick = (arr) => arr[pickIndex(arr.length)];

  return STAGE_WAVES.map((wave, i) => {
    const b = MONSTER_BY_ID.get(wave.monsterId);
    if (!b) throw new Error(`[rosterBuilder] unknown monsterId: ${wave.monsterId}`);
    const sc = STAGE_SCALE_BASE + i * STAGE_SCALE_STEP;
    const isEvolved = b.evolveLvl && (i + 1) >= b.evolveLvl;

    let variant = null;
    let evolvedVariant = null;
    if (b.id === "slime" && !isEvolved) variant = pick(SLIME_VARIANTS);
    if (b.id === "slime" && isEvolved) evolvedVariant = pick(EVOLVED_SLIME_VARIANTS);

    const activeVariant = evolvedVariant || variant;
    const hm = activeVariant ? (activeVariant.hpMult || 1) : 1;
    const am = activeVariant ? (activeVariant.atkMult || 1) : 1;

    return {
      ...b,
      ...(variant && {
        id: variant.id, name: variant.name, svgFn: variant.svgFn,
        c1: variant.c1, c2: variant.c2, mType: variant.mType,
        typeIcon: variant.typeIcon, typeName: variant.typeName,
        drops: variant.drops, trait: variant.trait, traitName: variant.traitName,
      }),
      ...(evolvedVariant && {
        id: evolvedVariant.id, name: evolvedVariant.name, svgFn: evolvedVariant.svgFn,
        c1: evolvedVariant.c1, c2: evolvedVariant.c2, mType: evolvedVariant.mType,
        typeIcon: evolvedVariant.typeIcon, typeName: evolvedVariant.typeName,
        drops: evolvedVariant.drops, trait: evolvedVariant.trait, traitName: evolvedVariant.traitName,
      }),
      name: evolvedVariant ? evolvedVariant.name : (isEvolved && b.evolvedName ? b.evolvedName : (variant ? variant.name : b.name)),
      svgFn: evolvedVariant ? evolvedVariant.svgFn : (isEvolved && b.evolvedSvgFn ? b.evolvedSvgFn : (variant ? variant.svgFn : b.svgFn)),
      sceneMType: b.mType,
      hp: Math.round(b.hp * sc * hm),
      maxHp: Math.round(b.hp * sc * hm),
      atk: Math.round(b.atk * sc * am),
      lvl: i + 1,
      isEvolved,
    };
  });
}
