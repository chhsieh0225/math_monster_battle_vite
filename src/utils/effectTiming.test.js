import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAttackImpact, getAttackEffectHitDelay, getAttackEffectClearDelay,
  getAttackEffectNextStepDelay, getAttackImpactProfile, getAttackImpactPhase,
} from './effectTiming.ts';

test('all eight element contact times precede effect cleanup', () => {
  for (const type of ['fire', 'electric', 'water', 'grass', 'dark', 'light', 'steel', 'ice']) {
    for (const idx of [0, 1, 2, 3]) {
      const hit = getAttackEffectHitDelay(type);
      assert.ok(hit >= 200 && hit <= 400);
      assert.ok(hit < getAttackEffectClearDelay({ idx }));
      assert.ok(getAttackEffectNextStepDelay({ idx }) > getAttackEffectClearDelay({ idx }));
    }
  }
  assert.equal(getAttackEffectHitDelay(undefined), 300);
  assert.equal(getAttackEffectHitDelay('unknown'), 300);
});

test('each contact receives a fresh event even for identical repeated moves', () => {
  const a = createAttackImpact('hit', 100);
  const b = createAttackImpact('hit', 100);
  assert.notEqual(a, b);
  assert.deepEqual(a, { outcome: 'hit', at: 100 });
  assert.deepEqual(a, b);
});

test('impact phases are anchored to contact, not launch or a guessed charge interval', () => {
  const profile = getAttackImpactProfile(0, 'hit');
  assert.equal(getAttackImpactPhase(0, 'hit', 0), 'freeze');
  assert.equal(getAttackImpactPhase(0, 'hit', profile.freezeMs - 0.1), 'freeze');
  assert.equal(getAttackImpactPhase(0, 'hit', profile.freezeMs), 'shake');
  assert.equal(getAttackImpactPhase(0, 'hit', profile.freezeMs + profile.shakeMs), 'settle');
  assert.equal(getAttackImpactPhase(0, 'hit', profile.freezeMs + profile.shakeMs + profile.settleMs), 'idle');
});

test('misses never freeze or shake, blocks only get a contact ring', () => {
  for (const idx of [0, 2, 3]) {
    for (const elapsed of [0, 30, 100, 500]) assert.equal(getAttackImpactPhase(idx, 'miss', elapsed), 'idle');
    assert.equal(getAttackImpactPhase(idx, 'blocked', 0), 'settle');
    assert.equal(getAttackImpactPhase(idx, 'blocked', 220), 'idle');
    assert.equal(getAttackImpactProfile(idx, 'blocked').shakePx, 0);
    assert.equal(getAttackImpactProfile(idx, 'blocked').scale, 1);
  }
});

test('regular attacks stay restrained while heavy attacks and criticals gain weight', () => {
  const normal = getAttackImpactProfile(0, 'hit');
  const heavy = getAttackImpactProfile(2, 'hit');
  const ultimate = getAttackImpactProfile(3, 'hit');
  const critical = getAttackImpactProfile(3, 'critical');
  assert.equal(normal.scale, 1);
  assert.ok(normal.freezeMs < heavy.freezeMs && heavy.freezeMs < ultimate.freezeMs);
  assert.ok(normal.shakePx < heavy.shakePx && heavy.shakePx < ultimate.shakePx);
  assert.ok(critical.freezeMs > ultimate.freezeMs);
  assert.ok(critical.freezeMs <= 110 && critical.shakePx <= 5);
});

test('throttled timers skip expired phases and malformed move indexes remain bounded', () => {
  assert.equal(getAttackImpactPhase(3, 'critical', 5000), 'idle');
  for (const idx of [NaN, Infinity, -10]) assert.deepEqual(getAttackImpactProfile(idx), getAttackImpactProfile(0));
  assert.deepEqual(getAttackImpactProfile(1000), getAttackImpactProfile(3));
});
