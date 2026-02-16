import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCoopTurnRotationDecision } from './coopTurnRotationFlow.ts';

test('resolveCoopTurnRotationDecision keeps pending when phase is not menu', () => {
  const out = resolveCoopTurnRotationDecision({
    phase: 'question',
    pending: true,
    state: { battleMode: 'coop', allySub: { name: '雷喵' }, pHpSub: 20 },
  });
  assert.deepEqual(out, { consumePending: false, action: 'none' });
});

test('resolveCoopTurnRotationDecision keeps pending when not marked pending', () => {
  const out = resolveCoopTurnRotationDecision({
    phase: 'menu',
    pending: false,
    state: { battleMode: 'coop', allySub: { name: '雷喵' }, pHpSub: 20 },
  });
  assert.deepEqual(out, { consumePending: false, action: 'none' });
});

test('resolveCoopTurnRotationDecision falls back to main when sub cannot switch', () => {
  const out = resolveCoopTurnRotationDecision({
    phase: 'menu',
    pending: true,
    state: { battleMode: 'coop', allySub: { name: '雷喵' }, pHpSub: 0 },
  });
  assert.deepEqual(out, { consumePending: true, action: 'set-main' });
});

test('resolveCoopTurnRotationDecision toggles when valid coop sub is alive', () => {
  const out = resolveCoopTurnRotationDecision({
    phase: 'menu',
    pending: true,
    state: { battleMode: 'coop', allySub: { name: '雷喵' }, pHpSub: 20 },
  });
  assert.deepEqual(out, { consumePending: true, action: 'toggle' });
});
