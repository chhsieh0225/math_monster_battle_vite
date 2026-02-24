# Hint System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let players spend XP to reveal step-by-step solution hints before answering a math question.

**Architecture:** Add `hintsRevealed` state to `useBattleUIState`, a `requestHint` action that decrements `pExp` and increments `hintsRevealed`, and render revealed hints in `BattleQuestionPanel`. The hint cost is configurable via `balanceConfig.hint.costPerStep`.

**Tech Stack:** React (memo components, hooks), TypeScript, Node test runner.

---

### Task 1: Add hint cost constant to balanceConfig

**Files:**
- Modify: `src/data/balanceConfig.ts`
- Modify: `src/data/balanceConfigSchema.ts`

**Step 1: Add hint config block**

In `src/data/balanceConfig.ts`, after the `coop` block (before `} as const;`), add:

```ts
  hint: {
    /** XP cost per hint step revealed */
    costPerStep: 20,
  },
```

**Step 2: Add schema validation**

In `src/data/balanceConfigSchema.ts`, before the `if (issues.length)` block, add:

```ts
  checkNumber(config, 'hint.costPerStep', issues, { min: 1, max: 100 });
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/data/balanceConfig.ts src/data/balanceConfigSchema.ts
git commit -m "feat: add hint cost constant to balanceConfig"
```

---

### Task 2: Add hintsRevealed state + requestHint action

**Files:**
- Modify: `src/hooks/useBattleUIState.ts` — add `hintsRevealed` state + `setHintsRevealed`
- Modify: `src/types/battle.ts` — add `hintsRevealed` to `UseBattleState`, `requestHint` to `UseBattleActions`
- Modify: `src/hooks/battle/selectMoveFlow.ts` — reset `hintsRevealed` when new question loads

**Step 1: Add state to useBattleUIState**

In `src/hooks/useBattleUIState.ts`, after `const [answered, setAnswered] = useState(false);` (line 79), add:

```ts
  const [hintsRevealed, setHintsRevealed] = useState(0);
```

In the return object, add:

```ts
    hintsRevealed,
    setHintsRevealed,
```

**Step 2: Add to UseBattleState type**

In `src/types/battle.ts`, inside `UseBattleState` (around line 311), add:

```ts
  hintsRevealed: number;
```

**Step 3: Add requestHint to UseBattleActions**

In `src/types/battle.ts`, inside `UseBattleActions` (after `onAns`, around line 333), add:

```ts
  requestHint: () => void;
```

**Step 4: Reset hintsRevealed in selectMoveFlow**

In `src/hooks/battle/selectMoveFlow.ts`:

a) Add `setHintsRevealed` to `RunSelectMoveFlowArgs` type (around line 66-67):
```ts
  setHintsRevealed: (value: number) => void;
```

b) Add `setHintsRevealed` to function destructure (around line 88-96):
```ts
  setHintsRevealed,
```

c) After `setAnswered(false);` (line 126), add:
```ts
  setHintsRevealed(0);
```

d) Update the guard check (line 104) to include `setHintsRevealed`:
```ts
  if (!isFn(setSelIdx) || !isFn(setDiffLevel) || !isFn(setQ) || !isFn(setFb) || !isFn(setAnswered) || !isFn(setPhase) || !isFn(setHintsRevealed)) {
```

**Step 5: Wire setHintsRevealed through turnActionDepsBuilder**

In `src/hooks/battle/turnActionDepsBuilder.ts`, find the selectMoveFlowDeps section and add:
```ts
    setHintsRevealed: ui.setHintsRevealed,
```

Also update the `Pick<>` type for `RunSelectMoveFlowArgs` to include `'setHintsRevealed'`.

**Step 6: Run tests**

Run: `npm test`
Expected: Some tests may need `setHintsRevealed` added to mocks (e.g., `selectMoveFlow.test.js`, `turnActionDepsBuilder.test.js`). Fix any failures by adding `setHintsRevealed: () => {}` to mocks.

**Step 7: Commit**

```bash
git add src/hooks/useBattleUIState.ts src/types/battle.ts src/hooks/battle/selectMoveFlow.ts src/hooks/battle/turnActionDepsBuilder.ts
git commit -m "feat: add hintsRevealed state and requestHint action type"
```

---

### Task 3: Implement requestHint in useBattleCore

**Files:**
- Modify: `src/hooks/useBattleCore.ts` — create `requestHint` callback
- Modify: `src/hooks/battle/buildUseBattleActions.ts` or equivalent — expose to actions

**Step 1: Create requestHint callback**

In `src/hooks/useBattleCore.ts`, near other action callbacks, add:

```ts
  const requestHintImpl = useCallback(() => {
    const s = sr.current;
    const cost = BALANCE_CONFIG.hint.costPerStep;
    if ((s.pExp || 0) < cost) return;
    if (!s.q?.steps?.length) return;
    const revealed = ui.hintsRevealed;
    if (revealed >= (s.q.steps.length || 0)) return;
    setPExp((s.pExp || 0) - cost);
    ui.setHintsRevealed(revealed + 1);
  }, [sr, ui, setPExp]);
  const requestHint = useStableCallback(requestHintImpl);
```

Note: The exact location depends on how the codebase structures its callbacks. Follow the same pattern as `onAns` / `selectMove`.

**Step 2: Expose requestHint in actions**

Find where `UseBattleActions` is assembled (likely in `buildUseBattleActions` or directly in `useBattleCore`). Add:

```ts
  requestHint,
```

Also ensure `hintsRevealed` is included in the state object returned from the hook.

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/hooks/useBattleCore.ts
git commit -m "feat: implement requestHint action in useBattleCore"
```

---

### Task 4: Add hint UI to BattleQuestionPanel

**Files:**
- Modify: `src/components/screens/battle/BattleQuestionPanel.tsx`
- Modify: `src/components/screens/BattleScreen.tsx` — pass new props

**Step 1: Add props to BattleQuestionPanel**

In `BattleQuestionPanelProps` type, add:

```ts
  hintsRevealed: number;
  hintSteps: string[];
  hintCost: number;
  currentXp: number;
  onRequestHint: () => void;
```

Add to the function destructure accordingly.

**Step 2: Add hint display + button to JSX**

After the question card `</div>` (line 146) and before the feedback section, add:

```tsx
      {!answered && hintSteps.length > 0 && (
        <div className="battle-hint-section">
          {hintsRevealed > 0 && (
            <div className="battle-hint-steps">
              {hintSteps.slice(0, hintsRevealed).map((step: string, i: number) => (
                <div key={i} className="battle-hint-step-row">
                  <span className="battle-hint-step-index">
                    {t('battle.hint.step', 'Step {index}.', { index: i + 1 })}
                  </span>
                  {renderMathText(step)}
                </div>
              ))}
            </div>
          )}
          {hintsRevealed < hintSteps.length && (
            <button
              className="battle-hint-btn"
              onClick={onRequestHint}
              disabled={currentXp < hintCost}
              title={currentXp < hintCost ? t('battle.hint.noXp', 'Not enough XP') : ''}
            >
              {t('battle.hint.button', '💡 Hint (-{cost} XP)', { cost: hintCost })}
            </button>
          )}
        </div>
      )}
```

**Step 3: Pass props from BattleScreen**

In `src/components/screens/BattleScreen.tsx`, where `<BattleQuestionPanel>` is rendered (around line 998), add:

```tsx
            hintsRevealed={S.hintsRevealed}
            hintSteps={question.steps || []}
            hintCost={BALANCE_CONFIG.hint.costPerStep}
            currentXp={S.pExp}
            onRequestHint={A.requestHint}
```

Add the `BALANCE_CONFIG` import at the top of BattleScreen if not already imported.

**Step 4: Add CSS for hint section**

In the relevant CSS file (check where `.battle-question-wrap` styles are defined), add:

```css
.battle-hint-section {
  margin: 6px 0;
}
.battle-hint-steps {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 6px;
  font-size: 13px;
}
.battle-hint-step-row {
  padding: 2px 0;
  color: #fbbf24;
}
.battle-hint-step-index {
  font-weight: 700;
  margin-right: 6px;
}
.battle-hint-btn {
  width: 100%;
  padding: 8px;
  border: 2px dashed #fbbf24;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.battle-hint-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.battle-hint-btn:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.2);
}
```

**Step 5: Run tests + build**

Run: `npm test && npx vite build`
Expected: All pass.

**Step 6: Commit**

```bash
git add src/components/screens/battle/BattleQuestionPanel.tsx src/components/screens/BattleScreen.tsx
git commit -m "feat: add hint button and step display to BattleQuestionPanel"
```

---

### Task 5: Add i18n keys

**Files:**
- Modify: `src/i18n/locales/zh-TW.ts`
- Modify: `src/i18n/locales/en-US.ts`

**Step 1: Add keys**

zh-TW:
```ts
  "battle.hint.button": "💡 提示 (-{cost} XP)",
  "battle.hint.step": "步驟 {index}.",
  "battle.hint.noXp": "XP 不足",
```

en-US:
```ts
  "battle.hint.button": "💡 Hint (-{cost} XP)",
  "battle.hint.step": "Step {index}.",
  "battle.hint.noXp": "Not enough XP",
```

**Step 2: Commit**

```bash
git add src/i18n/locales/zh-TW.ts src/i18n/locales/en-US.ts
git commit -m "i18n: add hint system text"
```

---

### Task 6: Run full tests, build, and verify

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 2: Run production build**

Run: `npx vite build`
Expected: Build succeeds.

**Step 3: Run bundle budget check**

Run: `node scripts/bundle-budget.mjs`
Expected: All budgets pass.

**Step 4: Visual smoke check**

Start dev server and enter a battle to verify hint button appears and works.
