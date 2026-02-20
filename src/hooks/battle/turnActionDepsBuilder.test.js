import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSelectMoveFlowArgs, buildEnemyTurnArgs } from './turnActionDepsBuilder.ts';

test('buildEnemyTurnArgs wires all deps correctly', () => {
  const noop = () => {};
  const sr = { current: {} };
  const safeTo = () => {};
  const args = buildEnemyTurnArgs({
    sr,
    runtime: {
      safeTo,
      rand: noop,
      randInt: noop,
      chance: noop,
      sfx: { play: noop },
      setScreen: noop,
      t: undefined,
    },
    battleFields: {
      setSealedTurns: noop,
      setSealedMove: noop,
      setBossPhase: noop,
      setBossTurn: noop,
      setBossCharging: noop,
      setPHp: noop,
      setPHpSub: noop,
      setSpecDef: noop,
      setDefAnim: noop,
      setEHp: noop,
      setCursed: noop,
    },
    ui: {
      setBText: noop,
      setPhase: noop,
      setEAnim: noop,
      setPAnim: noop,
      setEffMsg: noop,
      addD: noop,
      addP: noop,
    },
    callbacks: {
      _endSession: noop,
      handleVictory: noop,
      handlePlayerPartyKo: noop,
    },
  });
  assert.equal(args.sr, sr);
  assert.equal(args.safeTo, safeTo);
});

test('buildSelectMoveFlowArgs uses battle field diff setter (not UI)', () => {
  const sr = {
    current: {
      phase: 'menu',
      battleMode: 'single',
      pvpTurn: 'p1',
      pvpChargeP1: 0,
      pvpChargeP2: 0,
      sealedMove: null,
    },
  };

  const uiDiffSetter = () => {};
  const battleDiffSetter = () => {};

  const args = buildSelectMoveFlowArgs({
    index: 0,
    sr,
    runtime: {
      timedMode: true,
      diffMods: [0.7, 0.85, 1.0, 1.15, 1.3],
      t: undefined,
      getActingStarter: () => null,
      getMoveDiffLevel: () => 2,
      genQuestion: () => ({}),
      startTimer: () => {},
      markQStart: () => {},
      sfx: { play: () => {} },
    },
    ui: {
      setSelIdx: () => {},
      setQ: () => {},
      setFb: () => {},
      setAnswered: () => {},
      setPhase: () => {},
      // Intentional extra prop to catch wrong wiring.
      setDiffLevel: uiDiffSetter,
    },
    battleFields: {
      setDiffLevel: battleDiffSetter,
    },
  });

  assert.equal(args.setDiffLevel, battleDiffSetter);
  assert.notEqual(args.setDiffLevel, uiDiffSetter);
});

