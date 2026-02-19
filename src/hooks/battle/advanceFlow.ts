import { buildNextEvolvedAlly, isCoopBattleMode } from './coopFlow.ts';
import { processPvpTurnStart } from './pvpFlow.ts';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import type { ScreenName, StarterVm } from '../../types/battle';
import type { AchievementId } from '../../types/game';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type EnemyLite = {
  id?: string;
  name?: string;
};

type StarterLite = StarterVm;

type BattleState = {
  battleMode?: string;
  enemySub?: EnemyLite | null;
  allySub?: StarterLite | null;
  pHpSub?: number;
  pStg?: number;
  round?: number;
};

type NumberSetter = (value: number | ((prev: number) => number)) => void;
type PhaseSetter = (value: string) => void;
type TextSetter = (value: string) => void;

type ContinueFromVictoryFlowArgs = {
  state: BattleState;
  enemiesLength: number;
  setScreen: (value: ScreenName) => void;
  dispatchBattle: (action: { type: 'promote_enemy_sub' }) => void;
  localizeEnemy: (enemy: EnemyLite | null, locale?: string) => EnemyLite | null;
  locale?: string;
  setBText: TextSetter;
  setPhase: PhaseSetter;
  finishGame: () => void;
  setPHp: NumberSetter;
  setPHpSub: NumberSetter;
  getStageMaxHp: (stageIdx?: number) => number;
  getStarterMaxHp: (starter: StarterLite | null | undefined) => number;
  startBattle: (idx: number) => void;
  t?: Translator;
};

type HandlePendingEvolutionArgs = {
  pendingEvolveRef: { current: boolean };
  state: BattleState;
  setPStg: NumberSetter;
  tryUnlock: (id: AchievementId) => void;
  getStageMaxHp: (stageIdx?: number) => number;
  setPHp: NumberSetter;
  setAllySub: (value: StarterLite | null) => void;
  setPHpSub: NumberSetter;
  getStarterMaxHp: (starter: StarterLite | null | undefined) => number;
  setMLvls: (value: number[] | ((prev: number[]) => number[])) => void;
  maxMoveLvl: number;
  setScreen: (value: ScreenName) => void;
};

type PvpTurnStartArgs = Parameters<typeof processPvpTurnStart>[0];

type TryProcessPvpTextAdvanceArgs = {
  state: PvpTurnStartArgs['state'];
  handlers: Omit<PvpTurnStartArgs, 'state'>;
};

function formatFallback(template: string, params?: TranslatorParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m: string, token: string) => String(params[token] ?? ''));
}

function tr(
  t: Translator | undefined,
  key: string,
  fallback: string,
  params?: TranslatorParams,
): string {
  if (typeof t === 'function') return t(key, fallback, params);
  return formatFallback(fallback, params);
}

export function continueFromVictoryFlow({
  state,
  enemiesLength,
  setScreen,
  dispatchBattle,
  localizeEnemy,
  locale,
  setBText,
  setPhase,
  finishGame,
  setPHp,
  setPHpSub,
  getStageMaxHp,
  getStarterMaxHp,
  startBattle,
  t,
}: ContinueFromVictoryFlowArgs): void {
  if (isCoopBattleMode(state.battleMode) && state.enemySub) {
    setScreen('battle');
    dispatchBattle({ type: 'promote_enemy_sub' });
    const promotedEnemy = localizeEnemy(state.enemySub, locale);
    setBText(tr(t, 'battle.enemySub.promote', '💥 {enemy} steps in!', {
      enemy: promotedEnemy?.name || state.enemySub.name || tr(t, 'battle.enemy.unknown', 'Enemy'),
    }));
    setPhase(BOSS_IDS.has(promotedEnemy?.id ?? state.enemySub.id ?? '') ? 'bossIntro' : 'text');
    return;
  }

  const nextRound = (state.round || 0) + 1;
  if (nextRound >= enemiesLength) {
    finishGame();
    return;
  }

  setPHp((prev) => Math.min(prev + 10, getStageMaxHp(state.pStg || 0)));
  if (isCoopBattleMode(state.battleMode) && state.allySub && (state.pHpSub || 0) > 0) {
    setPHpSub((prev) => Math.min(prev + 8, getStarterMaxHp(state.allySub)));
  }
  startBattle(nextRound);
}

export function handlePendingEvolution({
  pendingEvolveRef,
  state,
  setPStg,
  tryUnlock,
  getStageMaxHp,
  setPHp,
  setAllySub,
  setPHpSub,
  getStarterMaxHp,
  setMLvls,
  maxMoveLvl,
  setScreen,
}: HandlePendingEvolutionArgs): boolean {
  if (!pendingEvolveRef.current) return false;

  pendingEvolveRef.current = false;
  const nextStage = Math.min((state.pStg || 0) + 1, 2);
  const shouldSyncAlly = isCoopBattleMode(state.battleMode) && state.allySub;
  const nextAlly = shouldSyncAlly ? buildNextEvolvedAlly(state.allySub) : null;

  setPStg((prev) => {
    if (prev + 1 >= 2) tryUnlock('evolve_max');
    return Math.min(prev + 1, 2);
  });
  setPHp(getStageMaxHp(nextStage));

  if (nextAlly) {
    setAllySub(nextAlly);
    setPHpSub(getStarterMaxHp(nextAlly));
  }

  setMLvls((prev) => prev.map((value) => Math.min(value + 1, maxMoveLvl)));
  setScreen('evolve');
  return true;
}

export function tryProcessPvpTextAdvance({
  state,
  handlers,
}: TryProcessPvpTextAdvanceArgs): boolean {
  return processPvpTurnStart({
    state,
    ...handlers,
  });
}
