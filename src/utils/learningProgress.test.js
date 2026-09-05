import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  createLearningProgress, learningSkillKey, normalizeLearningProgress, planLearningQuestion,
  recordLearningAnswer, loadLearningProgress, saveLearningProgress, resetLearningProgress,
  getLearningHintSteps, getLearningHintCost, isSoloLearningMode, summarizeLearningProgress,
} from './learningProgress.ts';
import { initSessionLog, logAnswer, saveSession, loadSessions, clearSessions } from './sessionLogger.ts';
import en from '../i18n/locales/en-US.ts';
import zh from '../i18n/locales/zh-TW.ts';

const move = { range: [1, 10], ops: ['+'] };
const key = learningSkillKey('+', move.range);
let previousStorage;
beforeEach(() => {
  previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
});
afterEach(() => {
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
});

function question(progress, selectedMove = move, overrides = {}) {
  const learning = planLearningQuestion(progress, selectedMove, () => 0);
  return { op: learning.op, display: `fresh ${progress.answered + 1}`, learning, ...overrides };
}

function answer(progress, correct = true, overrides = {}, selectedMove = move) {
  return recordLearningAnswer(progress, question(progress, selectedMove, overrides), correct).progress;
}

function dueProgress() {
  let progress = answer(createLearningProgress(), false, { display: '1 + 2' });
  progress = answer(progress);
  return answer(progress);
}

test('persistent learning is limited to normal untimed solo', () => {
  assert.equal(isSoloLearningMode('single', false, false), true);
  for (const mode of ['single', 'coop', 'double', 'pvp']) {
    assert.equal(isSoloLearningMode(mode, true, false), false);
    assert.equal(isSoloLearningMode(mode, false, true), false);
    if (mode !== 'single') assert.equal(isSoloLearningMode(mode, false, false), false);
  }
});

test('each level needs four new independent answers and is bounded', () => {
  let progress = createLearningProgress();
  for (let i = 0; i < 3; i++) progress = answer(progress);
  assert.equal(progress.skills[key].level, 2);
  progress = answer(progress);
  assert.equal(progress.skills[key].level, 3);
  assert.equal(progress.skills[key].proof, 0);
  progress = answer(progress);
  assert.equal(progress.skills[key].level, 3);
  for (let i = 0; i < 20; i++) progress = answer(progress);
  assert.equal(progress.skills[key].level, 4);
});

test('assisted correct answers reset proof and queue review without advancing difficulty', () => {
  let progress = createLearningProgress();
  for (let i = 0; i < 3; i++) progress = answer(progress);
  progress = answer(progress, true, { hintsUsed: 1 });
  assert.equal(progress.skills[key].level, 2);
  assert.equal(progress.skills[key].proof, 0);
  assert.equal(progress.skills[key].assistedCorrect, 1);
  assert.equal(progress.skills[key].independentCorrect, 3);
  assert.equal(progress.skills[key].recovery.dueAfter, 6);
});

test('mistakes lower difficulty only to its floor', () => {
  let progress = createLearningProgress();
  for (let i = 0; i < 8; i++) progress = answer(progress, false);
  assert.equal(progress.skills[key].level, 0);
  assert.equal(progress.skills[key].incorrect, 8);
});

test('mastery stays separate by operation and configured range', () => {
  let progress = createLearningProgress();
  for (let i = 0; i < 4; i++) progress = answer(progress);
  assert.equal(planLearningQuestion(progress, move, () => 0).level, 3);
  assert.equal(planLearningQuestion(progress, { range: [1, 50], ops: ['+'] }, () => 0).level, 2);
  assert.equal(planLearningQuestion(progress, { range: [1, 10], ops: ['dec_add'] }, () => 0).level, 2);
});

test('review waits for two intervening answers and selects only compatible skills', () => {
  let progress = answer(createLearningProgress(), false, { display: '1 + 2' });
  assert.equal(question(progress).learning.isRecovery, false);
  progress = answer(progress);
  assert.equal(question(progress).learning.isRecovery, false);
  progress = answer(progress);
  const retry = planLearningQuestion(progress, { ...move, ops: ['-', '+'] }, () => 0);
  assert.equal(retry.op, '+');
  assert.equal(retry.isRecovery, true);
  assert.equal(retry.avoidDisplay, '1 + 2');
  assert.equal(planLearningQuestion(progress, { ...move, ops: ['-'] }, () => 0).isRecovery, false);
  assert.equal(planLearningQuestion(progress, { range: [1, 20], ops: ['+'] }, () => 0).isRecovery, false);
});

test('only a fresh independent due retry clears recovery', () => {
  const progress = dueProgress();
  const repeated = recordLearningAnswer(progress, question(progress, move, { display: '1 + 2' }), true);
  assert.equal(repeated.recovered, false);
  assert.ok(repeated.progress.skills[key].recovery);
  const fresh = recordLearningAnswer(progress, question(progress), true);
  assert.equal(fresh.recovered, true);
  assert.equal(fresh.progress.skills[key].recovery, null);
  assert.equal(fresh.progress.skills[key].recovered, 1);
  assert.ok(progress.skills[key].recovery, 'input remains immutable');
});

test('a hinted or failed retry reschedules recovery with a fresh spacing gap', () => {
  const progress = dueProgress();
  for (const correct of [true, false]) {
    const result = recordLearningAnswer(progress, question(progress, move, { hintsUsed: 1 }), correct);
    assert.equal(result.recovered, false);
    assert.equal(result.progress.skills[key].recovery.dueAfter, 6);
  }
});

test('a duplicate or stale answer cannot be rewarded twice', () => {
  const initial = createLearningProgress();
  const q = question(initial);
  const next = recordLearningAnswer(initial, q, true).progress;
  assert.equal(recordLearningAnswer(next, q, true).progress, next);
});

test('invalid question metadata does not contaminate progress', () => {
  const progress = createLearningProgress();
  const q = question(progress);
  for (const patch of [{ op: '-' }, { skillKey: 'bad' }, { range: [0, 1] }, { level: 8 }, { sequence: 2 }]) {
    const result = recordLearningAnswer(progress, { ...q, learning: { ...q.learning, ...patch } }, true);
    assert.equal(result.progress, progress);
  }
  assert.equal(recordLearningAnswer(progress, { op: '+' }, true).progress, progress);
});

test('profile round-trip preserves level, progress and due recovery across runs', () => {
  const progress = dueProgress();
  assert.equal(saveLearningProgress(progress), true);
  const loaded = loadLearningProgress();
  assert.deepEqual(loaded, progress);
  assert.equal(question(loaded).learning.isRecovery, true);
  assert.equal(question(loaded).learning.level, 1);
});

test('unavailable or malformed storage uses safe in-memory fallback', () => {
  const fallback = dueProgress();
  globalThis.localStorage.getItem = () => '{broken';
  assert.equal(loadLearningProgress(fallback), fallback);
  globalThis.localStorage.getItem = () => { throw new Error('blocked'); };
  globalThis.localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(loadLearningProgress(fallback), fallback);
  assert.equal(saveLearningProgress(fallback), false);
});

test('normalization rejects malformed records and caps future recovery delay', () => {
  for (const raw of [null, [], { version: 2 }, { version: 1, answered: -1, skills: {} }]) {
    assert.deepEqual(normalizeLearningProgress(raw), createLearningProgress());
  }
  const raw = dueProgress();
  raw.skills[key].recovery.dueAfter = 9000;
  raw.skills[key].proof = 500;
  raw.skills.bad = { ...raw.skills[key] };
  const normalized = normalizeLearningProgress(raw);
  assert.equal(Object.keys(normalized.skills).length, 1);
  assert.equal(normalized.skills[key].recovery.dueAfter, 5);
  assert.equal(normalized.skills[key].proof, 3);
});

test('profile growth is bounded and unsupported moves fall back to legacy generation', () => {
  let progress = createLearningProgress();
  for (let i = 1; i <= 140; i++) progress = answer(progress, true, {}, { range: [1, i], ops: ['+'] });
  assert.equal(Object.keys(progress.skills).length, 128);
  assert.equal(planLearningQuestion(progress, { ...move, ops: ['bad'] }, () => 0), null);
  assert.equal(planLearningQuestion(progress, { ...move, range: [-1, 2] }, () => 0), null);
});

test('free hint is a scaffold, not the solution; other modes keep paid hints', () => {
  const q = question(createLearningProgress(), move, { steps: ['1 + 2 = 3'] });
  const steps = getLearningHintSteps(q, (_key, fallback) => fallback);
  assert.equal(steps.length, 2);
  assert.ok(!steps[0].includes('1 + 2 = 3'));
  assert.equal(steps[1], q.steps[0]);
  assert.equal(getLearningHintCost(q, 0, 20), 0);
  assert.equal(getLearningHintCost(q, 1, 20), 20);
  const legacy = { ...q, learning: undefined };
  assert.equal(getLearningHintSteps(legacy, (_key, fallback) => fallback), q.steps);
  assert.equal(getLearningHintCost(legacy, 0, 20), 20);
});

test('all scaffold families have matching English and Chinese translations', () => {
  for (const op of ['+', '-', '\u00d7', '\u00f7', 'dec_add', 'dec_frac', 'frac_muldiv', 'unknown3', 'mixed4']) {
    const q = question(createLearningProgress(), { ...move, ops: [op] });
    getLearningHintSteps(q, (key) => {
      assert.ok(en[key], key);
      assert.ok(zh[key], key);
      return en[key];
    });
  }
  for (const key of Object.keys(en).filter((key) => key.includes('.learning.'))) assert.ok(zh[key], key);
});

test('parent reset and session-history clearing are independent', () => {
  const progress = dueProgress();
  saveLearningProgress(progress);
  saveSession(initSessionLog(null));
  clearSessions();
  assert.deepEqual(loadLearningProgress(), progress);
  saveSession(initSessionLog(null));
  assert.equal(resetLearningProgress(), true);
  assert.deepEqual(loadLearningProgress(progress), createLearningProgress());
  assert.equal(loadSessions().length, 1);
});

test('session answers retain assistance and review metadata without changing combat totals', () => {
  const session = initSessionLog(null);
  const q = question(dueProgress(), move, { hintsUsed: 1 });
  logAnswer(session, q, true, 500);
  assert.equal(session.tC, 1);
  assert.equal(session.opStats['+'].correct, 1);
  assert.equal(session.answers[0].assisted, true);
  assert.equal(session.answers[0].hintsUsed, 1);
  assert.equal(session.answers[0].recovery, true);
  assert.equal(session.answers[0].learningSkillKey, key);
  logAnswer(session, { op: '+' }, false, 1000);
  assert.equal(session.answers[1].assisted, false);
  assert.equal(session.answers[1].learningSkillKey, null);
});

test('dashboard learning totals do not mistake assisted practice for independent recovery', () => {
  let progress = answer(dueProgress(), true, { hintsUsed: 1 });
  assert.deepEqual(summarizeLearningProgress(progress), { independent: 2, assisted: 1, recovered: 0, pending: 1 });
  progress = answer(answer(answer(progress)));
  assert.deepEqual(summarizeLearningProgress(progress), { independent: 5, assisted: 1, recovered: 1, pending: 0 });
});
