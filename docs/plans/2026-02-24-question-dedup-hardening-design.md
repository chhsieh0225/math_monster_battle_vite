# Question Dedup Hardening Design

## Goal

Extract the existing question deduplication logic from `useBattleCore.ts` into a standalone, testable module. Add comprehensive tests for all pure functions and the retry loop. Fix the edge case where retry exhaustion silently returns a duplicate question.

## Current State

Six pure functions + a retry loop are embedded in `useBattleCore.ts` (~80 lines, untestable in isolation):

- `normalizeOps()` — sanitize op arrays
- `resolveEffectiveQuestionOps()` — intersect move ops with allowed ops
- `estimateOpCombinationSpace()` — per-op question variety estimate
- `estimateMoveQuestionCombinationSpace()` — total variety for a move config
- `resolveQuestionRecentWindowSize()` — map variety → dedup window (0–8)
- `buildQuestionHistoryKey()` — cache key for move+difficulty+ops

The retry loop in `genBattleQuestion` re-generates up to 12 times to avoid recent duplicates, then records the display string in a ring buffer.

## Changes

### 1. Extract to `src/hooks/battle/questionDedup.ts`

Move the six pure functions out of `useBattleCore.ts`. Add a new `deduplicateQuestion()` function that encapsulates the retry + history-update logic:

```typescript
export function deduplicateQuestion(args: {
  generate: () => { display: string };
  historyMap: Map<string, string[]>;
  historyKey: string;
  dedupWindow: number;
}): { display: string } & Record<string, unknown>;
```

Behavior:
- If `dedupWindow <= 0`, generate once, return (no history tracking).
- Otherwise retry up to `max(2, min(12, dedupWindow * 2))` times.
- **Fix:** If final display is still in history, skip appending to history (don't record the duplicate — increases chance of a fresh question next time).
- Otherwise append display to ring buffer, trim to window size.

### 2. Update `useBattleCore.ts`

Replace the inline functions + retry loop with imports from `questionDedup.ts`. Net reduction ~80 lines.

### 3. New test file `src/hooks/battle/questionDedup.test.js`

Test coverage:
- `normalizeOps` — empty, null, duplicates, whitespace
- `resolveEffectiveQuestionOps` — intersection, fallback to allowed, fallback to base
- `estimateOpCombinationSpace` — spot-check several ops and spans
- `resolveQuestionRecentWindowSize` — tiny space → 0, large space → capped at 8
- `buildQuestionHistoryKey` — deterministic output, different inputs → different keys
- `deduplicateQuestion` — avoids recent, ring buffer trims, retry exhaustion skips history append

## Non-Goals

- No changes to `genQ()` or question generators
- No changes to `recentQuestionDisplaysRef` data structure
- No changes to `clearRecentQuestionDisplays` timing
- No new UI or user-facing behavior changes
