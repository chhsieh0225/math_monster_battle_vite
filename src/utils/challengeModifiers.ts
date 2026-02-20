/**
 * Challenge Modifier System
 *
 * 將 challengeCatalog 裡宣告的 modifierTags（如 'boss-round', 'strict-time'）
 * 轉為具體的戰鬥數值調整。所有乘數預設為 1（乘法單位元），多個 tag 的效果以乘法疊加。
 *
 * 設計原則：
 *   - 純函式、零副作用，方便單元測試
 *   - composable：每個 tag 獨立定義，resolveModifiers 負責合併
 *   - 新增 modifier 只要在 MODIFIER_REGISTRY 多加一筆，不動任何其他檔案
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 一個 modifier tag 可影響的所有效果維度 */
export type ModifierEffect = {
  /** 敵人 HP 倍率 (>1 更難) */
  enemyHpMult?: number;
  /** 敵人 ATK 倍率 (>1 更難) */
  enemyAtkMult?: number;
  /** 玩家傷害倍率 (>1 更強) */
  playerDamageMult?: number;
  /** 答題計時器倍率 (<1 更難，時間更短) */
  timerMult?: number;
  /** combo 加成倍率 (>1 連擊更有利) */
  comboScaleMult?: number;
};

/** 合併後的完整效果，所有欄位皆已填入（無 undefined） */
export type ResolvedModifiers = Required<ModifierEffect>;

// ---------------------------------------------------------------------------
// Identity（乘法單位元）
// ---------------------------------------------------------------------------

const IDENTITY: ResolvedModifiers = {
  enemyHpMult: 1,
  enemyAtkMult: 1,
  playerDamageMult: 1,
  timerMult: 1,
  comboScaleMult: 1,
};

// ---------------------------------------------------------------------------
// Registry — 每個 tag 的效果定義
// ---------------------------------------------------------------------------

const MODIFIER_REGISTRY: Record<string, ModifierEffect> = {
  // ─── 敵人強化 ───
  'boss-round': { enemyHpMult: 1.2, enemyAtkMult: 1.1 },

  // ─── 時間壓力 ───
  'strict-time': { timerMult: 0.85 },
  'high-pace': { timerMult: 0.8 },

  // ─── 玩家增益 ───
  'quick-start': { playerDamageMult: 1.15 },
  'combo-focus': { comboScaleMult: 1.2 },
  'combo-ramp': { comboScaleMult: 1.35 },

  // ─── 精準挑戰 ───
  'precision': { playerDamageMult: 1.1, timerMult: 0.9 },
  'fail-fast': { enemyAtkMult: 1.15 },

  // ─── 多目標 ───
  'type-pressure': { enemyHpMult: 1.1 },
  'multi-target': { enemyHpMult: 0.9 },
  'duel-wave': { enemyHpMult: 0.92 },

  // ─── 上下文標記（無數值效果） ───
  // 'tower', 'timed', 'unknown-focus', 'clean-start', 'mixup', 'unknown'
  // 這些 tag 用於 UI 顯示或未來擴充，目前無機械效果
};

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * 將一組 modifier tags 合併為最終數值效果。
 * 合併規則：所有同名乘數相乘（commutative & associative）。
 *
 * @example
 *   resolveModifiers(['boss-round', 'strict-time'])
 *   // → { enemyHpMult: 1.2, enemyAtkMult: 1.1, timerMult: 0.85, ... }
 */
export function resolveModifiers(tags: readonly string[] | null | undefined): ResolvedModifiers {
  if (!tags || tags.length === 0) return { ...IDENTITY };

  const result = { ...IDENTITY };

  for (const tag of tags) {
    const fx = MODIFIER_REGISTRY[tag];
    if (!fx) continue;

    if (fx.enemyHpMult != null) result.enemyHpMult *= fx.enemyHpMult;
    if (fx.enemyAtkMult != null) result.enemyAtkMult *= fx.enemyAtkMult;
    if (fx.playerDamageMult != null) result.playerDamageMult *= fx.playerDamageMult;
    if (fx.timerMult != null) result.timerMult *= fx.timerMult;
    if (fx.comboScaleMult != null) result.comboScaleMult *= fx.comboScaleMult;
  }

  return result;
}

/**
 * 檢查一組 tags 裡是否有任何具有機械效果的 modifier。
 * 用於 UI 層判斷是否需要顯示 modifier badge。
 */
export function hasActiveModifiers(tags: readonly string[] | null | undefined): boolean {
  if (!tags || tags.length === 0) return false;
  return tags.some((tag) => tag in MODIFIER_REGISTRY);
}

/**
 * 取得指定 tag 的顯示用效果摘要（給 UI tooltip 用）。
 * 回傳 null 表示該 tag 無機械效果。
 */
export function getModifierDisplayInfo(tag: string): ModifierEffect | null {
  return MODIFIER_REGISTRY[tag] || null;
}

/** 公開 IDENTITY 供測試用 */
export const MODIFIER_IDENTITY = IDENTITY;
