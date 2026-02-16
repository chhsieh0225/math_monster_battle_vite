import { isCoopBattleMode } from './coopFlow.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type StarterLike = {
  id?: string;
  name?: string;
  moves?: Array<{ name?: string; type?: string }>;
};

type TurnState = {
  battleMode?: string;
  pvpTurn?: 'p1' | 'p2';
  starter?: StarterLike | null;
  pvpStarter2?: StarterLike | null;
  coopActiveSlot?: 'main' | 'sub';
  allySub?: StarterLike | null;
  pHpSub?: number;
};

function tr(
  t: Translator | undefined,
  key: string,
  fallback: string,
  params?: TranslatorParams,
): string {
  if (typeof t === 'function') return t(key, fallback, params);
  if (!params) return fallback;
  return fallback.replace(/\{(\w+)\}/g, (_m: string, token: string) => String(params[token] ?? ''));
}

export function getOtherPvpTurn(turn: 'p1' | 'p2'): 'p1' | 'p2' {
  return turn === 'p1' ? 'p2' : 'p1';
}

export function getPvpTurnName(
  state: TurnState | null | undefined,
  turn: 'p1' | 'p2',
  t?: Translator,
): string {
  if (turn === 'p1') {
    return state?.starter?.name || tr(t, 'battle.pvp.player1', 'Player 1');
  }
  return state?.pvpStarter2?.name || tr(t, 'battle.pvp.player2', 'Player 2');
}

export function getActingStarter(state: TurnState | null | undefined): StarterLike | null {
  if (!state) return null;
  if (state.battleMode === 'pvp') {
    return state.pvpTurn === 'p1' ? state.starter || null : state.pvpStarter2 || null;
  }

  const isCoopSubActive = (
    isCoopBattleMode(state.battleMode)
    && state.coopActiveSlot === 'sub'
    && state.allySub
    && (state.pHpSub || 0) > 0
  );
  return isCoopSubActive ? (state.allySub || null) : (state.starter || null);
}
