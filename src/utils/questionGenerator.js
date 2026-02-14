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
function genMixed3(range, _depth = 0) {
  // Fallback: force addition so ans is always positive
  if (_depth > 15) {
    const a = rr(range[0], range[1]), b = rr(range[0], range[1]), c = rr(range[0], range[1]);
    const product = a * b, ans = product + c;
    return { display: `${a} × ${b} + ${c}`, answer: ans, op: "mixed3",
             steps: [`先算乘法：${a} × ${b} = ${product}`, `再算加法：${product} + ${c} = ${ans}`] };
  }
  const a = rr(range[0], range[1]);
  const b = rr(range[0], range[1]);
  const c = rr(range[0], range[1]);
  const op2 = Math.random() < 0.5 ? "+" : "-";
  const product = a * b;
  const ans = op2 === "+" ? product + c : product - c;
  if (ans < 0) return genMixed3(range, _depth + 1);
  const steps = [
    `先算乘法：${a} × ${b} = ${product}`,
    `再算${op2 === "+" ? "加" : "減"}法：${product} ${op2} ${c} = ${ans}`,
  ];
  return { display: `${a} × ${b} ${op2} ${c}`, answer: ans, op: "mixed3", steps };
}

/**
 * mixed4: full 四則運算 with order-of-operations
 */
function genMixed4(range, _depth = 0) {
  // Fallback: force all-addition pattern so ans is always positive
  if (_depth > 15) {
    const a = rr(range[0], range[1]), b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]), dd = rr(range[0], range[1]);
    const p1 = a * b, ans = p1 + c + dd;
    return { display: `${a} × ${b} + ${c} + ${dd}`, answer: ans, op: "mixed4",
             steps: [`先算乘法：${a} × ${b} = ${p1}`, `再算加法：${p1} + ${c} + ${dd} = ${ans}`] };
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
    if (ans < 0) return genMixed4(range, _depth + 1);
    d = `${a} ${op} ${b} × ${c}`;
    steps = [
      `先算乘法：${b} × ${c} = ${prod}`,
      `再算${op === "+" ? "加" : "減"}法：${a} ${op} ${prod} = ${ans}`,
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
    if (ans < 0) return genMixed4(range, _depth + 1);
    d = `${a} × ${b} ${op} ${c} × ${dd}`;
    steps = [
      `先算乘法：${a} × ${b} = ${p1}`,
      `再算乘法：${c} × ${dd} = ${p2}`,
      `最後${op === "+" ? "加" : "減"}法：${p1} ${op} ${p2} = ${ans}`,
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
    if (ans < 0) return genMixed4(range, _depth + 1);
    d = `${a} ${op1} ${b} × ${c} ${op2} ${dd}`;
    steps = [
      `先算乘法：${b} × ${c} = ${prod}`,
      `再算${op1 === "+" ? "加" : "減"}法：${a} ${op1} ${prod} = ${mid}`,
      `最後${op2 === "+" ? "加" : "減"}法：${mid} ${op2} ${dd} = ${ans}`,
    ];
  }

  return { display: d, answer: ans, op: "mixed4", steps };
}

/**
 * @param {Object} move
 * @param {number} [diffMod=1] - Difficulty multiplier for range (0.7~1.3)
 */
export function genQ(move, diffMod = 1) {
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
    const q = genMixed3(range);
    return makeChoices(q);
  }
  if (op === "mixed4") {
    const q = genMixed4(range);
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
      `想一想：${b} × ? = ${a}`,
      `${b} × ${ans} = ${a}`,
      `所以 ${a} ÷ ${b} = ${ans}`,
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
