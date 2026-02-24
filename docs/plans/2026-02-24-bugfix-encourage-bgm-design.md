# Bugfix: Wrong-Answer Encouragement + BGM Timer Leak

## #1 答錯缺乏鼓勵

### Problem

連錯 3 次只有「錯誤」音效，容易讓小朋友放棄。

### Solution

新增 `consecutiveWrong: number` 到 battle reducer state。

**鼓勵訊息**：答錯且 `consecutiveWrong >= 3` 時，在 miss 訊息前加一句鼓勵文字（`💪 繼續加油！學習需要練習！`）。

**難度微調**：在 `selectMoveFlow` 產生下一題時，若 `consecutiveWrong >= 3`，把 `diffMod *= 0.85`（降 15%）。答對一題即歸零，回到正常難度。

### Files

- `src/hooks/battle/battleReducer.ts` — 新增 `consecutiveWrong` 欄位，`start_battle` 歸零
- `src/hooks/battle/battleFieldSetters.ts` — 新增 `setConsecutiveWrong` setter
- `src/hooks/battle/playerFlow.ts` — 答錯 +1、答對歸零；連錯 ≥3 加鼓勵文字
- `src/hooks/battle/selectMoveFlow.ts` — 讀 `state.consecutiveWrong`，若 ≥3 則 `diffMod *= 0.85`
- `src/hooks/battle/turnActionDepsBuilder.ts` — 傳遞 `setConsecutiveWrong` 到 playerFlow deps
- `src/i18n/locales/zh-TW.ts` — 新增 `battle.encourage.keepGoing`
- `src/i18n/locales/en-US.ts` — 同上
- Tests: `battleReducer.test.js`, `playerFlow.test.js`, `selectMoveFlow.test.js` 各補測試

### Constants

```typescript
// in balanceConfig.ts or inline
const ENCOURAGE_THRESHOLD = 3;
const WRONG_STREAK_DIFF_DEBUFF = 0.85;
```

### Non-goals

- 不修改 PvP 答題流程（PvP 同樣適用鼓勵，無需特殊處理）
- 不改變 ability model 的長期難度調整邏輯
- 不加新的 BattlePhase

---

## #2 BGM 計時器洩漏

### Problem

`sfx/bgm.ts` 的 `disposeBgm()` 缺少：
1. 顯式 `disarmBgmUnlockRetry()` — gesture listeners 可能殘留
2. `pendingBgmTrack` 清空
3. `stopBgmLoop(immediate=false)` 裡的 350ms `setTimeout` 無法追蹤/取消

### Solution

**修復 A — disposeBgm() 補全**：
```typescript
function disposeBgm(): void {
  disarmBgmUnlockRetry();     // 確保移除 gesture listeners
  pendingBgmTrack = null;     // 清空待播放 track
  try { stopBgmLoop(true); } catch { /* ok */ }
  if (bgmDisconnectTimer) {   // 清除可能殘留的 disconnect timeout
    clearTimeout(bgmDisconnectTimer);
    bgmDisconnectTimer = null;
  }
  for (const [_src, el] of bgmWarmupCache) {
    try { el.pause(); el.src = ''; } catch { /* ok */ }
  }
  bgmWarmupCache.clear();
}
```

**修復 B — 追蹤 disconnect timeout**：
```typescript
let bgmDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

// stopBgmLoop 裡：
if (bgmDisconnectTimer) { clearTimeout(bgmDisconnectTimer); bgmDisconnectTimer = null; }
bgmDisconnectTimer = setTimeout(() => {
  try { g.disconnect(); } catch { /* ok */ }
  bgmDisconnectTimer = null;
}, 350);
```

### Files

- `src/utils/sfx/bgm.ts` — 新增 `bgmDisconnectTimer` 變數；修改 `stopBgmLoop`、`disposeBgm`

### Non-goals

- 不修改 App.tsx 的 BGM driver 邏輯
- 不修改 sfx.ts 主體（僅 bgm.ts）
- 不改變 BGM 播放行為或音量曲線
