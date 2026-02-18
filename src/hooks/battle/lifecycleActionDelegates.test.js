import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runAllySupportTurnWithContext,
  runHandleFreezeWithContext,
  runPlayerPartyKoWithContext,
  runQuitGameWithContext,
  runToggleCoopActiveWithContext,
} from './lifecycleActionDelegates.ts';

test('runQuitGameWithContext proxies args to quit controller', () => {
  let received = null;
  const args = {
    clearTimer: () => {},
    appendQuitEventIfOpen: () => {},
    sr: { current: {} },
    endSession: () => {},
    setScreen: () => {},
  };

  runQuitGameWithContext(args, (next) => { received = next; });
  assert.equal(received, args);
});

test('runToggleCoopActiveWithContext proxies args to toggle controller', () => {
  let received = null;
  const args = {
    sr: { current: {} },
    canSwitchCoopActiveSlot: () => true,
    setCoopActiveSlot: () => {},
  };

  runToggleCoopActiveWithContext(args, (next) => { received = next; });
  assert.equal(received, args);
});

test('runHandleFreezeWithContext proxies args to freeze controller', () => {
  let received = null;
  const args = {
    sr: { current: {} },
    frozenRef: { current: true },
    setFrozen: () => {},
    setBText: () => {},
    setPhase: () => {},
    safeTo: () => {},
    t: undefined,
  };

  runHandleFreezeWithContext(args, (next) => { received = next; });
  assert.equal(received, args);
});

test('runPlayerPartyKoWithContext merges base args with options', () => {
  let received = null;
  const resultToken = { ok: true };
  const base = {
    sr: { current: {} },
    setStarter: () => {},
    setPStg: () => {},
    setPHp: () => {},
    setAllySub: () => {},
    setPHpSub: () => {},
    setCoopActiveSlot: () => {},
    setPhase: () => {},
    setBText: () => {},
    safeTo: () => {},
    endSession: () => {},
    setScreen: () => {},
    t: undefined,
  };
  const options = { target: 'sub', reason: 'partner down' };

  const out = runPlayerPartyKoWithContext(base, options, (next) => {
    received = next;
    return resultToken;
  });

  assert.equal(received?.target, 'sub');
  assert.equal(received?.reason, 'partner down');
  assert.equal(out, resultToken);
});

test('runAllySupportTurnWithContext applies options and returns runner value', () => {
  let received = null;
  const base = {
    sr: { current: {} },
    safeTo: () => {},
    chance: () => false,
    rand: () => 0,
    setBText: () => {},
    setPhase: () => {},
    setEAnim: () => {},
    setEHp: () => {},
    addD: () => {},
    addP: () => {},
    sfx: { play: () => {} },
    handleVictory: () => {},
    t: undefined,
  };
  const onDone = () => {};
  const out = runAllySupportTurnWithContext(base, { delayMs: 1200, onDone }, (next) => {
    received = next;
    return true;
  });

  assert.equal(received?.delayMs, 1200);
  assert.equal(received?.onDone, onDone);
  assert.equal(out, true);
});
