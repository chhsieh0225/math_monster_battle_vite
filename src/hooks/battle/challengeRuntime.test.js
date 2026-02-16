import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyChallengeRoster,
  createDailyChallengeFeedback,
  getDailyChallengeEnemyTotal,
  getDailyChallengeSeed,
  resolveDailyBattleRule,
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
