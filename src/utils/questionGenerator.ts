/**
 * Generate a math question based on move configuration.
 */
import { chance, pickOne, random, randomInt, shuffleInPlace } from './prng.ts';

type TemplateParams = Record<string, string | number>;

type Translator = (key: string, fallback: string, params?: TemplateParams) => string;

export type QuestionGeneratorOptions = {
  t?: Translator;
  allowedOps?: string[];
  /** Grade alignment: largest operand per operation after difficulty scaling. */
  maxOperandByOp?: Readonly<Record<string, number>>;
  /** Before the ÷ sign is taught (grade 2), missing-factor questions use × only. */
  noDivisionSign?: boolean;
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
  /** Skip the same-ones-digit distractor guarantee in makeChoices. */
  skipOnesDigitGuard?: boolean;
  choiceLabels?: string[];
  answerLabel?: string;
};

export type GeneratedQuestion = Omit<QuestionDraft, 'skipOnesDigitGuard'> & {
  choices: number[];
};

type QuestionGeneratorFn = (
  range: [number, number],
  tr: Translator,
  diffMod: number,
) => GeneratedQuestion;

const QUESTION_REGISTRY = new Map<string, QuestionGeneratorFn>();

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

const FRACTION_LABEL_RE = /^\s*(-?\d+)\s*\/\s*(-?\d+)\s*$/;
const DECIMAL_LABEL_RE = /^\s*-?\d+(?:\.\d+)?\s*$/;

function normalizeFractionLabel(label: string): string {
  const text = String(label || '').trim();
  if (!text) return text;
  const match = FRACTION_LABEL_RE.exec(text);
  if (!match) return text;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return text;
  return fractionText(simplifyFraction(numerator, denominator));
}

function formatDecimal(value: number, digits: number, keepTrailingZero = false): string {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = safe.toFixed(Math.max(0, digits));
  if (keepTrailingZero) return fixed;
  return fixed.replace(/\.?0+$/, '');
}

function formatScaledInteger(value: number, digits: number, keepTrailingZero = false): string {
  const safeDigits = Math.max(0, Math.trunc(digits));
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(value));
  if (safeDigits === 0) return `${sign}${abs}`;
  const raw = String(abs).padStart(safeDigits + 1, '0');
  const whole = raw.slice(0, -safeDigits) || '0';
  const fracRaw = raw.slice(-safeDigits);
  const frac = keepTrailingZero ? fracRaw : fracRaw.replace(/0+$/, '');
  if (!frac) return `${sign}${whole}`;
  return `${sign}${whole}.${frac}`;
}

function exactDecimalFromFraction(
  numerator: number,
  denominator: number,
): { label: string; digits: number } | null {
  const simplified = simplifyFraction(numerator, denominator);
  let reducedDen = Math.abs(simplified.d);
  if (reducedDen === 0) return null;
  let count2 = 0;
  let count5 = 0;
  while (reducedDen % 2 === 0) {
    reducedDen /= 2;
    count2 += 1;
  }
  while (reducedDen % 5 === 0) {
    reducedDen /= 5;
    count5 += 1;
  }
  if (reducedDen !== 1) return null;

  const digits = Math.max(count2, count5);
  const scale = Math.pow(10, digits);
  const scaled = (simplified.n * scale) / simplified.d;
  if (!Number.isFinite(scaled)) return null;
  const scaledInt = Math.round(scaled);
  return {
    label: formatScaledInteger(scaledInt, digits, false),
    digits,
  };
}

function normalizeDecimalLabel(label: string, digits = 2): string {
  const text = String(label || '').trim();
  if (!text) return text;
  if (!DECIMAL_LABEL_RE.test(text)) return text;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return text;
  return formatDecimal(parsed, digits, false);
}

function randomDecimalLabel(range: [number, number], digits = 1): string {
  const scale = Math.pow(10, Math.max(0, Math.trunc(digits)));
  const lo = Math.max(1, Math.min(range[0], range[1]));
  const hi = Math.max(lo + 1, Math.max(range[0], range[1]));
  const n = rr(lo * scale, hi * scale);
  return formatDecimal(n / scale, digits, digits === 1);
}

function randomDecimalValue(range: [number, number], digits = 1): number {
  const scale = Math.pow(10, Math.max(0, Math.trunc(digits)));
  const lo = Math.max(1, Math.min(range[0], range[1]));
  const hi = Math.max(lo + 1, Math.max(range[0], range[1]));
  const n = rr(lo * scale, hi * scale);
  return n / scale;
}

function buildDecimalChoiceLabels(
  correctLabel: string,
  candidateLabels: string[],
  range: [number, number],
  digits = 1,
  targetCount = 4,
): string[] {
  const labels: string[] = [];
  const pushUnique = (value: string): void => {
    const normalized = normalizeDecimalLabel(String(value || '').trim(), digits);
    if (!normalized) return;
    if (!labels.includes(normalized)) labels.push(normalized);
  };
  pushUnique(correctLabel);
  for (const label of candidateLabels) pushUnique(label);
  let randomGuard = 0;
  while (labels.length < targetCount && randomGuard < 64) {
    pushUnique(randomDecimalLabel(range, digits));
    randomGuard += 1;
  }
  if (labels.length < targetCount) {
    let fallback = 1;
    while (labels.length < targetCount && fallback < 48) {
      pushUnique(formatDecimal(fallback / 10, digits, digits === 1));
      fallback += 1;
    }
  }
  return labels.slice(0, targetCount);
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
    const normalized = normalizeFractionLabel(String(value || "").trim());
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
  normalizeLabel?: (label: string) => string;
}): GeneratedQuestion {
  const normalizeLabel = typeof args.normalizeLabel === 'function'
    ? args.normalizeLabel
    : normalizeFractionLabel;
  const normalizedAnswerLabel = normalizeLabel(args.answerLabel);
  const labels = args.choiceLabels.map((label) => normalizeLabel(label));
  if (!labels.includes(normalizedAnswerLabel)) labels.unshift(normalizedAnswerLabel);
  shuffleInPlace(labels);
  const answer = Math.max(0, labels.indexOf(normalizedAnswerLabel));
  return {
    display: args.display,
    answer,
    op: args.op,
    steps: args.steps || [],
    choices: Array.from({ length: labels.length }, (_unused, idx) => idx),
    choiceLabels: labels,
    answerLabel: normalizedAnswerLabel,
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

function resolveDecimalAddDigits(diffMod: number): 1 | 2 {
  // Keep Ice starter move-1 beginner friendly:
  // start with one decimal place and upgrade to two only after difficulty increases.
  if (diffMod >= 1.15) return 2;
  return 1;
}

function genDecimalAdd(range: [number, number], tr: Translator, diffMod: number): GeneratedQuestion {
  const digits = resolveDecimalAddDigits(diffMod);
  let a = randomDecimalValue(range, digits);
  let b = randomDecimalValue(range, digits);
  const op: '+' | '-' = chance(0.5) ? '+' : '-';
  if (op === '-' && a < b) [a, b] = [b, a];
  const answerRaw = op === '+' ? a + b : a - b;
  const answerLabel = normalizeDecimalLabel(formatDecimal(answerRaw, digits, false), digits);
  const answer = Number(answerLabel);
  const step = 1 / Math.pow(10, digits);
  const candidateLabels = [
    formatDecimal(Math.max(0, answer + step), digits, false),
    formatDecimal(Math.max(0, answer - step), digits, false),
    formatDecimal(Math.max(0, answer + step * 2), digits, false),
    formatDecimal(Math.max(0, answer + (op === '+' ? -b : b)), digits, false),
  ];
  const choiceLabels = buildDecimalChoiceLabels(answerLabel, candidateLabels, range, digits, 4);
  const aLabel = formatDecimal(a, digits, true);
  const bLabel = formatDecimal(b, digits, true);
  const steps = [
    tr("question.step.decAddCompute", "Align decimal places: {a} {op} {b} = {answer}", {
      a: aLabel,
      op,
      b: bLabel,
      answer: answerLabel,
    }),
  ];
  return makeLabeledChoices({
    display: `${aLabel} ${op} ${bLabel}`,
    op: 'dec_add',
    steps,
    answerLabel,
    choiceLabels,
    normalizeLabel: (label: string) => normalizeDecimalLabel(label, digits),
  });
}

function genDecimalFrac(range: [number, number], tr: Translator): GeneratedQuestion {
  const denominatorPool = [2, 4, 5, 8, 10, 20, 25] as const;
  const den = pickOne(denominatorPool) ?? 10;
  const maxNumerator = Math.max(2, Math.min(den * 3, Math.max(range[0], range[1]) * den));
  const n = rr(1, maxNumerator);
  const simplified = simplifyFraction(n, den);

  // decimal -> fraction
  if (chance(0.55)) {
    const exact = exactDecimalFromFraction(n, den);
    if (!exact) return genDecimalFrac(range, tr);
    const decimalLabel = exact.label;
    const answerLabel = fractionText(simplified);
    const candidates = [
      `${n}/${den}`,
      `${Math.max(1, simplified.n + 1)}/${simplified.d}`,
      `${simplified.n}/${Math.max(2, simplified.d + 1)}`,
      `${simplified.d}/${Math.max(1, simplified.n || 1)}`,
    ];
    const choiceLabels = buildFractionChoiceLabels(answerLabel, candidates, range, 4);
    const steps = [
      tr("question.step.decFracToFraction", "{decimal} = {numerator}/{denominator} (simplified)", {
        decimal: decimalLabel,
        numerator: simplified.n,
        denominator: simplified.d,
      }),
    ];
    return makeLabeledChoices({
      display: `${decimalLabel} = ?`,
      op: 'dec_frac',
      steps,
      answerLabel,
      choiceLabels,
    });
  }

  // fraction -> decimal
  const numerator = simplified.n;
  const denominator = simplified.d;
  const exact = exactDecimalFromFraction(numerator, denominator);
  if (!exact) return genDecimalFrac(range, tr);
  const answerLabel = exact.label;
  const decimalDigits = Math.max(1, exact.digits);
  const answer = Number(answerLabel);
  const step = 1 / Math.pow(10, decimalDigits);
  const candidateLabels = [
    formatDecimal(Math.max(0, answer + step), decimalDigits, false),
    formatDecimal(Math.max(0, answer - step), decimalDigits, false),
    formatDecimal(Math.max(0, (numerator + 1) / denominator), decimalDigits, false),
    formatDecimal(Math.max(0, numerator / Math.max(2, denominator + 1)), decimalDigits, false),
  ];
  const choiceLabels = buildDecimalChoiceLabels(answerLabel, candidateLabels, range, decimalDigits, 4);
  const steps = [
    tr("question.step.decFracToDecimal", "{numerator}/{denominator} = {decimal}", {
      numerator,
      denominator,
      decimal: answerLabel,
    }),
  ];
  return makeLabeledChoices({
    display: `${numerator}/${denominator} = ?`,
    op: 'dec_frac',
    steps,
    answerLabel,
    choiceLabels,
    normalizeLabel: (label: string) => normalizeDecimalLabel(label, decimalDigits),
  });
}

function genDecimalMul(range: [number, number], tr: Translator): GeneratedQuestion {
  const a = randomDecimalValue(range, 1);
  const b = randomDecimalValue(range, 1);
  const answerRaw = a * b;
  const answerLabel = normalizeDecimalLabel(formatDecimal(answerRaw, 2, false), 2);
  const answer = Number(answerLabel);
  const candidateLabels = [
    formatDecimal(Math.max(0, answer + 0.1), 2, false),
    formatDecimal(Math.max(0, answer - 0.1), 2, false),
    formatDecimal(Math.max(0, a + b), 2, false),
    formatDecimal(Math.max(0, answer + 1), 2, false),
  ];
  const choiceLabels = buildDecimalChoiceLabels(answerLabel, candidateLabels, range, 2, 4);
  const aLabel = formatDecimal(a, 1, true);
  const bLabel = formatDecimal(b, 1, true);
  const steps = [
    tr("question.step.decMulCompute", "Decimal multiplication: {a} × {b} = {answer}", {
      a: aLabel,
      b: bLabel,
      answer: answerLabel,
    }),
  ];
  return makeLabeledChoices({
    display: `${aLabel} × ${bLabel}`,
    op: 'dec_mul',
    steps,
    answerLabel,
    choiceLabels,
    normalizeLabel: (label: string) => normalizeDecimalLabel(label, 2),
  });
}

function genDecimalDiv(range: [number, number], tr: Translator): GeneratedQuestion {
  const answerDigits = chance(0.3) ? 2 : 1;
  const answerScale = Math.pow(10, answerDigits);
  const lo = Math.max(1, Math.min(range[0], range[1]));
  const hi = Math.max(lo + 1, Math.max(range[0], range[1]));
  const answerInt = rr(lo * answerScale, hi * answerScale);

  const divisorDigits = chance(0.45) ? 1 : 0;
  const divisorScale = Math.pow(10, divisorDigits);
  const divisorBaseMax = Math.max(2, Math.min(9, hi));
  let divisorInt = rr(2 * divisorScale, divisorBaseMax * divisorScale);
  if (divisorDigits === 1) {
    if (divisorInt < 11) divisorInt = 11;
    if (divisorInt % 10 === 0) divisorInt += 1;
  }

  const dividendInt = answerInt * divisorInt;
  const dividendDigits = answerDigits + divisorDigits;
  const answerLabel = formatScaledInteger(answerInt, answerDigits, false);
  const dividendLabel = formatScaledInteger(dividendInt, dividendDigits, false);
  const divisorLabel = formatScaledInteger(divisorInt, divisorDigits, divisorDigits > 0);
  const answer = Number(answerLabel);
  const step = 1 / answerScale;
  const candidateLabels = [
    formatDecimal(Math.max(0, answer + step), answerDigits, false),
    formatDecimal(Math.max(0, answer - step), answerDigits, false),
    formatDecimal(Math.max(0, answer + 1), answerDigits, false),
    formatDecimal(
      Math.max(0, divisorDigits > 0 ? answer / 10 : answer + step * 2),
      answerDigits,
      false,
    ),
  ];
  const choiceLabels = buildDecimalChoiceLabels(answerLabel, candidateLabels, range, answerDigits, 4);
  const steps = [
    tr("question.step.decDivCompute", "Decimal division: {a} ÷ {b} = {answer}", {
      a: dividendLabel,
      b: divisorLabel,
      answer: answerLabel,
    }),
  ];
  return makeLabeledChoices({
    display: `${dividendLabel} ÷ ${divisorLabel}`,
    op: 'dec_div',
    steps,
    answerLabel,
    choiceLabels,
    normalizeLabel: (label: string) => normalizeDecimalLabel(label, answerDigits),
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
function genUnknown2(range: [number, number], multiplyOnly = false, tr?: Translator): QuestionDraft {
  const op = multiplyOnly || chance(0.5) ? "×" : "÷";
  if (op === "×") {
    const ans = rr(range[0], range[1]);
    const b = Math.max(2, rr(range[0], range[1]));
    const c = ans * b;
    // Before the ÷ sign is taught, explain by counting up the times table.
    const steps = multiplyOnly && tr
      ? [tr("question.step.think", "Think: {expr}", { expr: `${b} × ? = ${c}` }), `${b} × ${ans} = ${c}`, `? = ${ans}`]
      : [`? × ${b} = ${c}`, `? = ${c} ÷ ${b}`, `? = ${ans}`];
    return {
      display: `? × ${b} = ${c}`,
      answer: ans,
      op: "unknown2",
      steps,
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

// ── Basic arithmetic generators (extracted from genQ switch) ──
//
// Solution steps double as paid hints, so each strategy keeps the final
// answer in its last step only (make-ten, place value, derived facts).

function addSteps(a: number, b: number, tr: Translator): string[] {
  const ans = a + b;
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  if (big < 10) {
    if (ans <= 10) {
      return [
        tr('question.step.addCountOn', 'Start at {big} and count on {small}.', { big, small }),
        `${big} + ${small} = ${ans}`,
      ];
    }
    const need = 10 - big;
    const rest = small - need;
    return [
      tr('question.step.addSplit', 'Split {small} into {need} and {rest}.', { small, need, rest }),
      tr('question.step.addMakeTen', 'Make ten: {big} + {need} = 10', { big, need }),
      `10 + ${rest} = ${ans}`,
    ];
  }
  if (small < 10) {
    const ones = big % 10;
    const tens = big - ones;
    if (ones === 0) {
      return [
        tr('question.step.addPlaceValue', '{tens} tens and {ones} ones make {result}', { tens: tens / 10, ones: small, result: ans }),
      ];
    }
    if (ones + small === 10) {
      return [
        tr('question.step.addOnes', 'Add the ones: {a} + {b} = {result}', { a: ones, b: small, result: 10 }),
        tr('question.step.combine', 'Put them together: {a} + {b} = {result}', { a: tens, b: 10, result: ans }),
      ];
    }
    if (ones + small > 10) {
      const need = 10 - ones;
      const rest = small - need;
      const nextTen = big + need;
      return [
        tr('question.step.addSplit', 'Split {small} into {need} and {rest}.', { small, need, rest }),
        tr('question.step.addToNextTen', 'Make the next ten: {a} + {need} = {ten}', { a: big, need, ten: nextTen }),
        `${nextTen} + ${rest} = ${ans}`,
      ];
    }
    return [
      tr('question.step.addOnes', 'Add the ones: {a} + {b} = {result}', { a: ones, b: small, result: ones + small }),
      tr('question.step.combine', 'Put them together: {a} + {b} = {result}', { a: tens, b: ones + small, result: ans }),
    ];
  }
  const aOnes = a % 10;
  const bOnes = b % 10;
  const tensSum = (a - aOnes) + (b - bOnes);
  const onesSum = aOnes + bOnes;
  const steps = [
    tr('question.step.addTens', 'Add the tens: {a} + {b} = {result}', { a: a - aOnes, b: b - bOnes, result: tensSum }),
  ];
  if (onesSum === 0) return steps;
  if (aOnes > 0 && bOnes > 0) {
    steps.push(tr('question.step.addOnes', 'Add the ones: {a} + {b} = {result}', { a: aOnes, b: bOnes, result: onesSum }));
  }
  steps.push(tr('question.step.combine', 'Put them together: {a} + {b} = {result}', { a: tensSum, b: onesSum, result: ans }));
  return steps;
}

function subtractOnesSteps(a: number, b: number, tr: Translator): string[] {
  // a - b with b < 10, written so any borrow goes through the ten.
  const ans = a - b;
  const ones = a % 10;
  const tens = a - ones;
  if (a <= 10) {
    return [
      tr('question.step.subCountBack', 'Start at {a} and count back {b}.', { a, b }),
      `${a} - ${b} = ${ans}`,
    ];
  }
  if (ones >= b) {
    return [
      tr('question.step.subOnes', 'Subtract the ones: {a} - {b} = {result}', { a: ones, b, result: ones - b }),
      tr('question.step.combine', 'Put them together: {a} + {b} = {result}', { a: tens, b: ones - b, result: ans }),
    ];
  }
  if (ones === 0) {
    return [
      tr('question.step.subFromTen', 'Take one ten: 10 - {b} = {result}', { b, result: 10 - b }),
      tr('question.step.combine', 'Put them together: {a} + {b} = {result}', { a: tens - 10, b: 10 - b, result: ans }),
    ];
  }
  const rest = b - ones;
  return [
    tr('question.step.subSplit', 'Split {b} into {first} and {rest}.', { b, first: ones, rest }),
    tr('question.step.subToTen', 'Subtract down to the ten: {a} - {first} = {ten}', { a, first: ones, ten: tens }),
    `${tens} - ${rest} = ${ans}`,
  ];
}

function subSteps(a: number, b: number, tr: Translator): string[] {
  if (b < 10) return subtractOnesSteps(a, b, tr);
  const bOnes = b % 10;
  const bTens = b - bOnes;
  const mid = a - bTens;
  const steps = [
    tr('question.step.subTens', 'Subtract the tens: {a} - {b} = {result}', { a, b: bTens, result: mid }),
  ];
  if (bOnes === 0) return steps;
  const midOnes = mid % 10;
  if (midOnes >= bOnes || midOnes === 0) {
    steps.push(tr('question.step.subOnesFrom', 'Then subtract the ones: {a} - {b} = {result}', {
      a: mid, b: bOnes, result: mid - bOnes,
    }));
    return steps;
  }
  steps.push(
    tr('question.step.subToTen', 'Subtract down to the ten: {a} - {first} = {ten}', { a: mid, first: midOnes, ten: mid - midOnes }),
    `${mid - midOnes} - ${bOnes - midOnes} = ${mid - bOnes}`,
  );
  return steps;
}

function mulSteps(a: number, b: number, tr: Translator): string[] {
  const ans = a * b;
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  if (big >= 10) {
    const ones = big % 10;
    const tens = big - ones;
    if (ones === 0) {
      return [
        tr('question.step.mulTens', 'Multiply by {tens}: {n} × {factor} = {part}, then add a 0.', {
          tens, n: small, factor: tens / 10, part: small * (tens / 10),
        }),
        `${small} × ${tens} = ${ans}`,
      ];
    }
    return [
      tr('question.step.mulSplit', 'Split {n} into {tens} and {ones}.', { n: big, tens, ones }),
      `${small} × ${tens} = ${small * tens}`,
      `${small} × ${ones} = ${small * ones}`,
      tr('question.step.combine', 'Put them together: {a} + {b} = {result}', { a: small * tens, b: small * ones, result: ans }),
    ];
  }
  if (small === 1) {
    return [
      tr('question.step.mulOne', 'Any number times 1 stays the same.'),
      `${big} × 1 = ${ans}`,
    ];
  }
  const fewer = big * (small - 1);
  return [
    tr('question.step.mulOneLess', 'One group fewer: {big} × {n} = {result}', { big, n: small - 1, result: fewer }),
    tr('question.step.mulAddGroup', 'Add one more {big}: {a} + {big} = {result}', { a: fewer, big, result: ans }),
  ];
}

/**
 * Place-value square: ±10 and ±1 around the answer, so neither the ones digit
 * nor the tens digit alone identifies the correct choice. `tensShift` points
 * the ±10 pair toward the typical mistake (forgotten carry / forgotten borrow).
 */
function buildPlaceValueDistractors(answer: number, tensShift: 10 | -10): number[] {
  const tens = answer + tensShift >= 0 ? tensShift : 10;
  // Keep the ±1 pair inside the same tens so the tens digit stays ambiguous too.
  const onesDigit = answer % 10;
  const onesShift = onesDigit === 0 ? 1 : onesDigit === 9 ? -1 : (chance(0.5) ? -1 : 1);
  return [answer + tens, answer + onesShift, answer + tens + onesShift];
}

/** Pick the ±10 direction: the typical slip when it is still plausible, otherwise any plausible side. */
function pickTensShift(preferred: 10 | -10 | null, plusOk: boolean, minusOk: boolean): 10 | -10 {
  if (preferred === 10 && plusOk) return 10;
  if (preferred === -10 && minusOk) return -10;
  if (plusOk && minusOk) return chance(0.5) ? 10 : -10;
  return minusOk ? -10 : 10;
}

function buildSmallAnswerDistractors(answer: number): number[] {
  // Single-digit results: nearby counting slips are the realistic mistakes.
  const around = [answer - 1, answer + 1, answer - 2, answer + 2].filter((value) => value >= 0);
  shuffleInPlace(around);
  return around;
}

function genAdd(range: [number, number], tr: Translator): QuestionDraft {
  const a = rr(range[0], range[1]);
  const b = rr(range[0], range[1]);
  const ans = a + b;
  // Single-digit addends: knowing the ones digit already means knowing the fact,
  // so nearby counting slips are the realistic distractors.
  if (a < 10 && b < 10) {
    return {
      display: `${a} + ${b}`,
      answer: ans,
      op: '+',
      steps: addSteps(a, b, tr),
      distractorCandidates: buildSmallAnswerDistractors(ans),
      skipOnesDigitGuard: true,
    };
  }
  const carried = (a % 10) + (b % 10) >= 10;
  // A sum below either addend is not a believable answer.
  const tensShift = pickTensShift(carried ? -10 : null, true, ans - 10 >= Math.max(a, b));
  return {
    display: `${a} + ${b}`,
    answer: ans,
    op: '+',
    steps: addSteps(a, b, tr),
    distractorCandidates: ans >= 10 ? buildPlaceValueDistractors(ans, tensShift) : buildSmallAnswerDistractors(ans),
  };
}

function genSub(range: [number, number], tr: Translator): QuestionDraft {
  const x = rr(range[0], range[1]);
  let y = rr(range[0], range[1]);
  if (x === y) y = Math.min(range[1], y + 1);
  const a = Math.max(x, y);
  const b = Math.min(x, y);
  const ans = a - b;
  const borrowed = (a % 10) < (b % 10);
  // A difference larger than the starting number is not a believable answer.
  const tensShift = pickTensShift(borrowed ? 10 : null, ans + 10 <= a, ans - 10 >= 0);
  return {
    display: `${a} - ${b}`,
    answer: ans,
    op: '-',
    steps: subSteps(a, b, tr),
    distractorCandidates: ans >= 10 ? buildPlaceValueDistractors(ans, tensShift) : buildSmallAnswerDistractors(ans),
  };
}

function genMul(range: [number, number], tr: Translator): QuestionDraft {
  const a = rr(range[0], range[1]);
  const b = rr(range[0], range[1]);
  const ans = a * b;
  const distractorCandidates = buildMultiplicationDistractors(a, b, ans);
  if (a >= 10 && b >= 10) {
    // Two-digit × two-digit: the classic "tens×tens + ones×ones" slip (missing
    // cross terms) shares the answer's ones digit.
    const partial = (a - (a % 10)) * (b - (b % 10)) + (a % 10) * (b % 10);
    if (partial !== ans) distractorCandidates.unshift(partial);
  } else if (a >= 10 || b >= 10) {
    distractorCandidates.unshift(ans - 10 > 0 && chance(0.5) ? ans - 10 : ans + 10);
  }
  return {
    display: `${a} × ${b}`,
    answer: ans,
    op: '×',
    steps: mulSteps(a, b, tr),
    distractorCandidates,
    // Single-digit facts: the ones digit already requires knowing the fact.
    skipOnesDigitGuard: a < 10 && b < 10,
  };
}

function genDiv(range: [number, number], tr: Translator): QuestionDraft {
  const b = Math.max(1, rr(range[0], range[1]));
  const ans = Math.max(1, rr(range[0], range[1]));
  const a = b * ans;
  return {
    display: `${a} ÷ ${b}`,
    answer: ans,
    op: '÷',
    steps: [
      tr("question.step.think", "Think: {expr}", { expr: `${b} × ? = ${a}` }),
      `${b} × ${ans} = ${a}`,
      tr("question.step.therefore", "Therefore {expr}", { expr: `${a} ÷ ${b} = ${ans}` }),
    ],
  };
}

// ── Question Registry ──

QUESTION_REGISTRY.set('+', (range, tr) => makeChoices(genAdd(range, tr)));
QUESTION_REGISTRY.set('-', (range, tr) => makeChoices(genSub(range, tr)));
QUESTION_REGISTRY.set('×', (range, tr) => makeChoices(genMul(range, tr)));
QUESTION_REGISTRY.set('÷', (range, tr) => makeChoices(genDiv(range, tr)));

QUESTION_REGISTRY.set('mixed2', (range) => makeChoices(genMixed2(range)));
QUESTION_REGISTRY.set('mixed3', (range, tr) => makeChoices(genMixed3(range, tr)));
QUESTION_REGISTRY.set('mixed4', (range, tr) => makeChoices(genMixed4(range, tr)));

QUESTION_REGISTRY.set('unknown1', (range) => makeChoices(genUnknown1(range)));
QUESTION_REGISTRY.set('unknown2', (range) => makeChoices(genUnknown2(range)));
QUESTION_REGISTRY.set('unknown3', (range) => makeChoices(genUnknown3(range)));
QUESTION_REGISTRY.set('unknown4', (range) => makeChoices(genUnknown4(range)));

QUESTION_REGISTRY.set('frac_cmp', (range, tr) => genFractionCompare(range, tr));
QUESTION_REGISTRY.set('frac_same', (range, tr) => genFractionSameDen(range, tr));
QUESTION_REGISTRY.set('frac_diff', (range, tr) => genFractionDiffDen(range, tr));
QUESTION_REGISTRY.set('frac_muldiv', (range, tr) => genFractionMulDiv(range, tr));

QUESTION_REGISTRY.set('dec_add', (range, tr, diffMod) => genDecimalAdd(range, tr, diffMod));
QUESTION_REGISTRY.set('dec_frac', (range, tr) => genDecimalFrac(range, tr));
QUESTION_REGISTRY.set('dec_mul', (range, tr) => genDecimalMul(range, tr));
QUESTION_REGISTRY.set('dec_div', (range, tr) => genDecimalDiv(range, tr));

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

  // Keep operands inside the child's grade, however hard the move or level.
  const cap = options.maxOperandByOp?.[op];
  if (typeof cap === 'number' && Number.isFinite(cap) && cap >= 2) {
    range[1] = Math.min(range[1], Math.floor(cap));
    range[0] = Math.max(1, Math.min(range[0], range[1] - 1));
  }

  if (op === 'unknown2' && options.noDivisionSign) return makeChoices(genUnknown2(range, true, tr));

  // Registry lookup
  const generator = QUESTION_REGISTRY.get(op);
  if (generator) return generator(range, tr, diffMod);

  // Fallback: addition (unreachable if registry is complete)
  return QUESTION_REGISTRY.get('+')!(range, tr, diffMod);
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
  skipOnesDigitGuard,
  choiceLabels,
  answerLabel,
}: QuestionDraft): GeneratedQuestion {
  const spread = Math.max(5, Math.ceil(Math.abs(answer) * 0.2));
  const ch = new Set<number>([answer]);
  const candidates = Array.isArray(distractorCandidates) ? [...distractorCandidates] : [];

  // Multi-digit answers: make sure some distractor shares the ones digit, so the
  // answer cannot be picked by computing only the ones column.
  if (!skipOnesDigitGuard && Number.isInteger(answer) && answer >= 10) {
    const hasSameOnes = candidates.slice(0, 3).some((value) => (
      Number.isFinite(value) && Math.round(value) !== answer && Math.round(value) >= 0
      && Math.round(value) % 10 === answer % 10
    ));
    if (!hasSameOnes) {
      candidates.unshift(answer - 10 >= 0 && chance(0.5) ? answer - 10 : answer + 10);
    }
  }

  if (candidates.length > 0) {
    for (const value of candidates) {
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
