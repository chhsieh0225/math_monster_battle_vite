import assert from 'node:assert/strict';
import test from 'node:test';
import { runAnswerController } from './answerController.ts';
import { runAdvanceController } from './advanceController.ts';
import { runTimeoutController } from './timeoutController.ts';

test('runAnswerController no-ops when answer already submitted', () => {
  let setAnsweredCalls = 0;
  let clearTimerCalls = 0;

  runAnswerController({
    choice: 1,
    answered: true,
    setAnswered: () => { setAnsweredCalls += 1; },
    clearTimer: () => { clearTimerCalls += 1; },
    sr: { current: { battleMode: 'single' } },
    pvpHandlerDeps: {},
    playerHandlerDeps: {},
    getActingStarter: () => null,
    logAns: () => 0,
    appendSessionEvent: () => {},
    updateAbility: () => {},
    markCoopRotatePending: () => {},
  });

  assert.equal(setAnsweredCalls, 0);
  assert.equal(clearTimerCalls, 0);
});

test('runAnswerController marks answered and clears timer in non-pvp flow', () => {
  let setAnsweredCalls = 0;
  let clearTimerCalls = 0;

  runAnswerController({
    choice: 1,
    answered: false,
    setAnswered: () => { setAnsweredCalls += 1; },
    clearTimer: () => { clearTimerCalls += 1; },
    sr: { current: { battleMode: 'single', selIdx: 0, q: { answer: 2 } } },
    pvpHandlerDeps: {},
    playerHandlerDeps: {},
    getActingStarter: () => null,
    logAns: () => 0,
    appendSessionEvent: () => {},
    updateAbility: () => {},
    markCoopRotatePending: () => {},
  });

  assert.equal(setAnsweredCalls, 1);
  assert.equal(clearTimerCalls, 1);
});

test('runAdvanceController text phase falls back to menu when not pvp turn-start', () => {
  const phases = [];
  const texts = [];
  let continueCalls = 0;

  runAdvanceController({
    phase: 'text',
    sr: { current: { battleMode: 'single' } },
    pvpTurnStartHandlerDeps: {},
    setPhase: (value) => { phases.push(value); },
    setBText: (value) => { texts.push(value); },
    pendingEvolutionArgs: {
      pendingEvolveRef: { current: false },
      setPStg: () => {},
      tryUnlock: () => {},
      getStageMaxHp: () => 100,
      setPHp: () => {},
      setAllySub: () => {},
      setPHpSub: () => {},
      getStarterMaxHp: () => 100,
      setMLvls: () => {},
      maxMoveLvl: 10,
      setScreen: () => {},
    },
    continueFromVictory: () => { continueCalls += 1; },
  });

  assert.deepEqual(phases, ['menu']);
  assert.deepEqual(texts, ['']);
  assert.equal(continueCalls, 0);
});

test('runAdvanceController victory phase continues when no pending evolution', () => {
  let continueCalls = 0;
  let phaseCalls = 0;

  runAdvanceController({
    phase: 'victory',
    sr: { current: { battleMode: 'single', pStg: 0 } },
    pvpTurnStartHandlerDeps: {},
    setPhase: () => { phaseCalls += 1; },
    setBText: () => {},
    pendingEvolutionArgs: {
      pendingEvolveRef: { current: false },
      setPStg: () => {},
      tryUnlock: () => {},
      getStageMaxHp: () => 100,
      setPHp: () => {},
      setAllySub: () => {},
      setPHpSub: () => {},
      getStarterMaxHp: () => 100,
      setMLvls: () => {},
      maxMoveLvl: 10,
      setScreen: () => {},
    },
    continueFromVictory: () => { continueCalls += 1; },
  });

  assert.equal(continueCalls, 1);
  assert.equal(phaseCalls, 0);
});

test('runTimeoutController executes latest doEnemyTurnRef callback', () => {
  let scheduled = null;
  const calls = [];
  const doEnemyTurnRef = {
    current: () => { calls.push('first'); },
  };

  runTimeoutController({
    sr: { current: { battleMode: 'single', q: { answer: 3 }, selIdx: 0 } },
    t: undefined,
    getPvpTurnName: () => 'P1',
    getOtherPvpTurn: () => 'p2',
    setAnswered: () => {},
    setFb: () => {},
    setTW: () => {},
    setPvpChargeP1: () => {},
    setPvpChargeP2: () => {},
    setPvpComboP1: () => {},
    setPvpComboP2: () => {},
    setBText: () => {},
    setPvpTurn: () => {},
    setPvpActionCount: () => {},
    setPhase: () => {},
    sfx: { play: () => {} },
    setStreak: () => {},
    setPassiveCount: () => {},
    setCharge: () => {},
    logAns: () => 0,
    updateAbility: () => {},
    getActingStarter: () => null,
    appendSessionEvent: () => {},
    markCoopRotatePending: () => {},
    safeTo: (fn) => { scheduled = fn; },
    doEnemyTurnRef,
  });

  assert.equal(typeof scheduled, 'function');
  doEnemyTurnRef.current = () => { calls.push('second'); };
  scheduled();

  assert.deepEqual(calls, ['second']);
});

