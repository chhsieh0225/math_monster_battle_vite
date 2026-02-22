import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getResolvedPvpActionCount,
  getResolvedPvpCombatant,
  getResolvedPvpTurn,
  getResolvedPvpWinner,
} from './pvpStateSelectors.ts';

test('pvp selectors prioritize structured pvpState values', () => {
  const state = {
    pvpTurn: 'p1',
    pvpWinner: null,
    pvpActionCount: 0,
    pvpChargeP2: 1,
    pvpState: {
      turn: 'p2',
      winner: 'p1',
      actionCount: 5,
      p1: { charge: 2, burn: 1, freeze: false, static: 0, paralyze: false, combo: 2, specDef: true },
      p2: { charge: 3, burn: 2, freeze: true, static: 1, paralyze: true, combo: 4, specDef: false },
    },
  };
  assert.equal(getResolvedPvpTurn(state), 'p2');
  assert.equal(getResolvedPvpWinner(state), 'p1');
  assert.equal(getResolvedPvpActionCount(state), 5);
  assert.equal(getResolvedPvpCombatant(state, 'p2').charge, 3);
  assert.equal(getResolvedPvpCombatant(state, 'p2').freeze, true);
});

test('pvp selectors fall back to legacy flat fields', () => {
  const state = {
    pvpTurn: 'p2',
    pvpWinner: 'p2',
    pvpActionCount: 7,
    pvpChargeP2: 2,
    pvpBurnP2: 3,
    pvpFreezeP2: false,
    pvpStaticP2: 1,
    pvpParalyzeP2: true,
    pvpComboP2: 5,
    pvpSpecDefP2: true,
  };
  assert.equal(getResolvedPvpTurn(state), 'p2');
  assert.equal(getResolvedPvpWinner(state), 'p2');
  assert.equal(getResolvedPvpActionCount(state), 7);
  assert.deepEqual(getResolvedPvpCombatant(state, 'p2'), {
    charge: 2,
    burn: 3,
    freeze: false,
    static: 1,
    paralyze: true,
    combo: 5,
    specDef: true,
  });
});

test('pvp selectors merge partial structured state with flat fallbacks', () => {
  const state = {
    pvpTurn: 'p1',
    pvpChargeP1: 1,
    pvpBurnP1: 2,
    pvpFreezeP1: false,
    pvpStaticP1: 3,
    pvpParalyzeP1: false,
    pvpComboP1: 4,
    pvpSpecDefP1: false,
    pvpState: {
      p1: {
        charge: 9,
        combo: 8,
      },
    },
  };
  assert.deepEqual(getResolvedPvpCombatant(state, 'p1'), {
    charge: 9,
    burn: 2,
    freeze: false,
    static: 3,
    paralyze: false,
    combo: 8,
    specDef: false,
  });
});
