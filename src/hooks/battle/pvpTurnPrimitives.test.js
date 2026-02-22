import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCorrectTurnProgress,
  createBattleActiveScheduler,
  declarePvpWinner,
  resetCurrentTurnResources,
  swapPvpTurnToText,
} from './pvpTurnPrimitives.ts';

test('swapPvpTurnToText swaps turn, increments action count, and sets text phase', () => {
  let turn = 'p1';
  let actions = 2;
  let phase = 'question';
  swapPvpTurnToText({
    nextTurn: 'p2',
    setPvpTurn: (value) => { turn = value; },
    setPvpActionCount: (value) => {
      actions = typeof value === 'function' ? value(actions) : value;
    },
    setPhase: (value) => { phase = value; },
  });

  assert.equal(turn, 'p2');
  assert.equal(actions, 3);
  assert.equal(phase, 'text');
});

test('resetCurrentTurnResources resets only active attacker resources', () => {
  let chargeP1 = 2;
  let comboP1 = 1;
  let chargeP2 = 3;
  let comboP2 = 4;

  resetCurrentTurnResources({
    currentTurn: 'p1',
    setPvpChargeP1: (value) => { chargeP1 = typeof value === 'function' ? value(chargeP1) : value; },
    setPvpComboP1: (value) => { comboP1 = typeof value === 'function' ? value(comboP1) : value; },
    setPvpChargeP2: (value) => { chargeP2 = typeof value === 'function' ? value(chargeP2) : value; },
    setPvpComboP2: (value) => { comboP2 = typeof value === 'function' ? value(comboP2) : value; },
  });

  assert.equal(chargeP1, 0);
  assert.equal(comboP1, 0);
  assert.equal(chargeP2, 3);
  assert.equal(comboP2, 4);
});

test('applyCorrectTurnProgress unlocks spec-def when combo reaches trigger', () => {
  let chargeP1 = 2;
  let comboP1 = 1;
  let specDefP1 = false;

  const unlocked = applyCorrectTurnProgress({
    currentTurn: 'p1',
    state: {
      pvpState: {
        p1: { combo: 1, specDef: false },
        p2: { combo: 0, specDef: false },
      },
    },
    pvpSpecDefTrigger: 2,
    setPvpChargeP1: (value) => { chargeP1 = typeof value === 'function' ? value(chargeP1) : value; },
    setPvpChargeP2: () => {},
    setPvpComboP1: (value) => { comboP1 = typeof value === 'function' ? value(comboP1) : value; },
    setPvpComboP2: () => {},
    setPvpSpecDefP1: (value) => { specDefP1 = typeof value === 'function' ? value(specDefP1) : value; },
    setPvpSpecDefP2: () => {},
  });

  assert.equal(unlocked, true);
  assert.equal(chargeP1, 3);
  assert.equal(comboP1, 0);
  assert.equal(specDefP1, true);
});

test('applyCorrectTurnProgress prefers structured pvpState combo over flat fields', () => {
  let comboP1 = -1;
  let specDefP1 = false;

  const unlocked = applyCorrectTurnProgress({
    currentTurn: 'p1',
    state: {
      pvpState: {
        p1: { combo: 2, specDef: false },
        p2: { combo: 0, specDef: false },
      },
    },
    pvpSpecDefTrigger: 3,
    setPvpChargeP1: () => {},
    setPvpChargeP2: () => {},
    setPvpComboP1: (value) => { comboP1 = typeof value === 'function' ? value(comboP1) : value; },
    setPvpComboP2: () => {},
    setPvpSpecDefP1: (value) => { specDefP1 = typeof value === 'function' ? value(specDefP1) : value; },
    setPvpSpecDefP2: () => {},
  });

  assert.equal(unlocked, true);
  assert.equal(comboP1, 0);
  assert.equal(specDefP1, true);
});

test('declarePvpWinner sets winner and routes to pvp result screen', () => {
  let winner = null;
  let screen = 'battle';

  declarePvpWinner({
    winner: 'p2',
    setPvpWinner: (value) => { winner = value; },
    setScreen: (value) => { screen = value; },
  });

  assert.equal(winner, 'p2');
  assert.equal(screen, 'pvp_result');
});

test('createBattleActiveScheduler blocks stale delayed callbacks', () => {
  const queued = [];
  const state = { phase: 'question', screen: 'battle', pvpWinner: null };
  let ran = false;
  const safeTo = (fn) => { queued.push(fn); };

  const schedule = createBattleActiveScheduler({
    safeTo,
    getState: () => state,
  });
  schedule(() => { ran = true; }, 100);

  state.phase = 'ko';
  state.screen = 'pvp_result';
  queued[0]();

  assert.equal(ran, false);
});
