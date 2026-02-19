# 數學怪獸大亂鬥 (Math Monster Brawl)

React + Vite 教育對戰遊戲專案。  
目前已整合單人、計時、Co-op、PvP、每日挑戰、連勝塔、圖鑑、收藏/道具、家長儀表板與雙語系（`zh-TW` / `en-US`）。

## 開發指令

- `npm run dev` : 啟動開發伺服器
- `npm run build` : 產生 production build
- `npm run lint` : ESLint
- `npm run typecheck` : TypeScript 型別檢查（`tsc --noEmit`）
- `npm test` : Node 測試（`node --test`）
- `npm run test:coverage` : 輸出 coverage 報告
- `npm run test:coverage:gate` : coverage 門檻檢查（lines 80% / branches 60% / functions 70%）

## 目前架構（2026-02）

- `src/App.tsx`
  - 僅負責跨畫面 shell：路由 handoff、設定畫面進出、音樂切換與 preload。
  - `BattleScreen` 使用 lazy loading。
- `src/hooks/useBattle.ts`
  - 對外 typed public API（`state / actions / view`）。
- `src/hooks/useBattleCore.ts`
  - 戰鬥主協調器（已拆出大量 battle 子模組）。
- `src/hooks/battle/*`
  - reducer / flow / resolver / orchestrator 分層。
  - 目前新增 `useBattleOrchestrationState.ts`、`useBattleFlowState.ts` 收斂 orchestration state。

> battle 領域分層說明：`src/hooks/battle/README.md`

## 品質現況（最新本機基線）

- 測試數量：`289` tests（全綠）
- Coverage（最新 gate run）：  
  - Lines: `86.35%`
  - Branches: `67.39%`
  - Functions: `77.95%`
- 型別遷移現況（src）：  
  - `*.ts/*.tsx`：`185` 檔  
  - `*.js/*.jsx`：`63` 檔

## 文檔與追蹤

- 進度紀錄：`PROGRESS.md`
- battle 子層設計：`src/hooks/battle/README.md`

## 近期優先方向

1. 持續縮減 `*.js/*.jsx` 檔案（優先 battle 相關高耦合區塊）。
2. 針對低覆蓋模組補測（先從 `enemyFlow`、`pvpStrikeResolver`、deps builders）。
3. 持續整理畫面層樣式與響應式細節（避免 inline style 回流）。
