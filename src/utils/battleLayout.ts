import { BOSS_IDS } from '../data/monsterConfigs.ts';

type BattleMode = string;

type ResolveBattleLayoutInput = {
  battleMode: BattleMode;
  hasDualUnits: boolean;
  compactUI: boolean;
  playerStageIdx: number;
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

export function resolveBattleLayout({
  battleMode,
  hasDualUnits,
  compactUI,
  playerStageIdx,
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

  const mainPlayerBaseSize = playerStageIdx >= 2 ? 200 : playerStageIdx >= 1 ? 170 : 120;
  const mainPlayerScale = dualUnits ? (compactDual ? 0.9 : 0.96) : 1;
  const mainPlayerSize = Math.round(mainPlayerBaseSize * mainPlayerScale);
  const subPlayerSize = Math.round((compactDual ? 104 : 112) * (dualUnits ? (compactDual ? 0.9 : 0.95) : 1));

  const isBoss = BOSS_IDS.has(enemyId ?? '');
  const isDragonOrFire = enemyId === "fire" || enemyId === "dragon";
  const isEvolvedSlime = Boolean(enemyId?.startsWith("slime") && enemyIsEvolved);
  const isGolumn = enemyId === "golumn" || enemyId === "golumn_mud";
  const isCrazyDragon = enemyId === "boss_crazy_dragon";
  const isSwordGod = enemyId === "boss_sword_god";
  const enemyBaseSize = isSwordGod ? 270
    : isCrazyDragon ? 260
    : isBoss ? 230
      : isGolumn ? 230
        : (isDragonOrFire || isEvolvedSlime) ? 190
          : enemyIsEvolved ? 155 : 120;
  const enemyScale = dualUnits ? (compactDual ? 0.92 : 0.98) : 1;
  const enemySize = Math.round(enemyBaseSize * enemyScale);

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
