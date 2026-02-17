export type AchievementId =
  | "first_win"
  | "streak_5"
  | "streak_10"
  | "perfect"
  | "timed_clear"
  | "one_hit"
  | "spec_def"
  | "evolve_max"
  | "move_max"
  | "all_moves_max"
  | "fire_clear"
  | "water_clear"
  | "grass_clear"
  | "electric_clear"
  | "lion_clear"
  | "boss_kill"
  | "low_hp"
  | "no_damage"
  | "enc_all"
  | "enc_defeat";

export type AchievementDef = {
  id: AchievementId;
  name: string;
  icon: string;
  desc: string;
};

export type LeaderboardEntry = {
  score: number;
  name: string;
  defeated: number;
  correct: number;
  wrong: number;
  accuracy: number;
  level: number;
  timed: boolean;
  maxStreak?: number;
  completed: boolean;
  date: string;
};

export type StarterStage = {
  name: string;
  emoji: string;
  svgFn: (c1: string, c2: string) => string;
};

export type StarterId = "fire" | "water" | "grass" | "electric" | "lion";

export type StarterMoveLite = {
  icon: string;
  name: string;
  desc?: string;
  color?: string;
};

export type StarterMoveDef = StarterMoveLite & {
  type: string;
  type2?: string;
  desc: string;
  basePower: number;
  growth: number;
  range: [number, number];
  ops: string[];
  color: string;
  bg: string;
  risky?: boolean;
};

export type StarterLite = {
  id?: StarterId;
  name: string;
  c1: string;
  c2: string;
  stages: StarterStage[];
};

export type StarterSelectable = StarterLite & {
  id: StarterId;
  typeIcon: string;
  typeName: string;
  moves: StarterMoveDef[];
  selectedStageIdx?: number;
};

export type StarterConfig = StarterSelectable & {
  type: string;
};

export type SelectionMode = "single" | "coop" | "pvp" | "double";

export type EncyclopediaCounts = Record<string, number>;

export type EncyclopediaData = {
  encountered?: EncyclopediaCounts;
  defeated?: EncyclopediaCounts;
};

export type EncyclopediaEnemyEntry = {
  key: string;
  name: string;
  mType: string;
  mType2?: string;
  typeIcon: string;
  typeIcon2?: string;
  typeName: string;
  typeName2?: string;
  hp: number;
  atk: number;
  svgFn: (c1: string, c2: string) => string;
  c1: string;
  c2: string;
  weakAgainst: string[];
  resistAgainst: string[];
  isEvolved: boolean;
  desc?: string;
  habitat?: string;
  rarity?: string;
  drops?: string[];
  trait?: string | null;
  traitName?: string | null;
  traitDesc?: string | null;
};

export type EncyclopediaStarterEntry = {
  key: string;
  starterId?: StarterId;
  stageIdx: number;
  name: string;
  emoji?: string;
  mType: string;
  typeIcon: string;
  typeName: string;
  svgFn: (c1: string, c2: string) => string;
  c1: string;
  c2: string;
  desc?: string;
  skill?: string;
  stageLabel: string;
  moves: StarterMoveLite[];
};

export type MonsterType =
  | "grass"
  | "fire"
  | "water"
  | "electric"
  | "ghost"
  | "steel"
  | "dark"
  | "poison";

export type MonsterTraitFields = {
  trait?: string;
  traitName?: string;
  traitDesc?: string;
};

export type MonsterConfig = MonsterTraitFields & {
  id: string;
  name: string;
  hp: number;
  atk: number;
  c1: string;
  c2: string;
  spriteKey: string;
  evolvedSpriteKey?: string;
  evolvedName?: string;
  evolveLvl?: number;
  dropTable: string;
  mType: MonsterType;
  typeIcon: string;
  typeName: string;
  mType2?: MonsterType;
  typeIcon2?: string;
  typeName2?: string;
};

export type SlimeVariantConfig = MonsterTraitFields & {
  id: string;
  name: string;
  spriteKey: string;
  c1: string;
  c2: string;
  mType: MonsterType;
  typeIcon: string;
  typeName: string;
  dropTable: string;
  hpMult: number;
  atkMult: number;
};

export type SpriteFn = (c1: string, c2: string) => string;

export type HydratedMonster = Omit<
  MonsterConfig,
  "spriteKey" | "evolvedSpriteKey" | "dropTable"
> & {
  svgFn: SpriteFn;
  evolvedSvgFn?: SpriteFn;
  drops: string[];
};

export type HydratedSlimeVariant = Omit<
  SlimeVariantConfig,
  "spriteKey" | "dropTable"
> & {
  svgFn: SpriteFn;
  drops: string[];
};
