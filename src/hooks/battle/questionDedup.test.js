import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeOps,
  resolveEffectiveQuestionOps,
  estimateOpCombinationSpace,
  estimateMoveQuestionCombinationSpace,
  resolveQuestionRecentWindowSize,
  buildQuestionHistoryKey,
  deduplicateQuestion,
  MAX_RECENT_QUESTION_WINDOW,
} from './questionDedup.ts';

// ── normalizeOps ──

test('normalizeOps returns empty array for null/undefined', () => {
  assert.deepEqual(normalizeOps(null), []);
  assert.deepEqual(normalizeOps(undefined), []);
});

test('normalizeOps returns empty array for non-array', () => {
  assert.deepEqual(normalizeOps('not-an-array'), []);
});

test('normalizeOps trims whitespace and filters empty strings', () => {
  assert.deepEqual(normalizeOps([' + ', '', '  ', ' - ']), ['+', '-']);
});

test('normalizeOps deduplicates ops', () => {
  assert.deepEqual(normalizeOps(['+', '-', '+', '×', '-']), ['+', '-', '×']);
});

test('normalizeOps handles nullish items in array', () => {
  assert.deepEqual(normalizeOps(['+', null, undefined, '-']), ['+', '-']);
});

// ── resolveEffectiveQuestionOps ──

test('resolveEffectiveQuestionOps returns base ops when allowedOps is empty', () => {
  const move = { range: [1, 10], ops: ['+', '-'] };
  assert.deepEqual(resolveEffectiveQuestionOps(move, []), ['+', '-']);
  assert.deepEqual(resolveEffectiveQuestionOps(move, null), ['+', '-']);
});

test('resolveEffectiveQuestionOps returns intersection when overlap exists', () => {
  const move = { range: [1, 10], ops: ['+', '-', '×'] };
  assert.deepEqual(resolveEffectiveQuestionOps(move, ['-', '÷']), ['-']);
});

test('resolveEffectiveQuestionOps falls back to allowed when no overlap', () => {
  const move = { range: [1, 10], ops: ['+', '-'] };
  assert.deepEqual(resolveEffectiveQuestionOps(move, ['×', '÷']), ['×', '÷']);
});

test('resolveEffectiveQuestionOps returns base ops when move has empty ops and allowed is empty', () => {
  const move = { range: [1, 10], ops: [] };
  assert.deepEqual(resolveEffectiveQuestionOps(move, []), []);
});

// ── estimateOpCombinationSpace ──

test('estimateOpCombinationSpace: + with span 10 returns 100', () => {
  assert.equal(estimateOpCombinationSpace('+', 10), 100);
});

test('estimateOpCombinationSpace: - with span 10 returns 90', () => {
  assert.equal(estimateOpCombinationSpace('-', 10), 90);
});

test('estimateOpCombinationSpace: - with span 1 returns 1', () => {
  assert.equal(estimateOpCombinationSpace('-', 1), 1);
});

test('estimateOpCombinationSpace: mixed2 with span 5 returns 500', () => {
  assert.equal(estimateOpCombinationSpace('mixed2', 5), 500);
});

test('estimateOpCombinationSpace: dec_frac with span 1 returns 14 (minimum)', () => {
  assert.equal(estimateOpCombinationSpace('dec_frac', 1), 14);
});

test('estimateOpCombinationSpace: frac_same with span 2 returns 12 (minimum)', () => {
  assert.equal(estimateOpCombinationSpace('frac_same', 2), 12);
});

test('estimateOpCombinationSpace: unknown op falls back to span²', () => {
  assert.equal(estimateOpCombinationSpace('some_new_op', 7), 49);
});

test('estimateOpCombinationSpace: fractional span is truncated', () => {
  assert.equal(estimateOpCombinationSpace('+', 3.7), 9);
});

test('estimateOpCombinationSpace: zero/negative span becomes 1', () => {
  assert.equal(estimateOpCombinationSpace('+', 0), 1);
  assert.equal(estimateOpCombinationSpace('+', -5), 1);
});

// ── resolveQuestionRecentWindowSize ──

test('resolveQuestionRecentWindowSize: tiny space returns 0', () => {
  const move = { range: [1, 1], ops: ['+'] };
  assert.equal(resolveQuestionRecentWindowSize(move, 1, null), 0);
});

test('resolveQuestionRecentWindowSize: large space is capped at MAX_RECENT_QUESTION_WINDOW', () => {
  const move = { range: [1, 100], ops: ['+'] };
  assert.equal(resolveQuestionRecentWindowSize(move, 1, null), MAX_RECENT_QUESTION_WINDOW);
});

test('resolveQuestionRecentWindowSize: moderate space returns expected window', () => {
  const move = { range: [1, 5], ops: ['+'] };
  assert.equal(resolveQuestionRecentWindowSize(move, 1, null), 8);
});

test('resolveQuestionRecentWindowSize: small space returns proportional window', () => {
  const move = { range: [1, 3], ops: ['+'] };
  assert.equal(resolveQuestionRecentWindowSize(move, 1, null), 4);
});

// ── buildQuestionHistoryKey ──

test('buildQuestionHistoryKey: deterministic output', () => {
  const move = { range: [1, 10], ops: ['+', '-'] };
  const key1 = buildQuestionHistoryKey(move, 1.5, null);
  const key2 = buildQuestionHistoryKey(move, 1.5, null);
  assert.equal(key1, key2);
});

test('buildQuestionHistoryKey: different diffMod produces different key', () => {
  const move = { range: [1, 10], ops: ['+'] };
  const key1 = buildQuestionHistoryKey(move, 1.0, null);
  const key2 = buildQuestionHistoryKey(move, 2.0, null);
  assert.notEqual(key1, key2);
});

test('buildQuestionHistoryKey: different ops produce different key', () => {
  const move1 = { range: [1, 10], ops: ['+'] };
  const move2 = { range: [1, 10], ops: ['-'] };
  const key1 = buildQuestionHistoryKey(move1, 1, null);
  const key2 = buildQuestionHistoryKey(move2, 1, null);
  assert.notEqual(key1, key2);
});

test('buildQuestionHistoryKey: different range produces different key', () => {
  const move1 = { range: [1, 10], ops: ['+'] };
  const move2 = { range: [1, 20], ops: ['+'] };
  const key1 = buildQuestionHistoryKey(move1, 1, null);
  const key2 = buildQuestionHistoryKey(move2, 1, null);
  assert.notEqual(key1, key2);
});

test('buildQuestionHistoryKey: allowedOps affect the key via effective ops', () => {
  const move = { range: [1, 10], ops: ['+', '-', '×'] };
  const key1 = buildQuestionHistoryKey(move, 1, ['+']);
  const key2 = buildQuestionHistoryKey(move, 1, ['-']);
  assert.notEqual(key1, key2);
});

// ── deduplicateQuestion ──

test('deduplicateQuestion: dedupWindow 0 generates once, no history', () => {
  let calls = 0;
  const generate = () => { calls++; return { display: 'q1' }; };
  const historyMap = new Map();
  const result = deduplicateQuestion({
    generate,
    historyMap,
    historyKey: 'k',
    dedupWindow: 0,
  });
  assert.equal(result.display, 'q1');
  assert.equal(calls, 1);
  assert.equal(historyMap.size, 0, 'no history recorded when dedupWindow is 0');
});

test('deduplicateQuestion: avoids recent duplicates', () => {
  let callIdx = 0;
  const displays = ['old1', 'old2', 'fresh'];
  const generate = () => ({ display: displays[callIdx++] });
  const historyMap = new Map([['k', ['old1', 'old2']]]);
  const result = deduplicateQuestion({
    generate,
    historyMap,
    historyKey: 'k',
    dedupWindow: 4,
  });
  assert.equal(result.display, 'fresh');
  assert.ok(historyMap.get('k').includes('fresh'));
});

test('deduplicateQuestion: ring buffer trims to dedupWindow', () => {
  const historyMap = new Map([['k', ['a', 'b', 'c']]]);
  const generate = () => ({ display: 'new' });
  deduplicateQuestion({
    generate,
    historyMap,
    historyKey: 'k',
    dedupWindow: 3,
  });
  const history = historyMap.get('k');
  assert.equal(history.length, 3);
  assert.deepEqual(history, ['b', 'c', 'new']);
});

test('deduplicateQuestion: retry exhaustion does NOT append duplicate to history', () => {
  const generate = () => ({ display: 'dup' });
  const historyMap = new Map([['k', ['dup']]]);
  const result = deduplicateQuestion({
    generate,
    historyMap,
    historyKey: 'k',
    dedupWindow: 4,
  });
  assert.equal(result.display, 'dup', 'still returns the question');
  assert.deepEqual(historyMap.get('k'), ['dup'], 'history unchanged after exhaustion');
});

test('deduplicateQuestion: first question for a key starts fresh history', () => {
  const historyMap = new Map();
  const generate = () => ({ display: 'first' });
  deduplicateQuestion({
    generate,
    historyMap,
    historyKey: 'newkey',
    dedupWindow: 3,
  });
  assert.deepEqual(historyMap.get('newkey'), ['first']);
});

test('deduplicateQuestion: preserves extra properties on returned question', () => {
  const generate = () => ({ display: '2+3', answer: 5, choices: [3, 4, 5, 6] });
  const historyMap = new Map();
  const result = deduplicateQuestion({
    generate,
    historyMap,
    historyKey: 'k',
    dedupWindow: 3,
  });
  assert.equal(result.display, '2+3');
  assert.equal(result.answer, 5);
  assert.deepEqual(result.choices, [3, 4, 5, 6]);
});

test('deduplicateQuestion: empty display string is not recorded', () => {
  const generate = () => ({ display: '  ' });
  const historyMap = new Map();
  deduplicateQuestion({
    generate,
    historyMap,
    historyKey: 'k',
    dedupWindow: 3,
  });
  assert.equal(historyMap.has('k'), false, 'whitespace-only display not recorded');
});
