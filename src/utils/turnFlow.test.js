import assert from 'node:assert/strict';
import test from 'node:test';
import { canChooseBossTactic, computeBossPhase, decideBossTurnEvent, getBossIntent, getBossTacticProfile } from './turnFlow.ts';
import { resolveBossTurnState } from '../hooks/battle/turnResolver.ts';
import { BALANCE_CONFIG } from '../data/balanceConfig.ts';

test('intent and the enemy resolver share turn, phase and priority rules for every boss', () => {
  for (const enemyId of BALANCE_CONFIG.monsters.bossIds) {
    for (const hp of [100, 60, 30]) {
      for (let bossTurn = 0; bossTurn < 12; bossTurn += 1) {
        for (const bossCharging of [false, true]) {
          for (const sealedMove of [-1, 0]) {
            const state = { enemyId, hp, maxHp: 100, bossTurn, bossCharging, sealedMove };
            const intent = getBossIntent(state);
            const resolved = resolveBossTurnState({ ...state, enemy: { id: enemyId, maxHp: 100 }, eHp: hp });
            assert.equal(intent.event, resolved.bossEvent);
            assert.equal(intent.charging, bossCharging);
          }
        }
      }
    }
  }
});

test('intent is hidden for normal enemies, PvP and defeated bosses', () => {
  const state = { enemyId: 'boss', hp: 100, maxHp: 100, bossTurn: 3 };
  for (const override of [{ enemyId: 'slime' }, { enemyId: undefined }, { battleMode: 'pvp' }, { hp: 0 }]) {
    assert.equal(getBossIntent({ ...state, ...override }), null);
  }
  assert.equal(getBossIntent({ ...state, frozen: true }).event, 'frozen');
});

test('tactics are restricted to charging non-PvP bosses with a legacy force default', () => {
  const state = { enemyId: 'boss', bossCharging: true, battleMode: 'single' };
  assert.equal(canChooseBossTactic(state), true);
  for (const override of [{ enemyId: 'slime' }, { bossCharging: false }, { battleMode: 'pvp' }]) {
    assert.equal(canChooseBossTactic({ ...state, ...override }), false);
  }
  assert.deepEqual(getBossTacticProfile(), getBossTacticProfile('force'));
  assert.deepEqual(getBossTacticProfile('guarded'), {
    damageScale: BALANCE_CONFIG.traits.boss.guardedBreakDamageScale, counterRatio: 0,
  });
});

test('computeBossPhase transitions at 60% and 30% hp thresholds', () => {
  assert.equal(computeBossPhase(100, 100), 1);
  assert.equal(computeBossPhase(60, 100), 2);
  assert.equal(computeBossPhase(31, 100), 2);
  assert.equal(computeBossPhase(30, 100), 3);
  assert.equal(computeBossPhase(0, 100), 3);
});

test('decideBossTurnEvent default attack for non-boss', () => {
  const event = decideBossTurnEvent({
    isBoss: false,
    bossCharging: false,
    turnCount: 4,
    bossPhase: 2,
    sealedMove: -1,
  });
  assert.equal(event, "attack");
});

test('decideBossTurnEvent prioritizes release then charge then seal', () => {
  assert.equal(decideBossTurnEvent({
    isBoss: true,
    bossCharging: true,
    turnCount: 8,
    bossPhase: 3,
    sealedMove: -1,
  }), "release");

  assert.equal(decideBossTurnEvent({
    isBoss: true,
    bossCharging: false,
    turnCount: 12,
    bossPhase: 3,
    sealedMove: -1,
  }), "start_charge");

  assert.equal(decideBossTurnEvent({
    isBoss: true,
    bossCharging: false,
    turnCount: 3,
    bossPhase: 2,
    sealedMove: -1,
  }), "seal_move");
});

test('decideBossTurnEvent does not seal if a move is already sealed', () => {
  const event = decideBossTurnEvent({
    isBoss: true,
    bossCharging: false,
    turnCount: 3,
    bossPhase: 2,
    sealedMove: 1,
  });
  assert.equal(event, "attack");
});
