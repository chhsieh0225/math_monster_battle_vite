# God Hook Refactor: useBattleCore.ts

## Problem

`useBattleCore.ts` is 1,419 lines. While 30+ modules have already been extracted to `./battle/*`, the wiring layer (contextRef + useCallback + useStableCallback triple pattern) remains monolithic.

## Strategy

Extract 5 sub-hooks from useBattleCore, ordered simple → complex. Each extraction follows the same pattern: move the contextRef + impl + stable callback triple into a new file, export a hook that accepts deps and returns the callback(s).

## Extractions

### 1. `useGenBattleQuestion` (~27 lines)

**From:** lines 405-431
**Deps in:** `rand`, `recentQuestionDisplaysRef`
**Returns:** `genBattleQuestion(move, diffMod, options?)`
**File:** `src/hooks/battle/useGenBattleQuestion.ts`

### 2. `useChallengeBattleModifiers` (~25 lines)

**From:** lines 384-402 + derived scalars
**Deps in:** `dailyPlan`, `towerPlan`, `round`, `battleMode`
**Returns:** `{ currentChallengeBattleRule, challengeDamageMult, challengeComboMult, questionTimerSec, questionAllowedOps }`
**File:** `src/hooks/battle/useChallengeBattleModifiers.ts`

### 3. `useVictoryRewardCallbacks` (~65 lines)

**From:** lines 857-920 (inline closures in handleVictoryImpl)
**Deps in:** `t`, `setInventory`, `setCollectionPerks`, `setCollectionPopup`, `randInt`
**Returns:** `{ onDropResolved, onCollectionUpdated }`
**File:** `src/hooks/battle/useVictoryRewardCallbacks.ts`

### 4. `useOnAnsWiring` (~91 lines)

**From:** lines 1085-1175
**Deps in:** ~30 items (sr, callbacks, setters — all already exist as stable refs)
**Returns:** `onAns(choice)`
**File:** `src/hooks/battle/useOnAnsWiring.ts`

### 5. `useStartGameWiring` (~116 lines)

**From:** lines 669-784
**Deps in:** ~24 items (challenge state, roster builders, lifecycle ops)
**Returns:** `startGame(starterOverride?, modeOverride?, allyOverride?)`
**File:** `src/hooks/battle/useStartGameWiring.ts`

## Expected Result

- useBattleCore.ts: 1,419 → ~1,095 lines (-22%)
- 5 new files, each 30-120 lines
- No behavior change — pure mechanical extraction
- All 583 tests continue to pass

## Non-goals

- Do not change the public API (state/actions/view)
- Do not modify battleReducer or battleFieldSetters
- Do not restructure the existing sub-hooks
- Do not split callbacks that are already <30 lines of wiring
