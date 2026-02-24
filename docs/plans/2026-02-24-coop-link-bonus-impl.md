# Co-op Link Bonus Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a player answers correctly 2+ times in a row in co-op mode, the partner's support attack becomes guaranteed (100%) with +30% damage.

**Architecture:** Thread a `linkActive` boolean through the ally support pipeline: `playerFlow.buildPostHitResolutionPlan` → `applyPostHitResolutionPlan` → `AllySupportTurnRunner` → `runCoopAllySupportTurn` → `buildCoopAllySupportTurnPlan`. No new state variables; linkActive is derived from existing `streak` at call time.

**Tech Stack:** TypeScript, Node test runner, existing battle flow architecture.

---

### Task 1: Add coop link constants to balanceConfig

**Files:**
- Modify: `src/data/balanceConfig.ts:439-441`
- Modify: `src/data/balanceConfigSchema.ts` (add validation)

**Step 1: Add coop config block**

In `src/data/balanceConfig.ts`, before the closing `} as const;` (line 441), add:

```ts
  coop: {
    /** Streak threshold to activate link bonus */
    linkStreak: 2,
    /** Damage multiplier when link bonus is active */
    linkDamageMult: 1.3,
  },
```

**Step 2: Add schema validation**

In `src/data/balanceConfigSchema.ts`, before the `if (issues.length)` block, add:

```ts
  checkNumber(config, 'coop.linkStreak', issues, { min: 1, max: 10 });
  checkNumber(config, 'coop.linkDamageMult', issues, { min: 1, max: 3 });
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass (balanceConfig schema validation runs at import time).

**Step 4: Commit**

```bash
git add src/data/balanceConfig.ts src/data/balanceConfigSchema.ts
git commit -m "feat: add coop link bonus constants to balanceConfig"
```

---

### Task 2: Add linkActive to coopFlow + test

**Files:**
- Modify: `src/hooks/battle/coopFlow.ts:62-81` (RunCoopAllySupportTurnArgs type)
- Modify: `src/hooks/battle/coopFlow.ts:149-190` (buildCoopAllySupportTurnPlan)
- Modify: `src/hooks/battle/coopFlow.ts:344-401` (runCoopAllySupportTurn)
- Test: `src/hooks/battle/coopFlow.test.js`

**Step 1: Write the failing tests**

Append to `src/hooks/battle/coopFlow.test.js`:

```js
test('buildCoopAllySupportTurnPlan applies link damage multiplier when linkActive', () => {
  const base = buildCoopAllySupportTurnPlan({
    state: {
      battleMode: "coop",
      allySub: { name: "火狐" },
      pHpSub: 20,
      enemy: { id: "slime", name: "史萊姆" },
      pLvl: 1,
      eHp: 100,
    },
    rand: () => 0,
  });
  const linked = buildCoopAllySupportTurnPlan({
    state: {
      battleMode: "coop",
      allySub: { name: "火狐" },
      pHpSub: 20,
      enemy: { id: "slime", name: "史萊姆" },
      pLvl: 1,
      eHp: 100,
    },
    rand: () => 0,
    linkActive: true,
  });

  assert.ok(base);
  assert.ok(linked);
  assert.ok(linked.damage > base.damage, `linked ${linked.damage} should be > base ${base.damage}`);
  assert.ok(linked.effects.some((e) => e.kind === 'set_text' && e.text?.includes('🔗')));
});

test('runCoopAllySupportTurn skips chance gate when linkActive', () => {
  const sr = {
    current: {
      battleMode: "coop",
      allySub: { name: "火狐" },
      pHpSub: 20,
      enemy: { name: "史萊姆" },
      pLvl: 1,
      eHp: 100,
    },
  };
  // chance always returns false — normally blocks support
  const out = runCoopAllySupportTurn({
    sr,
    safeTo: (fn) => fn(),
    chance: () => false,
    rand: () => 0,
    setBText: () => {},
    setPhase: () => {},
    setEAnim: () => {},
    setEHp: (hp) => { sr.current.eHp = hp; },
    addD: () => {},
    addP: () => {},
    sfx: { play: () => {} },
    handleVictory: () => {},
    linkActive: true,
  });
  assert.equal(out, true, 'linkActive should bypass chance gate');
  assert.ok(sr.current.eHp < 100, 'damage should have been applied');
});

test('runCoopAllySupportTurn respects chance gate when linkActive is false', () => {
  const sr = {
    current: {
      battleMode: "coop",
      allySub: { name: "火狐" },
      pHpSub: 20,
      enemy: { name: "史萊姆" },
      pLvl: 1,
      eHp: 100,
    },
  };
  const out = runCoopAllySupportTurn({
    sr,
    safeTo: (fn) => fn(),
    chance: () => false,
    rand: () => 0,
    setBText: () => {},
    setPhase: () => {},
    setEAnim: () => {},
    setEHp: () => {},
    addD: () => {},
    addP: () => {},
    sfx: { play: () => {} },
    handleVictory: () => {},
  });
  assert.equal(out, false, 'should be blocked by chance gate');
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: New tests fail (linkActive param not recognized yet).

**Step 3: Implement coopFlow changes**

In `src/hooks/battle/coopFlow.ts`:

a) Add `linkActive?: boolean` to `RunCoopAllySupportTurnArgs` (after line 79, before `t`):
```ts
  linkActive?: boolean;
```

b) Add `linkActive?: boolean` to `BuildCoopSupportTurnPlanArgs` type (find it near line 83):
```ts
  linkActive?: boolean;
```

c) In `runCoopAllySupportTurn` (line 369), change the chance gate:
```ts
  // OLD:
  if (!chance(0.45)) return false;
  // NEW:
  if (!linkActive && !chance(0.45)) return false;
```

d) Pass `linkActive` through to `buildCoopAllySupportTurnPlan` (inside the `safeToIfBattleActive` callback):
```ts
    const plan = buildCoopAllySupportTurnPlan({
      state: s2,
      rand,
      t,
      linkActive,   // ← add this
    });
```

e) In `buildCoopAllySupportTurnPlan`, import `BALANCE_CONFIG` and apply the multiplier:
```ts
import { BALANCE_CONFIG } from '../../data/balanceConfig.ts';
```

After the `rawDmg` calculation (line 162), add:
```ts
  const linkMult = linkActive ? BALANCE_CONFIG.coop.linkDamageMult : 1;
  const boostedDmg = Math.round(rawDmg * linkMult);
  const damage = applyBossDamageReduction(boostedDmg, state.enemy?.id);
```
(Replace the old `const damage = applyBossDamageReduction(rawDmg, state.enemy?.id);`)

f) If `linkActive`, prepend a `set_text` effect with the link message before the existing support attack text:
```ts
  if (linkActive) {
    effects.unshift({
      kind: 'set_text',
      text: tr(t, 'battle.coop.linkAttack', '🔗 連結攻擊！傷害 +30%'),
    });
  }
```

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass including the 3 new ones.

**Step 5: Commit**

```bash
git add src/hooks/battle/coopFlow.ts src/hooks/battle/coopFlow.test.js
git commit -m "feat: add linkActive to coop ally support flow"
```

---

### Task 3: Thread linkActive through delegation layers

**Files:**
- Modify: `src/hooks/battle/coopActionController.ts` (no changes needed — uses spread)
- Modify: `src/hooks/battle/lifecycleActionDelegates.ts:29-30,65-74`
- Modify: `src/hooks/battle/playerFlow.ts:128,196-211,263-313`
- Modify: `src/hooks/useBattleCore.ts:1039-1056`

**Step 1: Update AllySupportTurnRunner type in playerFlow.ts**

Change line 128:
```ts
// OLD:
type AllySupportTurnRunner = (args: { delayMs: number; onDone: () => void }) => boolean;
// NEW:
type AllySupportTurnRunner = (args: { delayMs: number; onDone: () => void; linkActive?: boolean }) => boolean;
```

**Step 2: Add linkActive to PostHitResolutionPlan + BuildPostHitResolutionPlanArgs**

In `PostHitResolutionPlan` type (line 196-202), add:
```ts
  linkActive: boolean;
```

In `BuildPostHitResolutionPlanArgs` type (line 204-211), add:
```ts
  streak: number;
  isCoopMode: boolean;
```

**Step 3: Compute linkActive in buildPostHitResolutionPlan**

In `buildPostHitResolutionPlan` function (line 263-279), add import and computation:

Add import at top of playerFlow.ts:
```ts
import { isCoopBattleMode } from './coopFlow.ts';
```

In the return object of `buildPostHitResolutionPlan`, add:
```ts
    linkActive: isCoopMode && streak >= BALANCE_CONFIG.coop.linkStreak,
```

Also add `streak` and `isCoopMode` to the destructured params.

**Step 4: Pass linkActive in applyPostHitResolutionPlan**

In `applyPostHitResolutionPlan` (line 302-311), pass linkActive:
```ts
    && runAllySupportTurn({
      delayMs: plan.nextDelayMs,
      onDone: continueAfterTurn,
      linkActive: plan.linkActive,    // ← add
    })
```

**Step 5: Update lifecycleActionDelegates.ts**

In `RunAllySupportTurnOptions` (line 30):
```ts
// OLD:
type RunAllySupportTurnOptions = Pick<RunAllySupportTurnControllerArgs, 'delayMs' | 'onDone'>;
// NEW:
type RunAllySupportTurnOptions = Pick<RunAllySupportTurnControllerArgs, 'delayMs' | 'onDone' | 'linkActive'>;
```

In `RunAllySupportTurnBaseArgs` (line 29):
```ts
// OLD:
type RunAllySupportTurnBaseArgs = Omit<RunAllySupportTurnControllerArgs, 'delayMs' | 'onDone'>;
// NEW:
type RunAllySupportTurnBaseArgs = Omit<RunAllySupportTurnControllerArgs, 'delayMs' | 'onDone' | 'linkActive'>;
```

In `runAllySupportTurnWithContext` (line 70-74), add `linkActive`:
```ts
  return runner({
    ...base,
    delayMs: options.delayMs,
    onDone: options.onDone,
    linkActive: options.linkActive,    // ← add
  });
```

**Step 6: Update useBattleCore.ts**

In `runAllySupportTurnImpl` (line 1039), add `linkActive` param:
```ts
// OLD:
const runAllySupportTurnImpl = useCallback(({ delayMs = 850, onDone }: { delayMs?: number; onDone?: () => void } = {}) => {
// NEW:
const runAllySupportTurnImpl = useCallback(({ delayMs = 850, onDone, linkActive }: { delayMs?: number; onDone?: () => void; linkActive?: boolean } = {}) => {
```

And pass it through (line 1055):
```ts
    }, { delayMs, onDone, linkActive });
```

**Step 7: Update buildPostHitResolutionPlan call site**

In playerFlow.ts around line 788, pass the new params:
```ts
          const postHitPlan = buildPostHitResolutionPlan({
            enemyHpAfterHit: afterHp,
            enemyMaxHp: s3.enemy.maxHp,
            appliedHitDmg,
            nextDelayMs: effectTimeline.nextDelay,
            willFreeze,
            hasAllySupportRunner: Boolean(runAllySupportTurn),
            streak: ns,                                           // ← add
            isCoopMode: isCoopBattleMode(s3.battleMode),          // ← add
          });
```

Note: `ns` is the updated streak (available in scope from line 451). `s3` is the current state snapshot. `isCoopBattleMode` needs to be imported from `coopFlow.ts`.

**Step 8: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 9: Commit**

```bash
git add src/hooks/battle/playerFlow.ts src/hooks/battle/lifecycleActionDelegates.ts src/hooks/battle/coopActionController.ts src/hooks/useBattleCore.ts
git commit -m "feat: thread linkActive through ally support pipeline"
```

---

### Task 4: Add i18n keys

**Files:**
- Modify: `src/i18n/locales/zh-TW.ts`
- Modify: `src/i18n/locales/en-US.ts`

**Step 1: Add keys to both locale files**

In `zh-TW.ts`, before the closing `} as const;`:
```ts
  "battle.coop.linkAttack": "🔗 連結攻擊！傷害 +30%",
```

In `en-US.ts`, before the closing `} as const;`:
```ts
  "battle.coop.linkAttack": "🔗 Link Attack! Damage +30%",
```

**Step 2: Commit**

```bash
git add src/i18n/locales/zh-TW.ts src/i18n/locales/en-US.ts
git commit -m "i18n: add coop link attack text"
```

---

### Task 5: Run full tests, build, and verify

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

Start dev server and verify co-op mode loads correctly.
