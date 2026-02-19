import assert from 'node:assert/strict';
import test from 'node:test';
import { genQ } from './questionGenerator.ts';

test('genQ returns 4 choices and includes the answer', () => {
  const move = { range: [2, 10], ops: ["+"] };
  const q = genQ(move, 1);

  assert.equal(Array.isArray(q.choices), true);
  assert.equal(q.choices.length, 4);
  assert.equal(q.choices.includes(q.answer), true);
  assert.equal(Array.isArray(q.steps), true);
});

test('genQ keeps subtraction answers non-negative across many samples', () => {
  const move = { range: [2, 20], ops: ["-"] };
  for (let i = 0; i < 80; i++) {
    const q = genQ(move, 1);
    assert.equal(Number.isInteger(q.answer), true);
    assert.equal(q.answer >= 0, true);
    assert.equal(q.choices.includes(q.answer), true);
  }
});

test('genQ unknown-operation question contains unknown symbol and valid choices', () => {
  const move = { range: [2, 20], ops: ["unknown1"] };
  const q = genQ(move, 1);

  assert.equal(q.op, "unknown1");
  assert.equal(q.display.includes("?"), true);
  assert.equal(q.answer >= 0, true);
  assert.equal(q.choices.includes(q.answer), true);
  assert.equal(q.steps.length > 0, true);
});

test('genQ supports localized step text via translator option', () => {
  const move = { range: [2, 10], ops: ["÷"] };
  const q = genQ(move, 1, {
    t: (key, fallback, params) => {
      if (key === "question.step.think") return `THINK ${params.expr}`;
      if (key === "question.step.therefore") return `THEREFORE ${params.expr}`;
      return fallback;
    },
  });

  assert.equal(q.op, "÷");
  assert.equal(q.steps[0].startsWith("THINK "), true);
  assert.equal(q.steps[2].startsWith("THEREFORE "), true);
});

test('genQ respects allowedOps filter when overlap exists', () => {
  const move = { range: [2, 10], ops: ["+", "-"] };
  for (let i = 0; i < 20; i += 1) {
    const q = genQ(move, 1, { allowedOps: ["-"] });
    assert.equal(q.op, "-");
  }
});

test('genQ falls back to allowedOps when move ops do not overlap', () => {
  const move = { range: [2, 10], ops: ["+"] };
  for (let i = 0; i < 20; i += 1) {
    const q = genQ(move, 1, { allowedOps: ["unknown1"] });
    assert.equal(q.op, "unknown1");
    assert.equal(q.display.includes("?"), true);
  }
});

test('genQ fraction compare question exposes symbol choices', () => {
  const move = { range: [2, 9], ops: ["frac_cmp"] };
  const q = genQ(move, 1);

  assert.equal(q.op, "frac_cmp");
  assert.equal(Array.isArray(q.choiceLabels), true);
  assert.equal(q.choiceLabels.length, 3);
  assert.equal(typeof q.answerLabel, "string");
  assert.equal(["<", ">", "="].includes(q.answerLabel), true);
  assert.equal(q.choiceLabels[q.answer], q.answerLabel);
});

test('genQ fraction arithmetic question returns readable fraction labels', () => {
  const move = { range: [2, 10], ops: ["frac_same", "frac_diff", "frac_muldiv"] };
  const q = genQ(move, 1);

  assert.equal(["frac_same", "frac_diff", "frac_muldiv"].includes(q.op), true);
  assert.equal(Array.isArray(q.choiceLabels), true);
  assert.equal(q.choiceLabels.length, 4);
  assert.equal(typeof q.answerLabel, "string");
  assert.equal(q.choiceLabels[q.answer], q.answerLabel);
});
