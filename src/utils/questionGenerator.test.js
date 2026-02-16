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
