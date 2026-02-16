import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePvpTurnStartStatus } from './pvpStatusResolver.ts';

function createState(overrides = {}) {
  return {
    pvpTurn: 'p1',
    pHp: 100,
    pvpHp2: 100,
    pvpBurnP1: 0,
    pvpBurnP2: 0,
    pvpParalyzeP1: false,
    pvpParalyzeP2: false,
    pvpFreezeP1: false,
    pvpFreezeP2: false,
    phase: 'text',
    screen: 'battle',
    pvpWinner: null,
    ...overrides,
  };
}

test('resolvePvpTurnStartStatus applies lethal burn and declares winner', () => {
  const state = createState({ pvpTurn: 'p1', pHp: 6, pvpBurnP1: 2 });
  let hp = 6;
  let winner = null;
  let screen = 'battle';

  const out = resolvePvpTurnStartStatus({
    state,
    safeTo: (fn) => fn(),
    getOtherPvpTurn: () => 'p2',
    getPvpTurnName: () => 'P1',
    setPHp: (value) => { hp = typeof value === 'function' ? value(hp) : value; },
    setPvpBurnP1: () => {},
    setPAnim: () => {},
    addD: () => {},
    setPvpWinner: (value) => { winner = value; },
    setScreen: (value) => { screen = value; },
    setPvpHp2: () => {},
    setEHp: () => {},
    setPvpBurnP2: () => {},
    setEAnim: () => {},
    setBText: () => {},
    setPhase: () => {},
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPvpTurn: () => {},
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
  });

  assert.equal(out, true);
  assert.equal(hp, 0);
  assert.equal(winner, 'p2');
  assert.equal(screen, 'pvp_result');
});

test('resolvePvpTurnStartStatus handles paralyze skip and turn swap', () => {
  const state = createState({ pvpTurn: 'p2', pvpParalyzeP2: true });
  let turn = 'p2';
  let phase = '';

  const out = resolvePvpTurnStartStatus({
    state,
    safeTo: () => {},
    getOtherPvpTurn: () => 'p1',
    getPvpTurnName: () => 'P2',
    setPHp: () => {},
    setPvpBurnP1: () => {},
    setPAnim: () => {},
    addD: () => {},
    setPvpWinner: () => {},
    setScreen: () => {},
    setPvpHp2: () => {},
    setEHp: () => {},
    setPvpBurnP2: () => {},
    setEAnim: () => {},
    setBText: () => {},
    setPhase: (value) => { phase = value; },
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPvpTurn: (value) => { turn = value; },
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
  });

  assert.equal(out, true);
  assert.equal(turn, 'p1');
  assert.equal(phase, 'text');
});
