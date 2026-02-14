/**
 * Generate a math question based on move configuration.
 * @param {Object} move - Move object with range, ops properties
 * @returns {Object} { display, answer, choices, op }
 */
export function genQ(move) {
  const { range, ops } = move;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, ans, d;

  if (op === "×") {
    a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    b = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    ans = a * b;
    d = `${a} × ${b}`;
  } else if (op === "÷") {
    // Guard: ensure divisor b >= 1 and quotient ans >= 1 to prevent division-by-zero
    b = Math.max(1, Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]);
    ans = Math.max(1, Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]);
    a = b * ans;
    d = `${a} ÷ ${b}`;
  } else if (op === "+") {
    a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    b = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    ans = a + b;
    d = `${a} + ${b}`;
  } else if (op === "-") {
    a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    b = Math.floor(Math.random() * a) + 1;
    ans = a - b;
    d = `${a} - ${b}`;
  }

  // Generate 4 choices including the correct answer
  const spread = Math.max(5, Math.ceil(Math.abs(ans) * 0.2));
  const ch = new Set([ans]);
  let guard = 0;
  while (ch.size < 4 && guard++ < 50) {
    const w = ans + Math.floor(Math.random() * spread * 2 + 1) - spread;
    if (w >= 0 && w !== ans) ch.add(w);
  }
  let fb = 1;
  while (ch.size < 4) {
    ch.add(Math.max(0, ans + fb));
    fb++;
  }

  // Shuffle choices
  const arr = [...ch];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return { display: d, answer: ans, choices: arr, op };
}
