import type { BattleMode } from './battle';
import type { StarterId } from './game';

export type ChallengeDifficulty = 'normal' | 'hard' | 'expert' | 'master';

export type QuestionFocusTag =
  | '+'
  | '-'
  | '×'
  | '÷'
  | 'mixed2'
  | 'mixed3'
  | 'mixed4'
  | 'unknown1'
  | 'unknown2'
  | 'unknown3'
  | 'unknown4';

export type ChallengeRewardType =
  | 'achievement_point'
  | 'title'
  | 'badge'
  | 'resource';

export type ChallengeReward = {
  type: ChallengeRewardType;
  key: string;
  amount?: number;
  label: string;
};

export type ChallengeEnemyTier = 'normal' | 'elite' | 'boss';

export type ChallengeBattleRule = {
  id: string;
  label: string;
  mode: BattleMode;
  timed: boolean;
  timeLimitSec: number;
  enemyTier: ChallengeEnemyTier;
  enemyCount: number;
  enemyLevelOffset: number;
  difficulty: ChallengeDifficulty;
  questionFocus: QuestionFocusTag[];
  allowedStarters?: StarterId[];
  modifierTags: string[];
  rewardMultiplier: number;
};

export type DailyChallengeBlueprint = {
  id: string;
  label: string;
  description: string;
  battleCount: number;
  streakWindowDays: number;
  battles: ChallengeBattleRule[];
  rewards: {
    clear: ChallengeReward[];
    streak: ChallengeReward[];
  };
};

export type DailyChallengeBattlePlan = ChallengeBattleRule & {
  index: number;
  battleSeed: string;
};

export type DailyChallengePlan = {
  challengeId: string;
  dateKey: string;
  seedKey: string;
  blueprintId: string;
  label: string;
  description: string;
  streakWindowDays: number;
  battles: DailyChallengeBattlePlan[];
  rewards: DailyChallengeBlueprint['rewards'];
};

export type TowerFloorDef = {
  floor: number;
  ruleId: string;
  levelScale: number;
  checkpoint?: boolean;
  rewards: ChallengeReward[];
};

export type StreakTowerBlueprint = {
  seasonId: string;
  label: string;
  maxFloors: number;
  rules: ChallengeBattleRule[];
  floors: TowerFloorDef[];
};

export type StreakTowerFloorPlan = TowerFloorDef & {
  battle: ChallengeBattleRule;
  floorSeed: string;
};

export type StreakTowerPlan = {
  runId: string;
  seasonId: string;
  startFloor: number;
  floors: StreakTowerFloorPlan[];
};
