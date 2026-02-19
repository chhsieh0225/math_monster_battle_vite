import assert from 'node:assert/strict';
import test from 'node:test';
import { genQ } from './questionGenerator.ts';
import { withRandomSource } from './prng.ts';

function gcd(a, b) {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function normalizeFractionLabel(label) {
  const text = String(label).trim();
  const m = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(text);
  if (!m) return text;
  const n = Number(m[1]);
  const d = Number(m[2]);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return text;
  const g = gcd(n, d);
  const nn = n / g;
  const dd = d / g;
  if (dd === 1) return String(nn);
  return `${nn}/${dd}`;
}

function simplifyFrac(n, d) {
  const safeD = d === 0 ? 1 : d;
  const sign = safeD < 0 ? -1 : 1;
  const g = gcd(n, safeD);
  return { n: (n / g) * sign, d: Math.abs(safeD / g) };
}

function decimalLabelToFraction(label) {
  const text = String(label).trim();
  const m = /^(-?\d+)(?:\.(\d+))?$/.exec(text);
  if (!m) return null;
  const whole = Number(m[1]);
  const frac = m[2] || '';
  if (!Number.isFinite(whole)) return null;
  if (!frac) return { n: whole, d: 1 };
  const denom = 10 ** frac.length;
  const absWhole = Math.abs(whole);
  const num = absWhole * denom + Number(frac);
  const signedNum = whole < 0 ? -num : num;
  return simplifyFrac(signedNum, denom);
}

function divideFractions(a, b) {
  return simplifyFrac(a.n * b.d, a.d * b.n);
}

function equalFractions(a, b) {
  return a.n * b.d === b.n * a.d;
}

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

test('genQ decimal add route generates labeled decimal choices', () => {
  const move = { range: [2, 12], ops: ["dec_add"] };
  const q = genQ(move, 1);
  assert.equal(q.op, "dec_add");
  assert.equal(Array.isArray(q.choiceLabels), true);
  assert.equal(q.choiceLabels.length, 4);
  assert.equal(typeof q.answerLabel, "string");
  assert.equal(q.choiceLabels[q.answer], q.answerLabel);
  assert.equal(q.display.includes('.'), true);
});

test('genQ decimal add stays one-digit at low difficulty and upgrades at higher difficulty', () => {
  const move = { range: [2, 12], ops: ["dec_add"] };

  const low = genQ(move, 1);
  assert.equal(low.op, "dec_add");
  assert.match(low.display, /\d+\.\d\s*[+-]\s*\d+\.\d/);

  const high = genQ(move, 1.15);
  assert.equal(high.op, "dec_add");
  assert.match(high.display, /\d+\.\d{2}\s*[+-]\s*\d+\.\d{2}/);
});

test('genQ decimal fraction-convert route supports both conversion directions', () => {
  const move = { range: [2, 12], ops: ["dec_frac"] };
  for (let i = 0; i < 40; i += 1) {
    const q = genQ(move, 1);
    assert.equal(q.op, "dec_frac");
    assert.equal(Array.isArray(q.choiceLabels), true);
    assert.equal(q.choiceLabels.length, 4);
    assert.equal(typeof q.answerLabel, "string");
    assert.equal(q.choiceLabels[q.answer], q.answerLabel);
  }
});

test('genQ decimal fraction->decimal keeps exact value (no rounded recurring answers)', () => {
  const move = { range: [2, 12], ops: ["dec_frac"] };
  let checked = 0;
  for (let i = 0; i < 240; i += 1) {
    const q = genQ(move, 1);
    const m = /^(-?\d+)\s*\/\s*(-?\d+)\s*=\s*\?$/.exec(String(q.display).trim());
    if (!m) continue;
    const frac = simplifyFrac(Number(m[1]), Number(m[2]));
    const answerFrac = decimalLabelToFraction(q.answerLabel);
    assert.notEqual(answerFrac, null);
    assert.equal(equalFractions(frac, answerFrac), true);
    checked += 1;
  }
  assert.equal(checked > 0, true);
});

test('genQ decimal mul/div routes no longer fall through to addition', () => {
  const move = { range: [2, 12], ops: ["dec_mul", "dec_div"] };
  for (let i = 0; i < 60; i += 1) {
    const q = genQ(move, 1);
    assert.equal(["dec_mul", "dec_div"].includes(q.op), true);
  }
});

test('genQ decimal division produces exact quotient for displayed operands', () => {
  const move = { range: [2, 12], ops: ["dec_div"] };
  for (let i = 0; i < 120; i += 1) {
    const q = genQ(move, 1);
    const m = /^([0-9]+(?:\.[0-9]+)?)\s*÷\s*([0-9]+(?:\.[0-9]+)?)$/.exec(String(q.display).trim());
    assert.notEqual(m, null);
    const left = decimalLabelToFraction(m[1]);
    const right = decimalLabelToFraction(m[2]);
    const answer = decimalLabelToFraction(q.answerLabel);
    assert.notEqual(left, null);
    assert.notEqual(right, null);
    assert.notEqual(answer, null);
    const exact = divideFractions(left, right);
    assert.equal(equalFractions(exact, answer), true);
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

test('genQ fraction arithmetic labels stay in simplest form', () => {
  const move = { range: [2, 12], ops: ["frac_same", "frac_diff", "frac_muldiv"] };
  for (let i = 0; i < 160; i += 1) {
    const q = genQ(move, 1);
    if (!Array.isArray(q.choiceLabels)) continue;
    for (const label of q.choiceLabels) {
      assert.equal(normalizeFractionLabel(label), String(label).trim());
    }
    if (typeof q.answerLabel === 'string') {
      assert.equal(normalizeFractionLabel(q.answerLabel), q.answerLabel);
    }
  }
});

test('genQ frac_same subtraction avoids zero-result shortcuts', () => {
  const move = { range: [2, 9], ops: ["frac_same"] };
  let minusSeen = 0;
  for (let i = 0; i < 120; i += 1) {
    const q = genQ(move, 1);
    if (!q.display.includes('-')) continue;
    minusSeen += 1;
    assert.notEqual(q.answerLabel, "0");
  }
  assert.equal(minusSeen > 0, true);
});

test('genQ fraction labels remain finite and fill choices for narrow range', () => {
  const move = { range: [2, 2], ops: ["frac_same"] };
  const q = genQ(move, 1);
  assert.equal(Array.isArray(q.choiceLabels), true);
  assert.equal(q.choiceLabels.length, 4);
  assert.equal(new Set(q.choiceLabels).size, 4);
});

test('genQ fraction steps can be localized through translator', () => {
  const move = { range: [2, 9], ops: ["frac_diff"] };
  const q = genQ(move, 1, {
    t: (key, fallback) => (key.startsWith("question.step.frac") ? `LOC ${key}` : fallback),
  });
  assert.equal(q.steps.some((step) => String(step).startsWith("LOC question.step.frac")), true);
});

test('genQ multiplication distractors prioritize neighboring table values', () => {
  const move = { range: [7, 8], ops: ["×"] };
  const randomSeq = [0.2, 0.8, 0.15, 0.65, 0.35, 0.55, 0.75, 0.95];
  let cursor = 0;
  const q = withRandomSource(
    () => {
      const value = randomSeq[cursor] ?? 0.42;
      cursor += 1;
      return value;
    },
    () => genQ(move, 1),
  );

  assert.equal(q.op, "×");
  assert.equal(q.answer, 56);
  const distractors = q.choices.filter((value) => value !== q.answer).sort((a, b) => a - b);
  assert.deepEqual(distractors, [48, 54, 63]);
});
