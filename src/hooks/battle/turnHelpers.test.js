import assert from 'node:assert/strict';
import test from 'node:test';
import { getActingStarter, getOtherPvpTurn, getPvpTurnName } from './turnHelpers.ts';

test('getOtherPvpTurn swaps p1 and p2', () => {
  assert.equal(getOtherPvpTurn('p1'), 'p2');
  assert.equal(getOtherPvpTurn('p2'), 'p1');
});

test('getPvpTurnName uses starter names and fallback labels', () => {
  const namedState = {
    starter: { name: '火狐' },
    pvpStarter2: { name: '水靈' },
  };
  assert.equal(getPvpTurnName(namedState, 'p1'), '火狐');
  assert.equal(getPvpTurnName(namedState, 'p2'), '水靈');

  const emptyState = { starter: null, pvpStarter2: null };
  assert.equal(getPvpTurnName(emptyState, 'p1'), 'Player 1');
  assert.equal(getPvpTurnName(emptyState, 'p2'), 'Player 2');
});

test('getActingStarter resolves by pvp turn in pvp mode', () => {
  const state = {
    battleMode: 'pvp',
    pvpState: { turn: 'p2' },
    starter: { name: '火狐' },
    pvpStarter2: { name: '水靈' },
  };
  const acting = getActingStarter(state);
  assert.equal(acting?.name, '水靈');
});

test('getActingStarter returns coop sub when active and alive', () => {
  const state = {
    battleMode: 'coop',
    coopActiveSlot: 'sub',
    allySub: { name: '雷喵' },
    pHpSub: 10,
    starter: { name: '火狐' },
  };
  const acting = getActingStarter(state);
  assert.equal(acting?.name, '雷喵');
});

test('getActingStarter falls back to main when coop sub is down', () => {
  const state = {
    battleMode: 'coop',
    coopActiveSlot: 'sub',
    allySub: { name: '雷喵' },
    pHpSub: 0,
    starter: { name: '火狐' },
  };
  const acting = getActingStarter(state);
  assert.equal(acting?.name, '火狐');
});
