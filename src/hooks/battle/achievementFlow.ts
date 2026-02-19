import { getLevelMaxHp } from '../../utils/playerHp.ts';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import type { AchievementId } from '../../types/game';

type TryUnlock = (id: AchievementId) => void;

type BattleState = {
  enemy?: { id?: string } | null;
  pHp?: number;
  tW?: number;
  timedMode?: boolean;
  pLvl?: number;
  pStg?: number;
  starter?: { id?: string } | null;
};

type EncyclopediaState = {
  encountered: Record<string, number>;
  defeated: Record<string, number>;
  [key: string]: unknown;
};

type SetEncData = (updater: (prev: EncyclopediaState) => EncyclopediaState) => void;

type ApplyVictoryAchievementsArgs = {
  state: BattleState;
  tryUnlock: TryUnlock;
};

type ApplyGameCompletionAchievementsArgs = {
  state: BattleState;
  tryUnlock: TryUnlock;
  setEncData: SetEncData;
  encTotal: number;
};

const STARTER_CLEAR_ACHIEVEMENTS: Partial<Record<string, AchievementId>> = {
  fire: 'fire_clear',
  water: 'water_clear',
  grass: 'grass_clear',
  electric: 'electric_clear',
  lion: 'lion_clear',
  wolf: 'wolf_clear',
};

function unlockStarterClearAchievement(starterId: string | undefined, tryUnlock: TryUnlock): void {
  if (!starterId) return;
  const achievementId = STARTER_CLEAR_ACHIEVEMENTS[starterId];
  if (achievementId) tryUnlock(achievementId);
}

export function applyVictoryAchievements({
  state,
  tryUnlock,
}: ApplyVictoryAchievementsArgs): void {
  tryUnlock('first_win');
  if (BOSS_IDS.has(state.enemy?.id ?? '')) tryUnlock('boss_kill');
  if ((state.pHp || 0) <= 5) tryUnlock('low_hp');
}

export function applyGameCompletionAchievements({
  state,
  tryUnlock,
  setEncData,
  encTotal,
}: ApplyGameCompletionAchievementsArgs): void {
  if ((state.tW || 0) === 0) tryUnlock('perfect');
  if (state.timedMode) tryUnlock('timed_clear');
  if ((state.pHp || 0) >= getLevelMaxHp(state.pLvl || 1, state.pStg || 0)) tryUnlock('no_damage');
  unlockStarterClearAchievement(state.starter?.id, tryUnlock);

  setEncData((prev) => {
    const encounteredCount = Object.keys(prev.encountered || {}).length;
    const defeatedCount = Object.keys(prev.defeated || {}).length;
    if (encounteredCount >= encTotal) tryUnlock('enc_all');
    if (defeatedCount >= encTotal) tryUnlock('enc_defeat');
    return prev;
  });
}
