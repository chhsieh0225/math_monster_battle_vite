import type { BattleAction } from './battleReducer.ts';
import type { BattleMode, BattlePhase, EnemyVm, ScreenName, StarterVm } from '../../types/battle';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type StarterLite = StarterVm | null;
type BattleDispatch = (action: BattleAction) => void;

type RunPvpStartFlowArgs = {
  leader: StarterLite;
  rival: StarterLite;
  leaderMaxHp: number;
  leaderStageIdx: number;
  chance: (probability: number) => boolean;
  getStarterMaxHp: (starter: StarterLite) => number;
  t?: Translator;
  setEnemies: (value: EnemyVm[]) => void;
  setTimedMode: (value: boolean) => void;
  setCoopActiveSlot: (value: 'main' | 'sub') => void;
  dispatchBattle: BattleDispatch;
  setPvpStarter2: (value: StarterLite) => void;
  setPvpHp2: (value: number) => void;
  setPvpTurn: (value: 'p1' | 'p2') => void;
  resetPvpRuntime: () => void;
  resetRunRuntimeState: () => void;
  appendSessionEvent: (name: string, payload: Record<string, unknown>) => void;
  initSession: (starter: StarterLite, timedMode?: boolean) => void;
  createPvpEnemyFromStarter: (starter: StarterLite, t?: Translator) => EnemyVm | null;
  setPhase: (value: BattlePhase) => void;
  setBText: (value: string) => void;
  setScreen: (value: ScreenName) => void;
  playBattleIntro: () => void;
};

type RunStandardStartFlowArgs = {
  mode: BattleMode;
  leader: StarterLite;
  partner: StarterLite;
  leaderMaxHp: number;
  leaderStageIdx: number;
  currentTimedMode: boolean;
  buildNewRoster: (mode: BattleMode) => EnemyVm[];
  getStarterMaxHp: (starter: StarterLite) => number;
  setEnemies: (value: EnemyVm[]) => void;
  setCoopActiveSlot: (value: 'main' | 'sub') => void;
  resetPvpRuntime: () => void;
  dispatchBattle: BattleDispatch;
  resetRunRuntimeState: () => void;
  appendSessionEvent: (name: string, payload: Record<string, unknown>) => void;
  initSession: (starter: StarterLite, timedMode?: boolean) => void;
  setScreen: (value: ScreenName) => void;
  startBattle: (idx: number, roster?: EnemyVm[]) => void;
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

export function runPvpStartFlow({
  leader,
  rival,
  leaderMaxHp,
  leaderStageIdx,
  chance,
  getStarterMaxHp,
  t,
  setEnemies,
  setTimedMode,
  setCoopActiveSlot,
  dispatchBattle,
  setPvpStarter2,
  setPvpHp2,
  setPvpTurn,
  resetPvpRuntime,
  resetRunRuntimeState,
  appendSessionEvent,
  initSession,
  createPvpEnemyFromStarter,
  setPhase,
  setBText,
  setScreen,
  playBattleIntro,
}: RunPvpStartFlowArgs): void {
  const firstTurn: 'p1' | 'p2' = chance(0.5) ? 'p1' : 'p2';

  setEnemies([]);
  setTimedMode(true);
  setCoopActiveSlot('main');

  dispatchBattle({
    type: 'reset_run',
    patch: {
      diffLevel: 2,
      allySub: null,
      pHpSub: 0,
      pHp: leaderMaxHp,
      pStg: leaderStageIdx,
    },
  });

  setPvpStarter2(rival);
  setPvpHp2(getStarterMaxHp(rival));
  setPvpTurn(firstTurn);
  resetPvpRuntime();
  resetRunRuntimeState();

  appendSessionEvent('starter_selected', {
    starterId: leader?.id || null,
    starterName: leader?.name || null,
    starterType: leader?.type || null,
    timedMode: true,
  });
  initSession(leader, true);

  const enemyPvp = createPvpEnemyFromStarter(rival, t);
  dispatchBattle({ type: 'start_battle', enemy: enemyPvp, enemySub: null, round: 0 });

  setPhase('text');
  const p1Name = leader?.name || tr(t, 'battle.pvp.player1', 'Player 1');
  const p2Name = rival?.name || tr(t, 'battle.pvp.player2', 'Player 2');
  const firstName = firstTurn === 'p1' ? p1Name : p2Name;

  setBText(tr(t, 'battle.pvp.start', '⚔️ PvP start! {p1} vs {p2}, first turn: {first}', {
    p1: p1Name,
    p2: p2Name,
    first: firstName,
  }));

  setScreen('battle');
  playBattleIntro();
}

export function runStandardStartFlow({
  mode,
  leader,
  partner,
  leaderMaxHp,
  leaderStageIdx,
  currentTimedMode,
  buildNewRoster,
  getStarterMaxHp,
  setEnemies,
  setCoopActiveSlot,
  resetPvpRuntime,
  dispatchBattle,
  resetRunRuntimeState,
  appendSessionEvent,
  initSession,
  setScreen,
  startBattle,
}: RunStandardStartFlowArgs): void {
  const newRoster = buildNewRoster(mode);
  setEnemies(newRoster);
  setCoopActiveSlot('main');
  resetPvpRuntime();

  dispatchBattle({
    type: 'reset_run',
    patch: {
      diffLevel: 2,
      allySub: partner,
      pHpSub: partner ? getStarterMaxHp(partner) : 0,
      pHp: leaderMaxHp,
      pStg: leaderStageIdx,
    },
  });

  resetRunRuntimeState();

  appendSessionEvent('starter_selected', {
    starterId: leader?.id || null,
    starterName: leader?.name || null,
    starterType: leader?.type || null,
    timedMode: !!currentTimedMode,
  });
  initSession(leader, currentTimedMode);

  setScreen('battle');
  startBattle(0, newRoster);
}
