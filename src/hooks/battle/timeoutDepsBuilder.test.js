import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTimeoutControllerArgs } from './timeoutDepsBuilder.ts';
import { noop, noopNum } from './__testStubs.js';

test('buildTimeoutControllerArgs maps timeout deps from proper domains', () => {
  const runtime = {
    sr: { current: {} },
    t: undefined,
    getPvpTurnName: () => 'P1',
    getOtherPvpTurn: () => 'p2',
    sfx: { play: noop },
    logAns: noopNum,
    updateAbility: noop,
    getActingStarter: () => null,
    appendSessionEvent: noop,
    markCoopRotatePending: noop,
    safeTo: noop,
    doEnemyTurnRef: { current: noop },
  };

  const ui = {
    setAnswered: noop,
    setFb: noop,
    setBText: noop,
    setPhase: noop,
  };

  const pvp = {
    setPvpChargeP1: noop,
    setPvpChargeP2: noop,
    setPvpComboP1: noop,
    setPvpComboP2: noop,
    setPvpTurn: noop,
    setPvpActionCount: noop,
  };

  const battleFields = {
    setTW: noop,
    setStreak: noop,
    setPassiveCount: noop,
    setCharge: noop,
  };

  const args = buildTimeoutControllerArgs({
    runtime,
    ui,
    pvp,
    battleFields,
  });

  assert.equal(args.sr, runtime.sr);
  assert.equal(args.setAnswered, ui.setAnswered);
  assert.equal(args.setTW, battleFields.setTW);
  assert.equal(args.setStreak, battleFields.setStreak);
  assert.equal(args.setPvpChargeP1, pvp.setPvpChargeP1);
  assert.equal(args.setPvpTurn, pvp.setPvpTurn);
  assert.equal(args.doEnemyTurnRef, runtime.doEnemyTurnRef);
});

