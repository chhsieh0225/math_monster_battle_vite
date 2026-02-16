import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTimeoutControllerArgs } from './timeoutDepsBuilder.ts';

test('buildTimeoutControllerArgs maps timeout deps from proper domains', () => {
  const runtime = {
    sr: { current: {} },
    t: undefined,
    getPvpTurnName: () => 'P1',
    getOtherPvpTurn: () => 'p2',
    sfx: { play: () => {} },
    logAns: () => 0,
    updateAbility: () => {},
    getActingStarter: () => null,
    appendSessionEvent: () => {},
    markCoopRotatePending: () => {},
    safeTo: () => {},
    doEnemyTurnRef: { current: () => {} },
  };

  const ui = {
    setAnswered: () => {},
    setFb: () => {},
    setBText: () => {},
    setPhase: () => {},
  };

  const pvp = {
    setPvpChargeP1: () => {},
    setPvpChargeP2: () => {},
    setPvpComboP1: () => {},
    setPvpComboP2: () => {},
    setPvpTurn: () => {},
    setPvpActionCount: () => {},
  };

  const battleFields = {
    setTW: () => {},
    setStreak: () => {},
    setPassiveCount: () => {},
    setCharge: () => {},
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

