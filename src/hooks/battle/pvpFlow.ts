import { PVP_BALANCE } from '../../data/pvpBalance.ts';
import { getLevelMaxHp, getStarterLevelMaxHp, getStarterStageIdx } from '../../utils/playerHp.ts';
import { isBattleActiveState } from './menuResetGuard.ts';
import type { EnemyVm } from '../../types/battle';
import {
  runPvpAttackAnimation,
  showPvpEffectivenessMessage,
} from './pvpAnimationOrchestrator.ts';
import {
  applyCorrectTurnProgress,
  createBattleActiveScheduler,
  resetCurrentTurnResources,
  swapPvpTurnToText,
} from './pvpTurnPrimitives.ts';
import { executePvpStrikeTurn } from './pvpStrikeResolver.ts';
import { resolvePvpTurnStartStatus } from './pvpStatusResolver.ts';
import {
  getResolvedPvpActionCount,
  getResolvedPvpTurn,
  getResolvedPvpWinner,
} from './pvpStateSelectors.ts';
import { resolvePvpStrike } from './turnResolver.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type PvpTurn = 'p1' | 'p2';
type PvpWinner = PvpTurn | null;

type StarterStage = {
  name?: string;
  svgFn: (...colors: string[]) => string;
};

type StarterMove = {
  name: string;
  type: string;
  type2?: string;
  risky?: boolean;
  basePower: number;
  growth: number;
};

type StarterLike = {
  id?: string;
  name: string;
  type: string;
  typeIcon?: string;
  typeName?: string;
  c1?: string;
  c2?: string;
  stages: StarterStage[];
  moves: StarterMove[];
  selectedStageIdx?: number;
};

type BattleQuestion = {
  answer?: number;
  steps?: string[];
};

type PvpBattleState = {
  battleMode: string;
  phase?: string;
  screen?: string;
  pvpWinner: PvpWinner;
  pvpTurn: PvpTurn;
  pvpState?: {
    p1?: {
      charge?: number;
      burn?: number;
      freeze?: boolean;
      static?: number;
      paralyze?: boolean;
      combo?: number;
      specDef?: boolean;
    };
    p2?: {
      charge?: number;
      burn?: number;
      freeze?: boolean;
      static?: number;
      paralyze?: boolean;
      combo?: number;
      specDef?: boolean;
    };
    turn?: PvpTurn;
    winner?: PvpWinner;
    actionCount?: number;
  } | null;
  starter: StarterLike | null;
  pvpStarter2: StarterLike | null;
  selIdx: number | null;
  q: BattleQuestion | null;
  pvpSpecDefP1: boolean;
  pvpSpecDefP2: boolean;
  pvpComboP1: number;
  pvpComboP2: number;
  pvpChargeP1: number;
  pvpChargeP2: number;
  pvpActionCount: number;
  pHp: number;
  pvpHp2: number;
  pStg: number;
  pLvl?: number;
  pvpBurnP1: number;
  pvpBurnP2: number;
  pvpFreezeP1: boolean;
  pvpFreezeP2: boolean;
  pvpStaticP1: number;
  pvpStaticP2: number;
  pvpParalyzeP1: boolean;
  pvpParalyzeP2: boolean;
};

type StateRef = {
  current: PvpBattleState;
};

type NumberSetter = (value: number | ((prev: number) => number)) => void;
type BoolSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
type TextSetter = (value: string) => void;
type PhaseSetter = (value: string) => void;

type FeedbackValue = {
  correct: boolean;
  answer: number;
  steps: string[];
};

type EffectMessage = {
  text: string;
  color: string;
};

type AttackEffect = {
  type: string;
  idx: number;
  lvl: number;
  targetSide?: 'enemy' | 'player';
};

type SafeTo = (fn: () => void, ms: number) => void;
type RandomFn = () => number;
type ChanceFn = (probability: number) => boolean;

type SfxApi = {
  play: (name: string) => void;
  playMove?: (type: string, idx?: number) => void;
};

type PvpEnemyVm = EnemyVm & {
  hp: number;
  atk: number;
  selectedStageIdx: number;
};

type HandlePvpAnswerArgs = {
  choice: number;
  state: PvpBattleState;
  sr: StateRef;
  rand: RandomFn;
  chance: ChanceFn;
  safeTo: SafeTo;
  sfx: SfxApi;
  getOtherPvpTurn: (turn: PvpTurn) => PvpTurn;
  pvpSpecDefTrigger?: number;
  setFb: (value: FeedbackValue) => void;
  setTC: NumberSetter;
  setTW: NumberSetter;
  setPvpChargeP1: NumberSetter;
  setPvpChargeP2: NumberSetter;
  setPvpComboP1: NumberSetter;
  setPvpComboP2: NumberSetter;
  setPvpTurn: (turn: PvpTurn) => void;
  setPvpActionCount: NumberSetter;
  setBText: TextSetter;
  setPhase: PhaseSetter;
  setPvpSpecDefP1: BoolSetter;
  setPvpSpecDefP2: BoolSetter;
  setEffMsg: (value: EffectMessage | null) => void;
  setAtkEffect: (value: AttackEffect | null) => void;
  addP: (emoji: string, x: number, y: number, count?: number) => void;
  setPvpParalyzeP1: BoolSetter;
  setPvpParalyzeP2: BoolSetter;
  setPAnim: TextSetter;
  setEAnim: TextSetter;
  addD: (value: string, x: number, y: number, color: string) => void;
  setPHp: NumberSetter;
  setPvpHp2: NumberSetter;
  setEHp: NumberSetter;
  setScreen: (screen: string) => void;
  setPvpWinner: (winner: PvpWinner) => void;
  setPvpBurnP1: NumberSetter;
  setPvpBurnP2: NumberSetter;
  setPvpFreezeP1: BoolSetter;
  setPvpFreezeP2: BoolSetter;
  setPvpStaticP1: NumberSetter;
  setPvpStaticP2: NumberSetter;
  t?: Translator;
};

type ProcessPvpTurnStartArgs = {
  state: PvpBattleState;
  sr?: StateRef;
  safeTo: SafeTo;
  getOtherPvpTurn: (turn: PvpTurn) => PvpTurn;
  getPvpTurnName: (state: PvpBattleState, turn: PvpTurn) => string;
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

const PVP = PVP_BALANCE;

const TYPE_TO_SCENE: Record<string, string> = {
  fire: 'fire',
  ghost: 'ghost',
  steel: 'steel',
  dark: 'dark',
  grass: 'grass',
  water: 'grass',
  electric: 'steel',
  light: 'grass',
};

function formatFallback(template: string, params?: TranslatorParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m: string, key: string) => String(params[key] ?? ''));
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

export function createPvpEnemyFromStarter(starter: StarterLike | null | undefined, t?: Translator): PvpEnemyVm | null {
  if (!starter) return null;
  const stageIdx = getStarterStageIdx(starter);
  const stage = starter.stages?.[stageIdx] || starter.stages?.[0];
  const maxHp = getStarterLevelMaxHp(starter, 1, stageIdx);
  return {
    id: `pvp_${starter.id || 'starter'}`,
    name: stage?.name || starter.name,
    maxHp,
    hp: maxHp,
    atk: 12,
    lvl: 1,
    mType: starter.type,
    sceneMType: TYPE_TO_SCENE[starter.type] || 'grass',
    typeIcon: starter.typeIcon || '',
    typeName: starter.typeName || '',
    c1: starter.c1 || '#ffffff',
    c2: starter.c2 || '#cccccc',
    trait: 'normal',
    traitName: tr(t, 'battle.pvp.playerTrait', 'Player'),
    drops: ['🏁'],
    svgFn: stage?.svgFn || starter.stages[0].svgFn,
    isEvolved: stageIdx > 0,
    selectedStageIdx: stageIdx,
  };
}

export function handlePvpAnswer({
  choice,
  state,
  sr,
  rand,
  chance,
  safeTo,
  sfx,
  getOtherPvpTurn,
  pvpSpecDefTrigger = PVP.passive.specDefComboTrigger,
  setFb,
  setTC,
  setTW,
  setPvpChargeP1,
  setPvpChargeP2,
  setPvpComboP1,
  setPvpComboP2,
  setPvpTurn,
  setPvpActionCount,
  setBText,
  setPhase,
  setPvpSpecDefP1,
  setPvpSpecDefP2,
  setEffMsg,
  setAtkEffect,
  addP,
  setPvpParalyzeP1,
  setPvpParalyzeP2,
  setPAnim,
  setEAnim,
  addD,
  setPHp,
  setPvpHp2,
  setEHp,
  setScreen,
  setPvpWinner,
  setPvpBurnP1,
  setPvpBurnP2,
  setPvpFreezeP1,
  setPvpFreezeP2,
  setPvpStaticP1,
  setPvpStaticP2,
  t,
}: HandlePvpAnswerArgs): boolean {
  try {
  if (state.battleMode !== 'pvp') return false;
  if (!isBattleActiveState(state)) return false;
  const isBattleActive = (): boolean => isBattleActiveState(sr.current);
  const safeToIfBattleActive = createBattleActiveScheduler({
    safeTo,
    getState: () => sr.current,
  });
  const currentTurn = getResolvedPvpTurn(state);
  const attacker = currentTurn === 'p1' ? state.starter : state.pvpStarter2;
  const defender = currentTurn === 'p1' ? state.pvpStarter2 : state.starter;
  if (!attacker || !defender || state.selIdx == null) return false;

  const move = attacker.moves?.[state.selIdx];
  if (!move || !state.q || typeof state.q.answer !== 'number') return false;

  const correct = choice === state.q.answer;
  setFb({ correct, answer: state.q.answer, steps: state.q.steps || [] });
  if (correct) setTC((c) => c + 1);
  else setTW((w) => w + 1);
  const nextTurn = getOtherPvpTurn(currentTurn);

  if (!correct) {
    resetCurrentTurnResources({
      currentTurn,
      setPvpChargeP1,
      setPvpComboP1,
      setPvpChargeP2,
      setPvpComboP2,
    });
    swapPvpTurnToText({
      nextTurn,
      setPvpTurn,
      setPvpActionCount,
      setPhase,
    });
    setBText(tr(t, 'battle.pvp.miss', '❌ {name} answered wrong. Attack missed!', { name: attacker.name }));
    return true;
  }

  const unlockedSpecDef = applyCorrectTurnProgress({
    currentTurn,
    state,
    pvpSpecDefTrigger,
    setPvpChargeP1,
    setPvpChargeP2,
    setPvpComboP1,
    setPvpComboP2,
    setPvpSpecDefP1,
    setPvpSpecDefP2,
  });

  const attackerHp = currentTurn === 'p1' ? state.pHp : state.pvpHp2;
  const attackerMaxHp = currentTurn === 'p1'
    ? getLevelMaxHp(state.pLvl || 1, state.pStg)
    : getStarterLevelMaxHp(state.pvpStarter2, state.pLvl || 1, state.pStg);
  const strike = resolvePvpStrike({
    move,
    moveIdx: state.selIdx,
    attackerType: attacker.type,
    defenderType: defender.type,
    attackerHp,
    attackerMaxHp,
    firstStrike: getResolvedPvpActionCount(state) === 0,
    random: rand,
  });

  showPvpEffectivenessMessage({
    strike,
    t,
    setEffMsg,
    scheduleClear: safeToIfBattleActive,
  });

  const vfxType = move.risky && move.type2 ? move.type2 : move.type;
  const runStrike = () => {
    executePvpStrikeTurn({
      sr,
      currentTurn,
      nextTurn,
      attacker,
      defender,
      move,
      strike,
      unlockedSpecDef,
      vfxType,
      chance,
      sfx,
      t,
      isBattleActive,
      safeToIfBattleActive,
      setBText,
      setPvpTurn,
      setPvpActionCount,
      setPhase,
      setPvpSpecDefP1,
      setPvpSpecDefP2,
      setAtkEffect,
      addP,
      setPvpParalyzeP1,
      setPvpParalyzeP2,
      setPAnim,
      setEAnim,
      addD,
      setPHp,
      setPvpHp2,
      setEHp,
      setScreen,
      setPvpWinner,
      setPvpBurnP1,
      setPvpBurnP2,
      setPvpFreezeP1,
      setPvpFreezeP2,
      setPvpStaticP1,
      setPvpStaticP2,
    });
  };

  runPvpAttackAnimation({
    turn: currentTurn,
    safeTo,
    setPhase,
    setPAnim,
    setEAnim,
    onStrike: runStrike,
  });
  return true;
  } catch (err) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) console.error('[pvpFlow] handlePvpAnswer crashed:', err);
    try { setScreen('menu'); setPhase('menu'); setBText('⚠️ Battle error — returning to menu'); } catch { /* last resort */ }
    return false;
  }
}

export function processPvpTurnStart({
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
}: ProcessPvpTurnStartArgs): boolean {
  try {
  if (state.battleMode !== 'pvp' || getResolvedPvpWinner(state)) return false;
  if (!isBattleActiveState(state)) return false;
  return resolvePvpTurnStartStatus({
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
  });
  } catch (err) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) console.error('[pvpFlow] processPvpTurnStart crashed:', err);
    try { setScreen('menu'); setPhase('menu'); setBText('⚠️ Battle error — returning to menu'); } catch { /* last resort */ }
    return false;
  }
}
