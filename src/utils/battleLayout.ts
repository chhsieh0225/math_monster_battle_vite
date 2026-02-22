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
