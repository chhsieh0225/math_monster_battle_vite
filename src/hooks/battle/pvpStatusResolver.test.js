import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePvpTurnStartStatus } from './pvpStatusResolver.ts';
import { noop } from './__testStubs.js';

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
    setPvpBurnP1: noop,
    setPAnim: noop,
    addD: noop,
    setPvpWinner: (value) => { winner = value; },
    setScreen: (value) => { screen = value; },
    setPvpHp2: noop,
    setEHp: noop,
    setPvpBurnP2: noop,
    setEAnim: noop,
    setBText: noop,
    setPhase: noop,
    setPvpParalyzeP1: noop,
    setPvpParalyzeP2: noop,
    setPvpTurn: noop,
    setPvpFreezeP1: noop,
    setPvpFreezeP2: noop,
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
    safeTo: noop,
    getOtherPvpTurn: () => 'p1',
    getPvpTurnName: () => 'P2',
    setPHp: noop,
    setPvpBurnP1: noop,
    setPAnim: noop,
    addD: noop,
    setPvpWinner: noop,
    setScreen: noop,
    setPvpHp2: noop,
    setEHp: noop,
    setPvpBurnP2: noop,
    setEAnim: noop,
    setBText: noop,
    setPhase: (value) => { phase = value; },
    setPvpParalyzeP1: noop,
    setPvpParalyzeP2: noop,
    setPvpTurn: (value) => { turn = value; },
    setPvpFreezeP1: noop,
    setPvpFreezeP2: noop,
  });

  assert.equal(out, true);
  assert.equal(turn, 'p1');
  assert.equal(phase, 'text');
});
