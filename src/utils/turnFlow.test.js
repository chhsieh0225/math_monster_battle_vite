import assert from 'node:assert/strict';
import test from 'node:test';
import { computeBossPhase, decideBossTurnEvent } from './turnFlow.ts';

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
