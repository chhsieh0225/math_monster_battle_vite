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

export type StarterLite = {
  id?: string;
  name: string;
  c1: string;
  c2: string;
  stages: StarterStage[];
};
