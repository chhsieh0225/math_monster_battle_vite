import { BOSS_IDS } from '../data/monsterConfigs.ts';
import { getCompensation, getSpriteShape } from '../data/spriteProfiles.ts';

type BattleMode = string;

type ResolveBattleLayoutInput = {
  battleMode: BattleMode;
  hasDualUnits: boolean;
  compactUI: boolean;
  playerStageIdx: number;
  playerStarterId?: string | null;
  enemyId?: string | null;
  enemySceneType?: string | null;
  enemyIsEvolved?: boolean;
  /** SVG export name of player sprite (e.g. 'playerlion2SVG'). */
  playerSpriteKey?: string;
  /** SVG export name of enemy sprite (e.g. 'ghostLanternSVG'). */
  enemySpriteKey?: string;
  /** Starter id of the co-op sub ally (e.g. 'wolf'). */
  subStarterId?: string | null;
  /** SVG export name of the co-op sub ally sprite. */
  subSpriteKey?: string;
};

export type BattleLayoutConfig = {
  compactDual: boolean;
  enemyInfoRight: string;
  playerInfoLeft: string;
  enemyMainRightPct: number;
  enemySubRightPct: number;
  enemySubTopPct: number;
  playerMainLeftPct: number;
  playerMainBottomPct: number;
  playerSubLeftPct: number;
  playerSubBottomPct: number;
  mainPlayerSize: number;
  subPlayerSize: number;
  enemySize: number;
  enemyTopPct: number;
  /** Sprite-profile height compensation applied to the player (1 = standard). */
  playerComp: number;
  /** Sprite-profile height compensation applied to the enemy (1 = standard). */
  enemyComp: number;
  /** Sprite-profile height compensation applied to the co-op sub ally (1 = standard). */
  subComp: number;
};

export type BattleDeviceTier = 'phone' | 'tablet' | 'laptop';

export const BATTLE_ARENA_VIEWPORT = {
  width: 390,
  height: 550,
  minWidth: 280,
} as const;

type DualityKey = 'single' | 'dual';

type BattleLaneTuningInput = {
  arenaWidthPx: number;
  deviceTier: BattleDeviceTier;
  hasDualUnits: boolean;
  isCoopBattle: boolean;
  showAllySub: boolean;
  showEnemySub: boolean;
  isWidePlayerMainSprite: boolean;
  isWidePlayerSubSprite: boolean;
  isWideEnemyMainSprite: boolean;
  isWideEnemySubSprite: boolean;
};

export type BattleLaneTuning = {
  sepPct: number;
  safeGapPct: number;
  minPlayerLeftPct: number;
  minEnemyRightPct: number;
  allyGapPx: number;
  widePlayerMainScaleCap: number;
  widePlayerSubScaleCap: number;
  wideEnemyMainScaleCap: number;
  wideEnemySubScaleCap: number;
  coopGlobalScale: number;
  wideMainBackShiftPct: number;
  wideSubBackShiftPct: number;
  wideEnemyMainRetreatPct: number;
  wideEnemySubRetreatPct: number;
  allyOverlapRatio: number;
};

export type ResolveBattleLaneSnapshotInput = {
  arenaWidthPx: number;
  compactDual: boolean;
  hasDualUnits: boolean;
  isCoopBattle: boolean;
  showAllySub: boolean;
  showEnemySub: boolean;
  coopUsingSub: boolean;
  playerComp: number;
  subComp: number;
  enemyComp: number;
  rawMainLeftPct: number;
  rawMainBottomPct: number;
  rawSubLeftPct: number;
  rawSubBottomPct: number;
  rawMainSize: number;
  rawSubSize: number;
  starterSubRoleSize: number;
  allyMainRoleSize: number;
  enemyMainRightPct: number;
  enemySubRightPct: number;
  enemyTopPct: number;
  enemySubTopPct: number;
  enemySize: number;
  enemySubId?: string;
  enemySubIsBossVisual: boolean;
  enemySubIsEvolved: boolean;
};

export type BattleLaneSnapshot = {
  playerMainLeftPct: number;
  playerMainBottomPct: number;
  playerSubLeftPct: number;
  playerSubBottomPct: number;
  mainPlayerSize: number;
  subPlayerSize: number;
  enemyMainRightPct: number;
  enemySubRightPct: number;
  enemyTopPct: number;
  enemySubTopPct: number;
  enemySubScale: string;
  enemySubScaleNum: number;
  enemySubSize: number;
  lanePlayerMainScale: number;
  lanePlayerSubScale: number;
  laneEnemyMainScale: number;
  laneEnemySubScale: number;
  playerMainWidthPx: number;
  playerSubWidthPx: number;
  enemyMainWidthPx: number;
  enemySubWidthPx: number;
};

const DEVICE_TIER_THRESHOLD = {
  phoneMaxWidth: 520,
  tabletMaxWidth: 980,
} as const;

const LANE_TUNING_CONFIG = {
  sepPct: { single: 50, dual: 42 },
  safeGapPct: {
    phone: { single: 3.4, dual: 3.8 },
    tablet: { single: 2.9, dual: 3.2 },
    laptop: { single: 2.6, dual: 2.8 },
  },
  laneEdgePct: {
    phone: 0.7,
    tablet: 0.9,
    laptop: 1.1,
  },
  allyGap: {
    minPx: 8,
    widthRatio: 0.018,
  },
  coopGlobalScale: {
    phone: 0.9,
    tablet: 0.96,
    laptop: 1,
  },
  wideScaleCap: {
    playerMain: {
      phone: { single: 0.9, dual: 0.82 },
      tablet: { single: 0.96, dual: 0.9 },
      laptop: { single: 1, dual: 0.96 },
    },
    playerSub: {
      phone: 0.72,
      tablet: 0.8,
      laptop: 0.88,
    },
    enemyMain: {
      phone: { single: 0.9, dual: 0.84 },
      tablet: { single: 0.96, dual: 0.9 },
      laptop: { single: 1, dual: 1 },
    },
    enemySub: {
      phone: 0.76,
      tablet: 0.84,
      laptop: 0.9,
    },
  },
  wideShiftPct: {
    playerMainBack: {
      phone: { single: 1.8, dual: 2.4 },
      tablet: { single: 1.1, dual: 1.5 },
      laptop: { single: 0.6, dual: 0.9 },
    },
    playerSubBack: {
      phone: 2.6,
      tablet: 1.8,
      laptop: 1.1,
    },
    enemyMainRetreat: {
      phone: { single: 1.6, dual: 2.1 },
      tablet: { single: 1.0, dual: 1.4 },
      laptop: { single: 0.6, dual: 0.8 },
    },
    enemySubRetreat: {
      phone: 1.4,
      tablet: 1.0,
      laptop: 0.7,
    },
  },
  allyOverlapRatio: {
    phone: {
      normal: 0.14,
      wide: 0.28,
    },
    tablet: {
      normal: 0,
      wide: 0,
    },
    laptop: {
      normal: 0,
      wide: 0,
    },
  },
} as const;

function dualityKey(hasDualUnits: boolean): DualityKey {
  return hasDualUnits ? 'dual' : 'single';
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveBattleDeviceTier(arenaWidth: number): BattleDeviceTier {
  if (arenaWidth <= DEVICE_TIER_THRESHOLD.phoneMaxWidth) return 'phone';
  if (arenaWidth <= DEVICE_TIER_THRESHOLD.tabletMaxWidth) return 'tablet';
  return 'laptop';
}

export function resolveBattleLaneTuning({
  arenaWidthPx,
  deviceTier,
  hasDualUnits,
  isCoopBattle,
  showAllySub,
  showEnemySub,
  isWidePlayerMainSprite,
  isWidePlayerSubSprite,
  isWideEnemyMainSprite,
  isWideEnemySubSprite,
}: BattleLaneTuningInput): BattleLaneTuning {
  const dualKey = dualityKey(hasDualUnits);
  const sepPct = LANE_TUNING_CONFIG.sepPct[dualKey];
  const safeGapPct = LANE_TUNING_CONFIG.safeGapPct[deviceTier][dualKey];
  const minPlayerLeftPct = LANE_TUNING_CONFIG.laneEdgePct[deviceTier];
  const minEnemyRightPct = LANE_TUNING_CONFIG.laneEdgePct[deviceTier];
  const allyGapPx = showAllySub
    ? Math.max(
      LANE_TUNING_CONFIG.allyGap.minPx,
      arenaWidthPx * LANE_TUNING_CONFIG.allyGap.widthRatio,
    )
    : 0;
  const widePlayerMainScaleCap = isWidePlayerMainSprite
    ? LANE_TUNING_CONFIG.wideScaleCap.playerMain[deviceTier][dualKey]
    : 1;
  const widePlayerSubScaleCap = showAllySub && isWidePlayerSubSprite
    ? LANE_TUNING_CONFIG.wideScaleCap.playerSub[deviceTier]
    : 1;
  const wideEnemyMainScaleCap = isWideEnemyMainSprite
    ? LANE_TUNING_CONFIG.wideScaleCap.enemyMain[deviceTier][dualKey]
    : 1;
  const wideEnemySubScaleCap = showEnemySub && isWideEnemySubSprite
    ? LANE_TUNING_CONFIG.wideScaleCap.enemySub[deviceTier]
    : 1;
  const coopGlobalScale = isCoopBattle
    ? LANE_TUNING_CONFIG.coopGlobalScale[deviceTier]
    : 1;
  const wideMainBackShiftPct = isWidePlayerMainSprite
    ? LANE_TUNING_CONFIG.wideShiftPct.playerMainBack[deviceTier][dualKey]
    : 0;
  const wideSubBackShiftPct = showAllySub && isWidePlayerSubSprite
    ? LANE_TUNING_CONFIG.wideShiftPct.playerSubBack[deviceTier]
    : 0;
  const wideEnemyMainRetreatPct = isWideEnemyMainSprite
    ? LANE_TUNING_CONFIG.wideShiftPct.enemyMainRetreat[deviceTier][dualKey]
    : 0;
  const wideEnemySubRetreatPct = showEnemySub && isWideEnemySubSprite
    ? LANE_TUNING_CONFIG.wideShiftPct.enemySubRetreat[deviceTier]
    : 0;
  const allyOverlapRatio = LANE_TUNING_CONFIG.allyOverlapRatio[deviceTier][
    (isWidePlayerMainSprite || isWidePlayerSubSprite) ? 'wide' : 'normal'
  ];

  return {
    sepPct,
    safeGapPct,
    minPlayerLeftPct,
    minEnemyRightPct,
    allyGapPx,
    widePlayerMainScaleCap,
    widePlayerSubScaleCap,
    wideEnemyMainScaleCap,
    wideEnemySubScaleCap,
    coopGlobalScale,
    wideMainBackShiftPct,
    wideSubBackShiftPct,
    wideEnemyMainRetreatPct,
    wideEnemySubRetreatPct,
    allyOverlapRatio,
  };
}

function normalizeEnemyVisualId(enemyId?: string | null): string {
  if (!enemyId) return '';
  return enemyId.startsWith('pvp_') ? enemyId.slice(4) : enemyId;
}

export function resolveBattleLayout({
  battleMode,
  hasDualUnits,
  compactUI,
  playerStageIdx,
  playerStarterId,
  enemyId,
  enemySceneType,
  enemyIsEvolved,
  playerSpriteKey,
  enemySpriteKey,
  subStarterId,
  subSpriteKey,
}: ResolveBattleLayoutInput): BattleLayoutConfig {
  const isTeamMode = battleMode === "coop" || battleMode === "double";
  const dualUnits = hasDualUnits && isTeamMode;
  const compactDual = dualUnits && compactUI;
  const enemyInfoRight = dualUnits ? "44%" : "42%";
  const playerInfoLeft = dualUnits ? "44%" : "42%";
  const baseEnemyMainRightPct = dualUnits ? (compactDual ? 5 : 8) : 10;
  const enemySubRightPct = dualUnits ? (compactDual ? 16 : 20) : 24;
  const enemySubTopPct = dualUnits ? (compactDual ? 27 : 23) : 14;
  const normalizedPlayerId = normalizeEnemyVisualId(playerStarterId);
  const playerComp = playerSpriteKey ? getCompensation(playerSpriteKey) : 1;
  const subComp = subSpriteKey ? getCompensation(subSpriteKey) : 1;
  const enemyComp = enemySpriteKey ? getCompensation(enemySpriteKey) : 1;
  const playerShape = getSpriteShape(playerSpriteKey);
  const subShape = getSpriteShape(subSpriteKey);
  const enemyShape = getSpriteShape(enemySpriteKey);
  // Beast starters (wolf/tiger/lion) have wide sprites (677×369, comp≈1.7)
  // whose rendered width is much larger than standard starters. Shift them
  // leftward to keep the visual centre in a natural position and prevent
  // the main sprite from overlapping the sub ally in co-op mode.
  const isWideBeast = playerShape === 'wide' || ["wolf", "tiger", "lion"].includes(normalizedPlayerId);
  const normalizedSubId = normalizeEnemyVisualId(subStarterId);
  const isWideBeastSub = subShape === 'wide' || ["wolf", "tiger", "lion"].includes(normalizedSubId);
  const isTigerPlayer = normalizedPlayerId === "tiger";
  const isBeastFinal = isWideBeast && playerStageIdx >= 2;
  const isWolfFinal = normalizedPlayerId === "wolf" && playerStageIdx >= 2;
  const isLionFinal = normalizedPlayerId === "lion" && playerStageIdx >= 2;
  const beastLeftAdj = isWideBeast ? -4 : 0;      // nudge main sprite left
  const beastSubLeftAdj = isWideBeast ? 6 : 0;     // push sub ally further right
  // Aegis Wolf King is visually wide and should stay a bit farther to the left/back.
  const wolfFinalMainLeftAdj = isWolfFinal ? (dualUnits ? -0.8 : -1.2) : 0;
  const wolfFinalMainBottomAdj = isWolfFinal ? (dualUnits ? -1.5 : -2.5) : 0;
  // Lion King final form should sit slightly lower-left during battle.
  const lionFinalMainLeftAdj = isLionFinal ? (dualUnits ? -0.25 : -0.7) : 0;
  const lionFinalMainBottomAdj = isLionFinal ? (dualUnits ? -0.7 : -1.6) : 0;
  // Wide beast final forms (wolf/tiger/lion) still look centered due aspect ratio,
  // so apply an extra lane correction toward lower-left.
  const beastFinalMainLeftAdj = isBeastFinal ? (dualUnits ? -0.4 : -1.0) : 0;
  const beastFinalMainBottomAdj = isBeastFinal ? (dualUnits ? -0.3 : -1.0) : 0;
  // Ice Tiger should sit slightly lower-left for better lane readability.
  const tigerMainLeftAdj = isTigerPlayer ? (dualUnits ? -0.35 : -0.8) : 0;
  const tigerMainBottomAdj = isTigerPlayer ? (dualUnits ? -0.6 : -1.2) : 0;
  // Co-op battlefield readability: keep both allies slightly further from enemy side.
  // Sub ally is moved a bit more than main ally to reduce overlap after slot switches.
  const coopMainLeftShift = dualUnits ? (compactDual ? 1.5 : 2) : 0;
  const coopSubLeftShift = dualUnits ? (compactDual ? 2 : 2.5) : 0;
  // When sub ally uses wide beast sprites (wolf/tiger/lion), pull it back a bit
  // on co-op lanes to prevent mobile overlap into enemy area.
  const wideSubPullback = dualUnits && isWideBeastSub ? (compactDual ? 4 : 3) : 0;

  const playerMainLeftPct = (dualUnits ? (compactDual ? 4 : 6) : 6)
    - coopMainLeftShift
    + beastLeftAdj
    + beastFinalMainLeftAdj
    + wolfFinalMainLeftAdj
    + lionFinalMainLeftAdj
    + tigerMainLeftAdj;
  const playerMainBottomPct = (dualUnits ? (compactDual ? 9 : 11) : 14)
    + beastFinalMainBottomAdj
    + wolfFinalMainBottomAdj
    + lionFinalMainBottomAdj
    + tigerMainBottomAdj;
  const playerSubLeftPct = (dualUnits ? (compactDual ? 21 : 23) : 24) - coopSubLeftShift - wideSubPullback + beastSubLeftAdj;
  const playerSubBottomPct = dualUnits ? (compactDual ? 13 : 15) : 17;
  const isBossPlayer = BOSS_IDS.has(normalizedPlayerId);
  const isLionOrWolfFinal = (normalizedPlayerId === "lion" || normalizedPlayerId === "wolf") && playerStageIdx >= 2;
  const isLionFinalInTeam = dualUnits && normalizedPlayerId === "lion" && playerStageIdx >= 2;
  const isWolfFinalInTeam = dualUnits && normalizedPlayerId === "wolf" && playerStageIdx >= 2;
  const isWolfMid = normalizedPlayerId === "wolf" && playerStageIdx === 1;
  // 小火/小水/小草/小雷 (dragon_kin) stage-0 sprites are slightly smaller
  const isDragonKinBase = ["fire", "water", "grass", "electric"].includes(normalizedPlayerId) && playerStageIdx === 0;
  // 小剛狼/小冰虎/小獅獸 (beast_kin) stage-0 are wide-frame sprites.
  // Keep them slightly above dragon_kin stage-0 but avoid oversized feel in battle.
  const isBeastBase = ["wolf", "tiger", "lion"].includes(normalizedPlayerId) && playerStageIdx === 0;
  const mainPlayerBaseSize = isBossPlayer
    ? 230
    : (isLionFinalInTeam || isWolfFinalInTeam)
      ? 188
      : playerStageIdx >= 2
        ? 200
      : isWolfMid
          ? 150
      : playerStageIdx >= 1
          ? 170
          : isBeastBase ? 122
          : isDragonKinBase ? 108
          : 120;
  const mainPlayerScale = dualUnits ? (compactDual ? 0.9 : 0.96) : 1;
  // Slightly reduce lion/wolf final forms on compact (mobile) viewports.
  const compactFinalStarterScale = compactUI && isLionOrWolfFinal ? 0.97 : 1;
  // PvP readability: one-wing dragon silhouette is wide and appears visually
  // smaller than other bosses, so give it a dedicated in-battle boost.
  const pvpCrazyDragonPlayerBoost = battleMode === "pvp" && normalizedPlayerId === "boss_crazy_dragon"
    ? (compactUI ? 1 : 1.14)
    : 1;
  const wolfFinalSizeScale = isWolfFinal ? 0.92 : 1;
  const mainPlayerSize = Math.round(
    mainPlayerBaseSize
    * mainPlayerScale
    * compactFinalStarterScale
    * wolfFinalSizeScale
    * playerComp
    * pvpCrazyDragonPlayerBoost,
  );

  // Sub ally sizing: wide-sprites (beast starters) need compensation applied,
  // otherwise the creature only fills ~59% of the viewBox height and looks tiny.
  // A small base bump (112→120) keeps beast subs visually proportional.
  const subBaseSize = isWideBeastSub ? (compactDual ? 110 : 120) : (compactDual ? 104 : 112);
  const subPlayerSize = Math.round(subBaseSize * (dualUnits ? (compactDual ? 0.9 : 0.95) : 1) * subComp);

  const visualEnemyId = normalizeEnemyVisualId(enemyId);
  const isBoss = BOSS_IDS.has(visualEnemyId);
  const isDragonOrFire = visualEnemyId === "fire" || visualEnemyId === "dragon";
  const isEvolvedSlime = Boolean(visualEnemyId.startsWith("slime") && enemyIsEvolved);
  const isWildStarter = visualEnemyId.startsWith("wild_starter_");
  const isEvolvedWildStarter = isWildStarter && Boolean(enemyIsEvolved);
  const isGolumn = visualEnemyId === "golumn" || visualEnemyId === "golumn_mud";
  const isGhostLantern = visualEnemyId === "ghost_lantern";
  const isMushroom = visualEnemyId === "mushroom";
  const isCandyKnight = visualEnemyId === "candy_knight";
  const isCandyMonster = visualEnemyId === "candy_monster";
  const isCrazyDragon = visualEnemyId === "boss_crazy_dragon";
  const isSwordGod = visualEnemyId === "boss_sword_god";
  const isHydra = visualEnemyId === "boss_hydra";
  const isDarkDragon = visualEnemyId === "boss";
  const isDarkDragonPhase2Sprite = enemySpriteKey === "bossDarkPhase2SVG";
  const isTigerKingEnemy = (visualEnemyId === "wild_starter_tiger" || visualEnemyId === "tiger")
    && enemySpriteKey === "playertiger2SVG";
  // Mobile compact viewport: bosses should sit farther from player-side to avoid
  // crowding, with a tiny extra retreat for Crazy Dragon's wide silhouette.
  const compactNonBossRightAdjust = compactDual && !isBoss ? -2 : 0;
  const compactBossRightAdjust = compactUI && isBoss
    ? (dualUnits ? -2 : -3)
    : 0;
  const compactGhostLanternRightAdjust = compactUI && isGhostLantern
    ? (compactDual ? -1 : -5)
    : 0;
  const crazyDragonExtraRightAdjust = compactUI && isCrazyDragon
    ? (dualUnits ? -1 : -3)
    : 0;
  const swordGodExtraRightAdjust = isSwordGod
    ? (compactDual ? -0.8 : -2)
    : 0;
  const enemyMainRightPct = Math.max(
    2,
    baseEnemyMainRightPct
      + compactNonBossRightAdjust
      + compactBossRightAdjust
      + compactGhostLanternRightAdjust
      + crazyDragonExtraRightAdjust
      + swordGodExtraRightAdjust,
  );
  const enemyBaseSize = isSwordGod ? 270
    : isCrazyDragon ? 280
    : isHydra ? 260
    : isBoss ? 230
      : isGolumn ? 230
        : isGhostLantern ? 182
          : isMushroom ? 176
        : isEvolvedWildStarter ? 172
        : (isDragonOrFire || isEvolvedSlime) ? 190
          : enemyIsEvolved ? 155 : 120;
  const compactBossScale = compactUI && isBoss
    ? (isHydra ? 0.76 : isCrazyDragon ? 0.8 : isSwordGod ? 0.84 : 0.86)
    : 1;
  const compactGhostLanternScale = compactDual && isGhostLantern ? 0.78 : 1;
  const coopWideEnemyScale = dualUnits && !isBoss && enemyShape === 'wide'
    ? (compactDual ? 0.82 : 0.9)
    : 1;
  const enemyScale = (dualUnits ? (compactDual ? 0.92 : 0.98) : 1)
    * compactBossScale
    * compactGhostLanternScale
    * coopWideEnemyScale;
  const swordGodSizeBoost = isSwordGod
    ? (compactUI ? 1.16 : 1.13)
    : 1;
  const crazyDragonSizeBoost = isCrazyDragon
    ? (compactUI ? 1.12 : 1.06)
    : 1;
  // Hydra looked slightly undersized relative to other final bosses.
  // Apply a small global boost while preserving existing co-op bonus.
  const hydraSizeBoost = isHydra
    ? (compactUI ? 1.06 : 1.04)
    : 1;
  const hydraCoopBoost = isHydra && dualUnits ? (compactDual ? 1.08 : 1.1) : 1;
  const pvpCrazyDragonEnemyBoost = battleMode === "pvp" && isCrazyDragon
    ? (compactUI ? 1 : 1.1)
    : 1;
  const tigerKingEnemyBoost = isTigerKingEnemy
    ? (compactUI ? 1.12 : 1.15)
    : 1;
  const candyKnightSizeBoost = isCandyKnight
    ? (compactUI ? 1.07 : 1.05)
    : 1;
  const candyMonsterSizeBoost = isCandyMonster
    ? (compactUI ? 1.08 : 1.06)
    : 1;
  const darkDragonPhase2Boost = isDarkDragon && isDarkDragonPhase2Sprite
    ? (compactUI ? 1.08 : 1.12)
    : 1;
  const enemySizeRaw = Math.round(
    enemyBaseSize
    * enemyScale
    * swordGodSizeBoost
    * crazyDragonSizeBoost
    * hydraSizeBoost
    * hydraCoopBoost
    * tigerKingEnemyBoost
    * candyKnightSizeBoost
    * candyMonsterSizeBoost
    * darkDragonPhase2Boost
    * enemyComp
    * pvpCrazyDragonEnemyBoost,
  );
  // Phase-2 dark dragon should never render smaller than phase-1 at the same layout tier.
  const darkDragonPhase1Floor = isDarkDragon && isDarkDragonPhase2Sprite
    ? Math.round(enemyBaseSize * enemyScale)
    : 0;
  const enemySize = isDarkDragon && isDarkDragonPhase2Sprite
    ? Math.max(enemySizeRaw, darkDragonPhase1Floor)
    : enemySizeRaw;

  const enemyBaseTopPct = (enemySceneType === "ghost" || isBoss) ? 12
    : enemySceneType === "steel" ? 16 : 26;
  const enemyTopPct = enemyBaseTopPct + (dualUnits ? (compactDual ? 8 : 6) : 0);

  return {
    compactDual,
    enemyInfoRight,
    playerInfoLeft,
    enemyMainRightPct,
    enemySubRightPct,
    enemySubTopPct,
    playerMainLeftPct,
    playerMainBottomPct,
    playerSubLeftPct,
    playerSubBottomPct,
    mainPlayerSize,
    subPlayerSize,
    enemySize,
    enemyTopPct,
    playerComp,
    enemyComp,
    subComp,
  };
}

export function resolveBattleLaneSnapshot({
  arenaWidthPx,
  compactDual,
  hasDualUnits,
  isCoopBattle,
  showAllySub,
  showEnemySub,
  coopUsingSub,
  playerComp,
  subComp,
  enemyComp,
  rawMainLeftPct,
  rawMainBottomPct,
  rawSubLeftPct,
  rawSubBottomPct,
  rawMainSize,
  rawSubSize,
  starterSubRoleSize,
  allyMainRoleSize,
  enemyMainRightPct,
  enemySubRightPct,
  enemyTopPct,
  enemySubTopPct,
  enemySize,
  enemySubId = '',
  enemySubIsBossVisual,
  enemySubIsEvolved,
}: ResolveBattleLaneSnapshotInput): BattleLaneSnapshot {
  const safeArenaWidthPx = Math.max(280, arenaWidthPx || 390);

  // In co-op, swap only horizontal slots when sub is active.
  // Keep each unit's vertical baseline stable to avoid jumpy y-axis motion.
  // For wide beasts on compact screens, keep the inactive unit closer to rear lane.
  const shouldSwapPlayerSlots = isCoopBattle && coopUsingSub;
  const isWideMainSprite = (playerComp || 1) > 1.3;
  const isWideSubSprite = (subComp || 1) > 1.3;
  const compactWideInactiveMainShiftPct = compactDual && isWideMainSprite ? 4.2 : 0;
  const compactWideInactiveSubShiftPct = compactDual && isWideSubSprite ? 6.2 : 0;

  const playerMainLeftPct = shouldSwapPlayerSlots
    ? (compactWideInactiveMainShiftPct > 0
      ? rawMainLeftPct + compactWideInactiveMainShiftPct
      : rawSubLeftPct)
    : rawMainLeftPct;
  const playerMainBottomPct = rawMainBottomPct;
  const playerSubLeftPct = shouldSwapPlayerSlots
    ? rawMainLeftPct
    : (compactWideInactiveSubShiftPct > 0
      ? rawMainLeftPct + compactWideInactiveSubShiftPct
      : rawSubLeftPct);
  const playerSubBottomPct = rawSubBottomPct;

  const mainPlayerSize = coopUsingSub ? starterSubRoleSize : rawMainSize;
  const subPlayerSize = coopUsingSub ? allyMainRoleSize : rawSubSize;

  const isLargeEnemySub = enemySubId === 'golumn' || enemySubId === 'golumn_mud' || enemySubId === 'mushroom';
  const enemySubScale = isLargeEnemySub
    ? (compactDual ? '0.86' : '0.94')
    : (compactDual ? '0.72' : '0.8');
  const enemySubSize = !enemySubId
    ? 96
    : enemySubIsBossVisual
      ? 160
      : isLargeEnemySub
        ? 150
        : enemySubIsEvolved
          ? 120
          : 96;
  const enemySubScaleNum = Number(enemySubScale) || 1;

  const isWidePlayerMainSprite = isWideMainSprite;
  const isWidePlayerSubSprite = isWideSubSprite;
  const isWideEnemyMainSprite = (enemyComp || 1) >= 1.55;
  const isWideEnemySubSprite = Boolean(enemySubId)
    && !enemySubIsBossVisual
    && (enemySubIsEvolved || isLargeEnemySub);

  const deviceTier = resolveBattleDeviceTier(safeArenaWidthPx);
  const laneTuning = resolveBattleLaneTuning({
    arenaWidthPx: safeArenaWidthPx,
    deviceTier,
    hasDualUnits,
    isCoopBattle,
    showAllySub,
    showEnemySub,
    isWidePlayerMainSprite,
    isWidePlayerSubSprite,
    isWideEnemyMainSprite,
    isWideEnemySubSprite,
  });

  const sepPx = safeArenaWidthPx * laneTuning.sepPct / 100;
  const safeGapPx = safeArenaWidthPx * laneTuning.safeGapPct / 100;
  const minPlayerLeftPx = safeArenaWidthPx * laneTuning.minPlayerLeftPct / 100;
  const minEnemyRightPx = safeArenaWidthPx * laneTuning.minEnemyRightPct / 100;
  const playerLaneRightPx = sepPx - safeGapPx;
  const enemyLaneLeftPx = sepPx + safeGapPx;
  const playerLaneWidthPx = Math.max(24, playerLaneRightPx - minPlayerLeftPx);
  const enemyLaneWidthPx = Math.max(24, safeArenaWidthPx - minEnemyRightPx - enemyLaneLeftPx);
  const allyGapPx = laneTuning.allyGapPx;

  // When two allies share one lane on small phones, shrink both together
  // so they fit in-lane before applying positional clamps.
  const playerTotalWidthPx = showAllySub
    ? mainPlayerSize + subPlayerSize + allyGapPx
    : mainPlayerSize;
  const playerLaneScale = Math.min(1, playerLaneWidthPx / Math.max(1, playerTotalWidthPx));
  const basePlayerMainScale = Math.min(playerLaneScale, laneTuning.widePlayerMainScaleCap);
  const basePlayerSubScale = showAllySub
    ? Math.min(playerLaneScale, laneTuning.widePlayerSubScaleCap)
    : 1;
  const baseEnemyMainScale = Math.min(
    1,
    enemyLaneWidthPx / Math.max(1, enemySize),
    laneTuning.wideEnemyMainScaleCap,
  );
  const baseEnemySubScale = Math.min(
    1,
    enemyLaneWidthPx / Math.max(1, enemySubSize * enemySubScaleNum),
    laneTuning.wideEnemySubScaleCap,
  );

  // Co-op readability scaling by device:
  // phone: slightly smaller, tablet: tiny reduction, laptop: unchanged.
  const resolvedPlayerMainScale = Math.min(1, basePlayerMainScale * laneTuning.coopGlobalScale);
  const resolvedPlayerSubScale = Math.min(1, basePlayerSubScale * laneTuning.coopGlobalScale);
  const resolvedEnemyMainScale = Math.min(1, baseEnemyMainScale * laneTuning.coopGlobalScale);
  const resolvedEnemySubScale = Math.min(1, baseEnemySubScale * laneTuning.coopGlobalScale);

  const playerMainWidthPx = mainPlayerSize * resolvedPlayerMainScale;
  const playerSubWidthPx = subPlayerSize * resolvedPlayerSubScale;
  const enemyMainWidthPx = enemySize * resolvedEnemyMainScale;
  const enemySubWidthPx = enemySubSize * enemySubScaleNum * resolvedEnemySubScale;

  const clampPlayerLeftPx = (leftPx: number, spriteWidthPx: number): number => {
    const maxLeftPx = playerLaneRightPx - spriteWidthPx;
    return clampNumber(leftPx, minPlayerLeftPx, Math.max(minPlayerLeftPx, maxLeftPx));
  };
  const clampEnemyRightPx = (rightPx: number, spriteWidthPx: number): number => {
    const maxRightPx = safeArenaWidthPx - spriteWidthPx - enemyLaneLeftPx;
    return clampNumber(rightPx, minEnemyRightPx, Math.max(minEnemyRightPx, maxRightPx));
  };

  let resolvedPlayerMainLeftPx = clampPlayerLeftPx(
    (playerMainLeftPct - laneTuning.wideMainBackShiftPct) * safeArenaWidthPx / 100,
    playerMainWidthPx,
  );
  let resolvedPlayerSubLeftPx = clampPlayerLeftPx(
    (playerSubLeftPct - laneTuning.wideSubBackShiftPct) * safeArenaWidthPx / 100,
    playerSubWidthPx,
  );

  const skipStrictAllySeparation = compactDual && (isWidePlayerMainSprite || isWidePlayerSubSprite);
  if (showAllySub && !skipStrictAllySeparation) {
    // On narrow phones, permit a small ally overlap so wide sprites can stay
    // farther from the enemy lane after main/sub swap without hard clipping.
    const allowAllyOverlapPx = Math.min(playerMainWidthPx, playerSubWidthPx) * laneTuning.allyOverlapRatio;
    const requiredSeparationPx = Math.max(0, playerMainWidthPx + allyGapPx - allowAllyOverlapPx);
    const maxSubLeftPx = Math.max(minPlayerLeftPx, playerLaneRightPx - playerSubWidthPx);
    const minSubLeftPxFromMain = resolvedPlayerMainLeftPx + requiredSeparationPx;
    if (minSubLeftPxFromMain > maxSubLeftPx) {
      resolvedPlayerMainLeftPx = clampPlayerLeftPx(
        maxSubLeftPx - requiredSeparationPx,
        playerMainWidthPx,
      );
    }
    const minSubLeftPx = Math.min(
      maxSubLeftPx,
      resolvedPlayerMainLeftPx + requiredSeparationPx,
    );
    resolvedPlayerSubLeftPx = clampNumber(resolvedPlayerSubLeftPx, minSubLeftPx, maxSubLeftPx);
  }

  const resolvedEnemyMainRightPx = clampEnemyRightPx(
    (enemyMainRightPct + laneTuning.wideEnemyMainRetreatPct) * safeArenaWidthPx / 100,
    enemyMainWidthPx,
  );
  const resolvedEnemySubRightPx = showEnemySub
    ? clampEnemyRightPx(
      (enemySubRightPct + laneTuning.wideEnemySubRetreatPct) * safeArenaWidthPx / 100,
      enemySubWidthPx,
    )
    : enemySubRightPct * safeArenaWidthPx / 100;

  return {
    playerMainLeftPct: resolvedPlayerMainLeftPx / safeArenaWidthPx * 100,
    playerMainBottomPct,
    playerSubLeftPct: resolvedPlayerSubLeftPx / safeArenaWidthPx * 100,
    playerSubBottomPct,
    mainPlayerSize,
    subPlayerSize,
    enemyMainRightPct: resolvedEnemyMainRightPx / safeArenaWidthPx * 100,
    enemySubRightPct: resolvedEnemySubRightPx / safeArenaWidthPx * 100,
    enemyTopPct,
    enemySubTopPct,
    enemySubScale,
    enemySubScaleNum,
    enemySubSize,
    lanePlayerMainScale: resolvedPlayerMainScale,
    lanePlayerSubScale: resolvedPlayerSubScale,
    laneEnemyMainScale: resolvedEnemyMainScale,
    laneEnemySubScale: resolvedEnemySubScale,
    playerMainWidthPx,
    playerSubWidthPx,
    enemyMainWidthPx,
    enemySubWidthPx,
  };
}
