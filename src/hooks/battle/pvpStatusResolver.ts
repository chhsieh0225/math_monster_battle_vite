import { PVP_BALANCE } from '../../data/pvpBalance.ts';
import { applyBossDamageReduction } from '../../utils/bossDamage.ts';
import { fxt } from './battleFxTargets.ts';
import { createBattleActiveScheduler, declarePvpWinner } from './pvpTurnPrimitives.ts';
import { getResolvedPvpCombatant, type PvpStateReadLike, getResolvedPvpTurn } from './pvpStateSelectors.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type PvpTurn = 'p1' | 'p2';
type PvpWinner = PvpTurn | null;

type NumberSetter = (value: number | ((prev: number) => number)) => void;
type BoolSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
type TextSetter = (value: string) => void;
type PhaseSetter = (value: string) => void;
type SafeTo = (fn: () => void, ms: number) => void;

type PvpBalanceConfig = {
  passive: {
    fireBurnTickBase: number;
    fireBurnTickPerStack: number;
  };
};

type PvpTurnStartState = PvpStateReadLike & {
  starter?: { id?: string } | null;
  pvpStarter2?: { id?: string } | null;
  pHp: number;
  pvpHp2: number;
};

type ResolvePvpTurnStartStatusArgs<TState extends PvpTurnStartState> = {
  state: TState;
  sr?: { current: TState };
  safeTo: SafeTo;
  getOtherPvpTurn: (turn: PvpTurn) => PvpTurn;
  getPvpTurnName: (state: TState, turn: PvpTurn) => string;
  setPHp: NumberSetter;
  setPvpBurnP1: NumberSetter;
  setPAnim: TextSetter;
  addD: (value: string, x: number, y: number, color: string) => void;
  setPvpWinner: (winner: PvpWinner) => void;
  setScreen: (screen: string) => void;
  setPvpHp2: NumberSetter;
  setEHp: NumberSetter;
  setPvpBurnP2: NumberSetter;
  setEAnim: TextSetter;
  setBText: TextSetter;
  setPhase: PhaseSetter;
  setPvpParalyzeP1: BoolSetter;
  setPvpParalyzeP2: BoolSetter;
  setPvpTurn: (turn: PvpTurn) => void;
  setPvpFreezeP1: BoolSetter;
  setPvpFreezeP2: BoolSetter;
  t?: Translator;
};

const PVP: PvpBalanceConfig = PVP_BALANCE;

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

export function resolvePvpTurnStartStatus<TState extends PvpTurnStartState>({
  state,
  sr,
  safeTo,
  getOtherPvpTurn,
  getPvpTurnName,
  setPHp,
  setPvpBurnP1,
  setPAnim,
  addD,
  setPvpWinner,
  setScreen,
  setPvpHp2,
  setEHp,
  setPvpBurnP2,
  setEAnim,
  setBText,
  setPhase,
  setPvpParalyzeP1,
  setPvpParalyzeP2,
  setPvpTurn,
  setPvpFreezeP1,
  setPvpFreezeP2,
  t,
}: ResolvePvpTurnStartStatusArgs<TState>): boolean {
  const safeToIfBattleActive = createBattleActiveScheduler({
    safeTo,
    getState: () => sr?.current || state,
  });
  const currentTurn = getResolvedPvpTurn(state);
  const currentName = getPvpTurnName(state, currentTurn);
  const isP1 = currentTurn === 'p1';
  const currentCombatant = getResolvedPvpCombatant(state, currentTurn);

  const burnStack = currentCombatant.burn;
  if (burnStack > 0) {
    const burnRawDmg = PVP.passive.fireBurnTickBase
      + burnStack * PVP.passive.fireBurnTickPerStack;
    const burnTargetId = isP1 ? state.starter?.id : state.pvpStarter2?.id;
    const burnDmg = applyBossDamageReduction(burnRawDmg, burnTargetId);
    if (isP1) {
      const nh = Math.max(0, state.pHp - burnDmg);
      setPHp(nh);
      setPvpBurnP1(Math.max(0, burnStack - 1));
      setPAnim('playerHit 0.45s ease');
      addD(`🔥-${burnDmg}`, fxt().playerMain.x, fxt().playerMain.y, '#f97316');
      safeToIfBattleActive(() => setPAnim(''), 480);
      if (nh <= 0) {
        declarePvpWinner({
          winner: 'p2',
          setPvpWinner,
          setScreen,
        });
        return true;
      }
    } else {
      const nh = Math.max(0, state.pvpHp2 - burnDmg);
      setPvpHp2(nh);
      setEHp(nh);
      setPvpBurnP2(Math.max(0, burnStack - 1));
      setEAnim('enemyFireHit 0.5s ease');
      addD(`🔥-${burnDmg}`, fxt().enemyMain.x, fxt().enemyMain.y, '#f97316');
      safeToIfBattleActive(() => setEAnim(''), 480);
      if (nh <= 0) {
        declarePvpWinner({
          winner: 'p1',
          setPvpWinner,
          setScreen,
        });
        return true;
      }
    }
    setBText(tr(t, 'battle.pvp.turnstart.burn', '🔥 {name} took burn damage!', { name: currentName }));
    setPhase('text');
    return true;
  }

  const paralyzed = currentCombatant.paralyze;
  if (paralyzed) {
    if (isP1) setPvpParalyzeP1(false);
    else setPvpParalyzeP2(false);
    const nextTurn = getOtherPvpTurn(currentTurn);
    setPvpTurn(nextTurn);
    setBText(tr(t, 'battle.pvp.turnstart.paralyze', '⚡ {name} is paralyzed and skips the turn!', { name: currentName }));
    setPhase('text');
    return true;
  }

  const frozen = currentCombatant.freeze;
  if (frozen) {
    if (isP1) setPvpFreezeP1(false);
    else setPvpFreezeP2(false);
    const nextTurn = getOtherPvpTurn(currentTurn);
    setPvpTurn(nextTurn);
    setBText(tr(t, 'battle.pvp.turnstart.freeze', '❄️ {name} is frozen and skips the turn!', { name: currentName }));
    setPhase('text');
    return true;
  }

  return false;
}
