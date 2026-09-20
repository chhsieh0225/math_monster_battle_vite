import * as MC from '../data/monsterConfigs.ts';

const EN_LOCALE = "en-US";
const ZH_LOCALE = "zh-TW";

type LocaleCode = string | null | undefined;
type Dict<T> = Record<string, T>;
type LooseObject = Record<string, unknown>;

type MoveText = {
  name?: string;
  desc?: string;
};

type StarterText = {
  name: string;
  typeName?: string;
  stages: string[];
  skill?: string;
  moves?: MoveText[];
};

type TraitText = {
  name: string;
  desc: string;
};

type StageLike = {
  name?: string;
} & LooseObject;

type MoveLike = {
  name?: string;
  desc?: string;
} & LooseObject;

type StarterLike = {
  id?: string;
  name?: string;
  type?: string;
  typeName?: string;
  stages?: StageLike[];
  moves?: MoveLike[];
  selectedStageIdx?: number;
} & LooseObject;

type EnemyLike = {
  id?: string;
  name?: string;
  isEvolved?: boolean;
  mType?: string;
  mType2?: string;
  typeName?: string | null;
  typeName2?: string | null;
  trait?: string | null;
  traitName?: string | null;
  traitDesc?: string | null;
  personality?: {
    name?: string | null;
    nameEn?: string | null;
    desc?: string | null;
    descEn?: string | null;
    [k: string]: unknown;
  } | null;
} & LooseObject;

type EncyclopediaEnemyLike = {
  id?: string;
  key?: string;
  name?: string;
  mType?: string;
  mType2?: string;
  typeName?: string | null;
  typeName2?: string | null;
  weakAgainst?: string[];
  resistAgainst?: string[];
  desc?: string;
  habitat?: string;
  trait?: string | null;
  traitName?: string | null;
  traitDesc?: string | null;
} & LooseObject;

type EncyclopediaStarterLike = {
  id?: string;
  key?: string;
  starterId?: string;
  stageIdx?: number;
  name?: string;
  mType?: string;
  typeName?: string;
  desc?: string;
  skill?: string;
  stageLabel?: string;
  moves?: MoveLike[];
} & LooseObject;

const TYPE_NAME_EN_BY_ID: Dict<string> = {
  fire: "Fire",
  water: "Water",
  ice: "Ice",
  grass: "Grass",
  electric: "Electric",
  dark: "Dark",
  ghost: "Ghost",
  steel: "Steel",
  light: "Light",
  poison: "Poison",
  rock: "Rock",
  sweet: "Dream",
  dream: "Dream",
};

const TYPE_NAME_ZH_BY_ID: Dict<string> = {
  fire: "火",
  water: "水",
  ice: "冰",
  grass: "草",
  electric: "電",
  dark: "暗",
  ghost: "靈",
  steel: "鋼",
  light: "光",
  poison: "毒",
  rock: "岩",
  sweet: "夢幻",
  dream: "夢幻",
};

const TYPE_NAME_EN_BY_ZH: Dict<string> = {
  火: "Fire",
  水: "Water",
  冰: "Ice",
  草: "Grass",
  電: "Electric",
  暗: "Dark",
  靈: "Ghost",
  鋼: "Steel",
  光: "Light",
  毒: "Poison",
  岩: "Rock",
  神聖: "Holy",
  劍: "Sword",
  甜蜜: "Dream",
  夢幻: "Dream",
};

const SCENE_NAME_EN: Dict<string> = {
  grass: "🌿 Verdant Plains",
  fire: "🌋 Blazing Volcano",
  water: "💧 Azure Coast",
  electric: "⚡ Thunder Wasteland",
  ghost: "🌙 Gloom Graveyard",
  steel: "⚙️ Iron Fortress",
  light: "☁️ Celestial Sanctum",
  dark: "💀 Abyssal Depths",
  rock: "🪨 Rocky Canyon",
  poison: "☠️ Toxic Mire",
  heaven: "☁️ Celestial Sanctum",
  burnt_warplace: "🔥 Scorched Battlefield",
  candy: "🍬 Candy Land",
};

const STARTER_TEXT_EN: Dict<StarterText> = {
  fire: {
    name: "Embercub",
    typeName: "Fire",
    stages: ["Embercub", "Blazebeast", "Infernodrake"],
    skill: "🔥 Fire · Multiplication",
    moves: [
      { name: "Spark Shot", desc: "Basic multiplication" },
      { name: "Flare Rush", desc: "Times-table multiplication" },
      { name: "Inferno Burst", desc: "Large-number multiplication" },
      { name: "Umbral Firefall", desc: "Darkfire · mixed multiply/divide" },
    ],
  },
  water: {
    name: "Aquabub",
    typeName: "Water",
    stages: ["Aquabub", "Tidera", "Abyssdrake"],
    skill: "💧 Water · Division",
    moves: [
      { name: "Bubble Hit", desc: "Basic division" },
      { name: "Tide Wave", desc: "Advanced division" },
      { name: "Tsunami Crash", desc: "Large-number division" },
      { name: "Umbral Vortex", desc: "Darkwater · mixed multiply/divide" },
    ],
  },
  grass: {
    name: "Sproutlet",
    typeName: "Grass",
    stages: ["Sproutlet", "Bloomvine", "Sylvan King"],
    skill: "🌿 Grass · Add/Subtract",
    moves: [
      { name: "Leaf Slash", desc: "Basic addition" },
      { name: "Vine Whip", desc: "Basic subtraction" },
      { name: "Forest Tempest", desc: "Large-number add/subtract" },
      { name: "Umbral Briarfall", desc: "Darkgrass · mixed multiply/divide" },
    ],
  },
  electric: {
    name: "Voltkit",
    typeName: "Electric",
    stages: ["Voltkit", "Thundra", "Stormdrake"],
    skill: "⚡ Electric · Four Operations",
    moves: [
      { name: "Volt Orb", desc: "Mixed add/subtract" },
      { name: "Thunder Jab", desc: "Mixed multiply/add" },
      { name: "Grand Thunder", desc: "Four operations" },
      { name: "Umbral Shockchain", desc: "Darkthunder · four-op mix" },
    ],
  },
  lion: {
    name: "Lioncub",
    typeName: "Light",
    stages: ["Lioncub", "Manelion", "Solar King"],
    skill: "✨ Light · Unknown Variables",
    moves: [
      { name: "Hunter Pounce", desc: "Unknowns in add/subtract" },
      { name: "Roar Break", desc: "Unknowns in multiply/divide" },
      { name: "Blaze Hunt", desc: "Large-number unknowns" },
      { name: "Eclipse Roar", desc: "Darklight · mixed unknowns" },
    ],
  },
  wolf: {
    name: "Steelpup",
    typeName: "Steel",
    stages: ["Steelpup", "Bladewolf", "Aegis Wolf King"],
    skill: "⚙️ Steel · Fractions",
    moves: [
      { name: "Fraction Gauge", desc: "Compare fractions (> < =)" },
      { name: "Common-Denom Slash", desc: "Same-denominator add/subtract" },
      { name: "LCM Breakfang", desc: "Different-denominator add/subtract" },
      { name: "Iron Ratio Finale", desc: "Fraction multiply/divide" },
    ],
  },
  tiger: {
    name: "Frostcub",
    typeName: "Ice",
    stages: ["Frostcub", "Rimefang Tiger", "Glacier Tiger King"],
    skill: "❄️ Ice · Decimals",
    moves: [
      { name: "Crystal Bolt", desc: "One-decimal add/subtract" },
      { name: "Frost Conversion", desc: "Decimal/fraction conversion" },
      { name: "Polar Claw", desc: "Decimal multiplication" },
      { name: "Absolute Zero Verdict", desc: "Decimal division" },
    ],
  },
  boss: {
    name: "Dark Dragon King",
    typeName: "Dark",
    stages: ["Dark Dragon King"],
    skill: "💀 Dark · Thunder Pressure",
    moves: [
      { name: "Abyss Claw", desc: "Dark thunder mixed operations" },
      { name: "Void Storm", desc: "Dark thunder mul/add mix" },
      { name: "Dread Breath", desc: "Advanced four-op pressure" },
      { name: "Cataclysm Verdict", desc: "Final dark thunder execution" },
    ],
  },
  boss_hydra: {
    name: "Abyss Hydra",
    typeName: "Poison",
    stages: ["Abyss Hydra"],
    skill: "☠️ Venom · Control Pressure",
    moves: [
      { name: "Venom Fang", desc: "Poison add/sub mix" },
      { name: "Mire Tide", desc: "Poison mul/div mix" },
      { name: "Ninefold Coil", desc: "Abyssal four-op chain" },
      { name: "Marsh Oblivion", desc: "Final venom execution" },
    ],
  },
  boss_crazy_dragon: {
    name: "One-Winged Frenzy Dragon",
    typeName: "Dark",
    stages: ["One-Winged Frenzy Dragon"],
    skill: "🔥 Darkflame · Burst",
    moves: [
      { name: "Frenzy Bite", desc: "Darkflame multiplication" },
      { name: "Broken Wing Rush", desc: "Frenzy four-op mix" },
      { name: "Blackflame Skyfall", desc: "Darkflame mul/div pressure" },
      { name: "Wingfall Judgment", desc: "Final dragon execution" },
    ],
  },
  boss_sword_god: {
    name: "Kusanagi Sword God",
    typeName: "Holy",
    stages: ["Kusanagi Sword God"],
    skill: "⚔️ Holy Blade · Precision",
    moves: [
      { name: "Heaven Slash", desc: "Holy unknown add/sub" },
      { name: "Cloudblade Combo", desc: "Blade four-op mix" },
      { name: "Divine Sever", desc: "Advanced unknown control" },
      { name: "Kusanagi Finale", desc: "Final holy-blade execution" },
    ],
  },
};

export const MONSTER_NAME_EN: Dict<string> = {
  // Computed from monsterConfigs (base + evolved forms)
  ...Object.fromEntries(
    [...MC.MONSTER_CONFIGS, ...MC.SLIME_VARIANT_CONFIGS, ...MC.EVOLVED_SLIME_VARIANT_CONFIGS]
      .filter((c) => c.nameEn)
      .map((c) => [c.id, c.nameEn!]),
  ),
  ...Object.fromEntries(
    MC.MONSTER_CONFIGS
      .filter((c) => c.evolvedNameEn && c.evolvedSpriteKey)
      .map((c) => [c.id + "Evolved", c.evolvedNameEn!]),
  ),
  // Wild starters (no config object)
  wild_starter_fire: "Wild Fire Cub",
  wild_starter_water: "Wild Water Cub",
  wild_starter_grass: "Wild Grass Cub",
  wild_starter_electric: "Wild Thunder Cub",
  wild_starter_tiger: "Wild Frostcub",
  wild_starter_lion: "Wild Lion Cub",
  wild_starter_wolf: "Wild Steel Pup",
};

const MONSTER_NAME_EN_BY_ZH: Dict<string> = {
  // Computed from monsterConfigs (name → nameEn, evolvedName → evolvedNameEn)
  ...Object.fromEntries(
    [...MC.MONSTER_CONFIGS, ...MC.SLIME_VARIANT_CONFIGS, ...MC.EVOLVED_SLIME_VARIANT_CONFIGS]
      .filter((c) => c.nameEn)
      .map((c) => [c.name, c.nameEn!]),
  ),
  ...Object.fromEntries(
    MC.MONSTER_CONFIGS
      .filter((c) => c.evolvedName && c.evolvedNameEn)
      .map((c) => [c.evolvedName!, c.evolvedNameEn!]),
  ),
  // Starter stages (no config object)
  小火獸: "Fire Cub",
  小水獸: "Water Cub",
  小草獸: "Grass Cub",
  小雷獸: "Thunder Cub",
  小冰虎: "Frostcub",
  霜牙虎: "Rimefang Tiger",
  冰晶虎王: "Glacier Tiger King",
  小獅獸: "Lion Cub",
  小鋼狼: "Steel Pup",
  鋼刃狼: "Bladewolf",
  蒼鋼狼王: "Aegis Wolf King",
};

export const MONSTER_DESC_EN: Dict<string> = {
  // Computed from monsterConfigs (base + evolved forms)
  ...Object.fromEntries(
    [...MC.MONSTER_CONFIGS, ...MC.SLIME_VARIANT_CONFIGS, ...MC.EVOLVED_SLIME_VARIANT_CONFIGS]
      .filter((c) => c.descEn)
      .map((c) => [c.id, c.descEn!]),
  ),
  ...Object.fromEntries(
    MC.MONSTER_CONFIGS
      .filter((c) => c.evolvedDescEn)
      .map((c) => [c.id + "Evolved", c.evolvedDescEn!]),
  ),
};

export const MONSTER_HABITAT_EN: Dict<string> = {
  // Computed from monsterConfigs (base + evolved forms)
  ...Object.fromEntries(
    [...MC.MONSTER_CONFIGS, ...MC.SLIME_VARIANT_CONFIGS, ...MC.EVOLVED_SLIME_VARIANT_CONFIGS]
      .filter((c) => c.habitatEn)
      .map((c) => [c.id, c.habitatEn!]),
  ),
  ...Object.fromEntries(
    MC.MONSTER_CONFIGS
      .filter((c) => c.evolvedHabitatEn)
      .map((c) => [c.id + "Evolved", c.evolvedHabitatEn!]),
  ),
};

const STARTER_DESC_EN: Dict<string> = {
  fire_0: "A volcano-born cub. Its tail flame grows brighter with confidence and control.",
  fire_1: "A tougher evolved form with hardened scales and stronger flame pressure.",
  fire_2: "A winged final form that unleashes inferno breath with advanced multiplication.",
  water_0: "A playful water cub that practices division to control bubble pressure.",
  water_1: "An evolved tide partner that shapes stronger water currents with precision.",
  water_2: "A sea-dominating final form that commands tsunami force through perfect division.",
  grass_0: "A forest seedling partner that gathers nature energy through simple addition.",
  grass_1: "An evolved bloom form with long vines and precise weakening strikes.",
  grass_2: "A final forest sovereign that handles large-number add/subtract with ease.",
  electric_0: "A thunder-born cub storing static electricity in its fluffy fur.",
  electric_1: "An evolved lightning form with higher speed and flexible mixed operations.",
  electric_2: "A fully awakened storm form powered by complete mastery of four operations.",
  tiger_0: "A frost-born cub that trains one-decimal add/sub precision with steady focus.",
  tiger_1: "An evolved ice tiger that converts between decimals and fractions in a blink.",
  tiger_2: "A final glacier king that handles decimal multiply/divide under absolute control.",
  lion_0: "A brave plains cub with instinct for unknown variables in simple equations.",
  lion_1: "An evolved hunter with sharper claws and stronger unknown-solving power.",
  lion_2: "A final sacred lion wrapped in golden flames, revealing any hidden variable.",
  wolf_0: "A steel-born wolf pup that learns to compare fractions before striking.",
  wolf_1: "An evolved blade wolf that excels at same- and different-denominator operations.",
  wolf_2: "A final steel king that executes fraction multiply/divide with precision.",
};

const STAGE_LABEL_EN: string[] = ["Base", "Evolved", "Final"];

const STARTER_NAME_EN_BY_ZH: Dict<string> = {
  小火獸: "Embercub",
  烈焰獸: "Blazebeast",
  炎龍王: "Infernodrake",
  小水獸: "Aquabub",
  波濤獸: "Tidera",
  海龍王: "Abyssdrake",
  小草獸: "Sproutlet",
  花葉獸: "Bloomvine",
  森林王: "Sylvan King",
  小雷獸: "Voltkit",
  雷電獸: "Thundra",
  雷龍王: "Stormdrake",
  小冰虎: "Frostcub",
  霜牙虎: "Rimefang Tiger",
  冰晶虎王: "Glacier Tiger King",
  小獅獸: "Lioncub",
  獅鬃獸: "Manelion",
  獅焰王: "Solar King",
  小鋼狼: "Steelpup",
  鋼刃狼: "Bladewolf",
  蒼鋼狼王: "Aegis Wolf King",
  暗黑龍王: "Dark Dragon King",
  深淵九頭蛇: "Abyss Hydra",
  單翼狂龍: "One-Winged Frenzy Dragon",
  叢雲劍神: "Kusanagi Sword God",
};

const STARTER_NAME_ZH_BY_EN: Dict<string> = Object.fromEntries(
  Object.entries(STARTER_NAME_EN_BY_ZH).map(([zhName, enName]) => [enName, zhName]),
);

const STARTER_TEXT_ZH: Dict<StarterText> = {
  fire: {
    name: "小火獸",
    stages: ["小火獸", "烈焰獸", "炎龍王"],
  },
  water: {
    name: "小水獸",
    stages: ["小水獸", "波濤獸", "海龍王"],
  },
  grass: {
    name: "小草獸",
    stages: ["小草獸", "花葉獸", "森林王"],
  },
  electric: {
    name: "小雷獸",
    stages: ["小雷獸", "雷電獸", "雷龍王"],
  },
  tiger: {
    name: "小冰虎",
    stages: ["小冰虎", "霜牙虎", "冰晶虎王"],
  },
  lion: {
    name: "小獅獸",
    stages: ["小獅獸", "獅鬃獸", "獅焰王"],
  },
  wolf: {
    name: "小鋼狼",
    stages: ["小鋼狼", "鋼刃狼", "蒼鋼狼王"],
  },
  boss: {
    name: "暗黑龍王",
    stages: ["暗黑龍王"],
  },
  boss_hydra: {
    name: "深淵九頭蛇",
    stages: ["深淵九頭蛇"],
  },
  boss_crazy_dragon: {
    name: "單翼狂龍",
    stages: ["單翼狂龍"],
  },
  boss_sword_god: {
    name: "叢雲劍神",
    stages: ["叢雲劍神"],
  },
};

const TRAIT_TEXT_EN_BY_ID: Dict<TraitText> = {
  normal: {
    name: "Normal",
    desc: "No special trait.",
  },
  blaze: {
    name: "Blaze",
    desc: "ATK +50% when HP is below 50%. The lower it gets, the fiercer it fights.",
  },
  phantom: {
    name: "Phantom",
    desc: "25% chance to evade incoming attacks with an intangible body.",
  },
  counter: {
    name: "Counter Armor",
    desc: "Reflects 20% of damage taken back to the attacker.",
  },
  tyrant: {
    name: "Tyrant",
    desc: "A multi-phase boss trait with charge attacks and skill-seal pressure.",
  },
  venom: {
    name: "Venom Fog",
    desc: "Emits toxic mist that corrodes the opponent over time, with stronger ticks at higher phases.",
  },
  fortify: {
    name: "Stonewall",
    desc: "A hardened rock body reduces incoming damage.",
  },
  berserk: {
    name: "Berserk",
    desc: "Lower HP but fierce offense, with a chance to crit for 1.5x damage.",
  },
  tenacity: {
    name: "Tenacity",
    desc: "Lower attack but high endurance; attacks can heal itself.",
  },
  swift: {
    name: "Swift",
    desc: "Very fast movement; may strike twice in a single turn.",
  },
  curse: {
    name: "Curse",
    desc: "Can weaken the opponent's next attack with a dark aura.",
  },
  fortress: {
    name: "Fortress",
    desc: "Heavy metal shell reduces damage taken by 30%.",
  },
};

const TRAIT_NAME_EN_BY_ZH: Dict<string> = {
  普通: "Normal",
  烈焰: "Blaze",
  幻影: "Phantom",
  反擊裝甲: "Counter Armor",
  霸王: "Tyrant",
  毒霧: "Venom Fog",
  堅岩: "Stonewall",
  狂怒: "Tyrant",
  神裁: "Divine Verdict",
  狂暴: "Berserk",
  堅韌: "Tenacity",
  迅捷: "Swift",
  詛咒: "Curse",
  鐵壁: "Fortress",
};

function isObject(value: unknown): value is LooseObject {
  return value !== null && typeof value === "object";
}

export function isEnglishLocale(locale: unknown): locale is typeof EN_LOCALE {
  return locale === EN_LOCALE;
}

export function isZhLocale(locale: unknown): locale is typeof ZH_LOCALE {
  return locale === ZH_LOCALE;
}

export function localizeTypeName(
  typeNameOrId: string | null | undefined,
  locale: LocaleCode,
): string | null | undefined {
  if (!typeNameOrId) return typeNameOrId;
  if (isEnglishLocale(locale)) {
    return (
      TYPE_NAME_EN_BY_ID[typeNameOrId]
      || TYPE_NAME_EN_BY_ZH[typeNameOrId]
      || typeNameOrId
    );
  }
  // zh-TW: resolve type IDs (e.g. "fire") to Chinese labels (e.g. "火").
  // Already-Chinese values pass through via fallback.
  return TYPE_NAME_ZH_BY_ID[typeNameOrId] || typeNameOrId;
}

export function localizeSceneName(
  sceneType: string | null | undefined,
  fallback = "",
  locale: LocaleCode = null,
): string {
  if (!isEnglishLocale(locale)) return fallback;
  if (!sceneType) return fallback;
  return SCENE_NAME_EN[sceneType] || fallback;
}

function localizeTraitName(
  traitId: string | null | undefined,
  traitName: string | null | undefined,
  locale: LocaleCode,
): string | null | undefined {
  if (!isEnglishLocale(locale)) return traitName;
  return (
    (traitId ? TRAIT_TEXT_EN_BY_ID[traitId]?.name : undefined)
    || (traitName ? TRAIT_NAME_EN_BY_ZH[traitName] : undefined)
    || traitName
  );
}

function localizeTraitDesc(
  traitId: string | null | undefined,
  traitDesc: string | null | undefined,
  locale: LocaleCode,
  enemyId?: string | null,
): string | null | undefined {
  if (!isEnglishLocale(locale)) return traitDesc;
  if (enemyId === 'boss') return 'A multi-phase tyrant with a 2-layer shadow ward, reforming with 3 layers from phase two. Correct hits break 1 layer; Flame Rush breaks 2. After breaking it, the next answer attack gains 35% damage. Charges and seals skills, but never the basic move.';
  return (traitId ? TRAIT_TEXT_EN_BY_ID[traitId]?.desc : undefined) || traitDesc;
}

function localizeStarterMoves<T extends MoveLike>(
  moves: T[] | undefined,
  starterId: string | null | undefined,
  locale: LocaleCode,
): T[] | undefined {
  if (!Array.isArray(moves) || !isEnglishLocale(locale)) return moves;
  const localizedMoves = starterId ? STARTER_TEXT_EN[starterId]?.moves || [] : [];
  return moves.map((move, idx) => {
    const moveText = localizedMoves[idx];
    if (!moveText) return { ...move };
    const moveName = typeof move.name === "string" ? move.name : "";
    const moveDesc = typeof move.desc === "string" ? move.desc : "";
    return {
      ...move,
      name: moveText.name || moveName,
      desc: moveText.desc || moveDesc,
    };
  });
}

export function localizeStarter<T>(starter: T, locale: LocaleCode): T {
  if (!isObject(starter) || !isEnglishLocale(locale)) return starter;
  const starterData = starter as StarterLike;
  const starterId = typeof starterData.id === "string" ? starterData.id : "";
  const starterText = STARTER_TEXT_EN[starterId];
  const stages = Array.isArray(starterData.stages)
    ? starterData.stages.map((stage, idx) => ({
      ...stage,
      name: starterText?.stages?.[idx] || stage.name,
    }))
    : starterData.stages;
  const selectedStageIdx = Number.isFinite(starterData.selectedStageIdx)
    ? Number(starterData.selectedStageIdx)
    : 0;
  const stageName = stages?.[selectedStageIdx]?.name;

  return {
    ...starterData,
    name: stageName || starterText?.name || starterData.name,
    typeName: starterText?.typeName || localizeTypeName(starterData.type || starterData.typeName, locale),
    stages,
    moves: localizeStarterMoves(starterData.moves, starterId, locale),
  } as T;
}

export function localizeStarterList<T extends StarterLike>(
  starters: T[],
  locale: LocaleCode,
): T[];
export function localizeStarterList<T>(starters: T, locale: LocaleCode): T;
export function localizeStarterList(starters: unknown, locale: LocaleCode): unknown {
  if (!Array.isArray(starters)) return starters;
  const starterList = starters as StarterLike[];
  if (!isEnglishLocale(locale)) return starterList;
  return starterList.map((starter) => localizeStarter(starter, locale));
}

/**
 * @param {string | null | undefined} name
 * @param {string | null | undefined} starterId
 * @param {string | null | undefined} locale
 * @param {number | null | undefined} stageIdx
 * @returns {string}
 */
export function localizeStarterDisplayName(
  name: string | null | undefined,
  starterId: string | null | undefined,
  locale: LocaleCode,
  stageIdx: number | null = null,
): string {
  const resolvedName = typeof name === "string" ? name.trim() : "";
  const resolvedStageIdx = Number.isFinite(stageIdx) ? stageIdx : null;
  if (!isEnglishLocale(locale) && !isZhLocale(locale)) return resolvedName || String(name || "");

  if (isEnglishLocale(locale)) {
    if (starterId && resolvedStageIdx !== null) {
      const stageName = STARTER_TEXT_EN[starterId]?.stages?.[resolvedStageIdx];
      if (stageName) return stageName;
    }

    if (resolvedName && STARTER_NAME_EN_BY_ZH[resolvedName]) {
      return STARTER_NAME_EN_BY_ZH[resolvedName];
    }

    if (!resolvedName && starterId && STARTER_TEXT_EN[starterId]?.name) {
      return STARTER_TEXT_EN[starterId].name;
    }

    return resolvedName || String(name || "");
  }

  if (starterId && resolvedStageIdx !== null) {
    const stageName = STARTER_TEXT_ZH[starterId]?.stages?.[resolvedStageIdx];
    if (stageName) return stageName;
  }

  if (resolvedName && STARTER_NAME_ZH_BY_EN[resolvedName]) {
    return STARTER_NAME_ZH_BY_EN[resolvedName];
  }

  if (!resolvedName && starterId) {
    const starterZh = STARTERS_FALLBACK_ZH[starterId];
    if (starterZh) return starterZh;
  }

  return resolvedName || String(name || "");
}

const STARTERS_FALLBACK_ZH: Dict<string> = {
  fire: "小火獸",
  water: "小水獸",
  grass: "小草獸",
  electric: "小雷獸",
  tiger: "小冰虎",
  lion: "小獅獸",
  wolf: "小鋼狼",
  boss: "暗黑龍王",
  boss_hydra: "深淵九頭蛇",
  boss_crazy_dragon: "單翼狂龍",
  boss_sword_god: "叢雲劍神",
};

export function localizeEnemy<T>(enemy: T, locale: LocaleCode): T {
  if (!isObject(enemy) || !isEnglishLocale(locale)) return enemy;
  const enemyData = enemy as EnemyLike;
  const enemyId = String(enemyData.id || "");
  const enemyKey = (
    enemyData.isEvolved && enemyId && !enemyId.endsWith("Evolved")
      ? `${enemyId}Evolved`
      : enemyId
  );
  const fallbackName = (enemyData.name ? MONSTER_NAME_EN_BY_ZH[enemyData.name] : undefined) || enemyData.name;
  const p = enemyData.personality;
  const localizedPersonality = p
    ? { ...p, name: p.nameEn || p.name || null, desc: p.descEn || p.desc || null }
    : null;
  return {
    ...enemyData,
    name: MONSTER_NAME_EN[enemyKey] || MONSTER_NAME_EN[enemyId] || fallbackName,
    typeName: localizeTypeName(enemyData.typeName || enemyData.mType, locale),
    typeName2: localizeTypeName(enemyData.typeName2 || enemyData.mType2, locale),
    traitName: localizeTraitName(enemyData.trait, enemyData.traitName, locale),
    traitDesc: localizeTraitDesc(enemyData.trait, enemyData.traitDesc, locale, enemyId),
    personality: localizedPersonality,
  } as T;
}

export function localizeEnemyRoster<T extends EnemyLike>(
  roster: T[],
  locale: LocaleCode,
): T[];
export function localizeEnemyRoster<T>(roster: T, locale: LocaleCode): T;
export function localizeEnemyRoster(roster: unknown, locale: LocaleCode): unknown {
  if (!Array.isArray(roster)) return roster;
  const enemyList = roster as EnemyLike[];
  if (!isEnglishLocale(locale)) return enemyList;
  return enemyList.map((enemy) => localizeEnemy(enemy, locale));
}

function parseStarterIdFromKey(
  entry: EncyclopediaStarterLike | null | undefined,
): string | null {
  if (entry?.starterId) return entry.starterId;
  const key = entry?.key || "";
  const matched = /^starter_([a-zA-Z0-9]+)_\d+$/.exec(key);
  return matched?.[1] || null;
}

export function localizeEncyclopediaEnemyEntry<T>(entry: T, locale: LocaleCode): T {
  if (!isObject(entry)) return entry;
  const enemyEntry = entry as EncyclopediaEnemyLike;

  // weakAgainst / resistAgainst store raw type IDs — translate for ALL locales
  const localizedWeak = Array.isArray(enemyEntry.weakAgainst)
    ? enemyEntry.weakAgainst.map((id) => localizeTypeName(id, locale))
    : enemyEntry.weakAgainst;
  const localizedResist = Array.isArray(enemyEntry.resistAgainst)
    ? enemyEntry.resistAgainst.map((id) => localizeTypeName(id, locale))
    : enemyEntry.resistAgainst;

  if (!isEnglishLocale(locale)) {
    return { ...enemyEntry, weakAgainst: localizedWeak, resistAgainst: localizedResist } as T;
  }

  const key = enemyEntry.key || enemyEntry.id || "";
  const fallbackName = (enemyEntry.name ? MONSTER_NAME_EN_BY_ZH[enemyEntry.name] : undefined) || enemyEntry.name;
  return {
    ...enemyEntry,
    name: MONSTER_NAME_EN[key] || (enemyEntry.id ? MONSTER_NAME_EN[enemyEntry.id] : undefined) || fallbackName,
    typeName: localizeTypeName(enemyEntry.typeName || enemyEntry.mType, locale),
    typeName2: localizeTypeName(enemyEntry.typeName2 || enemyEntry.mType2, locale),
    weakAgainst: localizedWeak,
    resistAgainst: localizedResist,
    desc: MONSTER_DESC_EN[key] || enemyEntry.desc,
    habitat: MONSTER_HABITAT_EN[key] || enemyEntry.habitat,
    traitName: localizeTraitName(enemyEntry.trait, enemyEntry.traitName, locale),
    traitDesc: localizeTraitDesc(enemyEntry.trait, enemyEntry.traitDesc, locale, enemyEntry.id || key),
  } as T;
}

export function localizeEncyclopediaEnemyEntries<T extends EncyclopediaEnemyLike>(
  entries: T[],
  locale: LocaleCode,
): T[];
export function localizeEncyclopediaEnemyEntries<T>(entries: T, locale: LocaleCode): T;
export function localizeEncyclopediaEnemyEntries(entries: unknown, locale: LocaleCode): unknown {
  if (!Array.isArray(entries)) return entries;
  const enemyEntries = entries as EncyclopediaEnemyLike[];
  // Always localize: zh-TW needs weakAgainst/resistAgainst type-ID → Chinese mapping,
  // en-US needs full name/desc/habitat/trait translation.
  return enemyEntries.map((entry) => localizeEncyclopediaEnemyEntry(entry, locale));
}

export function localizeEncyclopediaStarterEntry<T>(entry: T, locale: LocaleCode): T {
  if (!isObject(entry) || !isEnglishLocale(locale)) return entry;
  const starterEntry = entry as EncyclopediaStarterLike;
  const starterId = parseStarterIdFromKey(starterEntry);
  const starterText = starterId ? STARTER_TEXT_EN[starterId] : undefined;
  const stageIdx = Number.isFinite(starterEntry.stageIdx) ? Number(starterEntry.stageIdx) : 0;
  const descKey = starterId ? `${starterId}_${stageIdx}` : "";

  return {
    ...starterEntry,
    name: starterText?.stages?.[stageIdx] || starterText?.name || starterEntry.name,
    typeName: localizeTypeName(starterEntry.mType || starterEntry.typeName, locale),
    desc: STARTER_DESC_EN[descKey] || starterEntry.desc,
    skill: starterText?.skill || starterEntry.skill,
    stageLabel: STAGE_LABEL_EN[stageIdx] || starterEntry.stageLabel,
    moves: localizeStarterMoves(starterEntry.moves, starterId, locale),
  } as T;
}

export function localizeEncyclopediaStarterEntries<T extends EncyclopediaStarterLike>(
  entries: T[],
  locale: LocaleCode,
): T[];
export function localizeEncyclopediaStarterEntries<T>(entries: T, locale: LocaleCode): T;
export function localizeEncyclopediaStarterEntries(entries: unknown, locale: LocaleCode): unknown {
  if (!Array.isArray(entries)) return entries;
  const starterEntries = entries as EncyclopediaStarterLike[];
  if (!isEnglishLocale(locale)) return starterEntries;
  return starterEntries.map((entry) => localizeEncyclopediaStarterEntry(entry, locale));
}
