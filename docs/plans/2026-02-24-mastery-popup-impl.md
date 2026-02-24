# Mastery Boost Popup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a floating `🔥精通 +5%` text after damage numbers when a collection mastery bonus applies.

**Architecture:** Extend `PlayerStrikeResult` with optional `masteryBoost` info, then use the existing `addD()` popup system in `playerFlow.ts` to show a delayed mastery text below the damage number. No new components needed.

**Tech Stack:** React, TypeScript, CSS animations (existing `dmgPop` keyframe), i18n

---

### Task 1: Add element emoji constant

**Files:**
- Create: `src/data/elementEmoji.ts`
- Test: `src/data/elementEmoji.test.js`

**Step 1: Write the test**

```javascript
// src/data/elementEmoji.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TYPE_EMOJI } from './elementEmoji.ts';

describe('TYPE_EMOJI', () => {
  it('maps all collection damage types to emojis', () => {
    const expectedTypes = [
      'fire', 'water', 'electric', 'grass', 'steel',
      'ice', 'light', 'dark', 'ghost', 'rock', 'poison', 'dream', 'all',
    ];
    for (const t of expectedTypes) {
      assert.ok(TYPE_EMOJI[t], `missing emoji for ${t}`);
      assert.ok(TYPE_EMOJI[t].length > 0);
    }
  });

  it('returns undefined for unknown types', () => {
    assert.equal(TYPE_EMOJI['banana'], undefined);
  });
});
```

**Step 2: Run test — expect FAIL** (module not found)

```bash
npm test 2>&1 | grep -E 'elementEmoji|pass|fail'
```

**Step 3: Implement**

```typescript
// src/data/elementEmoji.ts
export const TYPE_EMOJI: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  electric: '⚡',
  grass: '🌿',
  steel: '🗡️',
  ice: '❄️',
  light: '☀️',
  dark: '🌑',
  ghost: '👻',
  rock: '🪨',
  poison: '☠️',
  dream: '💭',
  all: '⭐',
};
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/data/elementEmoji.ts src/data/elementEmoji.test.js
git commit -m "feat: add TYPE_EMOJI constant for element→emoji mapping"
```

---

### Task 2: Extend PlayerStrikeResult with masteryBoost

**Files:**
- Modify: `src/hooks/battle/turnResolver.ts:122-134` (PlayerStrikeResult type)
- Modify: `src/hooks/battle/turnResolver.ts:390-477` (resolvePlayerStrike function)
- Test: `src/hooks/battle/turnResolver.test.js`

**Step 1: Write the test**

Add to `turnResolver.test.js`:

```javascript
test('resolvePlayerStrike returns masteryBoost when collectionDamageScale > 1', () => {
  const withBoost = resolvePlayerStrike({
    move: { basePower: 20, growth: 2, type: 'fire' },
    enemy: { mType: 'grass', trait: null },
    moveIdx: 0, moveLvl: 3, didLevel: false,
    streak: 0, stageBonus: 0, cursed: false,
    playerHp: 100, bossPhase: 0,
    collectionDamageScale: 1.05,
  });
  assert.deepStrictEqual(withBoost.masteryBoost, { damageType: 'fire', bonusPct: 5 });

  const noBoost = resolvePlayerStrike({
    move: { basePower: 20, growth: 2, type: 'fire' },
    enemy: { mType: 'grass', trait: null },
    moveIdx: 0, moveLvl: 3, didLevel: false,
    streak: 0, stageBonus: 0, cursed: false,
    playerHp: 100, bossPhase: 0,
    collectionDamageScale: 1,
  });
  assert.equal(noBoost.masteryBoost, undefined);
});
```

**Step 2: Run test — expect FAIL** (masteryBoost is undefined)

**Step 3: Implement**

In `turnResolver.ts`:

1. Add to `PlayerStrikeResult` type (line 122-134):
```typescript
  masteryBoost?: { damageType: string; bonusPct: number };
```

2. Add `move` type info to params — the `move.type` is already available as `move` param.

3. Before the `return` statement (line 465), add:
```typescript
  const masteryBoost = clampedCollectionScale > 1
    ? { damageType: move.type ?? 'all', bonusPct: Math.round((clampedCollectionScale - 1) * 100) }
    : undefined;
```

4. Add `masteryBoost` to the return object.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/hooks/battle/turnResolver.ts src/hooks/battle/turnResolver.test.js
git commit -m "feat: return masteryBoost from resolvePlayerStrike"
```

---

### Task 3: Show mastery popup in playerFlow

**Files:**
- Modify: `src/hooks/battle/playerFlow.ts:746` (after damage addD call)
- Modify: `src/hooks/battle/playerFlow.ts` (add import)

**Step 1: Add import** at top of playerFlow.ts:

```typescript
import { TYPE_EMOJI } from '../../data/elementEmoji.ts';
```

**Step 2: After the damage popup** (line 746), add mastery popup:

After this existing line:
```typescript
addD(isCrit ? `💥-${appliedHitDmg}` : `-${appliedHitDmg}`, fxt().enemyMain.x, fxt().enemyMain.y, isCrit ? '#ff6b00' : dmgColor);
```

Add:
```typescript
          if (strike.masteryBoost) {
            const { damageType, bonusPct } = strike.masteryBoost;
            const emoji = TYPE_EMOJI[damageType] || '⭐';
            const masteryLabel = tr(t, 'battle.mastery.boost', '{emoji}精通 +{pct}%', { emoji, pct: String(bonusPct) });
            safeToIfBattleActive(
              () => addD(masteryLabel, fxt().enemyMain.x + 10, fxt().enemyMain.y + 30, '#fbbf24'),
              250,
            );
          }
```

**Step 3: Commit**

```bash
git add src/hooks/battle/playerFlow.ts
git commit -m "feat: show mastery boost popup after damage number"
```

---

### Task 4: Add i18n keys

**Files:**
- Modify: `src/i18n/locales/zh-TW.ts`
- Modify: `src/i18n/locales/en-US.ts`

**Step 1: Add keys**

zh-TW.ts (before the `} as const;` closing):
```typescript
  "battle.mastery.boost": "{emoji}精通 +{pct}%",
```

en-US.ts:
```typescript
  "battle.mastery.boost": "{emoji}Mastery +{pct}%",
```

**Step 2: Commit**

```bash
git add src/i18n/locales/zh-TW.ts src/i18n/locales/en-US.ts
git commit -m "i18n: add mastery boost popup text"
```

---

### Task 5: Run full test suite and build

**Step 1: Run tests**

```bash
npm test
```

Expected: All tests pass (previous 535 + 2 new = 537).

**Step 2: Run build**

```bash
npx vite build && node scripts/bundle-budget.mjs
```

Expected: All budgets pass (elementEmoji.ts goes to game-data chunk, tiny addition).

**Step 3: Visual verification**

Start dev server, navigate to battle, verify mastery popup appears after attacking if collection bonuses are active.

**Step 4: Final commit if any fixups needed**

---

### Summary

| Task | Files | LOC | Estimated |
|------|-------|-----|-----------|
| 1. Element emoji constant | +2 new | ~25 | 3 min |
| 2. Extend PlayerStrikeResult | 1 modify + 1 test | ~15 | 5 min |
| 3. Mastery popup in playerFlow | 1 modify | ~8 | 3 min |
| 4. i18n keys | 2 modify | ~2 | 2 min |
| 5. Test + build + verify | — | — | 5 min |
| **Total** | 6 files | ~50 | ~18 min |
