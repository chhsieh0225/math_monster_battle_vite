import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  CHALLENGE_REWARD_TUNING, applyChallengeRewards, claimChallengeRewards, createChallengeRewardState,
  getChallengePerks, loadChallengeRewards, normalizeChallengeRewardState,
} from './challengeRewards.ts';
import { loadInventory } from './inventoryStore.ts';
import { DAILY_CHALLENGE_BLUEPRINTS, STREAK_TOWER_BLUEPRINT } from '../data/challengeCatalog.ts';

let previousStorage;
beforeEach(() => {
  previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
});
afterEach(() => { globalThis.localStorage = previousStorage; });

const bag = { potion: 0, candy: 0, shield: 0 };
const daily = [
  { type: 'achievement_point', key: 'daily_clear', amount: 60, label: '' },
  { type: 'badge', key: 'daily_clear_badge', label: '' },
];

test('badges, titles and honor become real, permanent perks', () => {
  let claim = applyChallengeRewards(createChallengeRewardState(), bag, daily, 'daily:a');
  assert.equal(claim.perks.damageBonus, CHALLENGE_REWARD_TUNING.badgeDamageBonus);
  assert.deepEqual(claim.granted.map((g) => g.kind), ['honor', 'badge']);
  assert.equal(claim.granted[1].isNew, true);

  claim = applyChallengeRewards(claim.state, claim.inventory, [
    ...daily,
    { type: 'title', key: 'daily_weekly', label: '' },
    { type: 'achievement_point', key: 'daily_streak_7', amount: 200, label: '' },
  ], 'daily:b');
  assert.equal(claim.perks.damageBonus, CHALLENGE_REWARD_TUNING.badgeDamageBonus, 'an owned badge does not stack');
  assert.equal(claim.granted.find((g) => g.kind === 'badge').isNew, false);
  assert.equal(claim.perks.victoryHeal, CHALLENGE_REWARD_TUNING.titleVictoryHeal);
  assert.equal(claim.state.honor, 320);
  assert.equal(claim.inventory.potion, 1, 'crossing 200 honor pays out a potion');
  assert.ok(claim.granted.some((g) => g.kind === 'item' && g.fromHonor && g.amount === 1));
});

test('perks are capped and item rewards land in the bag', () => {
  let state = createChallengeRewardState();
  const badges = Array.from({ length: 9 }, (_, i) => ({ type: 'badge', key: `tower_checkpoint_${(i + 1) * 5}`, label: '' }));
  const titles = ['a', 'b', 'c', 'd'].map((key) => ({ type: 'title', key, label: '' }));
  const claim = applyChallengeRewards(state, { potion: 0, candy: 0, shield: 2 }, [
    ...badges, ...titles, { type: 'resource', key: 'shield', amount: 3, label: '' },
  ], 'x');
  assert.equal(claim.perks.damageBonus, CHALLENGE_REWARD_TUNING.maxBadgeDamageBonus);
  assert.equal(claim.perks.victoryHeal, CHALLENGE_REWARD_TUNING.maxTitleVictoryHeal);
  assert.equal(claim.inventory.shield, 3, 'the bag cap still applies');
  assert.deepEqual(claim.granted.at(-1), { kind: 'item', item: 'shield', amount: 1, fromHonor: false });
  state = claim.state;
  assert.equal(applyChallengeRewards(state, bag, [{ type: 'resource', key: 'mystery', amount: 1, label: '' }], 'y').granted.length, 0);
});

test('the same result cannot be claimed twice, even across reloads', () => {
  const first = claimChallengeRewards(daily, 'daily:2026-10-09');
  assert.equal(first.alreadyClaimed, false);
  const again = claimChallengeRewards(daily, 'daily:2026-10-09');
  assert.equal(again.alreadyClaimed, true);
  assert.deepEqual(again.granted, []);
  assert.equal(loadChallengeRewards().honor, 60);
  assert.equal(getChallengePerks().badges.length, 1);
  assert.deepEqual(loadInventory(), { potion: 0, candy: 0, shield: 0 });
  assert.deepEqual(normalizeChallengeRewardState({ version: 1, honor: -5, badges: ['a', 'a', 3] }).badges, ['a']);
  assert.deepEqual(normalizeChallengeRewardState('junk'), createChallengeRewardState());
});

test('every catalog reward maps to a real effect', () => {
  const rewards = [
    ...DAILY_CHALLENGE_BLUEPRINTS.flatMap((bp) => [...bp.rewards.clear, ...bp.rewards.streak]),
    ...STREAK_TOWER_BLUEPRINT.floors.flatMap((floor) => floor.rewards),
  ];
  const claim = applyChallengeRewards(createChallengeRewardState(), bag, rewards, 'all');
  const grantedCount = claim.granted.filter((g) => g.kind !== 'item' || !g.fromHonor).length;
  assert.equal(grantedCount, rewards.length, 'no reward is silently ignored');
});
