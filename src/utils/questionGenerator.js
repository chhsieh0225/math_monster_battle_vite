/**
 * Generate a math question based on move configuration.
 * @param {Object} move - Move object with range, ops properties
 * @returns {Object} { display, answer, choices, op, steps }
 *   steps: array of strings showing the solution process (shown on wrong answer)
 */

// Helper: random int in [lo, hi]
function rr(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function formatTemplate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, key) => String(params[key] ?? ""));
}

function createTranslator(options = {}) {
  const t = typeof options?.t === "function" ? options.t : null;
  return (key, fallback, params) => {
    if (t) return t(key, fallback, params);
    return formatTemplate(fallback, params);
  };
}

function opWord(op, tr) {
  return op === "+" ? tr("question.word.add", "addition") : tr("question.word.sub", "subtraction");
}

// ── Mixed-operation question generators (for electric starter) ──

/**
 * mixed2: a ± b ± c  (加減混合，三個數)
 * e.g. 8 + 5 - 3 = 10
 */
function genMixed2(range, _depth = 0) {
  // Fallback: if too many retries (ans < 0), force all-addition
  if (_depth > 15) {
    const a = rr(range[0], range[1]), b = rr(range[0], range[1]), c = rr(range[0], range[1]);
    const ans = a + b + c;
    return { display: `${a} + ${b} + ${c}`, answer: ans, op: "mixed2",
             steps: [`${a} + ${b} = ${a + b}`, `${a + b} + ${c} = ${ans}`] };
  }
  const a = rr(range[0], range[1]);
  const b = rr(range[0], range[1]);
  const c = rr(range[0], range[1]);
  const op1 = Math.random() < 0.5 ? "+" : "-";
  const op2 = Math.random() < 0.5 ? "+" : "-";
  const step1 = op1 === "+" ? a + b : a - b;
  const ans = op2 === "+" ? step1 + c : step1 - c;
  if (ans < 0) return genMixed2(range, _depth + 1);
  const steps = [
    `${a} ${op1} ${b} = ${step1}`,
    `${step1} ${op2} ${c} = ${ans}`,
  ];
  return { display: `${a} ${op1} ${b} ${op2} ${c}`, answer: ans, op: "mixed2", steps };
}

/**
 * mixed3: a × b ± c  (乘加/乘減混合，考驗運算優先順序)
 */
function genMixed3(range, tr, _depth = 0) {
  // Fallback: force addition so ans is always positive
  if (_depth > 15) {
    const a = rr(range[0], range[1]), b = rr(range[0], range[1]), c = rr(range[0], range[1]);
    const product = a * b, ans = product + c;
    return { display: `${a} × ${b} + ${c}`, answer: ans, op: "mixed3",
             steps: [
               tr("question.step.mulFirst", "Multiply first: {a} × {b} = {result}", { a, b, result: product }),
               tr("question.step.addSubThen", "Then {opWord}: {left} {op} {right} = {result}", {
                 opWord: opWord("+", tr),
                 left: product,
                 op: "+",
                 right: c,
                 result: ans,
               }),
             ] };
  }
  const a = rr(range[0], range[1]);
  const b = rr(range[0], range[1]);
  const c = rr(range[0], range[1]);
  const op2 = Math.random() < 0.5 ? "+" : "-";
  const product = a * b;
  const ans = op2 === "+" ? product + c : product - c;
  if (ans < 0) return genMixed3(range, tr, _depth + 1);
  const steps = [
    tr("question.step.mulFirst", "Multiply first: {a} × {b} = {result}", { a, b, result: product }),
    tr("question.step.addSubThen", "Then {opWord}: {left} {op} {right} = {result}", {
      opWord: opWord(op2, tr),
      left: product,
      op: op2,
      right: c,
      result: ans,
    }),
  ];
  return { display: `${a} × ${b} ${op2} ${c}`, answer: ans, op: "mixed3", steps };
}

/**
 * mixed4: full 四則運算 with order-of-operations
 */
function genMixed4(range, tr, _depth = 0) {
  // Fallback: force all-addition pattern so ans is always positive
  if (_depth > 15) {
    const a = rr(range[0], range[1]), b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]), dd = rr(range[0], range[1]);
    const p1 = a * b, ans = p1 + c + dd;
    return { display: `${a} × ${b} + ${c} + ${dd}`, answer: ans, op: "mixed4",
             steps: [
               tr("question.step.mulFirst", "Multiply first: {a} × {b} = {result}", { a, b, result: p1 }),
               tr("question.step.addSubThen", "Then {opWord}: {left} {op} {right} = {result}", {
                 opWord: opWord("+", tr),
                 left: `${p1} + ${c}`,
                 op: "+",
                 right: dd,
                 result: ans,
               }),
             ] };
  }
  const pattern = Math.random();
  let d, ans, steps;

  if (pattern < 0.4) {
    // a ± b × c
    const a = rr(range[0] + 3, range[1] * 2);
    const b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]);
    const op = Math.random() < 0.5 ? "+" : "-";
    const prod = b * c;
    ans = op === "+" ? a + prod : a - prod;
    if (ans < 0) return genMixed4(range, tr, _depth + 1);
    d = `${a} ${op} ${b} × ${c}`;
    steps = [
      tr("question.step.mulFirst", "Multiply first: {a} × {b} = {result}", { a: b, b: c, result: prod }),
      tr("question.step.addSubThen", "Then {opWord}: {left} {op} {right} = {result}", {
        opWord: opWord(op, tr),
        left: a,
        op,
        right: prod,
        result: ans,
      }),
    ];
  } else if (pattern < 0.7) {
    // a × b ± c × d
    const a = rr(range[0], Math.min(range[1], 6));
    const b = rr(range[0], Math.min(range[1], 6));
    const c = rr(range[0], Math.min(range[1], 6));
    const dd = rr(range[0], Math.min(range[1], 6));
    const op = Math.random() < 0.6 ? "+" : "-";
    const p1 = a * b, p2 = c * dd;
    ans = op === "+" ? p1 + p2 : p1 - p2;
    if (ans < 0) return genMixed4(range, tr, _depth + 1);
    d = `${a} × ${b} ${op} ${c} × ${dd}`;
    steps = [
      tr("question.step.mulFirst", "Multiply first: {a} × {b} = {result}", { a, b, result: p1 }),
      tr("question.step.mulThen", "Then multiply: {a} × {b} = {result}", { a: c, b: dd, result: p2 }),
      tr("question.step.addSubFinal", "Finally {opWord}: {left} {op} {right} = {result}", {
        opWord: opWord(op, tr),
        left: p1,
        op,
        right: p2,
        result: ans,
      }),
    ];
  } else {
    // a ± b × c ± d
    const a = rr(range[0] + 5, range[1] * 3);
    const b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]);
    const dd = rr(range[0], range[1]);
    const op1 = Math.random() < 0.5 ? "+" : "-";
    const op2 = Math.random() < 0.5 ? "+" : "-";
    const prod = b * c;
    const mid = op1 === "+" ? a + prod : a - prod;
    ans = op2 === "+" ? mid + dd : mid - dd;
    if (ans < 0) return genMixed4(range, tr, _depth + 1);
    d = `${a} ${op1} ${b} × ${c} ${op2} ${dd}`;
    steps = [
      tr("question.step.mulFirst", "Multiply first: {a} × {b} = {result}", { a: b, b: c, result: prod }),
      tr("question.step.addSubThen", "Then {opWord}: {left} {op} {right} = {result}", {
        opWord: opWord(op1, tr),
        left: a,
        op: op1,
        right: prod,
        result: mid,
      }),
      tr("question.step.addSubFinal", "Finally {opWord}: {left} {op} {right} = {result}", {
        opWord: opWord(op2, tr),
        left: mid,
        op: op2,
        right: dd,
        result: ans,
      }),
    ];
  }

  return { display: d, answer: ans, op: "mixed4", steps };
}

// ── Solve-for-unknown question generators (for lion starter) ──

/**
 * unknown1: ? ± b = c  (加減求未知)
 * e.g. ? + 5 = 12 → ans = 7
 */
function genUnknown1(range, _depth = 0) {
  if (_depth > 20) {
    const a = rr(range[0], range[1]), b = rr(range[0], range[1]);
    return { display: `? + ${b} = ${a + b}`, answer: a, op: "unknown1",
             steps: [`? + ${b} = ${a + b}`, `? = ${a + b} - ${b}`, `? = ${a}`] };
  }
  const op = Math.random() < 0.5 ? "+" : "-";
  if (op === "+") {
    const ans = rr(range[0], range[1]);
    const b = rr(range[0], range[1]);
    const c = ans + b;
    return { display: `? + ${b} = ${c}`, answer: ans, op: "unknown1",
             steps: [`? + ${b} = ${c}`, `? = ${c} - ${b}`, `? = ${ans}`] };
  } else {
    const b = rr(range[0], range[1]);
    const ans = rr(range[0], range[1]);
    const c = ans - b;
    if (c < 0) return genUnknown1(range, _depth + 1);
    return { display: `? - ${b} = ${c}`, answer: ans, op: "unknown1",
             steps: [`? - ${b} = ${c}`, `? = ${c} + ${b}`, `? = ${ans}`] };
  }
}

/**
 * unknown2: ? × b = c  or  ? ÷ b = c  (乘除求未知)
 * e.g. ? × 4 = 28 → ans = 7
 */
function genUnknown2(range) {
  const op = Math.random() < 0.5 ? "×" : "÷";
  if (op === "×") {
    const ans = rr(range[0], range[1]);
    const b = Math.max(2, rr(range[0], range[1]));
    const c = ans * b;
    return { display: `? × ${b} = ${c}`, answer: ans, op: "unknown2",
             steps: [`? × ${b} = ${c}`, `? = ${c} ÷ ${b}`, `? = ${ans}`] };
  } else {
    const b = Math.max(2, rr(range[0], range[1]));
    const c = rr(range[0], range[1]);
    const ans = b * c;
    return { display: `? ÷ ${b} = ${c}`, answer: ans, op: "unknown2",
             steps: [`? ÷ ${b} = ${c}`, `? = ${c} × ${b}`, `? = ${ans}`] };
  }
}

/**
 * unknown3: large-number unknowns — ? + b = c, ? × b = c with bigger numbers
 * e.g. ? + 37 = 85 → ans = 48
 */
function genUnknown3(range, _depth = 0) {
  if (_depth > 20) {
    const a = rr(range[0], range[1]), b = rr(range[0], range[1]);
    return { display: `? + ${b} = ${a + b}`, answer: a, op: "unknown3",
             steps: [`? + ${b} = ${a + b}`, `? = ${a + b} - ${b}`, `? = ${a}`] };
  }
  const pattern = Math.random();
  if (pattern < 0.35) {
    // ? + b = c
    const ans = rr(range[0], range[1]);
    const b = rr(range[0], range[1]);
    const c = ans + b;
    return { display: `? + ${b} = ${c}`, answer: ans, op: "unknown3",
             steps: [`? + ${b} = ${c}`, `? = ${c} - ${b}`, `? = ${ans}`] };
  } else if (pattern < 0.65) {
    // ? - b = c
    const b = rr(range[0], range[1]);
    const ans = rr(Math.max(range[0], b + 1), range[1] + b);
    const c = ans - b;
    if (c < 0) return genUnknown3(range, _depth + 1);
    return { display: `? - ${b} = ${c}`, answer: ans, op: "unknown3",
             steps: [`? - ${b} = ${c}`, `? = ${c} + ${b}`, `? = ${ans}`] };
  } else {
    // ? × b = c (with capped b to keep answer reasonable)
    const b = Math.max(2, rr(2, Math.min(range[1], 9)));
    const ans = rr(range[0], Math.min(range[1], 15));
    const c = ans * b;
    return { display: `? × ${b} = ${c}`, answer: ans, op: "unknown3",
             steps: [`? × ${b} = ${c}`, `? = ${c} ÷ ${b}`, `? = ${ans}`] };
  }
}

/**
 * unknown4: compound unknowns — (? + a) × b = c, ? × a + b = c
 * e.g. (? + 3) × 4 = 28 → ? = 4
 */
function genUnknown4(range, _depth = 0) {
  if (_depth > 20) {
    const a = rr(2, 5), b = rr(2, 5), ans = rr(range[0], range[1]);
    const c = (ans + a) * b;
    return { display: `(? + ${a}) × ${b} = ${c}`, answer: ans, op: "unknown4",
             steps: [`(? + ${a}) × ${b} = ${c}`, `? + ${a} = ${c} ÷ ${b} = ${c / b}`, `? = ${c / b} - ${a} = ${ans}`] };
  }
  const pattern = Math.random();
  if (pattern < 0.5) {
    // (? + a) × b = c
    const a = rr(1, Math.min(range[1], 6));
    const b = Math.max(2, rr(2, Math.min(range[1], 6)));
    const ans = rr(range[0], range[1]);
    const inner = ans + a;
    const c = inner * b;
    return { display: `(? + ${a}) × ${b} = ${c}`, answer: ans, op: "unknown4",
             steps: [`(? + ${a}) × ${b} = ${c}`, `? + ${a} = ${c} ÷ ${b} = ${inner}`, `? = ${inner} - ${a} = ${ans}`] };
  } else {
    // ? × a + b = c
    const a = Math.max(2, rr(2, Math.min(range[1], 6)));
    const b = rr(1, Math.min(range[1], 10));
    const ans = rr(range[0], range[1]);
    const c = ans * a + b;
    return { display: `? × ${a} + ${b} = ${c}`, answer: ans, op: "unknown4",
             steps: [`? × ${a} + ${b} = ${c}`, `? × ${a} = ${c} - ${b} = ${c - b}`, `? = ${(c - b)} ÷ ${a} = ${ans}`] };
  }
}

/**
 * @param {Object} move
 * @param {number} [diffMod=1] - Difficulty multiplier for range (0.7~1.3)
 * @param {{ t?: (key:string, fallback?:string, params?:Record<string, string|number>) => string }} [options]
 */
export function genQ(move, diffMod = 1, options = {}) {
  const tr = createTranslator(options);
  // Scale range by difficulty modifier
  const baseRange = move.range;
  const range = [
    Math.max(1, Math.round(baseRange[0] * diffMod)),
    Math.max(2, Math.round(baseRange[1] * diffMod)),
  ];
  const ops = move.ops;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, ans, d, steps;

  // ── Mixed operations (electric starter) ──
  if (op === "mixed2") {
    const q = genMixed2(range);
    return makeChoices(q);
  }
  if (op === "mixed3") {
    const q = genMixed3(range, tr);
    return makeChoices(q);
  }
  if (op === "mixed4") {
    const q = genMixed4(range, tr);
    return makeChoices(q);
  }

  // ── Solve-for-unknown operations (lion starter) ──
  if (op === "unknown1") {
    const q = genUnknown1(range);
    return makeChoices(q);
  }
  if (op === "unknown2") {
    const q = genUnknown2(range);
    return makeChoices(q);
  }
  if (op === "unknown3") {
    const q = genUnknown3(range);
    return makeChoices(q);
  }
  if (op === "unknown4") {
    const q = genUnknown4(range);
    return makeChoices(q);
  }

  // ── Single operations (original starters) ──
  if (op === "×") {
    a = rr(range[0], range[1]);
    b = rr(range[0], range[1]);
    ans = a * b;
    d = `${a} × ${b}`;
    steps = [`${a} × ${b} = ${ans}`];
  } else if (op === "÷") {
    b = Math.max(1, rr(range[0], range[1]));
    ans = Math.max(1, rr(range[0], range[1]));
    a = b * ans;
    d = `${a} ÷ ${b}`;
    steps = [
      tr("question.step.think", "Think: {expr}", { expr: `${b} × ? = ${a}` }),
      `${b} × ${ans} = ${a}`,
      tr("question.step.therefore", "Therefore {expr}", { expr: `${a} ÷ ${b} = ${ans}` }),
    ];
  } else if (op === "+") {
    a = rr(range[0], range[1]);
    b = rr(range[0], range[1]);
    ans = a + b;
    d = `${a} + ${b}`;
    steps = [`${a} + ${b} = ${ans}`];
  } else if (op === "-") {
    let x = rr(range[0], range[1]);
    let y = rr(range[0], range[1]);
    if (x === y) y = Math.min(range[1], y + 1);
    a = Math.max(x, y);
    b = Math.min(x, y);
    ans = a - b;
    d = `${a} - ${b}`;
    steps = [`${a} - ${b} = ${ans}`];
  }

  return makeChoices({ display: d, answer: ans, op, steps });
}

/**
 * Wrap a {display, answer, op, steps} object with 4 shuffled answer choices.
 */
function makeChoices({ display, answer, op, steps }) {
  const spread = Math.max(5, Math.ceil(Math.abs(answer) * 0.2));
  const ch = new Set([answer]);
  let guard = 0;
  while (ch.size < 4 && guard++ < 50) {
    const w = answer + Math.floor(Math.random() * spread * 2 + 1) - spread;
    if (w >= 0 && w !== answer) ch.add(w);
  }
  let fb = 1;
  while (ch.size < 4) {
    ch.add(Math.max(0, answer + fb));
    fb++;
  }
  const arr = [...ch];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { display, answer, choices: arr, op, steps: steps || [] };
}
