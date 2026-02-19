import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE_CONFIG } from './balanceConfig.ts';
import { validateBalanceConfigSchema } from './balanceConfigSchema.ts';

test('validateBalanceConfigSchema accepts current balance config', () => {
  assert.doesNotThrow(() => validateBalanceConfigSchema(BALANCE_CONFIG));
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
