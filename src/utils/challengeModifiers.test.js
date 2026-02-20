import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveModifiers,
  hasActiveModifiers,
  getModifierDisplayInfo,
  MODIFIER_IDENTITY,
} from './challengeModifiers.ts';

describe('resolveModifiers', () => {
  it('returns identity when tags is null/undefined/empty', () => {
    assert.deepStrictEqual(resolveModifiers(null), MODIFIER_IDENTITY);
    assert.deepStrictEqual(resolveModifiers(undefined), MODIFIER_IDENTITY);
    assert.deepStrictEqual(resolveModifiers([]), MODIFIER_IDENTITY);
  });

  it('unknown tags return identity', () => {
    const result = resolveModifiers(['tower', 'timed', 'unknown-focus']);
    assert.deepStrictEqual(result, MODIFIER_IDENTITY);
  });

  it('boss-round increases enemy HP and ATK', () => {
    const result = resolveModifiers(['boss-round']);
    assert.ok(result.enemyHpMult > 1, 'enemy HP should increase');
    assert.ok(result.enemyAtkMult > 1, 'enemy ATK should increase');
    assert.strictEqual(result.playerDamageMult, 1);
    assert.strictEqual(result.timerMult, 1);
  });

  it('strict-time reduces timer', () => {
    const result = resolveModifiers(['strict-time']);
    assert.ok(result.timerMult < 1, 'timer should be reduced');
    assert.strictEqual(result.enemyHpMult, 1);
  });

  it('high-pace reduces timer more than strict-time', () => {
    const strict = resolveModifiers(['strict-time']);
    const highPace = resolveModifiers(['high-pace']);
    assert.ok(highPace.timerMult < strict.timerMult, 'high-pace should be harder');
  });

  it('combo-focus boosts combo scale', () => {
    const result = resolveModifiers(['combo-focus']);
    assert.ok(result.comboScaleMult > 1);
  });

  it('combo-ramp boosts combo scale more than combo-focus', () => {
    const focus = resolveModifiers(['combo-focus']);
    const ramp = resolveModifiers(['combo-ramp']);
    assert.ok(ramp.comboScaleMult > focus.comboScaleMult);
  });

  it('multiple tags compose multiplicatively', () => {
    const result = resolveModifiers(['boss-round', 'strict-time', 'quick-start']);
    // boss-round: enemyHpMult=1.2, enemyAtkMult=1.1
    // strict-time: timerMult=0.85
    // quick-start: playerDamageMult=1.15
    assert.strictEqual(result.enemyHpMult, 1.2);
    assert.strictEqual(result.enemyAtkMult, 1.1);
    assert.strictEqual(result.timerMult, 0.85);
    assert.strictEqual(result.playerDamageMult, 1.15);
  });

  it('stacking two timer modifiers multiplies them', () => {
    const result = resolveModifiers(['strict-time', 'precision']);
    // strict-time: 0.85, precision: 0.9 → 0.765
    const expected = 0.85 * 0.9;
    assert.ok(Math.abs(result.timerMult - expected) < 1e-10);
  });

  it('multi-target reduces enemy HP (easier with more targets)', () => {
    const result = resolveModifiers(['multi-target']);
    assert.ok(result.enemyHpMult < 1, 'should reduce individual enemy HP');
  });
});

describe('hasActiveModifiers', () => {
  it('returns false for null/empty/unknown tags', () => {
    assert.strictEqual(hasActiveModifiers(null), false);
    assert.strictEqual(hasActiveModifiers([]), false);
    assert.strictEqual(hasActiveModifiers(['tower', 'timed']), false);
  });

  it('returns true when at least one tag has mechanical effect', () => {
    assert.strictEqual(hasActiveModifiers(['tower', 'boss-round']), true);
    assert.strictEqual(hasActiveModifiers(['strict-time']), true);
  });
});

describe('getModifierDisplayInfo', () => {
  it('returns null for unknown tags', () => {
    assert.strictEqual(getModifierDisplayInfo('tower'), null);
    assert.strictEqual(getModifierDisplayInfo('nonexistent'), null);
  });

  it('returns effect for known tags', () => {
    const info = getModifierDisplayInfo('boss-round');
    assert.ok(info !== null);
    assert.ok(info.enemyHpMult > 1);
  });
});
