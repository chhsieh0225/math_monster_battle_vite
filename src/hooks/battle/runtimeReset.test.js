import assert from 'node:assert/strict';
import test from 'node:test';
import { runResetRuntimeState } from './runtimeReset.ts';

test('runResetRuntimeState resets transient ui/runtime refs to clean run state', () => {
  const calls = {
    dmgs: [],
    parts: [],
    atkEffect: [],
    effMsg: [],
  };
  const frozenRef = { current: true };
  const pendingEvolveRef = { current: true };
  const abilityModelRef = { current: { marker: 'old' } };

  runResetRuntimeState({
    setDmgs: (value) => { calls.dmgs.push(value); },
    setParts: (value) => { calls.parts.push(value); },
    setAtkEffect: (value) => { calls.atkEffect.push(value); },
    setEffMsg: (value) => { calls.effMsg.push(value); },
    frozenRef,
    abilityModelRef,
    createAbilityModel: (baselineLevel) => ({ marker: `new-${baselineLevel}` }),
    pendingEvolveRef,
  });

  assert.deepEqual(calls.dmgs, [[]]);
  assert.deepEqual(calls.parts, [[]]);
  assert.deepEqual(calls.atkEffect, [null]);
  assert.deepEqual(calls.effMsg, [null]);
  assert.equal(frozenRef.current, false);
  assert.equal(pendingEvolveRef.current, false);
  assert.deepEqual(abilityModelRef.current, { marker: 'new-2' });
});
