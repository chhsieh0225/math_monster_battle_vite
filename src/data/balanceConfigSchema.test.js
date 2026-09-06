import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE_CONFIG } from './balanceConfig.ts';
import { validateBalanceConfigSchema } from './balanceConfigSchema.ts';

test('validateBalanceConfigSchema accepts current balance config', () => {
  assert.doesNotThrow(() => validateBalanceConfigSchema(BALANCE_CONFIG));
});

test('guarded break damage must stay between a positive cost and full damage', () => {
  for (const value of [0, 1.1, NaN, undefined]) {
    const broken = structuredClone(BALANCE_CONFIG);
    broken.traits.boss.guardedBreakDamageScale = value;
    assert.throws(() => validateBalanceConfigSchema(broken), /guardedBreakDamageScale/);
  }
});

test('validateBalanceConfigSchema surfaces helpful errors for invalid input', () => {
  const broken = structuredClone(BALANCE_CONFIG);
  broken.pvp.moveSlotScale = [1, 1, 1];
  broken.damage.playerAttackVariance.min = 1.1;
  broken.damage.playerAttackVariance.max = 0.9;
  assert.throws(
    () => validateBalanceConfigSchema(broken),
    /Invalid BALANCE_CONFIG detected/,
  );
});
