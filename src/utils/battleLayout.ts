import { BOSS_IDS } from '../data/monsterConfigs.ts';

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
}: ResolveBattleLayoutInput): BattleLayoutConfig {
  const isTeamMode = battleMode === "coop" || battleMode === "double";
  const dualUnits = hasDualUnits && isTeamMode;
  const compactDual = dualUnits && compactUI;
  const enemyInfoRight = dualUnits ? "44%" : "42%";
  const playerInfoLeft = dualUnits ? "44%" : "42%";
  const enemyMainRightPct = dualUnits ? (compactDual ? 5 : 8) : 10;
  const enemySubRightPct = dualUnits ? (compactDual ? 25 : 24) : 24;
  const enemySubTopPct = dualUnits ? (compactDual ? 27 : 23) : 14;
  const playerMainLeftPct = dualUnits ? (compactDual ? 4 : 6) : 6;
  const playerMainBottomPct = dualUnits ? (compactDual ? 9 : 11) : 14;
  const playerSubLeftPct = dualUnits ? (compactDual ? 21 : 23) : 24;
  const playerSubBottomPct = dualUnits ? (compactDual ? 13 : 15) : 17;

  const normalizedPlayerId = normalizeEnemyVisualId(playerStarterId);
  const isBossPlayer = BOSS_IDS.has(normalizedPlayerId);
  const isLionFinalInTeam = dualUnits && normalizedPlayerId === "lion" && playerStageIdx >= 2;
  const mainPlayerBaseSize = isBossPlayer
    ? 230
    : isLionFinalInTeam
      ? 188
      : playerStageIdx >= 2
        ? 200
        : playerStageIdx >= 1
          ? 170
          : 120;
  const mainPlayerScale = dualUnits ? (compactDual ? 0.9 : 0.96) : 1;
  const mainPlayerSize = Math.round(mainPlayerBaseSize * mainPlayerScale);
  const subPlayerSize = Math.round((compactDual ? 104 : 112) * (dualUnits ? (compactDual ? 0.9 : 0.95) : 1));

  const visualEnemyId = normalizeEnemyVisualId(enemyId);
  const isBoss = BOSS_IDS.has(visualEnemyId);
  const isDragonOrFire = visualEnemyId === "fire" || visualEnemyId === "dragon";
  const isEvolvedSlime = Boolean(visualEnemyId.startsWith("slime") && enemyIsEvolved);
  const isGolumn = visualEnemyId === "golumn" || visualEnemyId === "golumn_mud";
  const isCrazyDragon = visualEnemyId === "boss_crazy_dragon";
  const isSwordGod = visualEnemyId === "boss_sword_god";
  const isHydra = visualEnemyId === "boss_hydra";
  const enemyBaseSize = isSwordGod ? 270
    : isCrazyDragon ? 260
    : isHydra ? 260
    : isBoss ? 230
      : isGolumn ? 230
        : (isDragonOrFire || isEvolvedSlime) ? 190
          : enemyIsEvolved ? 155 : 120;
  const enemyScale = dualUnits ? (compactDual ? 0.92 : 0.98) : 1;
  const hydraCoopBoost = isHydra && dualUnits ? (compactDual ? 1.08 : 1.1) : 1;
  const enemySize = Math.round(enemyBaseSize * enemyScale * hydraCoopBoost);

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
  };
}
