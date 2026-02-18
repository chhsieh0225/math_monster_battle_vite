import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyChallengeRoster,
  buildTowerChallengeRoster,
  createDailyChallengeFeedback,
  createTowerChallengeFeedback,
  getDailyChallengeEnemyTotal,
  getDailyChallengeSeed,
  getTowerChallengeSeed,
  resolveDailyBattleRule,
  resolveTowerBattleRule,
} from './challengeRuntime.ts';

const plan = {
  dateKey: '2026-02-16',
  seedKey: 'daily:2026-02-16',
  battles: [
    {
      index: 1,
      battleSeed: 'daily:2026-02-16:b1',
      enemyTier: 'elite',
      enemyCount: 1,
      enemyLevelOffset: 2,
    },
    {
      index: 2,
      battleSeed: 'daily:2026-02-16:b2',
      enemyTier: 'boss',
      enemyCount: 2,
      enemyLevelOffset: 4,
    },
  ],
};

const baseRoster = [
  { id: 'slime-a', lvl: 1, hp: 30, maxHp: 30, atk: 10 },
  { id: 'slime-b', lvl: 2, hp: 40, maxHp: 40, atk: 12 },
];

const towerPlan = {
  runId: 'tower-run-1',
  seasonId: 'tower_s1_2026',
  startFloor: 3,
  floors: [
    {
      floor: 3,
      floorSeed: 'tower:tower_s1_2026:tower-run-1:3',
      levelScale: 1.3,
      atkScale: 1.2,
      checkpoint: false,
      rewards: [{ label: 'Tower Floor 3 Clear' }],
      battle: {
        enemyTier: 'elite',
        enemyCount: 2,
        enemyLevelOffset: 3,
      },
    },
    {
      floor: 4,
      floorSeed: 'tower:tower_s1_2026:tower-run-1:4',
      levelScale: 1.4,
      atkScale: 1.25,
      checkpoint: false,
      rewards: [{ label: 'Tower Floor 4 Clear' }],
      battle: {
        enemyTier: 'elite',
        enemyCount: 1,
        enemyLevelOffset: 4,
      },
    },
  ],
};

test('getDailyChallengeSeed returns seedKey fallback', () => {
  assert.equal(getDailyChallengeSeed(plan), 'daily:2026-02-16');
  assert.equal(getDailyChallengeSeed({ dateKey: '2026-02-17' }), 'daily:2026-02-17');
  assert.equal(getDailyChallengeSeed(null), null);
});

test('buildDailyChallengeRoster shapes enemy count and tuning', () => {
  const roster = buildDailyChallengeRoster(baseRoster, plan);
  assert.equal(roster.length, 3);
  assert.ok(roster[0].lvl > baseRoster[0].lvl);
  assert.ok(roster[1].maxHp >= baseRoster[1].maxHp);
  assert.equal(roster[2].challengeBattleIndex, 2);
});

test('resolveDailyBattleRule maps round index by enemyCount slices', () => {
  assert.equal(resolveDailyBattleRule(plan, 0)?.battleSeed, 'daily:2026-02-16:b1');
  assert.equal(resolveDailyBattleRule(plan, 1)?.battleSeed, 'daily:2026-02-16:b2');
  assert.equal(resolveDailyBattleRule(plan, 2)?.battleSeed, 'daily:2026-02-16:b2');
  assert.equal(resolveDailyBattleRule(null, 0), null);
});

test('getDailyChallengeEnemyTotal sums enemyCount across battles', () => {
  assert.equal(getDailyChallengeEnemyTotal(plan), 3);
  assert.equal(getDailyChallengeEnemyTotal(null), 0);
});

test('tower challenge runtime resolves seed, rule, and roster from active floor', () => {
  const roster = buildTowerChallengeRoster(baseRoster, towerPlan);
  assert.equal(getTowerChallengeSeed(towerPlan), 'tower:tower_s1_2026:tower-run-1:3');
  assert.equal(resolveTowerBattleRule(towerPlan, 0)?.enemyCount, 2);
  assert.equal(resolveTowerBattleRule(towerPlan, 2)?.enemyCount, 1);
  assert.equal(roster.length, 2);
  assert.equal(roster[0].challengeTowerFloor, 3);
  assert.ok(roster[0].maxHp > baseRoster[0].maxHp);
});

test('createDailyChallengeFeedback includes clear rewards and streak gain', () => {
  const withRewards = {
    ...plan,
    challengeId: 'daily-2026-02-16',
    streakWindowDays: 7,
    rewards: {
      clear: [{ label: 'Daily Clear +60 AP' }],
      streak: [{ label: '7-day Streak +200 AP' }],
    },
  };
  const before = {
    streakCount: 2,
    runs: {},
  };
  const after = {
    streakCount: 3,
    runs: {
      '2026-02-16': {
        status: 'cleared',
        battlesCleared: 3,
      },
    },
  };
  const feedback = createDailyChallengeFeedback({
    plan: withRewards,
    before,
    after,
    outcome: 'cleared',
    battlesCleared: 3,
  });

  assert.equal(feedback.outcome, 'cleared');
  assert.equal(feedback.persistedStatus, 'cleared');
  assert.equal(feedback.battlesCleared, 3);
  assert.equal(feedback.battlesTotal, 3);
  assert.equal(feedback.streakDelta, 1);
  assert.deepEqual(feedback.rewardLabels, ['Daily Clear +60 AP']);
});

test('createDailyChallengeFeedback marks preserved clear when replay fails', () => {
  const withRewards = {
    ...plan,
    challengeId: 'daily-2026-02-16',
    streakWindowDays: 7,
    rewards: {
      clear: [{ label: 'Daily Clear +60 AP' }],
      streak: [{ label: '7-day Streak +200 AP' }],
    },
  };
  const before = {
    streakCount: 4,
    runs: {},
  };
  const after = {
    streakCount: 4,
    runs: {
      '2026-02-16': {
        status: 'cleared',
        battlesCleared: 3,
      },
    },
  };
  const feedback = createDailyChallengeFeedback({
    plan: withRewards,
    before,
    after,
    outcome: 'failed',
    battlesCleared: 1,
  });

  assert.equal(feedback.outcome, 'failed');
  assert.equal(feedback.persistedStatus, 'cleared');
  assert.equal(feedback.preservedClear, true);
  assert.equal(feedback.streakAfter, 4);
  assert.deepEqual(feedback.rewardLabels, []);
});

test('createTowerChallengeFeedback tracks floor progression deltas', () => {
  const before = {
    currentFloor: 3,
    bestFloor: 2,
    winStreak: 1,
    totalClears: 5,
  };
  const after = {
    currentFloor: 4,
    bestFloor: 3,
    winStreak: 2,
    totalClears: 6,
  };
  const feedback = createTowerChallengeFeedback({
    plan: towerPlan,
    before,
    after,
    outcome: 'cleared',
    floor: 3,
  });

  assert.equal(feedback.floor, 3);
  assert.equal(feedback.nextFloor, 4);
  assert.equal(feedback.winStreakDelta, 1);
  assert.equal(feedback.bestFloorDelta, 1);
  assert.equal(feedback.totalClearsDelta, 1);
  assert.deepEqual(feedback.rewardLabels, ['Tower Floor 3 Clear']);
});
