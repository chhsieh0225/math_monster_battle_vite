# Feature 1: Mastery Boost Popup in Battle

## Problem

Collection-based elemental damage bonuses (e.g. +5% fire damage) are applied silently in `turnResolver.ts`. Players never see that their collection progress yields tangible battle benefits.

## Design

When a player attack benefits from a collection mastery bonus, display a floating text below the damage number: `🔥火精通 +5%`. The popup uses a 1.2s fadeUp animation and only appears when `collectionDamageScale > 1`.

## Data Flow

```
turnResolver.resolvePlayerStrike()
  → calculates collectionDamageScale(attackType)
  → if scale > 1, attaches masteryBoost to strike result
      { damageType: 'fire', bonusPct: 5 }
  → playerFlow builds effect queue, includes mastery popup effect
  → BattleScreen renders MasteryPopup component alongside DamagePopup
  → 1.2s CSS fadeUp animation, then unmounts
```

## Changes

1. **`turnResolver.ts`** — Add `masteryBoost?: { damageType: string; bonusPct: number }` to `PlayerStrikeResult`. Populate when `collectionDamageScale > 1`.

2. **`playerFlow.ts`** — Read `masteryBoost` from strike result, push a `mastery_popup` effect into the turn plan effect queue.

3. **New: `MasteryPopup.tsx`** — Small presentational component. Renders emoji + localized text. CSS animation: translateY(-20px) + fadeOut over 1.2s.

4. **`BattleScreen.tsx`** — Render `<MasteryPopup>` when mastery effect is active, positioned near the enemy damage area.

5. **i18n keys** — `battle.mastery.boost`: `{emoji}{type}精通 +{pct}%`

6. **Element emoji map** — Shared constant mapping damageType → emoji (🔥💧⚡🌿🗡️❄️👻🌑☀️🪨☠️💭).

## Not Changed

- Damage calculation logic (unchanged)
- Persistent HUD layout (unchanged)
- XP / leveling system (unchanged)
