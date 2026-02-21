import { BOSS_IDS } from '../data/monsterConfigs.ts';
import { getCompensation } from '../data/spriteProfiles.ts';

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
}: ResolveBattleLayoutInput): BattleLayoutConfig {
  const isTeamMode = battleMode === "coop" || battleMode === "double";
  const dualUnits = hasDualUnits && isTeamMode;
  const compactDual = dualUnits && compactUI;
  const enemyInfoRight = dualUnits ? "44%" : "42%";
  const playerInfoLeft = dualUnits ? "44%" : "42%";
  const baseEnemyMainRightPct = dualUnits ? (compactDual ? 5 : 8) : 10;
  const enemySubRightPct = dualUnits ? (compactDual ? 25 : 24) : 24;
  const enemySubTopPct = dualUnits ? (compactDual ? 27 : 23) : 14;
  const normalizedPlayerId = normalizeEnemyVisualId(playerStarterId);
  // Beast starters (wolf/tiger/lion) have wide sprites (677×369, comp≈1.7)
  // whose rendered width is much larger than standard starters. Shift them
  // leftward to keep the visual centre in a natural position and prevent
  // the main sprite from overlapping the sub ally in co-op mode.
  const isWideBeast = ["wolf", "tiger", "lion"].includes(normalizedPlayerId);
  const beastLeftAdj = isWideBeast ? -4 : 0;      // nudge main sprite left
  const beastSubLeftAdj = isWideBeast ? 6 : 0;     // push sub ally further right

  const playerMainLeftPct = (dualUnits ? (compactDual ? 4 : 6) : 6) + beastLeftAdj;
  const playerMainBottomPct = dualUnits ? (compactDual ? 9 : 11) : 14;
  const playerSubLeftPct = (dualUnits ? (compactDual ? 21 : 23) : 24) + beastSubLeftAdj;
  const playerSubBottomPct = dualUnits ? (compactDual ? 13 : 15) : 17;
  const isBossPlayer = BOSS_IDS.has(normalizedPlayerId);
  const isLionOrWolfFinal = (normalizedPlayerId === "lion" || normalizedPlayerId === "wolf") && playerStageIdx >= 2;
  const isLionFinalInTeam = dualUnits && normalizedPlayerId === "lion" && playerStageIdx >= 2;
  const isWolfFinalInTeam = dualUnits && normalizedPlayerId === "wolf" && playerStageIdx >= 2;
  const isWolfMid = normalizedPlayerId === "wolf" && playerStageIdx === 1;
  // 小火/小水/小草/小雷 (dragon_kin) stage-0 sprites are slightly smaller
  const isDragonKinBase = ["fire", "water", "grass", "electric"].includes(normalizedPlayerId) && playerStageIdx === 0;
  // 小剛狼/小冰虎/小獅獸 (beast_kin) stage-0 are wide-frame sprites that
  // look undersized at the default 120 base — bump to 145 so the visible
  // creature is comparable to dragon_kin starters after compensation.
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
          : isBeastBase ? 145
          : isDragonKinBase ? 108
          : 120;
  const mainPlayerScale = dualUnits ? (compactDual ? 0.9 : 0.96) : 1;
  // Slightly reduce lion/wolf final forms on compact (mobile) viewports.
  const compactFinalStarterScale = compactUI && isLionOrWolfFinal ? 0.97 : 1;
  // Automatic height compensation from sprite profile (replaces hardcoded ×1.5).
  const playerComp = playerSpriteKey ? getCompensation(playerSpriteKey) : 1;
  const mainPlayerSize = Math.round(mainPlayerBaseSize * mainPlayerScale * compactFinalStarterScale * playerComp);
  const subPlayerSize = Math.round((compactDual ? 104 : 112) * (dualUnits ? (compactDual ? 0.9 : 0.95) : 1));

  const visualEnemyId = normalizeEnemyVisualId(enemyId);
  const isBoss = BOSS_IDS.has(visualEnemyId);
  const isDragonOrFire = visualEnemyId === "fire" || visualEnemyId === "dragon";
  const isEvolvedSlime = Boolean(visualEnemyId.startsWith("slime") && enemyIsEvolved);
  const isWildStarter = visualEnemyId.startsWith("wild_starter_");
  const isEvolvedWildStarter = isWildStarter && Boolean(enemyIsEvolved);
  const isGolumn = visualEnemyId === "golumn" || visualEnemyId === "golumn_mud";
  const isGhostLantern = visualEnemyId === "ghost_lantern";
  const isMushroom = visualEnemyId === "mushroom";
  const isCrazyDragon = visualEnemyId === "boss_crazy_dragon";
  const isSwordGod = visualEnemyId === "boss_sword_god";
  const isHydra = visualEnemyId === "boss_hydra";
  // Mobile compact viewport: move Crazy Dragon slightly to the right so it doesn't
  // feel too close to player-side due to its large body width.
  const crazyDragonRightAdjust = compactUI && isCrazyDragon
    ? (dualUnits ? -1.5 : -3)
    : 0;
  const enemyMainRightPct = Math.max(3, baseEnemyMainRightPct + crazyDragonRightAdjust);
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
  const enemyScale = dualUnits ? (compactDual ? 0.92 : 0.98) : 1;
  const hydraCoopBoost = isHydra && dualUnits ? (compactDual ? 1.08 : 1.1) : 1;
  // Automatic height compensation from sprite profile (replaces hardcoded ×1.5).
  const enemyComp = enemySpriteKey ? getCompensation(enemySpriteKey) : 1;
  const enemySize = Math.round(enemyBaseSize * enemyScale * hydraCoopBoost * enemyComp);

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
  };
}
