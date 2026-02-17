import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyChallengePlan,
  buildStreakTowerPlan,
  dailySeedKey,
  toLocalDateKey,
} from './challengePlanner.ts';

test('toLocalDateKey and dailySeedKey derive stable identifiers', () => {
  const date = new Date(2026, 1, 16, 9, 30, 0); // local time
  const key = toLocalDateKey(date);
  assert.equal(key, '2026-02-16');
  assert.equal(dailySeedKey(key), 'daily:2026-02-16');
});

test('buildDailyChallengePlan is deterministic for the same date', () => {
  const date = new Date(2026, 1, 16, 12, 0, 0);
  const planA = buildDailyChallengePlan(date);
  const planB = buildDailyChallengePlan(date);

  assert.deepEqual(planA, planB);
  assert.equal(planA.battles.length, 3);
  assert.ok(planA.battles.every((battle) => battle.battleSeed.includes(planA.seedKey)));
});

test('buildDailyChallengePlan changes when date changes', () => {
  const day1 = buildDailyChallengePlan(new Date(2026, 1, 16));
  const day2 = buildDailyChallengePlan(new Date(2026, 1, 17));

  assert.notEqual(day1.challengeId, day2.challengeId);
  assert.notEqual(day1.seedKey, day2.seedKey);
});

test('buildStreakTowerPlan slices floors and keeps deterministic output', () => {
  const planA = buildStreakTowerPlan({ runId: 'alpha', startFloor: 3, floorCount: 4 });
  const planB = buildStreakTowerPlan({ runId: 'alpha', startFloor: 3, floorCount: 4 });

  assert.deepEqual(planA, planB);
  assert.equal(planA.startFloor, 3);
  assert.equal(planA.floors.length, 4);
  assert.equal(planA.floors[0]?.floor, 3);
  assert.equal(planA.floors[3]?.floor, 6);
});

test('buildStreakTowerPlan ramps pressure across floors', () => {
  const plan = buildStreakTowerPlan({ runId: 'curve', startFloor: 1, floorCount: 15 });
  const floor1 = plan.floors.find((f) => f.floor === 1);
  const floor9 = plan.floors.find((f) => f.floor === 9);
  const floor13 = plan.floors.find((f) => f.floor === 13);
  const floor15 = plan.floors.find((f) => f.floor === 15);
  assert.ok(floor1);
  assert.ok(floor9);
  assert.ok(floor13);
  assert.ok(floor15);

  assert.ok(floor9.levelScale > floor1.levelScale);
  assert.ok((floor9.atkScale || 1) > (floor1.atkScale || 1));
  assert.ok(floor9.battle.enemyLevelOffset >= floor1.battle.enemyLevelOffset);
  assert.ok(floor9.battle.timeLimitSec <= floor1.battle.timeLimitSec);
  assert.ok(floor9.battle.enemyCount >= floor1.battle.enemyCount);
  assert.ok(floor9.battle.rewardMultiplier > floor1.battle.rewardMultiplier);

  assert.equal(floor15.battle.enemyCount, 1);
  assert.equal(floor15.battle.difficulty, 'master');
  assert.ok(floor13.battle.questionFocus.includes('unknown4'));
});
