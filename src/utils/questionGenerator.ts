/**
 * Generate a math question based on move configuration.
 */
import { chance, pickOne, random, randomInt, shuffleInPlace } from './prng.ts';

type TemplateParams = Record<string, string | number>;

type Translator = (key: string, fallback: string, params?: TemplateParams) => string;

export type QuestionGeneratorOptions = {
  t?: Translator;
  allowedOps?: string[];
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
  distractorCandidates?: number[];
  choiceLabels?: string[];
  answerLabel?: string;
};

export type GeneratedQuestion = QuestionDraft & {
  choices: number[];
};

type Fraction = {
  n: number;
  d: number;
};

// Helper: random int in [lo, hi]
function rr(lo: number, hi: number): number {
  return randomInt(lo, hi);
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

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = x % y;
    x = y;
    y = temp;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

function simplifyFraction(numerator: number, denominator: number): Fraction {
  const safeDen = denominator === 0 ? 1 : denominator;
  if (numerator === 0) return { n: 0, d: 1 };
  const sign = safeDen < 0 ? -1 : 1;
  const g = gcd(numerator, safeDen);
  return { n: (numerator / g) * sign, d: Math.abs(safeDen / g) };
}

function fractionText(frac: Fraction): string {
  if (frac.d === 1) return String(frac.n);
  return `${frac.n}/${frac.d}`;
}

function randomFractionLabel(range: [number, number]): string {
  const dMin = Math.max(2, Math.min(range[0], range[1]));
  const dMax = Math.max(dMin, Math.min(12, Math.max(range[0], range[1]) + 2));
  const d = rr(dMin, dMax);
  const n = rr(1, Math.max(1, d - 1));
  return fractionText(simplifyFraction(n, d));
}

function buildFractionChoiceLabels(
  correctLabel: string,
  candidateLabels: string[],
  range: [number, number],
  targetCount = 4,
): string[] {
  const labels: string[] = [];
  const pushUnique = (value: string): void => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    if (!labels.includes(normalized)) labels.push(normalized);
  };
  pushUnique(correctLabel);
  for (const label of candidateLabels) pushUnique(label);
  let randomGuard = 0;
  while (labels.length < targetCount && randomGuard < 64) {
    pushUnique(randomFractionLabel(range));
    randomGuard += 1;
  }
  if (labels.length < targetCount) {
    // Deterministic fallback to avoid theoretical infinite loops on very narrow ranges.
    let fallbackDen = Math.max(2, Math.min(range[0], range[1]));
    let fallbackNum = 1;
    let fallbackGuard = 0;
    while (labels.length < targetCount && fallbackGuard < 256) {
      pushUnique(fractionText(simplifyFraction(fallbackNum, fallbackDen)));
      fallbackNum += 1;
      if (fallbackNum >= fallbackDen) {
        fallbackDen += 1;
        fallbackNum = 1;
      }
      fallbackGuard += 1;
    }
  }
  if (labels.length < targetCount) {
    let numericFallback = 1;
    while (labels.length < targetCount && numericFallback < 32) {
      pushUnique(`${numericFallback}/${numericFallback + 1}`);
      numericFallback += 1;
    }
  }
  return labels.slice(0, targetCount);
}

function makeLabeledChoices(args: {
  display: string;
  op: string;
  steps: string[];
  answerLabel: string;
  choiceLabels: string[];
}): GeneratedQuestion {
  const labels = [...args.choiceLabels];
  if (!labels.includes(args.answerLabel)) labels.unshift(args.answerLabel);
  shuffleInPlace(labels);
  const answer = Math.max(0, labels.indexOf(args.answerLabel));
  return {
    display: args.display,
    answer,
    op: args.op,
    steps: args.steps || [],
    choices: Array.from({ length: labels.length }, (_unused, idx) => idx),
    choiceLabels: labels,
    answerLabel: args.answerLabel,
  };
}

function genFractionCompare(range: [number, number], tr: Translator): GeneratedQuestion {
  const dMin = Math.max(2, Math.min(range[0], range[1]));
  const dMax = Math.max(dMin, Math.min(12, Math.max(range[0], range[1]) + 2));
  let a = rr(1, dMax - 1);
  let b = rr(dMin, dMax);
  let c = rr(1, dMax - 1);
  let d = rr(dMin, dMax);

  // Keep some equality cases so children practice "=" as well.
  if (chance(0.22)) {
    const baseNum = rr(1, Math.max(1, dMax - 1));
    const baseDen = rr(dMin, dMax);
    const k1 = rr(1, 3);
    const k2 = rr(1, 3);
    a = baseNum * k1;
    b = baseDen * k1;
    c = baseNum * k2;
    d = baseDen * k2;
  }

  const leftCross = a * d;
  const rightCross = c * b;
  const answerLabel = leftCross > rightCross ? '>' : leftCross < rightCross ? '<' : '=';
  const relation = leftCross > rightCross ? '>' : leftCross < rightCross ? '<' : '=';
  const steps = [
    `${a}/${b} ? ${c}/${d}`,
    tr(
      "question.step.fracCompareCross",
      "Cross-multiply: {a}×{d} = {left}, {c}×{b} = {right}",
      { a, d, left: leftCross, c, b, right: rightCross },
    ),
    tr(
      "question.step.fracCompareResult",
      "{left} {relation} {right}, so {a}/{b} {relation} {c}/{d}",
      { left: leftCross, relation, right: rightCross, a, b, c, d },
    ),
  ];

  return makeLabeledChoices({
    display: `${a}/${b} ? ${c}/${d}`,
    op: 'frac_cmp',
    steps,
    answerLabel,
    choiceLabels: ['>', '<', '='],
  });
}

function genFractionSameDen(range: [number, number], tr: Translator, depth = 0): GeneratedQuestion {
  if (depth > 20) {
    return genFractionCompare(range, tr);
  }
  const dMin = Math.max(2, Math.min(range[0], range[1]));
  const dMax = Math.max(dMin, Math.min(12, Math.max(range[0], range[1]) + 2));
  const den = rr(dMin, dMax);
  let n1 = rr(1, Math.max(1, den - 1));
  let n2 = rr(1, Math.max(1, den - 1));
  let op: '+' | '-' = chance(0.5) ? '+' : '-';
  if (op === '-') {
    if (n1 === n2) {
      // Denominator=2 only has 1/2; subtraction would always be zero.
      if (den <= 2) op = '+';
      else if (n2 > 1) n2 -= 1;
      else n1 += 1;
    }
    if (op === '-' && n1 < n2) [n1, n2] = [n2, n1];
  }
  const rawNumerator = op === '+' ? n1 + n2 : n1 - n2;
  if (op === '-' && rawNumerator <= 0) {
    return genFractionSameDen(range, tr, depth + 1);
  }
  const raw = { n: rawNumerator, d: den };
  const simplified = simplifyFraction(raw.n, raw.d);
  const answerLabel = fractionText(simplified);
  const rawLabel = fractionText(raw);
  const oppositeNumerator = op === '+' ? Math.max(0, n1 - n2) : n1 + n2;
  const candidates = [
    rawLabel,
    `${oppositeNumerator}/${den}`,
    `${Math.max(1, raw.n)}/${Math.max(2, den + 1)}`,
    `${Math.max(1, raw.n + 1)}/${den}`,
  ];
  const choiceLabels = buildFractionChoiceLabels(answerLabel, candidates, range, 4);
  const steps = [
    tr(
      "question.step.fracSameNumerator",
      "Same denominator: {n1} {op} {n2} = {result}",
      { n1, op, n2, result: raw.n },
    ),
    tr(
      "question.step.fracSameCompose",
      "{n1}/{den} {op} {n2}/{den} = {result}/{den}",
      { n1, den, op, n2, result: raw.n },
    ),
    rawLabel === answerLabel
      ? tr("question.step.fracAnswer", "Answer: {answer}", { answer: answerLabel })
      : tr("question.step.fracSimplify", "Simplify: {raw} = {answer}", { raw: rawLabel, answer: answerLabel }),
  ];

  return makeLabeledChoices({
    display: `${n1}/${den} ${op} ${n2}/${den}`,
    op: 'frac_same',
    steps,
    answerLabel,
    choiceLabels,
  });
}

function genFractionDiffDen(range: [number, number], tr: Translator, depth = 0): GeneratedQuestion {
  if (depth > 20) return genFractionSameDen(range, tr);
  const dMin = Math.max(2, Math.min(range[0], range[1]));
  const dMax = Math.max(dMin + 1, Math.min(12, Math.max(range[0], range[1]) + 3));
  const d1 = rr(dMin, dMax);
  let d2 = rr(dMin, dMax);
  if (d1 === d2) d2 = Math.min(dMax, d2 + 1);
  const n1 = rr(1, Math.max(1, d1 - 1));
  const n2 = rr(1, Math.max(1, d2 - 1));
  const op = chance(0.5) ? '+' : '-';
  const commonDen = lcm(d1, d2);
  const scaledN1 = n1 * (commonDen / d1);
  const scaledN2 = n2 * (commonDen / d2);
  const rawNumerator = op === '+' ? scaledN1 + scaledN2 : scaledN1 - scaledN2;
  if (rawNumerator < 0) return genFractionDiffDen(range, tr, depth + 1);
  const raw = { n: rawNumerator, d: commonDen };
  const simplified = simplifyFraction(raw.n, raw.d);
  const answerLabel = fractionText(simplified);
  const rawLabel = fractionText(raw);
  const wrongNoCommon = simplifyFraction(op === '+' ? n1 + n2 : Math.max(0, n1 - n2), commonDen);
  const wrongProductDen = simplifyFraction(op === '+' ? n1 + n2 : Math.max(0, n1 - n2), d1 * d2);
  const candidates = [
    rawLabel,
    fractionText(wrongNoCommon),
    fractionText(wrongProductDen),
    `${Math.max(1, simplified.n + 1)}/${simplified.d}`,
  ];
  const choiceLabels = buildFractionChoiceLabels(answerLabel, candidates, range, 4);
  const steps = [
    tr(
      "question.step.fracCommonDen",
      "Convert to denominator {commonDen}: {n1}/{d1} = {scaledN1}/{commonDen}, {n2}/{d2} = {scaledN2}/{commonDen}",
      { commonDen, n1, d1, scaledN1, n2, d2, scaledN2 },
    ),
    tr(
      "question.step.fracDiffCompose",
      "{scaledN1}/{commonDen} {op} {scaledN2}/{commonDen} = {raw}/{commonDen}",
      { scaledN1, commonDen, op, scaledN2, raw: raw.n },
    ),
    rawLabel === answerLabel
      ? tr("question.step.fracAnswer", "Answer: {answer}", { answer: answerLabel })
      : tr("question.step.fracSimplify", "Simplify: {raw} = {answer}", { raw: rawLabel, answer: answerLabel }),
  ];

  return makeLabeledChoices({
    display: `${n1}/${d1} ${op} ${n2}/${d2}`,
    op: 'frac_diff',
    steps,
    answerLabel,
    choiceLabels,
  });
}

function genFractionMulDiv(range: [number, number], tr: Translator): GeneratedQuestion {
  const dMin = Math.max(2, Math.min(range[0], range[1]));
  const dMax = Math.max(dMin + 1, Math.min(12, Math.max(range[0], range[1]) + 3));
  const n1 = rr(1, dMax - 1);
  const d1 = rr(dMin, dMax);
  const n2 = rr(1, dMax - 1);
  const d2 = rr(dMin, dMax);
  const op = chance(0.5) ? '×' : '÷';

  const raw = op === '×'
    ? simplifyFraction(n1 * n2, d1 * d2)
    : simplifyFraction(n1 * d2, d1 * n2);
  const answerLabel = fractionText(raw);

  const wrongMultiply = simplifyFraction(n1 * n2, d1 * d2);
  const wrongCross = simplifyFraction(n1 * d2, d1 * n2);
  const swapped = simplifyFraction(raw.d, raw.n || 1);
  const candidates = [
    fractionText(op === '×' ? wrongCross : wrongMultiply),
    fractionText(swapped),
    `${Math.max(1, raw.n + 1)}/${raw.d}`,
    `${raw.n}/${Math.max(1, raw.d + 1)}`,
  ];
  const choiceLabels = buildFractionChoiceLabels(answerLabel, candidates, range, 4);

  const steps = op === '×'
    ? [
      tr(
        "question.step.fracMulRule",
        "Multiply numerators and denominators: ({n1}×{n2})/({d1}×{d2})",
        { n1, n2, d1, d2 },
      ),
      tr(
        "question.step.fracMulRaw",
        "Get {n}/{d}",
        { n: n1 * n2, d: d1 * d2 },
      ),
      tr("question.step.fracSimplifiedFinal", "After simplify: {answer}", { answer: answerLabel }),
    ]
    : [
      tr(
        "question.step.fracDivInvert",
        "Divide by a fraction means multiply by reciprocal: {n1}/{d1} ÷ {n2}/{d2} = {n1}/{d1} × {d2}/{n2}",
        { n1, d1, n2, d2 },
      ),
      tr(
        "question.step.fracDivRule",
        "Multiply numerators and denominators: ({n1}×{d2})/({d1}×{n2})",
        { n1, d2, d1, n2 },
      ),
      tr("question.step.fracSimplifiedFinal", "After simplify: {answer}", { answer: answerLabel }),
    ];

  return makeLabeledChoices({
    display: `${n1}/${d1} ${op} ${n2}/${d2}`,
    op: 'frac_muldiv',
    steps,
    answerLabel,
    choiceLabels,
  });
}

function buildMultiplicationDistractors(a: number, b: number, answer: number): number[] {
  const out: number[] = [];
  const pushProduct = (left: number, right: number): void => {
    const safeLeft = Math.max(1, Math.round(left));
    const safeRight = Math.max(1, Math.round(right));
    const value = safeLeft * safeRight;
    if (!Number.isFinite(value) || value === answer) return;
    if (!out.includes(value)) out.push(value);
  };

  // Prioritize neighboring multiplication-table values.
  pushProduct(a - 1, b);
  pushProduct(a - 1, b + 1);
  pushProduct(a, b + 1);
  pushProduct(a + 1, b);
  pushProduct(a, b - 1);
  pushProduct(a + 1, b - 1);
  pushProduct(a - 1, b - 1);
  pushProduct(a + 1, b + 1);

  // Extra near-product distractors for larger ranges.
  pushProduct(a - 2, b);
  pushProduct(a, b - 2);
  const nearByOffsets = [a, b, a + b];
  for (const offset of nearByOffsets) {
    const lower = answer - Math.max(1, Math.round(offset));
    const upper = answer + Math.max(1, Math.round(offset));
    if (lower > 0 && !out.includes(lower) && lower !== answer) out.push(lower);
    if (upper > 0 && !out.includes(upper) && upper !== answer) out.push(upper);
  }

  return out;
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
  const op1 = chance(0.5) ? "+" : "-";
  const op2 = chance(0.5) ? "+" : "-";
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
  const op2 = chance(0.5) ? "+" : "-";
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
  const pattern = random();
  let d = "";
  let ans = 0;
  let steps: string[] = [];

  if (pattern < 0.4) {
    // a ± b × c
    const a = rr(range[0] + 3, range[1] * 2);
    const b = rr(range[0], range[1]);
    const c = rr(range[0], range[1]);
    const op = chance(0.5) ? "+" : "-";
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
    const op = chance(0.6) ? "+" : "-";
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
    const op1 = chance(0.5) ? "+" : "-";
    const op2 = chance(0.5) ? "+" : "-";
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
  const op = chance(0.5) ? "+" : "-";
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
  const op = chance(0.5) ? "×" : "÷";
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
  const pattern = random();
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
  const pattern = random();
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

  const baseOps = Array.isArray(move.ops) && move.ops.length > 0 ? move.ops : ["+"];
  const allowedOps = Array.isArray(options.allowedOps)
    ? options.allowedOps.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  const intersectedOps = allowedOps.length > 0
    ? baseOps.filter((item) => allowedOps.includes(item))
    : [];
  const ops = intersectedOps.length > 0
    ? intersectedOps
    : (allowedOps.length > 0 ? allowedOps : baseOps);
  const op = pickOne(ops) ?? "+";

  // ── Mixed operations (electric starter) ──
  if (op === "mixed2") return makeChoices(genMixed2(range));
  if (op === "mixed3") return makeChoices(genMixed3(range, tr));
  if (op === "mixed4") return makeChoices(genMixed4(range, tr));

  // ── Solve-for-unknown operations (lion starter) ──
  if (op === "unknown1") return makeChoices(genUnknown1(range));
  if (op === "unknown2") return makeChoices(genUnknown2(range));
  if (op === "unknown3") return makeChoices(genUnknown3(range));
  if (op === "unknown4") return makeChoices(genUnknown4(range));

  // ── Fraction operations (steel starter) ──
  if (op === "frac_cmp") return genFractionCompare(range, tr);
  if (op === "frac_same") return genFractionSameDen(range, tr);
  if (op === "frac_diff") return genFractionDiffDen(range, tr);
  if (op === "frac_muldiv") return genFractionMulDiv(range, tr);

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
        distractorCandidates: buildMultiplicationDistractors(a, b, ans),
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
function makeChoices({
  display,
  answer,
  op,
  steps,
  distractorCandidates,
  choiceLabels,
  answerLabel,
}: QuestionDraft): GeneratedQuestion {
  const spread = Math.max(5, Math.ceil(Math.abs(answer) * 0.2));
  const ch = new Set<number>([answer]);

  if (Array.isArray(distractorCandidates) && distractorCandidates.length > 0) {
    for (const value of distractorCandidates) {
      if (!Number.isFinite(value)) continue;
      const normalized = Math.max(0, Math.round(value));
      if (normalized === answer) continue;
      ch.add(normalized);
      if (ch.size >= 4) break;
    }
  }

  let guard = 0;
  while (ch.size < 4 && guard++ < 50) {
    const w = answer + randomInt(-spread, spread);
    if (w >= 0 && w !== answer) ch.add(w);
  }
  let fb = 1;
  while (ch.size < 4) {
    ch.add(Math.max(0, answer + fb));
    fb += 1;
  }
  const arr = Array.from(ch);
  shuffleInPlace(arr);
  return {
    display,
    answer,
    choices: arr,
    op,
    steps: steps || [],
    choiceLabels,
    answerLabel,
  };
}
