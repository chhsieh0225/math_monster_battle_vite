import assert from 'node:assert/strict';
import test from 'node:test';
import { runSelectMoveFlow } from './selectMoveFlow.ts';

const DIFF_MODS = [0.7, 0.85, 1.0, 1.15, 1.3];

function createDeps(overrides = {}) {
  const calls = {
    sfx: [],
    setSelIdx: [],
    setDiffLevel: [],
    setQ: [],
    setFb: [],
    setAnswered: [],
    setPhase: [],
    markQStart: 0,
    startTimer: 0,
    startTimerArgs: [],
  };
  return {
    calls,
    args: {
      index: 1,
      state: {
        phase: 'menu',
        battleMode: 'single',
        pvpTurn: 'p1',
        pvpChargeP1: 0,
        pvpChargeP2: 0,
        sealedMove: null,
      },
      timedMode: false,
      diffMods: DIFF_MODS,
      getActingStarter: () => ({ moves: [{}, { risky: false }, {}] }),
      getMoveDiffLevel: () => 2,
      genQuestion: (_move, mod) => ({ mod }),
      startTimer: (durationSec) => {
        calls.startTimer += 1;
        calls.startTimerArgs.push(durationSec);
      },
      markQStart: () => { calls.markQStart += 1; },
      sfx: { play: (name) => { calls.sfx.push(name); } },
      setSelIdx: (value) => { calls.setSelIdx.push(value); },
      setDiffLevel: (value) => { calls.setDiffLevel.push(value); },
      setQ: (value) => { calls.setQ.push(value); },
      setFb: (value) => { calls.setFb.push(value); },
      setAnswered: (value) => { calls.setAnswered.push(value); },
      setPhase: (value) => { calls.setPhase.push(value); },
      ...overrides,
    },
  };
}

test('runSelectMoveFlow blocks selection when phase is not menu', () => {
  const { calls, args } = createDeps({
    state: {
      phase: 'text',
      battleMode: 'single',
      pvpTurn: 'p1',
      pvpChargeP1: 0,
      pvpChargeP2: 0,
      sealedMove: null,
    },
  });
  const out = runSelectMoveFlow(args);
  assert.equal(out, false);
  assert.equal(calls.setSelIdx.length, 0);
  assert.equal(calls.sfx.length, 0);
});

test('runSelectMoveFlow blocks risky pvp move without enough charge', () => {
  const { calls, args } = createDeps({
    state: {
      phase: 'menu',
      battleMode: 'pvp',
      pvpTurn: 'p1',
      pvpChargeP1: 2,
      pvpChargeP2: 0,
      sealedMove: null,
    },
    getActingStarter: () => ({ moves: [{}, { risky: true }, {}] }),
  });
  const out = runSelectMoveFlow(args);
  assert.equal(out, false);
  assert.equal(calls.setSelIdx.length, 0);
  assert.equal(calls.sfx.length, 0);
});

test('runSelectMoveFlow enters question phase and starts timer in timed mode', () => {
  const { calls, args } = createDeps({ timedMode: true });
  const out = runSelectMoveFlow(args);
  assert.equal(out, true);
  assert.deepEqual(calls.sfx, ['select']);
  assert.deepEqual(calls.setSelIdx, [1]);
  assert.deepEqual(calls.setDiffLevel, [2]);
  assert.equal(calls.setQ.length, 1);
  assert.equal(calls.setQ[0].mod, DIFF_MODS[2]);
  assert.deepEqual(calls.setFb, [null]);
  assert.deepEqual(calls.setAnswered, [false]);
  assert.deepEqual(calls.setPhase, ['question']);
  assert.equal(calls.markQStart, 1);
  assert.equal(calls.startTimer, 1);
  assert.deepEqual(calls.startTimerArgs, [undefined]);
});

test('runSelectMoveFlow starts timer with explicit question time limit', () => {
  const { calls, args } = createDeps({
    timedMode: true,
    questionTimeLimitSec: 5,
  });
  const out = runSelectMoveFlow(args);
  assert.equal(out, true);
  assert.equal(calls.startTimer, 1);
  assert.deepEqual(calls.startTimerArgs, [5]);
});

test('runSelectMoveFlow uses fixed 15s timer in pvp mode', () => {
  const { calls, args } = createDeps({
    state: {
      phase: 'menu',
      battleMode: 'pvp',
      pvpTurn: 'p1',
      pvpChargeP1: 0,
      pvpChargeP2: 0,
      sealedMove: null,
    },
    timedMode: false,
    questionTimeLimitSec: 4,
  });
  const out = runSelectMoveFlow(args);
  assert.equal(out, true);
  assert.equal(calls.startTimer, 1);
  assert.deepEqual(calls.startTimerArgs, [15]);
});

test('runSelectMoveFlow blocks sealed move in non-pvp mode', () => {
  const { calls, args } = createDeps({
    state: {
      phase: 'menu',
      battleMode: 'single',
      pvpTurn: 'p1',
      pvpChargeP1: 0,
      pvpChargeP2: 0,
      sealedMove: 1,
    },
  });
  const out = runSelectMoveFlow(args);
  assert.equal(out, false);
  assert.equal(calls.setSelIdx.length, 0);
  assert.equal(calls.markQStart, 0);
});

test('runSelectMoveFlow returns false when selected move is missing', () => {
  const { calls, args } = createDeps({
    index: 99,
  });
  const out = runSelectMoveFlow(args);
  assert.equal(out, false);
  assert.equal(calls.sfx.length, 0);
  assert.equal(calls.setSelIdx.length, 0);
  assert.equal(calls.startTimer, 0);
});

test('runSelectMoveFlow returns false when required setter is missing', () => {
  const { calls, args } = createDeps({
    setDiffLevel: undefined,
  });
  const out = runSelectMoveFlow(args);
  assert.equal(out, false);
  assert.equal(calls.sfx.length, 0);
  assert.equal(calls.setSelIdx.length, 0);
  assert.equal(calls.markQStart, 0);
});
