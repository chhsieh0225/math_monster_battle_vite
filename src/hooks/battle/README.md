# Battle Layering Guide

This folder holds the battle-domain layering used by `useBattle`.

## Layer Boundaries

- `battleReducer.ts`
  - Owns persistent battle state transitions.
  - Pure reducer only. No timers, no side effects.
- `turnResolver.ts`
  - Pure combat math / turn decision helpers.
  - No React state and no async scheduling.
- `effectOrchestrator.js`
  - Schedules animation/timing chains through injected `safeTo`.
  - No domain decisions.
- `enemyFlow.ts`
  - Enemy-side battle flow orchestration.
  - Uses resolver + orchestrator + injected state/effects.
- `playerFlow.ts`
  - Player answer / attack flow orchestration.
  - Uses resolver + orchestrator + injected state/effects.
- `pvpFlow.js`
  - PvP-only turn flow and status-resolution orchestration.
  - Keeps `useBattle` free of PvP branch details.
- `coopFlow.js`
  - Co-op only helper flows (party KO handling, support turns, evolution sync helpers).
- `achievementFlow.js`
  - Achievement unlock checks for victory and full-run completion.
  - Injected via callbacks so it remains UI/framework-agnostic.

`useBattle.js` should remain a coordinator that wires these modules together.

## Extension Rules

When adding new combat mechanics:

1. Add pure calculations to `turnResolver.ts`.
2. Keep animation timing in `effectOrchestrator.js`.
3. Keep flow-specific branching in `enemyFlow.ts` or `playerFlow.ts`.
4. Only use `battleReducer.ts` for persistent state transitions.
5. Do not add direct `setTimeout` chains in `useBattle.js`.

## Testing Guidance

- For deterministic logic, prefer unit tests in:
  - `battleReducer.test.js`
  - `turnResolver.test.js`
- For new resolver helpers, add tests before wiring into flows.
