/**
 * Generate a math question based on move configuration.
 */

type TemplateParams = Record<string, string | number>;

type Translator = (key: string, fallback: string, params?: TemplateParams) => string;

export type QuestionGeneratorOptions = {
  t?: Translator;
};

export type QuestionGeneratorMove = {
  range: [number, number];
  ops: string[];
};

type QuestionDraft = {
  display: string;
  answer: number;
  op: string;
  steps: string[];
};

export type GeneratedQuestion = QuestionDraft & {
  choices: number[];
};

// Helper: random int in [lo, hi]
function rr(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function formatTemplate(template: string, params?: TemplateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => String(params[key] ?? ""));
}

function createTranslator(options: QuestionGeneratorOptions = {}): Translator {
  const t = typeof options?.t === "function" ? options.t : null;
  return (key, fallback, params) => {
    if (t) return t(key, fallback, params);
    return formatTemplate(fallback, params);
  };
}

function opWord(op: string, tr: Translator): string {
  return op === "+" ? tr("question.word.add", "addition") : tr("question.word.sub", "subtraction");
}

// ── Mixed-operation question generators (for electric starter) ──

/**
 * mixed2: a ± b ± c  (加減混合，三個數)
 * e.g. 8 + 5 - 3 = 10
 */
function genMixed2(range: [number, number], depth = 0): QuestionDraft {
  // Fallback: if too many retries (ans < 0), force all-addition
  if (depth > 15) {
    const a = rr(range[0], range[1]);
    const b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]);
    const ans = a + b + c;
    return {
      display: `${a} + ${b} + ${c}`,
      answer: ans,
      op: "mixed2",
      steps: [`${a} + ${b} = ${a + b}`, `${a + b} + ${c} = ${ans}`],
    };
  }
  const a = rr(range[0], range[1]);
  const b = rr(range[0], range[1]);
  const c = rr(range[0], range[1]);
  const op1 = Math.random() < 0.5 ? "+" : "-";
  const op2 = Math.random() < 0.5 ? "+" : "-";
  const step1 = op1 === "+" ? a + b : a - b;
  const ans = op2 === "+" ? step1 + c : step1 - c;
  if (ans < 0) return genMixed2(range, depth + 1);
  const steps = [
    `${a} ${op1} ${b} = ${step1}`,
    `${step1} ${op2} ${c} = ${ans}`,
  ];
  return { display: `${a} ${op1} ${b} ${op2} ${c}`, answer: ans, op: "mixed2", steps };
}

/**
 * mixed3: a × b ± c  (乘加/乘減混合，考驗運算優先順序)
 */
function genMixed3(range: [number, number], tr: Translator, depth = 0): QuestionDraft {
  // Fallback: force addition so ans is always positive
  if (depth > 15) {
    const a = rr(range[0], range[1]);
    const b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]);
    const product = a * b;
    const ans = product + c;
    return {
      display: `${a} × ${b} + ${c}`,
      answer: ans,
      op: "mixed3",
      steps: [
        tr("question.step.mulFirst", "Multiply first: {a} × {b} = {result}", { a, b, result: product }),
        tr("question.step.addSubThen", "Then {opWord}: {left} {op} {right} = {result}", {
          opWord: opWord("+", tr),
          left: product,
          op: "+",
          right: c,
          result: ans,
        }),
      ],
    };
  }
  const a = rr(range[0], range[1]);
  const b = rr(range[0], range[1]);
  const c = rr(range[0], range[1]);
  const op2 = Math.random() < 0.5 ? "+" : "-";
  const product = a * b;
  const ans = op2 === "+" ? product + c : product - c;
  if (ans < 0) return genMixed3(range, tr, depth + 1);
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
function genMixed4(range: [number, number], tr: Translator, depth = 0): QuestionDraft {
  // Fallback: force all-addition pattern so ans is always positive
  if (depth > 15) {
    const a = rr(range[0], range[1]);
    const b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]);
    const dd = rr(range[0], range[1]);
    const p1 = a * b;
    const ans = p1 + c + dd;
    return {
      display: `${a} × ${b} + ${c} + ${dd}`,
      answer: ans,
      op: "mixed4",
      steps: [
        tr("question.step.mulFirst", "Multiply first: {a} × {b} = {result}", { a, b, result: p1 }),
        tr("question.step.addSubThen", "Then {opWord}: {left} {op} {right} = {result}", {
          opWord: opWord("+", tr),
          left: `${p1} + ${c}`,
          op: "+",
          right: dd,
          result: ans,
        }),
      ],
    };
  }
  const pattern = Math.random();
  let d = "";
  let ans = 0;
  let steps: string[] = [];

  if (pattern < 0.4) {
    // a ± b × c
    const a = rr(range[0] + 3, range[1] * 2);
    const b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]);
    const op = Math.random() < 0.5 ? "+" : "-";
    const prod = b * c;
    ans = op === "+" ? a + prod : a - prod;
    if (ans < 0) return genMixed4(range, tr, depth + 1);
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
    const p1 = a * b;
    const p2 = c * dd;
    ans = op === "+" ? p1 + p2 : p1 - p2;
    if (ans < 0) return genMixed4(range, tr, depth + 1);
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
    if (ans < 0) return genMixed4(range, tr, depth + 1);
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
function genUnknown1(range: [number, number], depth = 0): QuestionDraft {
  if (depth > 20) {
    const a = rr(range[0], range[1]);
    const b = rr(range[0], range[1]);
    return {
      display: `? + ${b} = ${a + b}`,
      answer: a,
      op: "unknown1",
      steps: [`? + ${b} = ${a + b}`, `? = ${a + b} - ${b}`, `? = ${a}`],
    };
  }
  const op = Math.random() < 0.5 ? "+" : "-";
  if (op === "+") {
    const ans = rr(range[0], range[1]);
    const b = rr(range[0], range[1]);
    const c = ans + b;
    return {
      display: `? + ${b} = ${c}`,
      answer: ans,
      op: "unknown1",
      steps: [`? + ${b} = ${c}`, `? = ${c} - ${b}`, `? = ${ans}`],
    };
  }

  const b = rr(range[0], range[1]);
  const ans = rr(range[0], range[1]);
  const c = ans - b;
  if (c < 0) return genUnknown1(range, depth + 1);
  return {
    display: `? - ${b} = ${c}`,
    answer: ans,
    op: "unknown1",
    steps: [`? - ${b} = ${c}`, `? = ${c} + ${b}`, `? = ${ans}`],
  };
}

/**
 * unknown2: ? × b = c  or  ? ÷ b = c  (乘除求未知)
 * e.g. ? × 4 = 28 → ans = 7
 */
function genUnknown2(range: [number, number]): QuestionDraft {
  const op = Math.random() < 0.5 ? "×" : "÷";
  if (op === "×") {
    const ans = rr(range[0], range[1]);
    const b = Math.max(2, rr(range[0], range[1]));
    const c = ans * b;
    return {
      display: `? × ${b} = ${c}`,
      answer: ans,
      op: "unknown2",
      steps: [`? × ${b} = ${c}`, `? = ${c} ÷ ${b}`, `? = ${ans}`],
    };
  }

  const b = Math.max(2, rr(range[0], range[1]));
  const c = rr(range[0], range[1]);
  const ans = b * c;
  return {
    display: `? ÷ ${b} = ${c}`,
    answer: ans,
    op: "unknown2",
    steps: [`? ÷ ${b} = ${c}`, `? = ${c} × ${b}`, `? = ${ans}`],
  };
}

/**
 * unknown3: large-number unknowns — ? + b = c, ? × b = c with bigger numbers
 * e.g. ? + 37 = 85 → ans = 48
 */
function genUnknown3(range: [number, number], depth = 0): QuestionDraft {
  if (depth > 20) {
    const a = rr(range[0], range[1]);
    const b = rr(range[0], range[1]);
    return {
      display: `? + ${b} = ${a + b}`,
      answer: a,
      op: "unknown3",
      steps: [`? + ${b} = ${a + b}`, `? = ${a + b} - ${b}`, `? = ${a}`],
    };
  }
  const pattern = Math.random();
  if (pattern < 0.35) {
    // ? + b = c
    const ans = rr(range[0], range[1]);
    const b = rr(range[0], range[1]);
    const c = ans + b;
    return {
      display: `? + ${b} = ${c}`,
      answer: ans,
      op: "unknown3",
      steps: [`? + ${b} = ${c}`, `? = ${c} - ${b}`, `? = ${ans}`],
    };
  }
  if (pattern < 0.65) {
    // ? - b = c
    const b = rr(range[0], range[1]);
    const ans = rr(Math.max(range[0], b + 1), range[1] + b);
    const c = ans - b;
    if (c < 0) return genUnknown3(range, depth + 1);
    return {
      display: `? - ${b} = ${c}`,
      answer: ans,
      op: "unknown3",
      steps: [`? - ${b} = ${c}`, `? = ${c} + ${b}`, `? = ${ans}`],
    };
  }

  // ? × b = c (with capped b to keep answer reasonable)
  const b = Math.max(2, rr(2, Math.min(range[1], 9)));
  const ans = rr(range[0], Math.min(range[1], 15));
  const c = ans * b;
  return {
    display: `? × ${b} = ${c}`,
    answer: ans,
    op: "unknown3",
    steps: [`? × ${b} = ${c}`, `? = ${c} ÷ ${b}`, `? = ${ans}`],
  };
}

/**
 * unknown4: compound unknowns — (? + a) × b = c, ? × a + b = c
 * e.g. (? + 3) × 4 = 28 → ? = 4
 */
function genUnknown4(range: [number, number], depth = 0): QuestionDraft {
  if (depth > 20) {
    const a = rr(2, 5);
    const b = rr(2, 5);
    const ans = rr(range[0], range[1]);
    const c = (ans + a) * b;
    return {
      display: `(? + ${a}) × ${b} = ${c}`,
      answer: ans,
      op: "unknown4",
      steps: [`(? + ${a}) × ${b} = ${c}`, `? + ${a} = ${c} ÷ ${b} = ${c / b}`, `? = ${c / b} - ${a} = ${ans}`],
    };
  }
  const pattern = Math.random();
  if (pattern < 0.5) {
    // (? + a) × b = c
    const a = rr(1, Math.min(range[1], 6));
    const b = Math.max(2, rr(2, Math.min(range[1], 6)));
    const ans = rr(range[0], range[1]);
    const inner = ans + a;
    const c = inner * b;
    return {
      display: `(? + ${a}) × ${b} = ${c}`,
      answer: ans,
      op: "unknown4",
      steps: [`(? + ${a}) × ${b} = ${c}`, `? + ${a} = ${c} ÷ ${b} = ${inner}`, `? = ${inner} - ${a} = ${ans}`],
    };
  }

  // ? × a + b = c
  const a = Math.max(2, rr(2, Math.min(range[1], 6)));
  const b = rr(1, Math.min(range[1], 10));
  const ans = rr(range[0], range[1]);
  const c = ans * a + b;
  return {
    display: `? × ${a} + ${b} = ${c}`,
    answer: ans,
    op: "unknown4",
    steps: [`? × ${a} + ${b} = ${c}`, `? × ${a} = ${c} - ${b} = ${c - b}`, `? = ${c - b} ÷ ${a} = ${ans}`],
  };
}

export function genQ(
  move: QuestionGeneratorMove,
  diffMod = 1,
  options: QuestionGeneratorOptions = {},
): GeneratedQuestion {
  const tr = createTranslator(options);

  // Scale range by difficulty modifier
  const baseRange = move.range;
  const minRange = Math.max(1, Math.round(baseRange[0] * diffMod));
  const maxRange = Math.max(minRange, Math.max(2, Math.round(baseRange[1] * diffMod)));
  const range: [number, number] = [minRange, maxRange];

  const ops = Array.isArray(move.ops) && move.ops.length > 0 ? move.ops : ["+"];
  const op = ops[Math.floor(Math.random() * ops.length)] ?? "+";

  // ── Mixed operations (electric starter) ──
  if (op === "mixed2") return makeChoices(genMixed2(range));
  if (op === "mixed3") return makeChoices(genMixed3(range, tr));
  if (op === "mixed4") return makeChoices(genMixed4(range, tr));

  // ── Solve-for-unknown operations (lion starter) ──
  if (op === "unknown1") return makeChoices(genUnknown1(range));
  if (op === "unknown2") return makeChoices(genUnknown2(range));
  if (op === "unknown3") return makeChoices(genUnknown3(range));
  if (op === "unknown4") return makeChoices(genUnknown4(range));

  // ── Single operations (original starters) ──
  let draft: QuestionDraft;
  switch (op) {
    case "×": {
      const a = rr(range[0], range[1]);
      const b = rr(range[0], range[1]);
      const ans = a * b;
      draft = {
        display: `${a} × ${b}`,
        answer: ans,
        op,
        steps: [`${a} × ${b} = ${ans}`],
      };
      break;
    }
    case "÷": {
      const b = Math.max(1, rr(range[0], range[1]));
      const ans = Math.max(1, rr(range[0], range[1]));
      const a = b * ans;
      draft = {
        display: `${a} ÷ ${b}`,
        answer: ans,
        op,
        steps: [
          tr("question.step.think", "Think: {expr}", { expr: `${b} × ? = ${a}` }),
          `${b} × ${ans} = ${a}`,
          tr("question.step.therefore", "Therefore {expr}", { expr: `${a} ÷ ${b} = ${ans}` }),
        ],
      };
      break;
    }
    case "-": {
      const x = rr(range[0], range[1]);
      let y = rr(range[0], range[1]);
      if (x === y) y = Math.min(range[1], y + 1);
      const a = Math.max(x, y);
      const b = Math.min(x, y);
      const ans = a - b;
      draft = {
        display: `${a} - ${b}`,
        answer: ans,
        op,
        steps: [`${a} - ${b} = ${ans}`],
      };
      break;
    }
    case "+":
    default: {
      const a = rr(range[0], range[1]);
      const b = rr(range[0], range[1]);
      const ans = a + b;
      draft = {
        display: `${a} + ${b}`,
        answer: ans,
        op: op === "+" ? op : "+",
        steps: [`${a} + ${b} = ${ans}`],
      };
      break;
    }
  }

  return makeChoices(draft);
}

/**
 * Wrap a {display, answer, op, steps} object with 4 shuffled answer choices.
 */
function makeChoices({ display, answer, op, steps }: QuestionDraft): GeneratedQuestion {
  const spread = Math.max(5, Math.ceil(Math.abs(answer) * 0.2));
  const ch = new Set<number>([answer]);
  let guard = 0;
  while (ch.size < 4 && guard++ < 50) {
    const w = answer + Math.floor(Math.random() * spread * 2 + 1) - spread;
    if (w >= 0 && w !== answer) ch.add(w);
  }
  let fb = 1;
  while (ch.size < 4) {
    ch.add(Math.max(0, answer + fb));
    fb += 1;
  }
  const arr = Array.from(ch);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { display, answer, choices: arr, op, steps: steps || [] };
}
