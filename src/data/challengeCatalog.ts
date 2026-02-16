import type {
  ChallengeBattleRule,
  DailyChallengeBlueprint,
  StreakTowerBlueprint,
  TowerFloorDef,
} from '../types/challenges.ts';

export const DAILY_CHALLENGE_BLUEPRINTS: DailyChallengeBlueprint[] = [
  {
    id: 'daily_elemental_gauntlet',
    label: 'Elemental Gauntlet',
    description: '3 rounds, timed pressure, mixed elemental focus.',
    battleCount: 3,
    streakWindowDays: 7,
    battles: [
      {
        id: 'daily_elemental_opening',
        label: 'Opening Burst',
        mode: 'single',
        timed: true,
        timeLimitSec: 6,
        enemyTier: 'elite',
        enemyCount: 1,
        enemyLevelOffset: 2,
        difficulty: 'hard',
        questionFocus: ['+', '-', '×'],
        modifierTags: ['quick-start', 'combo-focus'],
        rewardMultiplier: 1,
      },
      {
        id: 'daily_elemental_mid',
        label: 'Cross Formula',
        mode: 'single',
        timed: true,
        timeLimitSec: 5,
        enemyTier: 'elite',
        enemyCount: 1,
        enemyLevelOffset: 3,
        difficulty: 'hard',
        questionFocus: ['÷', 'mixed2', 'mixed3'],
        modifierTags: ['type-pressure', 'precision'],
        rewardMultiplier: 1.15,
      },
      {
        id: 'daily_elemental_final',
        label: 'Apex Clash',
        mode: 'single',
        timed: true,
        timeLimitSec: 4,
        enemyTier: 'boss',
        enemyCount: 1,
        enemyLevelOffset: 5,
        difficulty: 'expert',
        questionFocus: ['mixed4', 'unknown4'],
        modifierTags: ['boss-round', 'fail-fast'],
        rewardMultiplier: 1.45,
      },
    ],
    rewards: {
      clear: [
        { type: 'achievement_point', key: 'daily_clear', amount: 60, label: 'Daily Clear +60 AP' },
        { type: 'badge', key: 'daily_clear_badge', label: 'Badge: Daily Victor' },
      ],
      streak: [
        { type: 'title', key: 'daily_weekly', label: 'Title: Weekly Challenger' },
        { type: 'achievement_point', key: 'daily_streak_7', amount: 200, label: '7-day Streak +200 AP' },
      ],
    },
  },
  {
    id: 'daily_unknown_hunt',
    label: 'Unknown Hunt',
    description: 'Unknown-variable focused challenge route.',
    battleCount: 3,
    streakWindowDays: 7,
    battles: [
      {
        id: 'daily_unknown_opening',
        label: 'Symbol Probe',
        mode: 'single',
        timed: true,
        timeLimitSec: 6,
        enemyTier: 'elite',
        enemyCount: 1,
        enemyLevelOffset: 2,
        difficulty: 'hard',
        questionFocus: ['unknown1', 'unknown2'],
        modifierTags: ['unknown-focus', 'clean-start'],
        rewardMultiplier: 1,
      },
      {
        id: 'daily_unknown_mid',
        label: 'Equation Rush',
        mode: 'single',
        timed: true,
        timeLimitSec: 5,
        enemyTier: 'elite',
        enemyCount: 2,
        enemyLevelOffset: 4,
        difficulty: 'expert',
        questionFocus: ['unknown3', 'unknown4'],
        modifierTags: ['multi-target', 'strict-time'],
        rewardMultiplier: 1.2,
      },
      {
        id: 'daily_unknown_final',
        label: 'Proof of Mastery',
        mode: 'single',
        timed: true,
        timeLimitSec: 4,
        enemyTier: 'boss',
        enemyCount: 1,
        enemyLevelOffset: 6,
        difficulty: 'master',
        questionFocus: ['unknown4', 'mixed4'],
        modifierTags: ['boss-round', 'precision'],
        rewardMultiplier: 1.5,
      },
    ],
    rewards: {
      clear: [
        { type: 'achievement_point', key: 'daily_unknown_clear', amount: 70, label: 'Unknown Route +70 AP' },
        { type: 'resource', key: 'daily_unknown_token', amount: 1, label: 'Unknown Token x1' },
      ],
      streak: [
        { type: 'title', key: 'daily_unknown_weekly', label: 'Title: Equation Hunter' },
        { type: 'achievement_point', key: 'daily_unknown_streak_7', amount: 220, label: '7-day Unknown Streak +220 AP' },
      ],
    },
  },
  {
    id: 'daily_combo_rush',
    label: 'Combo Rush',
    description: 'Combo and pace focused mixed-operation ladder.',
    battleCount: 3,
    streakWindowDays: 7,
    battles: [
      {
        id: 'daily_combo_opening',
        label: 'Momentum Start',
        mode: 'single',
        timed: true,
        timeLimitSec: 6,
        enemyTier: 'elite',
        enemyCount: 1,
        enemyLevelOffset: 3,
        difficulty: 'hard',
        questionFocus: ['mixed2', 'mixed3'],
        modifierTags: ['combo-ramp', 'timed'],
        rewardMultiplier: 1,
      },
      {
        id: 'daily_combo_mid',
        label: 'Crossfire',
        mode: 'single',
        timed: true,
        timeLimitSec: 5,
        enemyTier: 'elite',
        enemyCount: 2,
        enemyLevelOffset: 4,
        difficulty: 'expert',
        questionFocus: ['mixed3', '×', '÷'],
        modifierTags: ['duel-wave', 'combo-ramp'],
        rewardMultiplier: 1.25,
      },
      {
        id: 'daily_combo_final',
        label: 'Tempo Breaker',
        mode: 'single',
        timed: true,
        timeLimitSec: 4,
        enemyTier: 'boss',
        enemyCount: 1,
        enemyLevelOffset: 6,
        difficulty: 'master',
        questionFocus: ['mixed4', 'unknown3'],
        modifierTags: ['boss-round', 'high-pace'],
        rewardMultiplier: 1.55,
      },
    ],
    rewards: {
      clear: [
        { type: 'achievement_point', key: 'daily_combo_clear', amount: 75, label: 'Combo Route +75 AP' },
        { type: 'badge', key: 'daily_combo_badge', label: 'Badge: Tempo Rider' },
      ],
      streak: [
        { type: 'title', key: 'daily_combo_weekly', label: 'Title: Combo Specialist' },
        { type: 'achievement_point', key: 'daily_combo_streak_7', amount: 240, label: '7-day Combo Streak +240 AP' },
      ],
    },
  },
];

const TOWER_RULES: ChallengeBattleRule[] = [
  {
    id: 'tower_precision',
    label: 'Precision Drill',
    mode: 'single',
    timed: true,
    timeLimitSec: 6,
    enemyTier: 'elite',
    enemyCount: 1,
    enemyLevelOffset: 2,
    difficulty: 'hard',
    questionFocus: ['+', '-', '×'],
    modifierTags: ['tower', 'precision'],
    rewardMultiplier: 1,
  },
  {
    id: 'tower_mixup',
    label: 'Mixed Breaker',
    mode: 'single',
    timed: true,
    timeLimitSec: 5,
    enemyTier: 'elite',
    enemyCount: 2,
    enemyLevelOffset: 3,
    difficulty: 'expert',
    questionFocus: ['mixed2', 'mixed3', 'mixed4'],
    modifierTags: ['tower', 'mixup'],
    rewardMultiplier: 1.2,
  },
  {
    id: 'tower_unknown',
    label: 'Unknown Pressure',
    mode: 'single',
    timed: true,
    timeLimitSec: 5,
    enemyTier: 'elite',
    enemyCount: 2,
    enemyLevelOffset: 4,
    difficulty: 'expert',
    questionFocus: ['unknown1', 'unknown2', 'unknown3'],
    modifierTags: ['tower', 'unknown'],
    rewardMultiplier: 1.25,
  },
  {
    id: 'tower_boss',
    label: 'Tower Boss Gate',
    mode: 'single',
    timed: true,
    timeLimitSec: 4,
    enemyTier: 'boss',
    enemyCount: 1,
    enemyLevelOffset: 6,
    difficulty: 'master',
    questionFocus: ['mixed4', 'unknown4'],
    modifierTags: ['tower', 'boss'],
    rewardMultiplier: 1.5,
  },
];

const TOWER_ROTATION = ['tower_precision', 'tower_mixup', 'tower_unknown'];
const TOWER_MAX_FLOORS = 30;

function buildTowerFloors(maxFloors: number): TowerFloorDef[] {
  const floors: TowerFloorDef[] = [];
  for (let floor = 1; floor <= maxFloors; floor += 1) {
    const isBossFloor = floor % 5 === 0;
    const ruleId = isBossFloor
      ? 'tower_boss'
      : TOWER_ROTATION[(floor - 1) % TOWER_ROTATION.length];
    const checkpoint = floor % 5 === 0;
    const rewards: TowerFloorDef['rewards'] = [
      {
        type: 'achievement_point',
        key: `tower_floor_${floor}`,
        amount: 12 + floor * 3,
        label: `Tower Floor ${floor} Clear`,
      },
    ];
    if (checkpoint) {
      rewards.push({
        type: 'badge',
        key: `tower_checkpoint_${floor}`,
        label: `Checkpoint Badge ${floor}`,
      });
    }
    floors.push({
      floor,
      ruleId,
      levelScale: Number((1 + floor * 0.07).toFixed(2)),
      checkpoint,
      rewards,
    });
  }
  return floors;
}

export const STREAK_TOWER_BLUEPRINT: StreakTowerBlueprint = {
  seasonId: 'tower_s1_2026',
  label: 'Streak Tower Season 1',
  maxFloors: TOWER_MAX_FLOORS,
  rules: TOWER_RULES,
  floors: buildTowerFloors(TOWER_MAX_FLOORS),
};
