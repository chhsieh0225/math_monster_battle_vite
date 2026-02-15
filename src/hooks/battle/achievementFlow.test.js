import assert from 'node:assert/strict';
import test from 'node:test';
import { getStageMaxHp } from '../../utils/playerHp.js';
import {
  applyGameCompletionAchievements,
  applyVictoryAchievements,
} from './achievementFlow.js';

test('applyVictoryAchievements unlocks boss and low-hp rewards', () => {
  const unlocked = [];
  applyVictoryAchievements({
    state: {
      enemy: { id: "boss" },
      pHp: 5,
    },
    tryUnlock: (id) => unlocked.push(id),
  });

  assert.deepEqual(unlocked, ["first_win", "boss_kill", "low_hp"]);
});

test('applyGameCompletionAchievements unlocks run and encyclopedia milestones', () => {
  const unlocked = [];
  let encUpdater = null;
  applyGameCompletionAchievements({
    state: {
      tW: 0,
      timedMode: true,
      pHp: getStageMaxHp(0),
      pStg: 0,
      starter: { id: "fire" },
    },
    tryUnlock: (id) => unlocked.push(id),
    setEncData: (updater) => { encUpdater = updater; },
    encTotal: 2,
  });

  assert.ok(unlocked.includes("perfect"));
  assert.ok(unlocked.includes("timed_clear"));
  assert.ok(unlocked.includes("no_damage"));
  assert.ok(unlocked.includes("fire_clear"));
  assert.equal(typeof encUpdater, "function");

  encUpdater({
    encountered: { a: true, b: true },
    defeated: { a: true, b: true },
  });

  assert.ok(unlocked.includes("enc_all"));
  assert.ok(unlocked.includes("enc_defeat"));
});
