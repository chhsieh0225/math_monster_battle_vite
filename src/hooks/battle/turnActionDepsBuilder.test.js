import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSelectMoveFlowArgs } from './turnActionDepsBuilder.ts';

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

