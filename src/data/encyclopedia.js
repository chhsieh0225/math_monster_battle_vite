/**
 * Encyclopedia entries — derived from MONSTERS but includes evolved forms as
 * separate entries.  The `key` field is what we store in localStorage.
 */
import { MONSTERS, SLIME_VARIANTS, TYPE_EFF } from './monsters';

function weaknesses(mType) {
  const weak = [];
  for (const [atkType, map] of Object.entries(TYPE_EFF)) {
    if (map[mType] > 1) weak.push(atkType);
  }
  return weak;
}

const TYPE_LABEL = { fire:"火", water:"水", grass:"草", electric:"電", dark:"暗", ghost:"靈", steel:"鋼" };

export const ENC_ENTRIES = [];

MONSTERS.forEach(m => {
  if (m.id === "slime") {
    // Slime variants — each gets its own encyclopedia entry
    SLIME_VARIANTS.forEach(v => {
      ENC_ENTRIES.push({
        key: v.id,
        name: v.name,
        mType: v.mType,
        typeIcon: v.typeIcon,
        typeName: v.typeName,
        hp: m.hp,
        atk: m.atk,
        svgFn: v.svgFn,
        c1: v.c1, c2: v.c2,
        weakAgainst: weaknesses(v.mType).map(t => TYPE_LABEL[t] || t),
        isEvolved: false,
      });
    });
    // Evolved slime (叢林巨魔) — still one entry
    ENC_ENTRIES.push({
      key: m.id + "Evolved",
      name: m.evolvedName,
      mType: m.mType,
      typeIcon: m.typeIcon,
      typeName: m.typeName,
      hp: m.hp,
      atk: m.atk,
      svgFn: m.evolvedSvgFn,
      c1: m.c1, c2: m.c2,
      weakAgainst: weaknesses(m.mType).map(t => TYPE_LABEL[t] || t),
      isEvolved: true,
    });
  } else {
    // Base form
    ENC_ENTRIES.push({
      key: m.id,
      name: m.name,
      mType: m.mType,
      typeIcon: m.typeIcon,
      typeName: m.typeName,
      hp: m.hp,
      atk: m.atk,
      svgFn: m.svgFn,
      c1: m.c1, c2: m.c2,
      weakAgainst: weaknesses(m.mType).map(t => TYPE_LABEL[t] || t),
      isEvolved: false,
    });
    // Evolved form (boss has none)
    if (m.evolvedSvgFn) {
      ENC_ENTRIES.push({
        key: m.id + "Evolved",
        name: m.evolvedName,
        mType: m.mType,
        typeIcon: m.typeIcon,
        typeName: m.typeName,
        hp: m.hp,
        atk: m.atk,
        svgFn: m.evolvedSvgFn,
        c1: m.c1, c2: m.c2,
        weakAgainst: weaknesses(m.mType).map(t => TYPE_LABEL[t] || t),
        isEvolved: true,
      });
    }
  }
});

// Total count for "collect all" achievement
export const ENC_TOTAL = ENC_ENTRIES.length; // 14 (6 slime variants + 1 evolved + 4 base + 3 evolved)
