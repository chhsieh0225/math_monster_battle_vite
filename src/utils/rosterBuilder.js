import { MONSTERS, SLIME_VARIANTS, EVOLVED_SLIME_VARIANTS } from '../data/monsters';

const ORDER = [0, 1, 0, 2, 0, 1, 3, 2, 3, 4];

export function buildRoster(pickIndex) {
  const pick = (arr) => arr[pickIndex(arr.length)];

  return ORDER.map((idx, i) => {
    const b = MONSTERS[idx];
    const sc = 1 + i * 0.12;
    const isEvolved = b.evolveLvl && (i + 1) >= b.evolveLvl;

    let variant = null;
    let evolvedVariant = null;
    if (idx === 0 && !isEvolved) variant = pick(SLIME_VARIANTS);
    if (idx === 0 && isEvolved) evolvedVariant = pick(EVOLVED_SLIME_VARIANTS);

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
