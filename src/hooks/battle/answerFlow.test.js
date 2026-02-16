import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAnswerContext,
  logSubmittedAnswer,
  runStandardAnswerFlow,
  tryHandlePvpAnswer,
} from './answerFlow.ts';

test('buildAnswerContext resolves move/correctness and coop sub attacker', () => {
  const state = {
    battleMode: 'coop',
    allySub: { id: 'sub-1' },
    selIdx: 0,
    q: { answer: 4 },
  };
  const starter = {
    id: 'sub-1',
    moves: [{ name: 'Flame Bite', type: 'fire' }],
  };

  const out = buildAnswerContext({
    state,
    choice: 4,
    getActingStarter: () => starter,
  });

  assert.equal(out?.correct, true);
  assert.equal(out?.isCoopSubActive, true);
  assert.equal(out?.move?.name, 'Flame Bite');
});

test('buildAnswerContext returns null when selected move is missing', () => {
  const out = buildAnswerContext({
    state: {
      battleMode: 'single',
      selIdx: 1,
      q: { answer: 3 },
    },
    choice: 3,
    getActingStarter: () => ({ moves: [{ name: 'A' }] }),
  });

  assert.equal(out, null);
});

test('buildAnswerContext returns null when question payload is missing', () => {
  const out = buildAnswerContext({
    state: {
      battleMode: 'single',
      selIdx: 0,
      q: null,
    },
    choice: 3,
    getActingStarter: () => ({ moves: [{ name: 'A' }] }),
  });

  assert.equal(out, null);
});

test('logSubmittedAnswer emits session event and marks coop rotation', () => {
  const events = [];
  let updateArgs = null;
  let marked = 0;

  logSubmittedAnswer({
    state: {
      battleMode: 'coop',
      timedMode: true,
      diffLevel: 3,
      round: 2,
      selIdx: 1,
      q: { answer: 9, op: 'mix', display: '1 + 8' },
    },
    choice: 9,
    move: { name: 'Dark Nova', type: 'dark' },
    logAns: () => 987,
    appendSessionEvent: (name, payload) => { events.push({ name, payload }); },
    updateAbility: (op, correct) => { updateArgs = { op, correct }; },
    markCoopRotatePending: () => { marked += 1; },
    correct: true,
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].name, 'question_answered');
  assert.equal(events[0].payload.answerTimeMs, 987);
  assert.equal(events[0].payload.moveName, 'Dark Nova');
  assert.deepEqual(updateArgs, { op: 'mix', correct: true });
  assert.equal(marked, 1);
});

test('runStandardAnswerFlow returns false when answer context cannot be built', () => {
  let logged = false;
  const out = runStandardAnswerFlow({
    choice: 1,
    state: { selIdx: null, q: { answer: 1 } },
    getActingStarter: () => ({ moves: [{ name: 'Hit', type: 'fire' }] }),
    logAns: () => {
      logged = true;
      return 0;
    },
    appendSessionEvent: () => {},
    updateAbility: () => {},
    markCoopRotatePending: () => {},
    handlers: {},
  });

  assert.equal(out, false);
  assert.equal(logged, false);
});

test('runStandardAnswerFlow logs and forwards when context is valid', () => {
  const events = [];
  let marked = 0;
  let ability = null;

  const out = runStandardAnswerFlow({
    choice: 6,
    state: {
      battleMode: 'coop',
      allySub: { id: 'ally-1' },
      selIdx: 0,
      q: { answer: 6, op: '+', display: '2+4' },
      timedMode: false,
      diffLevel: 2,
      round: 0,
    },
    getActingStarter: () => ({
      id: 'ally-1',
      moves: [{ name: 'Aqua Shot', type: 'water' }],
    }),
    logAns: () => 321,
    appendSessionEvent: (name, payload) => { events.push({ name, payload }); },
    updateAbility: (op, correct) => { ability = { op, correct }; },
    markCoopRotatePending: () => { marked += 1; },
    handlers: {
      // Keep runPlayerAnswer on the no-op path for this unit test.
      sr: { current: null },
    },
  });

  assert.equal(out, true);
  assert.equal(events.length, 1);
  assert.equal(events[0].payload.correct, true);
  assert.equal(marked, 1);
  assert.deepEqual(ability, { op: '+', correct: true });
});

test('tryHandlePvpAnswer returns false for non-pvp state', () => {
  const out = tryHandlePvpAnswer({
    choice: 1,
    state: { battleMode: 'single' },
    handlers: {},
  });
  assert.equal(out, false);
});
