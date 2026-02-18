import assert from 'node:assert/strict';
import test from 'node:test';
import { runBattleSelectMove } from './turnFlowAdapter.ts';

const DIFF_MODS = [0.7, 0.85, 1.0, 1.15, 1.3];

function createMove({ risky = false } = {}) {
  return {
    name: '測試招式',
    risky,
    ops: ['+'],
    range: [1, 10],
  };
}

function createSelectMoveHarness({
  battleMode = 'single',
  timedMode = false,
  risky = false,
  pvpChargeP1 = 0,
  questionTimeLimitSec = 5,
} = {}) {
  const state = {
    phase: 'menu',
    battleMode,
    pvpTurn: 'p1',
    pvpChargeP1,
    pvpChargeP2: 0,
    sealedMove: -1,
  };
  const calls = {
    timerArgs: [],
    sfx: [],
    qStartCount: 0,
  };
  const sr = { current: state };

  const selectMoveInput = {
    index: 0,
    sr,
    runtime: {
      timedMode,
      questionTimeLimitSec,
      questionAllowedOps: null,
      diffMods: DIFF_MODS,
      t: undefined,
      getActingStarter: () => ({ moves: [createMove({ risky })] }),
      getMoveDiffLevel: () => 2,
      genQuestion: () => ({
        display: '1 + 1',
        op: '+',
        answer: 2,
        choices: [2, 1, 3, 4],
        steps: ['1 + 1 = 2'],
      }),
      startTimer: (durationSec) => { calls.timerArgs.push(durationSec); },
      markQStart: () => { calls.qStartCount += 1; },
      sfx: { play: (name) => { calls.sfx.push(name); } },
    },
    ui: {
      setSelIdx: (value) => { state.selIdx = value; },
      setQ: (value) => { state.q = value; },
      setFb: (value) => { state.fb = value; },
      setAnswered: (value) => { state.answered = value; },
      setPhase: (value) => { state.phase = value; },
    },
    battleFields: {
      setDiffLevel: (value) => { state.diffLevel = value; },
    },
  };

  return {
    state,
    calls,
    selectMoveInput,
  };
}

test('smoke(select): single mode enters question phase', () => {
  const { state, calls, selectMoveInput } = createSelectMoveHarness({
    battleMode: 'single',
    timedMode: false,
  });

  runBattleSelectMove({ selectMoveInput });

  assert.equal(state.phase, 'question');
  assert.equal(state.selIdx, 0);
  assert.equal(state.diffLevel, 2);
  assert.equal(state.answered, false);
  assert.equal(state.q?.answer, 2);
  assert.equal(calls.qStartCount, 1);
  assert.equal(calls.timerArgs.length, 0);
  assert.deepEqual(calls.sfx, ['select']);
});

test('smoke(select): timed mode starts timer', () => {
  const { state, calls, selectMoveInput } = createSelectMoveHarness({
    battleMode: 'single',
    timedMode: true,
    questionTimeLimitSec: 6,
  });

  runBattleSelectMove({ selectMoveInput });

  assert.equal(state.phase, 'question');
  assert.deepEqual(calls.timerArgs, [6]);
});

test('smoke(select): coop mode remains responsive', () => {
  const { state, calls, selectMoveInput } = createSelectMoveHarness({
    battleMode: 'coop',
    timedMode: false,
  });

  runBattleSelectMove({ selectMoveInput });

  assert.equal(state.phase, 'question');
  assert.equal(state.selIdx, 0);
  assert.equal(calls.qStartCount, 1);
});

test('smoke(select): pvp mode starts timer and blocks uncharged risky move', () => {
  const normal = createSelectMoveHarness({
    battleMode: 'pvp',
    timedMode: false,
    risky: false,
    pvpChargeP1: 0,
    questionTimeLimitSec: 4,
  });
  runBattleSelectMove({ selectMoveInput: normal.selectMoveInput });
  assert.equal(normal.state.phase, 'question');
  assert.deepEqual(normal.calls.timerArgs, [4]);

  const risky = createSelectMoveHarness({
    battleMode: 'pvp',
    timedMode: false,
    risky: true,
    pvpChargeP1: 2,
    questionTimeLimitSec: 4,
  });
  runBattleSelectMove({ selectMoveInput: risky.selectMoveInput });
  assert.equal(risky.state.phase, 'menu');
  assert.equal(risky.state.selIdx, undefined);
  assert.equal(risky.calls.qStartCount, 0);
  assert.equal(risky.calls.timerArgs.length, 0);
  assert.deepEqual(risky.calls.sfx, []);
});
