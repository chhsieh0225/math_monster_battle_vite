# 數學寶可夢對戰 (Math Monster Battle) Vite 專案完整審計報告

**報告日期**: 2026年2月13日
**專案版本**: 202602ver03
**開發者**: Chung-Han Hsieh (ch.hsieh@mx.nthu.edu.tw) | Claude (Anthropic) 協助實作

---

## 目錄
1. [專案結構](#專案結構)
2. [遊戲流程](#遊戲流程)
3. [戰鬥系統](#戰鬥系統)
4. [招式系統](#招式系統)
5. [數學題生成](#數學題生成)
6. [計分系統](#計分系統)
7. [敵人系統](#敵人系統)
8. [UI/UX 功能](#ui/ux-功能)
9. [PWA 與部署](#pwa-與部署)
10. [初始怪獸資料](#初始怪獸資料)

---

## 專案結構

### 檔案清單 (28個源文件)

#### 核心應用
- **src/App.jsx** (567行) - 主遊戲邏輯、狀態管理、戰鬥流程控制
- **src/main.tsx** - React 應用進入點

#### 資料層
- **src/data/constants.js** - 遊戲常數 (MAX_MOVE_LVL, POWER_CAPS, HITS_PER_LVL 等)
- **src/data/starters.js** - 3種初始怪獸定義 (火、水、草)
- **src/data/monsters.js** - 5種敵人怪獸定義 + 屬性相剋關係
- **src/data/scenes.jsx** - 5種戰場背景與裝飾定義
- **src/data/sprites.js** - SVG 圖形函數 (未詳細檢視)

#### 工具與鉤子
- **src/utils/questionGenerator.js** - 數學題目生成引擎
- **src/utils/leaderboard.js** - 本地排行榜管理與計分公式
- **src/hooks/useTimer.js** - 計時模式計時器邏輯

#### UI 組件
**屏幕組件**:
- **src/components/screens/TitleScreen.tsx** - 標題與模式選擇
- **src/components/screens/SelectionScreen.jsx** - 初始怪獸選擇
- **src/components/screens/GameOverScreen.tsx** - 遊戲結束、成績、排行榜入選
- **src/components/screens/LeaderboardScreen.tsx** - 排行榜顯示
- **src/components/screens/AchievementScreen.tsx** - 成就列表顯示
- **src/components/screens/EvolveScreen.tsx** - 進化動畫與演出
- **src/components/screens/PvpResultScreen.tsx** - 雙人對戰結算畫面
- **src/components/screens/SettingsScreen.tsx** - 設定畫面（聲音/效能）

**UI 元素**:
- **src/components/ui/HPBar.tsx** - 生命值條顯示
- **src/components/ui/XPBar.tsx** - 經驗值條顯示
- **src/components/ui/MonsterSprite.tsx** - 怪獸 SVG 渲染
- **src/components/ui/DamagePopup.tsx** - 傷害數字浮出動畫
- **src/components/ui/Particle.tsx** - 粒子特效
- **src/components/ui/TextBox.tsx** - 文本對話框

**特效組件**:
- **src/components/effects/FireEffect.jsx** - 火系招式特效
- **src/components/effects/ElecEffect.jsx** - 電系招式特效
- **src/components/effects/WaterEffect.jsx** - 水系招式特效
- **src/components/effects/GrassEffect.jsx** - 草系招式特效
- **src/components/effects/DarkEffect.jsx** - 暗系招式特效
- **src/components/effects/index.js** - 特效導出

#### 樣式與配置
- **src/App.css** (60行) - 所有動畫與樣式定義
- **vite.config.js** - Vite 構建配置 (相對路徑、自動開瀏覽器)
- **index.html** - HTML 進入點 (PWA 配置)
- **package.json** - 依賴管理 (React 19.2.0, Vite 7.3.1)

#### 構建輸出
- **dist/** - 編譯後的靜態資源
- **public/** - 靜態資源 (manifest.json、icon)
- **.github/** - GitHub Actions 配置

---

## 遊戲流程

### 屏幕階段

#### 1. 標題屏 (TitleScreen)
```
↓ 選擇模式 ↓
├─ 一般模式 (timedMode = false)
└─ 計時模式 (timedMode = true, 5秒限制)
```

**特性**:
- 顯示3個初始怪獸的縮小版本並使用浮動動畫
- 提供遊戲說明: 「選擇招式 → 回答數學題 → 打倒怪獸」
- 排行榜快速訪問按鈕

#### 2. 初始怪獸選擇屏 (SelectionScreen)
- 顯示3個可選初始怪獸的卡片
- 每張卡片展示:
  - 屬性圖標與名稱
  - 前3個招式的名稱與說明
  - 屬性背景顏色 (火紅、水藍、草綠)

#### 3. 主戰鬥屏 (Battle Screen)
由多個階段 (phase) 組成:

| Phase | 說明 | 觸發條件 |
|-------|------|---------|
| **menu** | 主菜單，顯示4個招式按鈕 | 玩家可選招 |
| **question** | 數學題目顯示與選擇 | 選擇招式後 |
| **playerAtk** | 玩家招式執行動畫 | 答題正確 |
| **enemyAtk** | 敵人攻擊動畫 | 玩家回合結束 |
| **text** | 文本對話框顯示 | 各種事件通知 |
| **victory** | 敵人被擊倒訊息 | 敵人 HP ≤ 0 |
| **ko** | 玩家怪獸倒下 | 玩家 HP ≤ 0 |

#### 4. 進化屏 (EvolveScreen)
- 觸發條件: 玩家每升級 3 級 (Lv.3, Lv.6, Lv.9等)
- 顯示進化的新外觀與名稱
- 完整的視覺演出: 閃光、旋轉、粒子效果
- 自動恢復全部生命值 + 所有招式升級

#### 5. 遊戲結束屏 (GameOverScreen)
**顯示內容**:
- 最終得分 (黃金色 Press Start 2P 字體)
- 成績統計: 答對、答錯、最大連擊、擊倒敵人數、最終等級、正確率
- 招式等級與威力總結
- 玩家名稱輸入與排行榜儲存
  - 若進入前3名: 顯示「🥇/🥈/🥉 新紀錄！」
- 重新挑戰、查看排行榜、返回主畫面按鈕

#### 6. 排行榜屏 (LeaderboardScreen)
- 顯示前10名成績 (localStorage 儲存)
- 每筆記錄顯示:
  - 排名 (獎牌或序號)
  - 玩家名稱、得分、模式標記 (⏱️計時/👑通關)
  - 敵人數、正確率、等級、日期

#### 7. 敵人遭遇開場
```
文本框: 「【場景名稱】野生的 {敵人名稱} Lv.{等級} 出現了！」
```

### 流程總結
```
標題屏 → 選擇模式 → 初始怪獸選擇 → 戰鬥 (x10輪)
  ↓ (每3級)
  ├→ 進化屏 → 返回戰鬥
  ↓ (戰鬥結束 或 玩家倒下)
遊戲結束屏 → 保存成績 → 排行榜 或 返回主畫面
```

---

## 戰鬥系統

### 戰鬥流程 (Turn-Based)

#### 玩家回合
1. **選擇招式** (phase = "menu")
   - 顯示4個招式按鈕
   - 禁用条件: 危險招式 (risky=true) 未蓄力滿 (charge < 3)

2. **回答題目** (phase = "question")
   - 顯示數學題目與4個選項
   - 計時模式: 5秒限制，剩餘時間以顏色反饋
     - 綠色 (>3s) → 黃色 (1.5-3s) → 紅色 (<1.5s)
   - 正確答案背景變綠，錯誤答案變灰

3. **判定與特效** (phase = "playerAtk")
   - **正確答題**:
     - 增加連擊計數 (streak++)
     - 蓄力值增加 (charge++, 上限3)
     - 計算傷害值
     - 播放對應招式特效
     - 取消事件計時器

   - **答錯**:
     - 清除連擊計數 (streak = 0)
     - 清除蓄力值 (charge = 0)
     - 添加「答錯」計數 (tW++)
     - **危險招式處理** (risky=true):
       - 玩家受傷: `damage = basePower × 0.4`
       - 顯示「招式失控」訊息
       - 如果玩家 HP ≤ 0 → 遊戲結束
     - **非危險招式**: 「攻擊落空」，檢查灼燒傷害

4. **敵人回合** (phase = "enemyAtk")
   - 敵人發動攻擊
   - **特殊防禦觸發** (specDef=true, 連擊≥8):
     - **火系防禦**: 🛡️防護罩 - 完全擋住傷害
     - **水系防禦**: 💨完美閃避 - 玩家閃避敵人攻擊
     - **草系防禦**: 🌿反彈攻擊 - 反傷敵人 120% 傷害
   - **常規傷害計算**: `damage = enemy.atk × (0.8 + 0.4 × random) × 防禦屬性相剋`

### 持續狀態效果

#### 灼燒 (Burn) - 火系
- **觸發**: 火系招式擊中敵人時，敵人未倒下
- **效果**: 灼燒堆疊值 (burnStack) 最多5層
- **傷害**: 每層灼燒造成 2 × burnStack 傷害
- **清除**: 敵人倒下或切換敵人
- **視覺**: 敵人狀態欄顯示「🔥灼燒 x{stackCount}」

#### 凍結 (Freeze) - 水系
- **觸發**: 水系招式擊中敵人，25% + 3% × 招式等級 的機率
- **效果**: 敵人在下一回合無法攻擊，顯示訊息「❄️ {敵人名稱} 被凍住了，無法攻擊！」
- **清除**: 下一回合自動解除，返回 menu 狀態

### 傷害計算公式

#### 玩家發動招式傷害

```javascript
baseDamage = 招式基礎威力 + (招式等級 - 1) × 招式成長值
damage = Math.min(baseDamage, 威力上限[招式索引])

// 連擊加成
if (連擊數 >= 5) damage *= 1.8
else if (連擊數 >= 3) damage *= 1.5

// 進化加成
damage *= (1 + 進化等級 × 0.15)  // 第1進化: ×1.15, 第2進化: ×1.30

// 屬性相剋修正
damage *= 屬性相剋倍率 (0.6, 1.0, 或 1.5)

// 最終四捨五入
damage = Math.round(damage)
```

#### 敵人攻擊傷害

```javascript
baseDamage = Math.round(敵人.atk × (0.8 + 0.4 × random()))
finalDamage = Math.round(baseDamage × 防禦屬性相剋倍率)
```

#### 灼燒額外傷害

```javascript
burnDamage = burnStack × 2  // 每層2點
```

#### 草系反彈傷害

```javascript
refDamage = Math.round(敵人.atk × (0.8 + 0.4 × random()) × 1.2)
```

### 敵人配置與強度擴展

#### 強度擴展公式 (敵人陣容: 10場戰鬥)

```javascript
// App.jsx 第81-95行
順序 = [0, 1, 0, 2, 0, 1, 3, 2, 3, 4]  // 敵人索引
強度係數 = 1 + 戰鬥序號 × 0.12
// 例: 第1戰 ×1.00, 第5戰 ×1.48, 第10戰 ×2.08

敵人_HP = Math.round(基礎HP × 強度係數)
敵人_maxHp = 敵人_HP
敵人_atk = Math.round(基礎atk × 強度係數)
敵人_lvl = 戰鬥序號 + 1
```

#### 進化觸發

```javascript
// 敵人在第 evolveLvl 戰開始進化 (如果 evolveLvl 已定義)
isEvolved = 敵人.evolveLvl && (戰鬥序號 + 1) >= 敵人.evolveLvl
// 使用進化名稱與 SVG 函數
```

---

## 招式系統

### 招式等級與成長

#### 招式升級條件

```javascript
const MAX_MOVE_LVL = 6           // 招式最高等級
const POWER_CAPS = [42, 45, 45, 55]  // 每個招式的威力上限
const HITS_PER_LVL = 2           // 升級所需的成功使用次數

// 升級邏輯
命中數 = mHits[招式索引]
當前等級 = mLvls[招式索引]
升級所需命中數 = HITS_PER_LVL × 當前等級
新威力 = 招式.basePower + 當前等級 × 招式.growth

if (命中數 >= 升級所需命中數 && 當前等級 < MAX_MOVE_LVL && 新威力 <= POWER_CAPS[索引])
  當前等級++
  命中數 = 0
  顯示升級提示 2秒
```

#### 威力計算

```javascript
招式威力 = Math.min(basePower + (Lv - 1) × growth, 威力上限)
```

#### 每個初始怪獸的招式詳情

##### 🔥 火系 (小火獸)

| # | 名稱 | 描述 | 類型 | 基礎威力 | 成長值 | 威力上限 | 範圍 | 操作 | 危險 |
|---|------|------|------|---------|--------|---------|------|------|------|
| 0 | 火花彈 | 簡單乘法 | fire | 12 | 6 | 42 | 2-5 | × | 否 |
| 1 | 烈焰衝 | 九九乘法 | fire | 20 | 5 | 45 | 2-9 | × | 否 |
| 2 | 爆炎轟 | 大數乘法 | fire | 30 | 3 | 45 | 4-12 | × | 否 |
| 3 | 終極爆破 | 大數乘除混合 | dark | 40 | 3 | 55 | 3-12 | ×÷ | 是 |

**火系特性**:
- 灼燒效果: 每次攻擊敵人時 (敵人未倒) 堆疊灼燒層數 (最多5層)
- 灼燒傷害: 每回合造成 `2 × 灼燒層數` 額外傷害
- 特殊防禦 (8連擊): 🛡️防護罩 - 完全阻擋敵人攻擊

##### 💧 水系 (小水獸)

| # | 名稱 | 描述 | 類型 | 基礎威力 | 成長值 | 威力上限 | 範圍 | 操作 | 危險 |
|---|------|------|------|---------|--------|---------|------|------|------|
| 0 | 水泡攻擊 | 簡單除法 | water | 12 | 6 | 42 | 2-5 | ÷ | 否 |
| 1 | 水流波 | 進階除法 | water | 20 | 5 | 45 | 2-9 | ÷ | 否 |
| 2 | 海嘯衝擊 | 大數除法 | water | 30 | 3 | 45 | 4-12 | ÷ | 否 |
| 3 | 終極爆破 | 大數乘除混合 | dark | 40 | 3 | 55 | 3-12 | ×÷ | 是 |

**水系特性**:
- 凍結效果: 25% + 3% × 招式等級 的機率凍結敵人
- 凍結時敵人無法攻擊，下一回合自動解除
- 特殊防禦 (8連擊): 💨完美閃避 - 玩家閃避敵人攻擊

##### 🌿 草系 (小草獸)

| # | 名稱 | 描述 | 類型 | 基礎威力 | 成長值 | 威力上限 | 範圍 | 操作 | 危險 |
|---|------|------|------|---------|--------|---------|------|------|------|
| 0 | 葉刃切 | 加法練習 | grass | 12 | 6 | 42 | 5-50 | + | 否 |
| 1 | 藤鞭打 | 減法練習 | grass | 20 | 5 | 45 | 10-80 | - | 否 |
| 2 | 森林風暴 | 加減混合 | grass | 30 | 3 | 45 | 10-99 | +- | 否 |
| 3 | 終極爆破 | 大數乘除混合 | dark | 40 | 3 | 55 | 3-12 | ×÷ | 是 |

**草系特性**:
- 自我回復: 每次攻擊時回復 `2 + 招式等級` 點生命值
- 特殊防禦 (8連擊): 🌿反彈攻擊 - 將敵人攻擊反傷，傷害為 `敵人atk × (0.8-1.2) × 1.2`

#### 蓄力系統

```javascript
// 蓄力值 (charge): 0-3
// 連續答對時增加 (每次 +1, 上限3)
// 答錯時清零

// 危險招式啟用條件
if (招式.risky && charge < 3) {
  招式按鈕半透明 + 顯示🔒
  點擊無效
}

if (charge === 3) {
  招式按鈕顯示「⚡蓄力完成！」
  可以點擊並使用危險招式
}
```

---

## 數學題生成

### 題目生成引擎 (questionGenerator.js)

#### 乘法題 (×)

```javascript
a = random(range[0] ~ range[1])
b = random(range[0] ~ range[1])
答案 = a × b
題目 = "{a} × {b} = ?"
```

**範例**: 火系「火花彈」: 2-5 範圍
- 可能題目: "3 × 4 = ?" (答案: 12)
- 可能題目: "5 × 5 = ?" (答案: 25)

#### 除法題 (÷)

```javascript
b = random(range[0] ~ range[1])      // 除數
答案 = random(range[0] ~ range[1])    // 商
a = b × 答案                          // 被除數 = 除數 × 商
題目 = "{a} ÷ {b} = ?"
```

**範例**: 水系「水泡攻擊」: 2-5 範圍
- 可能題目: "12 ÷ 3 = ?" (答案: 4)
- 可能題目: "20 ÷ 5 = ?" (答案: 4)

#### 加法題 (+)

```javascript
a = random(range[0] ~ range[1])
b = random(range[0] ~ range[1])
答案 = a + b
題目 = "{a} + {b} = ?"
```

**範例**: 草系「葉刃切」: 5-50 範圍
- 可能題目: "23 + 18 = ?" (答案: 41)

#### 減法題 (-)

```javascript
a = random(range[0] ~ range[1])       // 被減數
b = random(0 ~ a)                     // 減數 (確保結果為正)
答案 = a - b
題目 = "{a} - {b} = ?"
```

**範例**: 草系「藤鞭打」: 10-80 範圍
- 可能題目: "55 - 23 = ?" (答案: 32)

### 選項生成

```javascript
// 目標答案加上3個干擾選項

const spread = Math.max(5, Math.ceil(Math.abs(答案) × 0.2))
const 選項集合 = new Set([答案])

// 第1步: 生成隨機選項 (最多50次嘗試)
while (選項集合.size < 4 && 嘗試 < 50) {
  w = 答案 + random(-spread ~ +spread)
  if (w >= 0 && w !== 答案) 選項集合.add(w)
}

// 第2步: 若不足4個，遞增法補充
let fb = 1
while (選項集合.size < 4) {
  選項集合.add(Math.max(0, 答案 + fb))
  fb++
}

// 第3步: 打亂順序
選項陣列 = shuffle([...選項集合])
```

### 難度配置

| 招式 | 操作 | 範圍 | 難度等級 | 說明 |
|------|------|------|---------|------|
| 火花彈 | × | 2-5 | ⭐ 簡單 | 九九乘法基礎 |
| 烈焰衝 | × | 2-9 | ⭐⭐ 進階 | 完整九九乘法 |
| 爆炎轟 | × | 4-12 | ⭐⭐⭐ 困難 | 大數乘法 |
| 水泡攻擊 | ÷ | 2-5 | ⭐ 簡單 | 基礎除法 |
| 水流波 | ÷ | 2-9 | ⭐⭐ 進階 | 進階除法 |
| 海嘯衝擊 | ÷ | 4-12 | ⭐⭐⭐ 困難 | 大數除法 |
| 葉刃切 | + | 5-50 | ⭐⭐ 進階 | 兩位數加法 |
| 藤鞭打 | - | 10-80 | ⭐⭐⭐ 困難 | 大數減法 |
| 森林風暴 | +- | 10-99 | ⭐⭐⭐⭐ 極難 | 加減混合 |
| 終極爆破 | ×÷ | 3-12 | ⭐⭐⭐⭐ 極難 | 乘除混合 (危險) |

---

## 計分系統

### 成績計算公式

```javascript
/**
 * 計分公式：
 *   基礎分 = (擊倒數 × 100) + (正確率% × 50) + (等級 × 30)
 *   連擊獎勵 = 最大連擊數 × 20（鼓勵持續答對）
 *   計時加成 = 整體 × 1.5（計時模式）
 */

正確率 = (正確數 / (正確數 + 錯誤數)) × 100
基礎分 = (擊倒數 × 100) + (正確率 × 50) + (等級 × 30) + (最大連擊 × 20)

if (計時模式) {
  最終得分 = Math.round(基礎分 × 1.5)
} else {
  最終得分 = Math.round(基礎分)
}
```

### 計分範例

#### 一般模式: 全勝

```
擊倒數: 10, 正確: 50, 錯誤: 0, 等級: 30, 最大連擊: 45
正確率: 100%
基礎分 = (10 × 100) + (100 × 50) + (30 × 30) + (45 × 20)
       = 1000 + 5000 + 900 + 900
       = 7800
最終得分 = 7800
```

#### 計時模式: 全勝

```
相同狀況，計時模式加成 ×1.5
最終得分 = Math.round(7800 × 1.5) = 11700
```

#### 一般模式: 半勝

```
擊倒數: 5, 正確: 25, 錯誤: 25, 等級: 15, 最大連擊: 12
正確率: 50%
基礎分 = (5 × 100) + (50 × 50) + (15 × 30) + (12 × 20)
       = 500 + 2500 + 450 + 240
       = 3690
最終得分 = 3690
```

### 排行榜系統

- **最多儲存**: 前10名成績
- **儲存位置**: localStorage (鍵: "mathMonsterBattle_lb")
- **玩家名稱**: localStorage (鍵: "mathMonsterBattle_name")
- **入選條件**: 得分進入前10名
- **記錄欄位**:
  - score (得分)
  - name (玩家名稱)
  - defeated (擊倒敵人數)
  - correct (答對次數)
  - wrong (答錯次數)
  - accuracy (正確率%)
  - level (最終等級)
  - timed (計時模式標記)
  - maxStreak (最大連擊)
  - completed (是否通關)
  - date (ISO 時間戳)

### 特殊稱號與獎勵

- **連擊大師**: 最大連擊 ≥ 5 時顯示「🔥 連擊大師！」並加分提示
- **新紀錄**: 排行榜前3名顯示 🥇/🥈/🥉 獎牌與「新紀錄！」提示
- **通關標記**: 擊倒全部10個敵人時顯示 👑 標記

---

## 敵人系統

### 敵人陣容 (10場戰鬥)

| 敵人ID | 敵人名稱 | 屬性 | 基礎HP | 基礎atk | 進化等級 | 進化名稱 | 掉落物 | 出場戰鬥 |
|--------|---------|------|--------|---------|---------|---------|--------|---------|
| slime | 史萊姆 | grass 🌿 | 40 | 6 | 5 | 叢林巨魔 | 🍬🧪 | 1, 3, 5 |
| fire | 火焰蜥 | fire 🔥 | 55 | 9 | 5 | 烈焰巨龍 | 🔥💎 | 2, 6 |
| ghost | 幽靈魔 | ghost 👻 | 50 | 8 | 5 | 冥界死神 | 👻⭐ | 4, 8 |
| dragon | 鋼鐵龍 | steel 🛡️ | 80 | 12 | 5 | 鐵甲天龍 | 🐉👑 | 7, 9 |
| boss | 暗黑魔王 | dark 💀 | 120 | 15 | - | 無 | 👑🏆 | 10 |

**戰鬥順序**: `[0, 1, 0, 2, 0, 1, 3, 2, 3, 4]` (MONSTERS 陣列索引)
- 0 = slime, 1 = fire, 2 = ghost, 3 = dragon, 4 = boss

### 敵人強度擴展

```javascript
// 敵人 HP 與攻擊力隨著戰鬥序號增加

強度係數 = 1 + 戰鬥序號 × 0.12

// 敵人 Lv = 戰鬥序號 + 1
敵人.hp = Math.round(基礎HP × 強度係數)
敵人.atk = Math.round(基礎atk × 強度係數)
敵人.lvl = 戰鬥序號 + 1

// 進化判定 (僅用於部分敵人)
if (敵人.evolveLvl && 敵人.lvl >= 敵人.evolveLvl) {
  敵人.name = 進化名稱
  敵人.svgFn = 進化SVG函數
}
```

#### 敵人強度表

| 戰鬥序號 | 係數 | 敵人名稱 | 屬性 | Lv. | 實際HP | 實際Atk | 進化 |
|---------|------|---------|------|-----|--------|---------|------|
| 1 | 1.00 | 史萊姆 | 🌿草 | 1 | 40 | 6 | ✗ |
| 2 | 1.12 | 火焰蜥 | 🔥火 | 2 | 62 | 10 | ✗ |
| 3 | 1.24 | 史萊姆 | 🌿草 | 3 | 50 | 7 | ✗ |
| 4 | 1.36 | 幽靈魔 | 👻靈 | 4 | 68 | 11 | ✗ |
| 5 | 1.48 | 叢林巨魔 | 🌿草 | 5 | 59 | 9 | ✓ (史萊姆進化) |
| 6 | 1.60 | 烈焰巨龍 | 🔥火 | 6 | 88 | 14 | ✓ (火焰蜥進化) |
| 7 | 1.72 | 鐵甲天龍 | 🛡️鋼 | 7 | 138 | 21 | ✓ (鋼鐵龍進化) |
| 8 | 1.84 | 冥界死神 | 👻靈 | 8 | 92 | 15 | ✓ (幽靈魔進化) |
| 9 | 1.96 | 鐵甲天龍 | 🛡️鋼 | 9 | 157 | 24 | ✓ (鋼鐵龍進化) |
| 10 | 2.08 | 暗黑魔王 | 💀暗 | 10 | 250 | 31 | - (BOSS) |

### 屬性相剋系統

#### 相剋表 (以攻擊方屬性為行, 防禦方屬性為列)

```javascript
TYPE_EFF = {
  fire:    {grass:1.5, fire:0.6, water:0.6, ghost:1.5, steel:0.6, dark:1.0},
  electric:{grass:1.0, fire:1.0, water:1.5, ghost:0.6, steel:1.5, dark:1.0},
  water:   {grass:0.6, fire:1.5, water:0.6, ghost:1.0, steel:1.0, dark:1.5},
  grass:   {grass:0.6, fire:0.6, water:1.5, ghost:1.0, steel:0.6, dark:1.0},
  dark:    {grass:1.0, fire:1.0, water:1.0, ghost:1.5, steel:0.6, dark:0.6},
}
```

#### 相剋詳情

| 攻擊屬性 | 效果佳 (×1.5) | 效果不佳 (×0.6) | 一般 (×1.0) |
|---------|--------------|-----------------|-----------|
| 🔥 火 | 🌿草 👻靈 | 🔥火 💧水 🛡️鋼 | 💀暗 |
| ⚡ 電 | 💧水 🛡️鋼 | 👻靈 | 🌿草 🔥火 💀暗 |
| 💧 水 | 🔥火 💀暗 | 🌿草 💧水 | 👻靈 🛡️鋼 |
| 🌿 草 | 💧水 | 🌿草 🔥火 🛡️鋼 | 👻靈 💀暗 |
| 💀 暗 | 👻靈 | 🛡️鋼 💀暗 | 🌿草 🔥火 💧水 |

**示例**:
- 火系招式 vs 草系敵人: ×1.5 (效果絕佳)
- 火系招式 vs 水系敵人: ×0.6 (效果不好)
- 草系招式 vs 鋼系敵人: ×0.6 (效果不好)

---

## UI/UX 功能

### 暫停系統

- **觸發**: 點擊「⏸️ 暫停」按鈕 (menu 階段可見)
- **效果**:
  - 顯示暫停覆蓋層 (70% 黑色透明 + 4px 模糊)
  - 計時器暫停 (如果在計時模式)
  - 顯示「⏸️ 遊戲暫停」文本 + 「點擊任意處繼續」提示
  - 所有遊戲邏輯停止

### 計時器與時間管理

- **計時模式**: 5秒 (TIMER_SEC = 5)
- **超時回調**: 自動標記答案為錯誤，觸發敵人攻擊
- **視覺反饋**:
  - 題目框底部進度條顯示剩餘時間
  - 顏色變化: 綠 (>3s) → 黃 (1.5-3s) → 紅 (<1.5s)
  - 時間≤1.5秒時脈衝動畫 + 紅色警告
  - 顯示精確到小數點後1位 (例: "3.5s")

### 屏幕方向處理

#### 觸控設備檢測

```javascript
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0
```

#### 方向鎖定邏輯

```javascript
// 應用嘗試鎖定為直向 (portrait-primary)
screen.orientation.lock("portrait-primary").catch(() => {})

// 觸發橫向時顯示提示
if (window.innerWidth > window.innerHeight × 1.05 && isTouchDevice()) {
  顯示旋轉提示屏
}
```

#### 旋轉提示屏

- 全屏覆蓋層，漸層背景 (靛藍→深紫→深青)
- 📱 大圖示 + 浮動動畫
- 文本: 「請將手機轉為直立方向」+ 「本遊戲僅支援直向模式」
- 點擊任意處關閉

### 動畫與視覺效果

#### 核心動畫定義 (App.css, 60個關鍵幀)

**戰鬥動畫**:
- `attackLunge`: 玩家衝刺攻擊 (0.6s) - 前進60px, 上升40px
- `enemyAttackLunge`: 敵人衝刺攻擊 (0.6s) - 後退60px, 下降40px
- `enemyHit`: 敵人被擊中 (0.5s) - 抖動效果
- `playerHit`: 玩家被擊中 (0.5s) - 抖動效果

**特效動畫**:
- `fireballFly`: 火球飛行 (180px 距離)
- `lightningStrike`: 閃電擊中 (亮度變化)
- `waterWave`: 水波衝擊
- `darkPulse`: 暗系脈衝擴散
- 屬性特定命中動畫: `enemyFireHit`, `enemyElecHit`, `enemyWaterHit`, `enemyGrassHit`, `enemyDarkHit`

**狀態動畫**:
- `shieldPulse`: 防護罩展開 (0-1.1倍縮放)
- `dodgeSlide`: 閃避側滑 (前後移動)
- `vineCounter`: 藤蔓反彈 (旋轉擴散)
- `specDefReady`: 特殊防禦待命脈衝

**UI 動畫**:
- `popIn`: 元素彈出 (0.3s, 0.8→1 縮放)
- `fadeSlide`: 淡入滑上 (12px 向上移動)
- `dmgPop`: 傷害數字浮出 (50px, 透明)
- `chargeGlow`: 蓄力光暈脈衝

**背景與浮動**:
- `float`: 浮動動畫 (±8px, 3s)
- `floatFlip`: 反向浮動 (翻轉版本)
- `shadowPulse`: 影子脈衝 (縮放 0.82-1.0)
- `sparkle`: 閃爍效果 (旋轉消失)
- `bossFloat`: Boss特殊浮動 (±4px, 2.5s)
- `bossPulse`: Boss光暈脈衝

#### 特殊場景動畫

**火場景**:
- `emberRise`: 火炭上升 (110px, 2.5-3.1s)
- `lavaGlow`: 熔岩發光 (3s 脈衝)

**靈場景**:
- `float`: 靈體浮動 (2個幽靈、星辰、月亮)

**鋼場景**:
- 靜態齒輪與圓形邊框裝飾

**暗場景**:
- `sparkle`: 星光閃爍 (8個隨機位置、時間、不透明度)

### 裝置佈局

#### 固定寬度設計

```css
GameShell {
  width: 100%
  maxWidth: 480px     // 手機標準寬度
  height: 100%        // 全屏高度
  background: #000
  boxShadow: 0 0 40px rgba(0,0,0,0.5)
}
```

#### 響應式組件

**戰鬥屏佈局**:
- 上方: 敵人 HP 條 + 敵人狀態欄 (燃燒/凍結)
- 中央: 戰場背景 + 敵人Sprite + 玩家Sprite + 特效
- 下方: 玩家 HP 條 + 經驗值條 + 招式菜單

**菜單佈局**:
- 2×2 網格: 4個招式按鈕
- 暫停/逃跑按鈕 (右對齐)

**題目佈局**:
- 標題: 招式名稱 + 計時標記
- 題目框: 題目式子 + 倒計時 + 進度條
- 選項: 2×2 網格 4個選項按鈕

---

## PWA 與部署

### PWA 配置

#### index.html Meta 標籤

```html
<!-- 應用名稱 & 描述 -->
<meta name="description" content="數學怪獸對戰 - 用算數打敗怪獸！" />

<!-- PWA 清單 -->
<link rel="manifest" href="/manifest.json" />

<!-- Apple iOS 支持 -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icon-192.png" />

<!-- 顏色 & 圖標 -->
<meta name="theme-color" content="#0f172a" />
<link rel="icon" type="image/png" href="/icon-192.png" />
```

#### manifest.json (推測)

應包含:
- name: "數學寶可夢對戰"
- start_url: "/"
- display: "standalone" (全屏應用模式)
- theme_color: "#0f172a"
- icons: [icon-192.png, ...]

### Vite 部署配置

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  base: './',           // 相對路徑 - 適配任何部署路徑
  server: {
    open: true,         // npm run dev 自動開啟瀏覽器
    host: true,         // 允許區網 IP 訪問 (手機測試)
  },
})
```

#### 相對路徑益處

- 部署到 `example.com/math-game/` 仍可正常運作
- 部署到 GitHub Pages 子目錄時無需路徑調整
- 支持本地文件協議 (file://) 與任何主機

### GitHub Pages 部署

基於 `.github/workflows/` 配置 (推測):
- 自動化構建與部署流程
- 編譯: `vite build` → dist/ 目錄
- 部署: dist/ 上傳至 gh-pages 分支

#### 資源路徑處理

```javascript
// 背景圖片 (scenes.jsx)
bgImg: BG_IMGS.grass      // 從 sprites.js 導入的相對路徑

// SVG 函數 (動態生成)
svgFn: playerfire0SVG     // 返回 SVG 字符串，不需要外部資源
```

---

## 初始怪獸資料

### 🔥 火系 - 小火獸

```javascript
{
  id: "fire",
  name: "小火獸",
  type: "fire",
  typeIcon: "🔥",
  typeName: "火",
  c1: "#f87171",        // 主要顏色 (紅)
  c2: "#b91c1c",        // 次要顏色 (深紅)

  stages: [
    {
      name: "小火獸",
      emoji: "🔥",
      svgFn: playerfire0SVG
    },
    {
      name: "烈焰獸",
      emoji: "🔥",
      svgFn: playerfire1SVG
    },
    {
      name: "炎龍王",
      emoji: "🔥",
      svgFn: playerfire2SVG
    }
  ],

  moves: [
    {
      name: "火花彈",
      icon: "🔥",
      type: "fire",
      desc: "簡單乘法",
      basePower: 12,
      growth: 6,
      range: [2, 5],
      ops: ["×"],
      color: "#ef4444",
      bg: "#fef2f2"
    },
    {
      name: "烈焰衝",
      icon: "🔥",
      type: "fire",
      desc: "九九乘法",
      basePower: 20,
      growth: 5,
      range: [2, 9],
      ops: ["×"],
      color: "#f97316",
      bg: "#fff7ed"
    },
    {
      name: "爆炎轟",
      icon: "🔥",
      type: "fire",
      desc: "大數乘法",
      basePower: 30,
      growth: 3,
      range: [4, 12],
      ops: ["×"],
      color: "#dc2626",
      bg: "#fef2f2"
    },
    {
      name: "終極爆破",
      icon: "💥",
      type: "dark",
      desc: "大數乘除混合",
      basePower: 40,
      growth: 3,
      range: [3, 12],
      ops: ["×", "÷"],
      color: "#a855f7",
      bg: "#faf5ff",
      risky: true
    }
  ]
}
```

**進化路線**: 小火獸 (Lv.1) → 烈焰獸 (Lv.3) → 炎龍王 (Lv.6)
**特性**:
- 灼燒: 每次攻擊堆疊灼燒層數 (最多5層)，敵人每回合受 `2×層數` 傷害
- 特殊防禦: 連擊達8時觸發防護罩，完全阻擋敵人攻擊

---

### 💧 水系 - 小水獸

```javascript
{
  id: "water",
  name: "小水獸",
  type: "water",
  typeIcon: "💧",
  typeName: "水",
  c1: "#60a5fa",        // 主要顏色 (淺藍)
  c2: "#1d4ed8",        // 次要顏色 (深藍)

  stages: [
    {
      name: "小水獸",
      emoji: "💧",
      svgFn: playerwater0SVG
    },
    {
      name: "波濤獸",
      emoji: "💧",
      svgFn: playerwater1SVG
    },
    {
      name: "海龍王",
      emoji: "💧",
      svgFn: playerwater2SVG
    }
  ],

  moves: [
    {
      name: "水泡攻擊",
      icon: "💧",
      type: "water",
      desc: "簡單除法",
      basePower: 12,
      growth: 6,
      range: [2, 5],
      ops: ["÷"],
      color: "#3b82f6",
      bg: "#eff6ff"
    },
    {
      name: "水流波",
      icon: "🌊",
      type: "water",
      desc: "進階除法",
      basePower: 20,
      growth: 5,
      range: [2, 9],
      ops: ["÷"],
      color: "#2563eb",
      bg: "#eff6ff"
    },
    {
      name: "海嘯衝擊",
      icon: "🌊",
      type: "water",
      desc: "大數除法",
      basePower: 30,
      growth: 3,
      range: [4, 12],
      ops: ["÷"],
      color: "#1d4ed8",
      bg: "#dbeafe"
    },
    {
      name: "終極爆破",
      icon: "💥",
      type: "dark",
      desc: "大數乘除混合",
      basePower: 40,
      growth: 3,
      range: [3, 12],
      ops: ["×", "÷"],
      color: "#a855f7",
      bg: "#faf5ff",
      risky: true
    }
  ]
}
```

**進化路線**: 小水獸 (Lv.1) → 波濤獸 (Lv.3) → 海龍王 (Lv.6)
**特性**:
- 凍結: 25% + 3% × 招式等級 的機率凍結敵人，敵人下一回合無法攻擊
- 特殊防禦: 連擊達8時觸發閃避，玩家閃過敵人攻擊

---

### 🌿 草系 - 小草獸

```javascript
{
  id: "grass",
  name: "小草獸",
  type: "grass",
  typeIcon: "🌿",
  typeName: "草",
  c1: "#4ade80",        // 主要顏色 (淺綠)
  c2: "#16a34a",        // 次要顏色 (深綠)

  stages: [
    {
      name: "小草獸",
      emoji: "🌿",
      svgFn: playergrass0SVG
    },
    {
      name: "花葉獸",
      emoji: "🌿",
      svgFn: playergrass1SVG
    },
    {
      name: "森林王",
      emoji: "🌿",
      svgFn: playergrass2SVG
    }
  ],

  moves: [
    {
      name: "葉刃切",
      icon: "🌿",
      type: "grass",
      desc: "加法練習",
      basePower: 12,
      growth: 6,
      range: [5, 50],
      ops: ["+"],
      color: "#22c55e",
      bg: "#f0fdf4"
    },
    {
      name: "藤鞭打",
      icon: "🌿",
      type: "grass",
      desc: "減法練習",
      basePower: 20,
      growth: 5,
      range: [10, 80],
      ops: ["-"],
      color: "#16a34a",
      bg: "#f0fdf4"
    },
    {
      name: "森林風暴",
      icon: "🌿",
      type: "grass",
      desc: "加減混合",
      basePower: 30,
      growth: 3,
      range: [10, 99],
      ops: ["+", "-"],
      color: "#15803d",
      bg: "#dcfce7"
    },
    {
      name: "終極爆破",
      icon: "💥",
      type: "dark",
      desc: "大數乘除混合",
      basePower: 40,
      growth: 3,
      range: [3, 12],
      ops: ["×", "÷"],
      color: "#a855f7",
      bg: "#faf5ff",
      risky: true
    }
  ]
}
```

**進化路線**: 小草獸 (Lv.1) → 花葉獸 (Lv.3) → 森林王 (Lv.6)
**特性**:
- 自我回復: 每次攻擊回復 `2 + 招式等級` 生命值
- 特殊防禦: 連擊達8時觸發反彈，將敵人攻擊反傷為 `敵人atk × (0.8-1.2) × 1.2`

---

## 進化系統詳情

### 進化觸發

```javascript
// App.jsx 第228-235行
if (pStg < 2 && pLvl % 3 === 0) {
  // 等級為3的倍數時觸發
  safeTo(() => {
    setPStg(s => Math.min(s + 1, 2))    // 進化階段增加 (上限2)
    setScreen("evolve")                 // 切換到進化屏
  }, 1500)

  setPHp(PLAYER_MAX_HP)                 // 恢復全部生命值
  setMLvls(prev => prev.map(v => v + 1)) // 所有招式升級+1
}
```

### 進化等級與福利

| 進化階段 | 觸發等級 | 外觀變化 | 生命值 | 招式升級 | 攻擊加成 |
|---------|---------|---------|---------|---------|---------|---------|
| 初始 (0) | Lv.1-2 | 小型 (155px) | - | - | ×1.00 |
| 第1進化 (1) | Lv.3 | 中型 (170px) | 全回復 | 全部+1級 | ×1.15 |
| 第2進化 (2) | Lv.6 | 大型 (200px) | 全回復 | 全部+1級 | ×1.30 |

### 進化屏視覺演出 (2秒)

1. **0ms**: 白色閃光覆蓋全屏 (evolveFlash 1.8s)
2. **200ms**: 3個彩色爆炸環擴散 (colorBurst)
3. **400ms**: 12個軌道元素旋轉 (evolveSpin)
4. **600ms**: 8個星光閃爍 (sparkle)
5. **800ms**: 進化名稱與新外觀淡入
6. **1900ms**: 「繼續戰鬥！」按鈕可點擊

---

## 版本資訊

- **當前版本**: 202602ver03
- **框架**: React 19.2.0
- **打包工具**: Vite 7.3.1
- **構建目標**: 現代化瀏覽器 (ES2020+)
- **開發工具**: ESLint 9.39.1
- **語言**: Traditional Chinese (繁體中文)
- **字體**:
  - 正文: Google Fonts "Noto Sans TC" (400/700/900)
  - 數字: "Press Start 2P" (復古像素)

---

## 優化建議與注意事項

### 當前實現的優化

✅ 相對路徑配置 (支持任何部署路徑)
✅ 本地存儲排行榜 (無服務器依賴)
✅ 暫停/繼續機制 (計時模式)
✅ 流暢的 60fps 動畫
✅ 觸控和桌面雙支持
✅ 響應式佈局 (固定480px寬度)
✅ PWA 就緒 (manifest + icon)

### 可優化的方向

⚠️ **性能**: 大量 CSS 動畫可考慮 GPU 加速或動畫分組
⚠️ **國際化**: 目前僅繁體中文，可擴展多語言支持
⚠️ **無障礙**: 可添加鍵盤快捷鍵與屏幕閱讀器支持
⚠️ **資料安全**: localStorage 無加密，排行榜可人為竄改
⚠️ **靜態資源**: SVG 內聯於代碼，大型專案可分離為文件

---

## 總結

**數學寶可夢對戰** 是一個功能完整的教育遊戲，以 Vite + React 構建，專注於：

1. **數學教育**: 4種操作 (+ - × ÷) 的分級練習
2. **遊戲化學習**: 戰鬥系統、升級、進化、排行榜驅動持續參與
3. **多模式**: 一般模式與計時模式提供不同難度
4. **視覺設計**: 60+個動畫、5個主題場景、豐富特效
5. **移動優先**: PWA 兼容、觸控優化、屏幕鎖定
6. **數據持久化**: 本地排行榜與玩家名稱儲存

專案代碼組織清晰，分層明確，易於擴展與維護。
