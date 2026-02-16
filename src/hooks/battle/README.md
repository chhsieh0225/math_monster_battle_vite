# Battle Layering Guide

This folder holds the battle-domain layering used by `useBattle`.

## Layer Boundaries

- `battleReducer.ts`
  - Owns persistent battle state transitions.
  - Pure reducer only. No timers, no side effects.
- `battleFieldSetters.ts`
  - Builds `set_field` wrapper setters used by `useBattle`.
  - Keeps repetitive reducer field-updater wiring out of the hook body.
- `turnResolver.ts`
  - Pure combat math / turn decision helpers.
  - No React state and no async scheduling.
- `effectOrchestrator.ts`
  - Schedules animation/timing chains through injected `safeTo`.
  - No domain decisions.
- `enemyFlow.ts`
  - Enemy-side battle flow orchestration.
  - Uses resolver + orchestrator + injected state/effects.
- `playerFlow.ts`
  - Player answer / attack flow orchestration.
  - Uses resolver + orchestrator + injected state/effects.
- `pvpFlow.ts`
  - PvP-only turn flow and status-resolution orchestration.
  - Keeps `useBattle` free of PvP branch details.
- `timeoutFlow.ts`
  - Timer timeout resolution (PvP turn swap + PvE timeout handling).
  - Keeps timer-branch logic out of `useBattle`.
- `startGameFlow.ts`
  - Start-of-run flow orchestration for PvP and standard modes.
  - Keeps `startGame` branch logic out of `useBattle`.
- `startBattleFlow.ts`
  - Per-round encounter bootstrap and opening-text orchestration.
  - Keeps `startBattle` encounter setup out of `useBattle`.
- `turnHelpers.ts`
  - Shared turn helpers (`getActingStarter`, PvP turn label/swap).
  - Reused by flow modules and `useBattle`.
- `victoryFlow.ts`
  - Victory settlement orchestration (status reset, exp/level progression, drop text).
  - Keeps post-defeat settlement logic out of `useBattle`.
- `advanceFlow.ts`
  - Advance-phase helpers (continue after victory, pending evolution routing).
  - Keeps `advance` branch logic focused in one module.
- `answerFlow.ts`
  - Answer-phase helpers (acting starter context + answer event logging).
  - Keeps `onAns` pre-processing concise.
- `selectMoveFlow.ts`
  - Move-select to question-start orchestration.
  - Keeps `selectMove` guard and question-boot logic out of `useBattle`.
- `coopFlow.ts`
  - Co-op only helper flows (party KO handling, support turns, evolution sync helpers).
- `coopTurnRotationFlow.ts`
  - Pure decision helper for co-op active-slot auto-rotation.
  - Lets `useCoopTurnRotation` stay thin and testable.
- `sessionLifecycleModel.ts`
  - Pure payload/stat builders for session result and quit events.
  - Keeps `useBattleSessionLifecycle` focused on wiring and side effects.
- `achievementFlow.ts`
  - Achievement unlock checks for victory and full-run completion.
  - Injected via callbacks so it remains UI/framework-agnostic.

`useBattle.js` should remain a coordinator that wires these modules together.

## Extension Rules

When adding new combat mechanics:

1. Add pure calculations to `turnResolver.ts`.
2. Keep animation timing in `effectOrchestrator.ts`.
3. Keep flow-specific branching in `enemyFlow.ts` or `playerFlow.ts`.
4. Only use `battleReducer.ts` for persistent state transitions.
5. Do not add direct `setTimeout` chains in `useBattle.js`.

## Testing Guidance

- For deterministic logic, prefer unit tests in:
  - `battleReducer.test.js`
  - `turnResolver.test.js`
- For new resolver helpers, add tests before wiring into flows.
