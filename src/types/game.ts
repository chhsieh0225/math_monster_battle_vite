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
  moves: StarterMoveLite[];
  selectedStageIdx?: number;
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
  typeIcon: string;
  typeName: string;
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
