/**
 * Question deduplication helpers.
 *
 * Pure functions for estimating question variety and keeping a
 * per-move ring-buffer of recently shown question displays so that
 * the same question text does not repeat too quickly.
 */

import type { QuestionGeneratorMove } from '../../utils/questionGenerator.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_RECENT_QUESTION_WINDOW = 8;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Sanitize an ops array: trim, de-dup, drop empties. */
export function normalizeOps(
  ops: readonly string[] | null | undefined,
): string[] {
  if (!Array.isArray(ops)) return [];
  const normalized = ops
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

/** Intersect move ops with the globally allowed ops. */
export function resolveEffectiveQuestionOps(
  move: QuestionGeneratorMove,
  allowedOps: readonly string[] | null | undefined,
): string[] {
  const baseOps = normalizeOps(move.ops);
  const allowed = normalizeOps(allowedOps);
  if (allowed.length <= 0) return baseOps;
  const overlap = baseOps.filter((item) => allowed.includes(item));
  if (overlap.length > 0) return overlap;
  return allowed;
}

/** Rough per-op question variety estimate. */
export function estimateOpCombinationSpace(
  op: string,
  span: number,
): number {
  const safeSpan = Math.max(1, Math.trunc(span));
  switch (op) {
    case '+':
    case 'dec_add':
    case '×':
    case 'dec_mul':
    case '÷':
    case 'dec_div':
      return safeSpan * safeSpan;
    case 'dec_frac':
      return Math.max(14, safeSpan * safeSpan * 2);
    case '-':
      return safeSpan * Math.max(1, safeSpan - 1);
    case 'mixed2':
      return safeSpan * safeSpan * safeSpan * 4;
    case 'mixed3':
      return safeSpan * safeSpan * safeSpan * 2;
    case 'mixed4':
      return safeSpan * safeSpan * safeSpan * safeSpan * 3;
    case 'unknown1':
    case 'unknown2':
      return safeSpan * safeSpan * 2;
    case 'unknown3':
      return safeSpan * safeSpan * 3;
    case 'unknown4':
      return safeSpan * safeSpan * safeSpan * 2;
    case 'frac_cmp':
    case 'frac_diff':
    case 'frac_muldiv':
      return Math.max(16, safeSpan * safeSpan * safeSpan);
    case 'frac_same':
      return Math.max(12, safeSpan * safeSpan * 2);
    default:
      return safeSpan * safeSpan;
  }
}

/** Total question variety across all effective ops for a move. */
export function estimateMoveQuestionCombinationSpace(
  move: QuestionGeneratorMove,
  diffMod: number,
  allowedOps: readonly string[] | null | undefined,
): number {
  const lo = Number.isFinite(move.range?.[0]) ? Number(move.range[0]) : 1;
  const hi = Number.isFinite(move.range?.[1]) ? Number(move.range[1]) : lo;
  const scaledMin = Math.max(1, Math.round(Math.min(lo, hi) * diffMod));
  const scaledMax = Math.max(scaledMin, Math.round(Math.max(lo, hi) * diffMod));
  const span = Math.max(1, scaledMax - scaledMin + 1);
  const ops = resolveEffectiveQuestionOps(move, allowedOps);
  if (ops.length <= 0) return span;
  return ops.reduce(
    (sum, op) => sum + estimateOpCombinationSpace(op, span),
    0,
  );
}

/** Map estimated variety to a dedup window size (0 – MAX_RECENT_QUESTION_WINDOW). */
export function resolveQuestionRecentWindowSize(
  move: QuestionGeneratorMove,
  diffMod: number,
  allowedOps: readonly string[] | null | undefined,
): number {
  const space = estimateMoveQuestionCombinationSpace(move, diffMod, allowedOps);
  return Math.max(
    0,
    Math.min(MAX_RECENT_QUESTION_WINDOW, Math.floor(space / 2)),
  );
}

/** Stable cache key for a move + difficulty + allowed ops combination. */
export function buildQuestionHistoryKey(
  move: QuestionGeneratorMove,
  diffMod: number,
  allowedOps: readonly string[] | null | undefined,
): string {
  const [rangeLo = 1, rangeHi = 10] = move.range || [1, 10];
  const ops = resolveEffectiveQuestionOps(move, allowedOps);
  return `${rangeLo}:${rangeHi}:${Math.round(diffMod * 1000)}:${ops.join('|')}`;
}

// ---------------------------------------------------------------------------
// Deduplication wrapper
// ---------------------------------------------------------------------------

/**
 * Generate a question via `generate()` and deduplicate against recent history.
 *
 * - If `dedupWindow <= 0` the question is generated once with no tracking.
 * - Otherwise up to `max(2, min(12, dedupWindow * 2))` retries are attempted.
 * - **Fix:** when retries are exhausted and the final display is still a
 *   duplicate the display is NOT appended to history.  This increases the
 *   chance of a fresh question on the next call.
 * - Empty / whitespace-only displays are never recorded.
 */
export function deduplicateQuestion<T extends { display: string }>(args: {
  generate: () => T;
  historyMap: Map<string, string[]>;
  historyKey: string;
  dedupWindow: number;
}): T {
  const { generate, historyMap, historyKey, dedupWindow } = args;

  // No dedup requested — generate once, return immediately.
  if (dedupWindow <= 0) {
    return generate();
  }

  const maxRetries = Math.max(2, Math.min(12, dedupWindow * 2));
  const history = historyMap.get(historyKey) ?? [];

  let result = generate();

  for (let i = 0; i < maxRetries; i++) {
    if (!history.includes(result.display)) break;
    result = generate();
  }

  const trimmed = (result.display ?? '').trim();

  // Only record non-empty, non-duplicate displays.
  if (trimmed.length > 0 && !history.includes(result.display)) {
    const updated = [...history, result.display];
    // Trim ring buffer to window size.
    while (updated.length > dedupWindow) {
      updated.shift();
    }
    historyMap.set(historyKey, updated);
  }

  return result;
}
