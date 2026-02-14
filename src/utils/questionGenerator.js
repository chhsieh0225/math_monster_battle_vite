/**
 * Generate a math question based on move configuration.
 * @param {Object} move - Move object with range, ops properties
 * @returns {Object} { display, answer, choices, op }
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
function genMixed2(range) {
  const a = rr(range[0], range[1]);
  const b = rr(range[0], range[1]);
  const c = rr(range[0], range[1]);
  const op1 = Math.random() < 0.5 ? "+" : "-";
  const op2 = Math.random() < 0.5 ? "+" : "-";
  let ans = a;
  ans = op1 === "+" ? ans + b : ans - b;
  ans = op2 === "+" ? ans + c : ans - c;
  // Ensure non-negative answer; retry with addition if negative
  if (ans < 0) {
    return genMixed2(range);
  }
  return { display: `${a} ${op1} ${b} ${op2} ${c}`, answer: ans, op: "mixed2" };
}

/**
 * mixed3: a × b ± c  (乘加/乘減混合，考驗運算優先順序)
 * Display: "a × b + c" — student must do multiplication first
 */
function genMixed3(range) {
  const a = rr(range[0], range[1]);
  const b = rr(range[0], range[1]);
  const c = rr(range[0], range[1]);
  const op2 = Math.random() < 0.5 ? "+" : "-";
  const product = a * b;
  const ans = op2 === "+" ? product + c : product - c;
  if (ans < 0) return genMixed3(range);
  return { display: `${a} × ${b} ${op2} ${c}`, answer: ans, op: "mixed3" };
}

/**
 * mixed4: full 四則運算 with order-of-operations
 * Patterns:
 *   (1) a + b × c      → a + (b*c)
 *   (2) a × b + c × d  → (a*b) + (c*d)  (rare, harder)
 *   (3) a × b - c      → (a*b) - c
 *   (4) a + b × c - d  → a + (b*c) - d
 */
function genMixed4(range) {
  const pattern = Math.random();
  let d, ans;

  if (pattern < 0.4) {
    // a ± b × c
    const a = rr(range[0] + 3, range[1] * 2);
    const b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]);
    const op = Math.random() < 0.5 ? "+" : "-";
    ans = op === "+" ? a + b * c : a - b * c;
    if (ans < 0) return genMixed4(range);
    d = `${a} ${op} ${b} × ${c}`;
  } else if (pattern < 0.7) {
    // a × b ± c × d
    const a = rr(range[0], Math.min(range[1], 6));
    const b = rr(range[0], Math.min(range[1], 6));
    const c = rr(range[0], Math.min(range[1], 6));
    const dd = rr(range[0], Math.min(range[1], 6));
    const op = Math.random() < 0.6 ? "+" : "-";
    ans = op === "+" ? a * b + c * dd : a * b - c * dd;
    if (ans < 0) return genMixed4(range);
    d = `${a} × ${b} ${op} ${c} × ${dd}`;
  } else {
    // a ± b × c ± d
    const a = rr(range[0] + 5, range[1] * 3);
    const b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]);
    const dd = rr(range[0], range[1]);
    const op1 = Math.random() < 0.5 ? "+" : "-";
    const op2 = Math.random() < 0.5 ? "+" : "-";
    ans = a;
    ans = op1 === "+" ? ans + b * c : ans - b * c;
    ans = op2 === "+" ? ans + dd : ans - dd;
    if (ans < 0) return genMixed4(range);
    d = `${a} ${op1} ${b} × ${c} ${op2} ${dd}`;
  }

  return { display: d, answer: ans, op: "mixed4" };
}

export function genQ(move) {
  const { range, ops } = move;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, ans, d;

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
  } else if (op === "÷") {
    b = Math.max(1, rr(range[0], range[1]));
    ans = Math.max(1, rr(range[0], range[1]));
    a = b * ans;
    d = `${a} ÷ ${b}`;
  } else if (op === "+") {
    a = rr(range[0], range[1]);
    b = rr(range[0], range[1]);
    ans = a + b;
    d = `${a} + ${b}`;
  } else if (op === "-") {
    let x = rr(range[0], range[1]);
    let y = rr(range[0], range[1]);
    if (x === y) y = Math.min(range[1], y + 1);
    a = Math.max(x, y);
    b = Math.min(x, y);
    ans = a - b;
    d = `${a} - ${b}`;
  }

  return makeChoices({ display: d, answer: ans, op });
}

/**
 * Wrap a {display, answer, op} object with 4 shuffled answer choices.
 */
function makeChoices({ display, answer, op }) {
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
  return { display, answer, choices: arr, op };
}
