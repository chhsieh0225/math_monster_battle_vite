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

test('pvp selectors default to safe values when pvpState is missing', () => {
  const state = {};
  assert.equal(getResolvedPvpTurn(state), 'p1');
  assert.equal(getResolvedPvpWinner(state), null);
  assert.equal(getResolvedPvpActionCount(state), 0);
  assert.deepEqual(getResolvedPvpCombatant(state, 'p2'), {
    charge: 0,
    burn: 0,
    freeze: false,
    static: 0,
    paralyze: false,
    combo: 0,
    specDef: false,
  });
});

test('pvp selectors default missing combatant fields to safe values', () => {
  const state = {
    pvpState: {
      p1: {
        charge: 9,
        combo: 8,
      },
    },
  };
  assert.deepEqual(getResolvedPvpCombatant(state, 'p1'), {
    charge: 9,
    burn: 0,
    freeze: false,
    static: 0,
    paralyze: false,
    combo: 8,
    specDef: false,
  });
});
