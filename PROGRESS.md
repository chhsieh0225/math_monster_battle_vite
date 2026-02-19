# PROGRESS

此檔案改為「現況 + 里程碑 + 下一步」格式，避免舊版審計內容與實際程式狀態脫節。  
舊版長篇審計仍可透過 Git 歷史查看。

---

## 0. 專案現況快照（2026-02-19）

- 遊戲版本：`202602ver10`（`src/data/constants.ts`）
- 核心模式：單人、計時、Co-op、PvP、每日挑戰、連勝塔
- 主要附屬系統：圖鑑、成就、收藏掉落、道具庫、家長儀表板、雙語系（zh-TW / en-US）
- 架構形態：`App.tsx` 薄殼 + `useBattle` 公開 API + `useBattleCore` 協調 + `src/hooks/battle/*` 領域模組

### 品質指標（最新本機驗證）

- 測試：`289` tests 全綠
- Coverage（`npm run test:coverage:gate`）：
  - lines: `86.35%`
  - branches: `67.39%`
  - functions: `77.95%`
- coverage gate：
  - lines `>= 80%`
  - branches `>= 60%`
  - functions `>= 70%`
- 型別遷移（src）：
  - TS/TSX：`185` 檔
  - JS/JSX：`63` 檔

---

## 1. 已完成里程碑（重點）

## 2026-02-13 ~ 2026-02-16

- TypeScript 遷移基線建立（`strict` + `typecheck` 流程）。
- 戰鬥邏輯拆層落地：
  - reducer / resolver / flow / orchestrator 分離
  - `battle` 子模組大量單元測試補齊
- 多畫面與模式擴充完成：
  - Daily Challenge / Tower / PvP / Co-op / Dashboard / Encyclopedia
- 音效系統持續擴充：
  - BGM + SFX 分離控制
  - 多場景/多 Boss 曲目綁定

## 2026-02-17 ~ 2026-02-18

- `App.tsx` 精簡為 render shell，戰鬥畫面改 lazy 載入。
- 戰鬥背景與 BGM preload/prefetch 加入分級策略（含低效能網路保守模式）。
- 題庫、掉落、平衡與資料檔持續 TS 化與測試化。
- 內容雙語化範圍擴大（戰鬥文字、圖鑑、主 UI）。

## 2026-02-19（本次文檔同步前）

- `useBattleCore` 再收斂：
  - orchestration refs 抽離到 `useBattleOrchestrationState.ts`
  - pause 狀態抽離到 `useBattlePauseState`
  - flow state（screen/timedMode/battleMode + challenge queue 切換）抽離到 `useBattleFlowState.ts`
- coverage gate 正式加到 `package.json` scripts：
  - `test:coverage`
  - `test:coverage:gate`

---

## 2. 目前主要結構（維護視角）

- `src/App.tsx`
  - 跨畫面控制、設定進出、BGM 控制與 preload，非戰鬥邏輯主體。
- `src/hooks/useBattle.ts`
  - 對 UI 提供穩定介面：`state/actions/view`。
- `src/hooks/useBattleCore.ts`
  - 戰鬥領域協調器（已拆大量細節到 `src/hooks/battle/*`）。
- `src/hooks/battle/*`
  - 純運算：`turnResolver.ts`
  - 狀態轉移：`battleReducer.ts`
  - 流程控制：`playerFlow.ts`、`enemyFlow.ts`、`pvpFlow.ts`、`timeoutFlow.ts` 等
  - API 組裝：`publicStateBuilder.ts`、`publicActionsBuilder.ts`、`publicViewBuilder.ts`

---

## 3. 當前風險與缺口（仍需持續）

1. JS/JSX 殘量仍高（`63` 檔），長期會拖慢重構安全性。
2. 覆蓋率雖達 gate，但部分關鍵模組仍偏低：
   - `enemyFlow.ts`
   - `pvpStrikeResolver.ts`
   - 多個 deps builder / adapter 類檔案
3. `useBattleCore.ts` 仍是大型協調器，後續應持續以「不過度拆分」方式收斂。

---

## 4. 下一階段（優先順序）

1. 補測低 coverage 的 battle 關鍵流程模組，先把高風險分支補齊。
2. 以功能區塊為單位持續 JS -> TS 遷移（先 battle 相關，再 UI 邊緣檔）。
3. 維持每批次固定品質閘門：
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run test:coverage:gate`
   - `npm run build`

---

## 5. 備註

- battle 分層規範請見：`src/hooks/battle/README.md`
- 本檔為「當前可行版本」追蹤，不再維護過時的大型一次性審計內容。
