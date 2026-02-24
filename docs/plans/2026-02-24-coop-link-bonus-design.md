# Co-op Link Bonus Design

## Goal

When the player answers correctly for 2+ consecutive rounds in co-op mode, the partner's support attack becomes guaranteed (100%) with +30% damage, providing a visible reward for sustained accuracy.

## Trigger

- **Condition:** `streak >= 2` AND battle mode is `coop` or `double`
- **Scope:** Applies only to the ally support turn that immediately follows the current player attack
- **Reset:** streak resets to 0 on wrong answer, removing the bonus

## Effects When Active

| Aspect | Normal | Link Bonus |
|--------|--------|------------|
| Support chance | 45% | 100% |
| Support damage | base formula | base formula x 1.3 |
| Visual cue | none | "🔗 連結攻擊！" gold text before support attack |

## Data Flow

```
playerFlow.ts (streak >= 2 check)
  → buildPostHitResolutionPlan({ ..., linkActive: true })
    → applyPostHitResolutionPlan()
      → runCoopAllySupportTurn({ ..., linkActive: true })
        → skip chance(0.45) gate
        → buildCoopAllySupportTurnPlan({ ..., linkActive: true })
          → damage *= 1.3
          → prepend link_text effect
```

## Changes by File

### balanceConfig.ts
Add under `coop` section:
```ts
coop: {
  linkStreak: 2,        // streak threshold to activate link bonus
  linkDamageMult: 1.3,  // damage multiplier when link active
}
```

### coopFlow.ts
- `BuildCoopSupportTurnPlanArgs` — add `linkActive?: boolean`
- `buildCoopAllySupportTurnPlan()` — when `linkActive`, multiply `rawDmg` by `linkDamageMult` (before boss reduction), and prepend a `set_text` effect with link attack message
- `RunCoopAllySupportTurnArgs` — add `linkActive?: boolean`
- `runCoopAllySupportTurn()` — when `linkActive`, skip `chance(0.45)` check

### playerFlow.ts
- `buildPostHitResolutionPlan()` — add `streak` and `isCoopMode` params, compute `linkActive`
- `PostHitResolutionPlan` — add `linkActive: boolean` field
- `applyPostHitResolutionPlan()` — pass `linkActive` to `runAllySupportTurn`

### i18n locales
- zh-TW: `"battle.coop.linkAttack": "🔗 連結攻擊！傷害 +30%"`
- en-US: `"battle.coop.linkAttack": "🔗 Link Attack! Damage +30%"`

### Tests
- `coopFlow.test.js` — test that `linkActive` skips chance gate and boosts damage
- `playerFlow.test.js` (if applicable) — test `linkActive` computation in post-hit plan

## Non-Goals
- No new state variables in battleReducer
- No new battle phases
- No visual indicator before the attack (only the text when it triggers)
