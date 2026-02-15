const EN_LOCALE = "en-US";

const TYPE_NAME_EN_BY_ID = {
  fire: "Fire",
  water: "Water",
  grass: "Grass",
  electric: "Electric",
  dark: "Dark",
  ghost: "Ghost",
  steel: "Steel",
  light: "Light",
};

const TYPE_NAME_EN_BY_ZH = {
  火: "Fire",
  水: "Water",
  草: "Grass",
  電: "Electric",
  暗: "Dark",
  靈: "Ghost",
  鋼: "Steel",
  光: "Light",
};

const SCENE_NAME_EN = {
  grass: "🌿 Verdant Plains",
  fire: "🌋 Blazing Volcano",
  water: "💧 Azure Waters",
  electric: "⚡ Thunder Wasteland",
  ghost: "🌙 Gloom Graveyard",
  steel: "⚙️ Iron Fortress",
  dark: "💀 Abyssal Depths",
};

const STARTER_TEXT_EN = {
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
};

const MONSTER_NAME_EN = {
  slime: "Green Slime",
  slime_red: "Crimson Slime",
  slime_blue: "Azure Slime",
  slime_yellow: "Volt Slime",
  slime_dark: "Shadow Slime",
  slime_steel: "Iron Slime",
  slimeEvolved: "Jungle Ogre",
  slimeElectricEvolved: "Thunder Ogre",
  slimeFireEvolved: "Inferno Ogre",
  slimeWaterEvolved: "Abyssal Ogre",
  slimeSteelEvolved: "Titan Ogre",
  slimeDarkEvolved: "Void Ogre",
  fire: "Flame Lizard",
  fireEvolved: "Inferno Dragon",
  ghost: "Phantom Fiend",
  ghostEvolved: "Nether Reaper",
  dragon: "Iron Dragon",
  dragonEvolved: "Aegis Skywyrm",
  boss: "Dark Dragon King",
};

const MONSTER_DESC_EN = {
  slime: "The most common monster on the plains. Soft and bouncy, but tougher than it looks.",
  slime_red: "A slime mutated near volcanoes. Its body burns hot and its temper is fierce.",
  slime_blue: "A water-rich slime variant from wetlands. It moves swiftly during rain.",
  slime_yellow: "A slime adapted to thunder fields. Static energy constantly crackles around it.",
  slime_dark: "A mysterious slime from deep shadows. It reflects almost no light.",
  slime_steel: "A hardened slime formed by consuming metal ore. Tough shell, soft core.",
  slimeEvolved: "Final evolution of slime that absorbed massive natural energy in ancient forests.",
  slimeElectricEvolved: "An ultimate form born from countless lightning strikes, wrapped in electric arcs.",
  slimeFireEvolved: "A magma-forged ultimate form that scorches everything in its path.",
  slimeWaterEvolved: "An abyss-forged form that controls crushing deep-sea pressure.",
  slimeSteelEvolved: "An ultimate alloy form reinforced by meteor iron, nearly unbreakable.",
  slimeDarkEvolved: "A void-touched form surrounded by darkness said to swallow light itself.",
  fire: "A lizard monster near volcanic vents. Its scales gather heat for flame attacks.",
  fireEvolved: "The ultimate evolution of Flame Lizard, empowered by a volcanic core.",
  ghost: "A spectral monster haunting ancient graves, drifting through walls and minds.",
  ghostEvolved: "A transcendent spirit wielding reaper power from the underworld.",
  dragon: "An ancient mechanical dragon with heavy alloy armor and strong defense.",
  dragonEvolved: "An upgraded war-dragon with a sky engine, balancing speed and armor.",
  boss: "The legendary ruler of the abyss. Only top trainers can challenge this tyrant.",
};

const MONSTER_HABITAT_EN = {
  slime: "🌿 Verdant Plains",
  slime_red: "🌿 Verdant Plains",
  slime_blue: "🌿 Verdant Plains",
  slime_yellow: "🌿 Verdant Plains",
  slime_dark: "🌿 Verdant Plains",
  slime_steel: "🌿 Verdant Plains",
  slimeEvolved: "🌿 Verdant Plains",
  slimeElectricEvolved: "🌿 Verdant Plains",
  slimeFireEvolved: "🌿 Verdant Plains",
  slimeWaterEvolved: "🌿 Verdant Plains",
  slimeSteelEvolved: "🌿 Verdant Plains",
  slimeDarkEvolved: "🌿 Verdant Plains",
  fire: "🌋 Blazing Volcano",
  fireEvolved: "🌋 Blazing Volcano",
  ghost: "🌙 Gloom Graveyard",
  ghostEvolved: "🌙 Gloom Graveyard",
  dragon: "⚙️ Iron Fortress",
  dragonEvolved: "⚙️ Iron Fortress",
  boss: "💀 Abyssal Depths",
};

const STARTER_DESC_EN = {
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
  lion_0: "A brave plains cub with instinct for unknown variables in simple equations.",
  lion_1: "An evolved hunter with sharper claws and stronger unknown-solving power.",
  lion_2: "A final sacred lion wrapped in golden flames, revealing any hidden variable.",
};

const STAGE_LABEL_EN = ["Base", "Evolved", "Final"];

const TRAIT_TEXT_EN_BY_ID = {
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

const TRAIT_NAME_EN_BY_ZH = {
  普通: "Normal",
  烈焰: "Blaze",
  幻影: "Phantom",
  反擊裝甲: "Counter Armor",
  霸王: "Tyrant",
  狂暴: "Berserk",
  堅韌: "Tenacity",
  迅捷: "Swift",
  詛咒: "Curse",
  鐵壁: "Fortress",
};

function isObject(value) {
  return value !== null && typeof value === "object";
}

export function isEnglishLocale(locale) {
  return locale === EN_LOCALE;
}

export function localizeTypeName(typeNameOrId, locale) {
  if (!isEnglishLocale(locale) || !typeNameOrId) return typeNameOrId;
  return (
    TYPE_NAME_EN_BY_ID[typeNameOrId]
    || TYPE_NAME_EN_BY_ZH[typeNameOrId]
    || typeNameOrId
  );
}

export function localizeSceneName(sceneType, fallback = "", locale) {
  if (!isEnglishLocale(locale)) return fallback;
  return SCENE_NAME_EN[sceneType] || fallback;
}

function localizeTraitName(traitId, traitName, locale) {
  if (!isEnglishLocale(locale)) return traitName;
  return (
    TRAIT_TEXT_EN_BY_ID[traitId]?.name
    || TRAIT_NAME_EN_BY_ZH[traitName]
    || traitName
  );
}

function localizeTraitDesc(traitId, traitDesc, locale) {
  if (!isEnglishLocale(locale)) return traitDesc;
  return TRAIT_TEXT_EN_BY_ID[traitId]?.desc || traitDesc;
}

function localizeStarterMoves(moves, starterId, locale) {
  if (!Array.isArray(moves) || !isEnglishLocale(locale)) return moves;
  const localizedMoves = STARTER_TEXT_EN[starterId]?.moves || [];
  return moves.map((move, idx) => {
    const moveText = localizedMoves[idx];
    if (!moveText) return { ...move };
    return {
      ...move,
      name: moveText.name || move.name,
      desc: moveText.desc || move.desc,
    };
  });
}

export function localizeStarter(starter, locale) {
  if (!isObject(starter) || !isEnglishLocale(locale)) return starter;
  const starterId = starter.id;
  const starterText = STARTER_TEXT_EN[starterId] || {};
  const stages = Array.isArray(starter.stages)
    ? starter.stages.map((stage, idx) => ({
      ...stage,
      name: starterText.stages?.[idx] || stage.name,
    }))
    : starter.stages;
  const selectedStageIdx = Number.isFinite(starter.selectedStageIdx) ? starter.selectedStageIdx : 0;
  const stageName = stages?.[selectedStageIdx]?.name;

  return {
    ...starter,
    name: stageName || starterText.name || starter.name,
    typeName: starterText.typeName || localizeTypeName(starter.type || starter.typeName, locale),
    stages,
    moves: localizeStarterMoves(starter.moves, starterId, locale),
  };
}

export function localizeStarterList(starters, locale) {
  if (!Array.isArray(starters)) return starters;
  if (!isEnglishLocale(locale)) return starters;
  return starters.map((starter) => localizeStarter(starter, locale));
}

export function localizeEnemy(enemy, locale) {
  if (!isObject(enemy) || !isEnglishLocale(locale)) return enemy;
  const enemyId = String(enemy.id || "");
  const enemyKey = (
    enemy.isEvolved && enemyId && !enemyId.endsWith("Evolved")
      ? `${enemyId}Evolved`
      : enemyId
  );
  return {
    ...enemy,
    name: MONSTER_NAME_EN[enemyKey] || MONSTER_NAME_EN[enemyId] || enemy.name,
    typeName: localizeTypeName(enemy.mType || enemy.typeName, locale),
    traitName: localizeTraitName(enemy.trait, enemy.traitName, locale),
    traitDesc: localizeTraitDesc(enemy.trait, enemy.traitDesc, locale),
  };
}

export function localizeEnemyRoster(roster, locale) {
  if (!Array.isArray(roster)) return roster;
  if (!isEnglishLocale(locale)) return roster;
  return roster.map((enemy) => localizeEnemy(enemy, locale));
}

function parseStarterIdFromKey(entry) {
  if (entry?.starterId) return entry.starterId;
  const key = entry?.key || "";
  const matched = /^starter_([a-zA-Z0-9]+)_\d+$/.exec(key);
  return matched?.[1] || null;
}

export function localizeEncyclopediaEnemyEntry(entry, locale) {
  if (!isObject(entry) || !isEnglishLocale(locale)) return entry;
  const key = entry.key || entry.id;
  return {
    ...entry,
    name: MONSTER_NAME_EN[key] || MONSTER_NAME_EN[entry.id] || entry.name,
    typeName: localizeTypeName(entry.mType || entry.typeName, locale),
    weakAgainst: Array.isArray(entry.weakAgainst)
      ? entry.weakAgainst.map((name) => localizeTypeName(name, locale))
      : entry.weakAgainst,
    resistAgainst: Array.isArray(entry.resistAgainst)
      ? entry.resistAgainst.map((name) => localizeTypeName(name, locale))
      : entry.resistAgainst,
    desc: MONSTER_DESC_EN[key] || entry.desc,
    habitat: MONSTER_HABITAT_EN[key] || entry.habitat,
    traitName: localizeTraitName(entry.trait, entry.traitName, locale),
    traitDesc: localizeTraitDesc(entry.trait, entry.traitDesc, locale),
  };
}

export function localizeEncyclopediaEnemyEntries(entries, locale) {
  if (!Array.isArray(entries)) return entries;
  if (!isEnglishLocale(locale)) return entries;
  return entries.map((entry) => localizeEncyclopediaEnemyEntry(entry, locale));
}

export function localizeEncyclopediaStarterEntry(entry, locale) {
  if (!isObject(entry) || !isEnglishLocale(locale)) return entry;
  const starterId = parseStarterIdFromKey(entry);
  const starterText = STARTER_TEXT_EN[starterId] || {};
  const stageIdx = Number.isFinite(entry.stageIdx) ? entry.stageIdx : 0;
  const descKey = starterId ? `${starterId}_${stageIdx}` : "";

  return {
    ...entry,
    name: starterText.stages?.[stageIdx] || starterText.name || entry.name,
    typeName: localizeTypeName(entry.mType || entry.typeName, locale),
    desc: STARTER_DESC_EN[descKey] || entry.desc,
    skill: starterText.skill || entry.skill,
    stageLabel: STAGE_LABEL_EN[stageIdx] || entry.stageLabel,
    moves: localizeStarterMoves(entry.moves, starterId, locale),
  };
}

export function localizeEncyclopediaStarterEntries(entries, locale) {
  if (!Array.isArray(entries)) return entries;
  if (!isEnglishLocale(locale)) return entries;
  return entries.map((entry) => localizeEncyclopediaStarterEntry(entry, locale));
}
