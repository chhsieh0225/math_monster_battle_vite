import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePvpTurnStartStatus } from './pvpStatusResolver.ts';
import { noop } from './__testStubs.js';

function createState(overrides = {}) {
  const base = {
    pHp: 100,
    pvpHp2: 100,
    phase: 'text',
    screen: 'battle',
    pvpState: {
      turn: 'p1',
      winner: null,
      actionCount: 0,
      p1: {
        charge: 0,
        burn: 0,
        freeze: false,
        static: 0,
        paralyze: false,
        combo: 0,
        specDef: false,
      },
      p2: {
        charge: 0,
        burn: 0,
        freeze: false,
        static: 0,
        paralyze: false,
        combo: 0,
        specDef: false,
      },
    },
  };

  const overrideState = overrides.pvpState || {};
  return {
    ...base,
    ...overrides,
    pvpState: {
      ...base.pvpState,
      ...overrideState,
      p1: {
        ...base.pvpState.p1,
        ...(overrideState.p1 || {}),
      },
      p2: {
        ...base.pvpState.p2,
        ...(overrideState.p2 || {}),
      },
    },
  };
}

test('resolvePvpTurnStartStatus applies lethal burn and declares winner', () => {
  const state = createState({
    pHp: 6,
    pvpState: {
      turn: 'p1',
      p1: { burn: 2 },
    },
  });
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
  const state = createState({
    pvpState: {
      turn: 'p2',
      p2: { paralyze: true },
    },
  });
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
