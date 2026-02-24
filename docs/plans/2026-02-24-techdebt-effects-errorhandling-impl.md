# Tech Debt: Effect Dedup + Error Handling — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deduplicate ~1,000 lines from 8 Effect component ultimate moves via shared `UltimateEffect` template, and fix the 3 most dangerous error handling gaps (blank screen on battle crash, inadequate ErrorBoundary, no chunk load recovery).

**Architecture:** Error handling fixes are small, surgical edits to 4 existing files. Effect dedup creates one new shared `UltimateEffect.tsx` component and replaces the idx-3 block in each element with a config object + `<UltimateEffect>` call.

**Tech Stack:** React, TypeScript, Vite, Node test runner

---

## Part A: Error Handling (Tasks 1-4)

### Task 1: Fix battle catch blank screen

All 4 locations use `setScreen('menu')` which is not a valid screen name — the router returns null, rendering a blank page.

**Files:**
- Modify: `src/hooks/battle/playerFlow.ts:901-902`
- Modify: `src/hooks/battle/enemyFlow.ts:785-786`
- Modify: `src/hooks/battle/pvpFlow.ts:417-418`
- Modify: `src/hooks/battle/pvpFlow.ts:477-478`

**Step 1: Fix all 4 catch blocks**

In each file, replace:
```typescript
try { setScreen('menu'); setPhase('menu'); setBText('⚠️ Battle error — returning to menu'); } catch { /* last resort */ }
```
with:
```typescript
try { setScreen('title'); setPhase('idle'); } catch { /* last resort */ }
```

Remove `setBText` — it sets battle text that won't be visible after navigating to title screen.

Also change the `console.error` guard from DEV-only to always-log:
```typescript
// BEFORE:
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) console.error('[playerFlow] runPlayerAnswer crashed:', err);
// AFTER:
console.error('[playerFlow] runPlayerAnswer crashed:', err);
```

Apply same pattern to all 4 locations (`[playerFlow]`, `[enemyFlow]`, `[pvpFlow] handlePvpAnswer`, `[pvpFlow] processPvpTurnStart`).

**Step 2: Run tests**

Run: `npm test`
Expected: All existing tests pass (no test depends on `setScreen('menu')`)

**Step 3: Commit**

```bash
git add src/hooks/battle/playerFlow.ts src/hooks/battle/enemyFlow.ts src/hooks/battle/pvpFlow.ts
git commit -m "fix: battle crash recovery uses valid screen name 'title' instead of 'menu'"
```

---

### Task 2: Upgrade ErrorBoundary + add BattleErrorBoundary

**Files:**
- Modify: `src/App.tsx:127-154` (existing ErrorBoundary)
- Modify: `src/App.tsx:442-459` (BattleScreen Suspense wrapper)

**Step 1: Add `componentDidCatch` to existing ErrorBoundary**

After `getDerivedStateFromError` (line 136), add:

```typescript
componentDidCatch(error: Error, info: React.ErrorInfo) {
  console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
}
```

**Step 2: Change "Reload" button to actual page reload**

Replace the button onClick at line 148:
```typescript
// BEFORE:
<button onClick={() => { this.setState({ error: null }); }} className="app-error-reload">
// AFTER:
<button onClick={() => { window.location.reload(); }} className="app-error-reload">
```

**Step 3: Create BattleErrorBoundary**

Add a new class after the existing ErrorBoundary (around line 155). This boundary catches render errors specifically in BattleScreen and navigates to title instead of showing a full-app error:

```typescript
type BattleErrorBoundaryProps = {
  children?: ReactNode;
  onReset: () => void;
};

class BattleErrorBoundary extends Component<BattleErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: BattleErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    if (error instanceof Error) return { error };
    return { error: String(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[BattleErrorBoundary] Battle render crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-wrap">
          <div className="app-error-icon">⚠️</div>
          <div className="app-error-title">{staticT("app.error.battleCrash", "Battle error")}</div>
          <button onClick={() => { this.setState({ error: null }); this.props.onReset(); }} className="app-error-reload">
            {staticT("app.error.returnTitle", "Return to Title")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Step 4: Wrap BattleScreen in BattleErrorBoundary**

At line 442-459, wrap the existing `<Suspense>` in `<BattleErrorBoundary>`:

```tsx
// BEFORE:
return (
  <Suspense fallback={...}>
    <BattleScreen ... />
  </Suspense>
);

// AFTER:
return (
  <BattleErrorBoundary onReset={() => A.setScreen('title')}>
    <Suspense fallback={...}>
      <BattleScreen ... />
    </Suspense>
  </BattleErrorBoundary>
);
```

Note: `A.setScreen('title')` is already available in the `GameShell` function scope.

**Step 5: Run tests + build**

Run: `npm test && npx vite build`
Expected: All pass, build succeeds

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "fix: upgrade ErrorBoundary with componentDidCatch + page reload + BattleErrorBoundary"
```

---

### Task 3: Add ChunkErrorBoundary to lazy screens

**Files:**
- Modify: `src/components/AppScreenRouter.tsx:97-101`

**Step 1: Add ChunkErrorBoundary class inside AppScreenRouter**

Before the `withScreenSuspense` function (around line 97), add:

```typescript
class ChunkErrorBoundary extends Component<
  { children?: ReactNode; t: TFunc },
  { hasError: boolean }
> {
  constructor(props: { children?: ReactNode; t: TFunc }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ChunkErrorBoundary] Chunk load failed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 12, padding: 24,
          color: 'rgba(255,255,255,0.85)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 36 }}>📡</div>
          <div style={{ fontSize: 16 }}>
            {this.props.t('app.error.chunkLoad', 'Failed to load. Please check your connection.')}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 24px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.15)', color: 'white',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            {this.props.t('app.error.retry', 'Retry')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Also add `Component` to the React import at the top of the file.

**Step 2: Wrap `withScreenSuspense` with ChunkErrorBoundary**

```typescript
// BEFORE:
const withScreenSuspense = (node: ReactNode) => (
  <Suspense fallback={screenLoadingFallback}>
    {node}
  </Suspense>
);

// AFTER:
const withScreenSuspense = (node: ReactNode) => (
  <ChunkErrorBoundary t={t}>
    <Suspense fallback={screenLoadingFallback}>
      {node}
    </Suspense>
  </ChunkErrorBoundary>
);
```

**Step 3: Run tests + build**

Run: `npm test && npx vite build`
Expected: All pass

**Step 4: Commit**

```bash
git add src/components/AppScreenRouter.tsx
git commit -m "fix: add ChunkErrorBoundary around lazy-loaded screens for chunk load recovery"
```

---

### Task 4: Add i18n keys for error boundaries

**Files:**
- Modify: `src/i18n/locales/zh-TW.ts:370-371`
- Modify: `src/i18n/locales/en-US.ts:370-371`

**Step 1: Add keys to zh-TW.ts**

After the existing `app.error.reload` key, add:

```typescript
"app.error.battleCrash": "戰鬥發生錯誤",
"app.error.returnTitle": "返回標題畫面",
"app.error.chunkLoad": "載入失敗，請檢查網路連線。",
"app.error.retry": "重試",
```

**Step 2: Add keys to en-US.ts**

```typescript
"app.error.battleCrash": "Battle error",
"app.error.returnTitle": "Return to Title",
"app.error.chunkLoad": "Failed to load. Please check your connection.",
"app.error.retry": "Retry",
```

**Step 3: Run tests + build**

Run: `npm test && npx vite build`

**Step 4: Commit**

```bash
git add src/i18n/locales/zh-TW.ts src/i18n/locales/en-US.ts
git commit -m "i18n: add error boundary message keys"
```

---

## Part B: Effect Ultimate Dedup (Tasks 5-8)

### Task 5: Create UltimateEffect types and shared component

**Files:**
- Create: `src/components/effects/UltimateEffect.tsx`

**Step 1: Create the UltimateConfig type and UltimateEffect component**

The component renders the 7-phase ultimate scaffold. Each phase uses config values for element-specific appearance.

Reference the design doc at `docs/plans/2026-02-24-techdebt-effects-errorhandling-design.md` for the `UltimateConfig` type.

The component signature:

```tsx
import type { ReactElement, CSSProperties } from 'react';
import type { EffectTemplateContext } from './createEffectTemplate.ts';
import type { SpriteTarget } from '../../hooks/useSpriteTargets';

export type UltimateConfig = {
  approachDelay: number;  // D constant (0.3 or 0.34)

  // Phase 1: approach orb
  orb: {
    size: number;         // viewBox size (36-38)
    content: (uid: string) => ReactElement;  // SVG defs + shape
    filter: (glow: number) => string;
  };

  // Phase 2: impact core
  core: {
    svgSize: number;      // 160-196
    center: number;       // svgSize/2 (80-98)
    radius: (fxLvl: number) => number;
    gradientStops: Array<{ offset: string; color: string; opacity: number }>;
    filter: {
      turbulenceType: 'fractalNoise' | 'turbulence';
      baseFreqValues: string;
      displacementScale: (fxLvl: number) => string;
      blurValues: string;
      colorMatrix?: string;
    };
    outerFilter: (glow: number) => string;
  };

  // Phase 3: pressure rings
  rings: {
    count: (fxLvl: number) => number;
    svgSize: [number, number];         // [width, height]
    center: [number, number];          // [cx, cy]
    baseRadius: (i: number) => [number, number];  // [rx, ry] or [r, r] for circles
    strokeColors: [string, string];
    strokeWidth: (i: number) => number;
    animation: string;                 // 'darkRingExpand' or 'fireExpand'
    delayFormula: (D: number, i: number, fxLvl: number) => number;
    ringStyle?: (i: number, glow: number) => CSSProperties;
    useCircle?: boolean;
    offset?: string;                   // right/top offset CSS
  };

  // Phase 4: sweep layer
  sweeps: {
    type: 'ray' | 'horizontal';
    count: (fxLvl: number) => number;
    render: (args: {
      i: number; count: number; uid: string; T: SpriteTarget;
      fxLvl: number; glow: number; D: number; dur: number;
      rr: EffectTemplateContext['rr'];
    }) => ReactElement;
  };

  // Phase 5: burst particles
  burst: {
    count: (fxLvl: number) => number;
    render: (args: {
      i: number; count: number; T: SpriteTarget;
      fxLvl: number; glow: number; D: number;
      rr: EffectTemplateContext['rr'];
    }) => ReactElement;
  };

  // Phase 6: shard/fragment layer (optional — some elements omit)
  shards?: {
    count: (fxLvl: number) => number;
    render: (args: {
      i: number; T: SpriteTarget; fxLvl: number; glow: number; D: number;
      rr: EffectTemplateContext['rr'];
    }) => ReactElement;
  };

  // Phase 7: global glow
  glow: {
    gradient: (T: SpriteTarget, fxLvl: number) => string;
    durMultiplier: number;  // typically 1.15 or 1.2
  };
};

export function UltimateEffect({ config, ctx }: { config: UltimateConfig; ctx: EffectTemplateContext }): ReactElement;
```

The component body:
- Destructures `ctx` → `{ fxLvl, dur, glow, T, rr, uid }`
- Generates SVG IDs: `core-${uid}`, `core-filter-${uid}`
- Generates coreSeed via `rr("ult-core-seed", 0, 2, 90)`
- Renders each of the 7 phases using config functions/values
- Phase 1: approach orb with `ultApproach` animation
- Phase 2: core SVG with radialGradient + feTurbulence filter chain
- Phase 3: rings via `Array.from({ length: config.rings.count(fxLvl) }, ...)`
- Phase 4: sweeps via `config.sweeps.render()`
- Phase 5: burst via `config.burst.render()`
- Phase 6: shards via `config.shards?.render()` (if present)
- Phase 7: glow div with `ultGlow` animation

Key design decisions:
- Phases 4-6 use **render functions** (not just config data) because these phases vary too much between elements to express purely as data. This is a pragmatic middle ground: the scaffold (phase ordering, container div, core SVG filter structure) is shared, while per-element particle shapes are render functions.
- Phases 1-3 and 7 ARE expressed as data since they have consistent structure.

**Step 2: Run build to check types**

Run: `npx vite build`
Expected: Succeeds (component not yet imported anywhere)

**Step 3: Commit**

```bash
git add src/components/effects/UltimateEffect.tsx
git commit -m "feat: add shared UltimateEffect template component"
```

---

### Task 6: Migrate FireEffect + DarkEffect ultimates (pilot pair)

Migrate two elements first to validate the template. Fire is the most complex (509 lines), Dark uses circles instead of ellipses for rings.

**Files:**
- Modify: `src/components/effects/FireEffect.tsx:318-509` (replace with config + UltimateEffect)
- Modify: `src/components/effects/DarkEffect.tsx:177-292` (replace with config + UltimateEffect)

**Step 1: Create FIRE_ULTIMATE config and replace FireEffect idx 3 block**

At the top of FireEffect.tsx, add import:
```typescript
import { UltimateEffect, type UltimateConfig } from './UltimateEffect.tsx';
```

After the `fireEffectTemplate` creation (line 11), add the `FIRE_ULTIMATE` config object. This config captures all the Fire-specific values from the existing idx 3 code (lines 319-509):
- `approachDelay: 0.3`
- Meteor orb with FLAME path + fire gradient
- Core with fire gradient stops + fire feColorMatrix
- Ellipse rings with fire stroke colors
- Horizontal sweep type with fire gradient
- Burst particles using FLAME shapes with ember colors
- Ash shard layer
- Fire glow gradient

Then replace everything from `const D = 0.3;` (line 319) through end of function (line 509) with:
```tsx
return <UltimateEffect config={FIRE_ULTIMATE} ctx={fireEffectTemplate({ idx: moveIdx, lvl, target })} />;
```

**Step 2: Create DARK_ULTIMATE config and replace DarkEffect idx 3 block**

Same pattern for DarkEffect. The Dark ultimate (lines 177-292) uses:
- `approachDelay: 0.34` (slightly different)
- Void orb with dark gradient
- Core with dark gradient stops + dark feColorMatrix
- Circle rings (not ellipses) with dark stroke colors
- Ray sweep type (radial rays, not horizontal sweeps)
- Star burst particles using STAR/SPARK4 paths
- No shard layer (omit shards config)
- Dark glow gradient

Replace everything from `const D = 0.34;` (line 178) through end (line 292) with:
```tsx
return <UltimateEffect config={DARK_ULTIMATE} ctx={darkEffectTemplate({ idx: moveIdx, lvl, target })} />;
```

**Step 3: Run tests + build**

Run: `npm test && npx vite build`
Expected: All pass. Bundle size should decrease slightly.

**Step 4: Commit**

```bash
git add src/components/effects/FireEffect.tsx src/components/effects/DarkEffect.tsx
git commit -m "refactor: migrate Fire + Dark ultimates to shared UltimateEffect template"
```

---

### Task 7: Migrate remaining 6 element ultimates

Migrate the other 6 elements using the same pattern established in Task 6.

**Files:**
- Modify: `src/components/effects/IceEffect.tsx:161-271`
- Modify: `src/components/effects/WaterEffect.tsx:153-318`
- Modify: `src/components/effects/ElecEffect.tsx:201-340`
- Modify: `src/components/effects/GrassEffect.tsx:163-329`
- Modify: `src/components/effects/LightEffect.tsx:160-325`
- Modify: `src/components/effects/SteelEffect.tsx:197-318`

**Step 1: Create configs and replace idx 3 blocks for all 6 elements**

For each element, read the existing idx 3 code, extract element-specific values into an `XXX_ULTIMATE` config, and replace the block with `<UltimateEffect config={XXX_ULTIMATE} ctx={...} />`.

Element-specific notes:
- **Ice**: Uses SHARD path, ring stroke "rgba(191,219,254,0.84)"/"rgba(56,189,248,0.68)", no feColorMatrix in filter (check carefully), shard burst with `sparkle` animation
- **Water**: Uses vortex/waves, `splashBurst` animation for burst, horizontal sweeps with wave gradient
- **Elec**: Uses BOLT/SPARK paths, `arcFlow` animation for sweeps, `darkStarSpin` for burst
- **Grass**: Uses LEAF/VEIN paths, `vineWhipDraw` for sweeps, `leafSpin` for burst
- **Light**: Uses ORB path, radial rays, `leafSpin` for burst motes
- **Steel**: Uses BLADE/SHARD paths, no feColorMatrix, `darkStarSpin` for burst

Each element adds import for UltimateEffect at top + config object before the component function.

**Step 2: Run tests + build**

Run: `npm test && npx vite build`
Expected: All pass

**Step 3: Commit**

```bash
git add src/components/effects/IceEffect.tsx src/components/effects/WaterEffect.tsx src/components/effects/ElecEffect.tsx src/components/effects/GrassEffect.tsx src/components/effects/LightEffect.tsx src/components/effects/SteelEffect.tsx
git commit -m "refactor: migrate remaining 6 element ultimates to shared UltimateEffect template"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Build + bundle budget**

Run: `npx vite build && node scripts/bundle-budget.mjs`
Expected: Build succeeds, bundle budget passes. Bundle should be noticeably smaller.

**Step 3: Visual verification**

Start dev server. In each of the 8 elements, trigger the ultimate move (idx 3) and verify the animation renders correctly. Check:
- Approach orb flies correctly
- Impact core expands with turbulence filter
- Rings expand outward
- Sweeps/rays animate
- Burst particles scatter
- Glow overlay pulses

Also test error scenarios:
- Battle crash → navigates to title (not blank)
- ErrorBoundary "Reload" → does `window.location.reload()`
- If possible, simulate chunk load error → ChunkErrorBoundary shows retry

**Step 4: Commit any fixes needed, then final summary commit if applicable**

---

## Summary

| Task | What | Files | Est. Lines Changed |
|------|------|-------|--------------------|
| 1 | Fix blank screen on battle crash | playerFlow, enemyFlow, pvpFlow | ~8 lines |
| 2 | Upgrade ErrorBoundary + BattleErrorBoundary | App.tsx | ~40 lines added |
| 3 | ChunkErrorBoundary | AppScreenRouter.tsx | ~40 lines added |
| 4 | i18n keys | zh-TW.ts, en-US.ts | ~8 lines added |
| 5 | UltimateEffect template component | UltimateEffect.tsx (new) | ~200 lines added |
| 6 | Migrate Fire + Dark ultimates | FireEffect, DarkEffect | ~350 lines removed |
| 7 | Migrate 6 remaining ultimates | Ice/Water/Elec/Grass/Light/Steel | ~800 lines removed |
| 8 | Final verification | — | — |
