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

## 單人學習循環

- 一般不限時單人冒險，會在每次作答後儲存學習進度；新冒險、續玩及重新載入都會保留。
- 依「運算 + 招式原始數字範圍」分別調整難度。當前難度獨立答對四題才提升，答錯降低一級；使用提示不會推高難度。
- 第一個提示免費且只提供思考方向，後續解題步驟維持原本 XP 費用。使用提示仍保留正常戰鬥獎勵。
- 答錯或使用提示的技能，在至少回答另外兩題後，選到相符招式時優先出新題複習；只有不看提示答對新題，才清除該次待複習紀錄。
- 家長儀表板顯示獨立答對、提示後答對、完成複習及待複習技能數；可獨立重設學習進度，不會刪除歷史遊戲紀錄。
- 紀錄以裝置共用，非個別兒童帳號，儲存於 `mathMonsterBattle_learning_v1`。不回推舊紀錄，清除瀏覽器資料會遺失。儲存失敗時本次遊戲仍可繼續，但不能保證重新載入後保留。
- Co-op、PvP、計時、每日挑戰與連勝塔維持原有難度規則，不寫入此學習進度。

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

