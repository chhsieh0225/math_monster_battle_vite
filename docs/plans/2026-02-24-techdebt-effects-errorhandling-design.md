# Tech Debt: Effect Dedup + Error Handling

## #5 Effect Component Ultimate Dedup

### Problem

8 element Effect components total ~2,702 lines. The ultimate move (idx 3) in each follows an identical 7-phase structure (~200-250 lines per element, 60-70% structurally identical). Only colors, SVG shapes, feColorMatrix values, and particle counts differ.

### Scope

**Only extract ultimate move (idx 3)**. Moves 0-2 remain untouched — they are too element-specific to benefit from templating without excessive config complexity.

### Design

**NEW: `src/components/effects/UltimateEffect.tsx`**

A shared component rendering the 7-phase ultimate scaffold:

```typescript
export type UltimateConfig = {
  // Phase 1: approach orb
  orbSvg: (uid: string) => ReactElement;  // element-specific orb SVG content
  orbFilter: (glow: number) => string;    // drop-shadow string

  // Phase 2: impact core
  coreSize: number;                       // SVG viewBox dimension (e.g. 190, 196, 160)
  coreGradientStops: Array<{ offset: string; color: string; opacity: number }>;
  coreFilter: {
    turbulenceType: 'fractalNoise' | 'turbulence';
    baseFreqValues: string;               // "0.75;0.42;0.14"
    displacementScale: (fxLvl: number) => string;  // "0;12;3"
    blurValues: string;                   // "0;0.68;0.25"
    colorMatrix?: string;                 // feColorMatrix values (optional, Steel omits)
  };
  coreRadius: (fxLvl: number) => number;  // e.g. 26 + fxLvl * 4

  // Phase 3: pressure rings
  ringCount: (fxLvl: number) => number;
  ringStrokeColors: [string, string];     // alternating even/odd
  ringStrokeWidth: (i: number) => number;
  ringUsesCircle?: boolean;               // Dark uses <circle> instead of <ellipse>

  // Phase 4: sweep layer (rays or horizontal sweeps)
  sweeps: {
    type: 'ray' | 'horizontal';
    count: (fxLvl: number) => number;
    gradient: string[];                   // linearGradient stops
    animation: string;                    // 'windSweep' | 'sparkle'
  };

  // Phase 5: burst particles
  burst: {
    count: (fxLvl: number) => number;
    shape: (i: number) => ReactElement;   // element-specific SVG path
    animation: string;                    // 'leafSpin' | 'darkStarSpin' | 'splashBurst'
    distRange: [number, number];          // base + rr range for scatter radius
  };

  // Phase 6: shard fragments
  shards: {
    count: (fxLvl: number) => number;
    background: string;                   // CSS gradient
  };

  // Phase 7: global glow
  glowGradient: (T: SpriteTarget, fxLvl: number) => string;
  glowDurMultiplier?: number;             // default 1.15
};

type UltimateEffectProps = {
  config: UltimateConfig;
  ctx: EffectTemplateContext;             // from createEffectTemplate
};

export function UltimateEffect({ config, ctx }: UltimateEffectProps): ReactElement;
```

**MODIFY: Each `XxxEffect.tsx`**

Replace the entire `idx === 3` block with:

```tsx
import { UltimateEffect } from './UltimateEffect.tsx';

const FIRE_ULTIMATE: UltimateConfig = { /* ... config object ... */ };

// In the component:
return <UltimateEffect config={FIRE_ULTIMATE} ctx={fireEffectTemplate({ idx: moveIdx, lvl, target })} />;
```

**NEW: `src/components/effects/ultimateConfigs/` (barrel + 8 config files)**

Each element gets a small config file exporting its `UltimateConfig`:
- `fireUltimate.ts` (~50 lines)
- `iceUltimate.ts` (~50 lines)
- ... (8 total)
- `index.ts` (barrel re-export)

### Estimated Impact

- **Remove** ~200-250 lines from each of the 8 element files = ~1,600-2,000 lines removed
- **Add** ~200 lines for `UltimateEffect.tsx` + ~400 lines total for 8 config files
- **Net savings**: ~1,000-1,400 lines (~37-52%)

### Non-goals

- Do not modify moves 0-2 rendering
- Do not modify `createEffectTemplate.ts` or `effectTypes.ts`
- Do not modify `AmbientParticles.tsx`
- Do not change any CSS keyframe animations in `App.css`
- Do not modify `AttackEffect.tsx` dispatcher

---

## #6 Error Handling — Fix Top 3 Dangers

### Danger 1: Battle catch → blank screen

**Problem**: `playerFlow.ts:902`, `enemyFlow.ts:786`, `pvpFlow.ts:418,478` all call `setScreen('menu')` which is not a valid screen name. The router returns `null`, rendering a blank page.

**Fix**: Change `setScreen('menu')` to `setScreen('title')` in all 4 locations. Also change `setPhase('menu')` to `setPhase('idle')`.

Files: `playerFlow.ts`, `enemyFlow.ts`, `pvpFlow.ts`

### Danger 2: ErrorBoundary inadequate

**Problems**:
1. No `componentDidCatch` — errors invisible in production
2. "Reload" button only clears React state (`this.setState({ error: null })`), doesn't reload page — the crash repeats immediately

**Fix A — Upgrade existing ErrorBoundary** (`App.tsx`):
- Add `componentDidCatch` that logs to `console.error` (always, not just DEV)
- Change "Reload" button to call `window.location.reload()`

**Fix B — Add BattleErrorBoundary** (`App.tsx`):
- Wrap `<BattleScreen>` in a dedicated `BattleErrorBoundary`
- On catch: show "Battle error — return to title" with button that calls `setScreen('title')` + clears error state
- This prevents a battle render crash from killing the entire app

### Danger 3: Lazy chunk load → app crash

**Problem**: All `<Suspense>` wrappers in `AppScreenRouter.tsx` lack `ErrorBoundary`. A `ChunkLoadError` (network failure during lazy load) kills the entire app.

**Fix**: Create a reusable `ChunkErrorBoundary` component:
- On catch: show "Failed to load — tap to retry" with a button
- Button calls `window.location.reload()` (simplest reliable retry for chunk loads)
- Wrap each `withScreenSuspense` call in this boundary

Files: `AppScreenRouter.tsx` (or new `ChunkErrorBoundary.tsx`)

### Non-goals

- Do not add error handling to `questionGenerator.ts` (low probability, caught by battle flow)
- Do not modify BGM crossfade fallback (cosmetic-only issue)
- Do not add external error reporting / analytics
- Do not modify audio system catch blocks beyond what was done in the BGM timer fix

---

## Testing

### Effect dedup tests (`UltimateEffect.test.js`)
- Each of 8 elements renders with the shared component
- Config objects pass type checks
- Visual regression: snapshot comparison per element

### Error handling tests
- `battleFlow-errorRecovery.test.js`: verify catch blocks use valid screen names
- Manual: trigger lazy chunk error → verify ChunkErrorBoundary shows retry
- Manual: trigger battle render error → verify BattleErrorBoundary catches it

---

## Verification

1. `npm test` — all pass (existing + new)
2. `npx vite build` — succeeds, bundle budget passes
3. Visual: each element's ultimate move renders identically to before
4. Error scenarios: battle crash → title screen (not blank), chunk load fail → retry UI
