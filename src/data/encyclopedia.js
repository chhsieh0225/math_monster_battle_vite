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

function resistances(mType) {
  const res = [];
  for (const [atkType, map] of Object.entries(TYPE_EFF)) {
    if (map[mType] < 1) res.push(atkType);
  }
  return res;
}

const TYPE_LABEL = { fire:"火", water:"水", grass:"草", electric:"電", dark:"暗", ghost:"靈", steel:"鋼" };

// ── Monster descriptions ──
const DESCS = {
  slime:       "草原上最常見的怪獸。身體柔軟Q彈，看似無害卻意外地頑強。據說不同環境下會產生屬性突變。",
  slime_red:   "在火山地帶附近突變的史萊姆。體溫極高，觸碰時會感到灼熱。性格比綠色同類更加暴躁。",
  slime_blue:  "長期棲息在水域邊的史萊姆變種。身體含有大量水分，能在雨天快速移動。",
  slime_yellow:"在雷暴頻繁的荒原中進化的史萊姆。體內蓄積靜電，毛髮會不自覺地豎起。",
  slime_dark:  "在黑暗深淵中誕生的神秘史萊姆。幾乎不反射光線，總是默默地潛伏在陰影中。",
  slime_steel:  "吞食了大量金屬礦石後硬化的史萊姆。外殼堅硬如鋼，但內部依然柔軟。",
  slimeEvolved:"史萊姆的最終進化型態。在叢林深處吸收了大量自然能量後，體型暴增數倍，成為令人畏懼的巨魔。",
  fire:        "棲息在火山口附近的蜥蜴型怪獸。背部的鱗片能聚集熱能，在戰鬥中噴射灼熱火焰。",
  fireEvolved: "火焰蜥的最終進化。吸收了火山核心的能量後化身為巨龍，翅膀上的火焰永不熄滅。",
  ghost:       "出沒於古老墓地的靈體怪獸。能穿越牆壁，用幽冥之力操控敵人的心智。白天幾乎看不到它的身影。",
  ghostEvolved:"幽靈魔突破生死界限後的終極型態。手持冥界死神鐮刀，據說能看穿一切防禦。",
  dragon:      "由古代機械文明創造的龍型機甲。全身覆蓋鈦合金裝甲，防禦力極高，但行動略顯笨重。",
  dragonEvolved:"鋼鐵龍裝載了傳說中的天空引擎後的形態。速度與防禦兼備，被稱為空中要塞。",
  boss:        "傳說中的暗黑龍王。統治著暗黑深淵的最終BOSS。擁有壓倒性的力量，只有最強的訓練師才能擊敗它。",
};

const HABITATS = {
  slime: "🌿 綠意草原",       slime_red: "🌿 綠意草原",
  slime_blue: "🌿 綠意草原",  slime_yellow: "🌿 綠意草原",
  slime_dark: "🌿 綠意草原",  slime_steel: "🌿 綠意草原",
  slimeEvolved: "🌿 綠意草原",
  fire: "🌋 炎熱火山",        fireEvolved: "🌋 炎熱火山",
  ghost: "🌙 幽暗墓地",       ghostEvolved: "🌙 幽暗墓地",
  dragon: "⚙️ 鋼鐵要塞",      dragonEvolved: "⚙️ 鋼鐵要塞",
  boss: "💀 暗黑深淵",
};

const RARITY = {
  slime: "★",       slime_red: "★",     slime_blue: "★",
  slime_yellow: "★", slime_dark: "★★",   slime_steel: "★★",
  slimeEvolved: "★★★",
  fire: "★★",       fireEvolved: "★★★",
  ghost: "★★",      ghostEvolved: "★★★",
  dragon: "★★★",    dragonEvolved: "★★★★",
  boss: "★★★★★",
};

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
        resistAgainst: resistances(v.mType).map(t => TYPE_LABEL[t] || t),
        isEvolved: false,
        desc: DESCS[v.id] || "",
        habitat: HABITATS[v.id] || "",
        rarity: RARITY[v.id] || "★",
        drops: v.drops,
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
      resistAgainst: resistances(m.mType).map(t => TYPE_LABEL[t] || t),
      isEvolved: true,
      desc: DESCS.slimeEvolved || "",
      habitat: HABITATS.slimeEvolved || "",
      rarity: RARITY.slimeEvolved || "★",
      drops: m.drops,
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
      resistAgainst: resistances(m.mType).map(t => TYPE_LABEL[t] || t),
      isEvolved: false,
      desc: DESCS[m.id] || "",
      habitat: HABITATS[m.id] || "",
      rarity: RARITY[m.id] || "★",
      drops: m.drops,
    });
    // Evolved form (boss has none)
    if (m.evolvedSvgFn) {
      const ek = m.id + "Evolved";
      ENC_ENTRIES.push({
        key: ek,
        name: m.evolvedName,
        mType: m.mType,
        typeIcon: m.typeIcon,
        typeName: m.typeName,
        hp: m.hp,
        atk: m.atk,
        svgFn: m.evolvedSvgFn,
        c1: m.c1, c2: m.c2,
        weakAgainst: weaknesses(m.mType).map(t => TYPE_LABEL[t] || t),
        resistAgainst: resistances(m.mType).map(t => TYPE_LABEL[t] || t),
        isEvolved: true,
        desc: DESCS[ek] || "",
        habitat: HABITATS[ek] || "",
        rarity: RARITY[ek] || "★",
        drops: m.drops,
      });
    }
  }
});

// Total count for "collect all" achievement
export const ENC_TOTAL = ENC_ENTRIES.length; // 14 (6 slime variants + 1 evolved + 4 base + 3 evolved)
