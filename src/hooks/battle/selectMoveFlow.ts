import type { MoveVm, QuestionVm, StarterVm } from '../../types/battle';
import { PVP_TIMER_SEC } from '../../data/constants.ts';
import { getResolvedPvpCombatant, getResolvedPvpTurn } from './pvpStateSelectors.ts';

type BattleStarter = StarterVm | null;
type BattleQuestion = QuestionVm;

type BattleState = {
  phase: string;
  battleMode: string;
  pvpTurn?: 'p1' | 'p2';
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
    turn?: 'p1' | 'p2';
  } | null;
  pvpChargeP1?: number;
  pvpChargeP2?: number;
  sealedMove: number | null;
};

type SafeState = BattleState & Record<string, unknown>;

type MoveDiffLevelResolver = (move: MoveVm | undefined) => number;
type GenQuestion = (
  move: MoveVm | undefined,
  diffMod: number,
  options?: {
    t?: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
    allowedOps?: string[];
  },
) => BattleQuestion | null;

type RunSelectMoveFlowArgs = {
  index: number;
  state: SafeState;
  timedMode: boolean;
  questionTimeLimitSec?: number | null;
  questionAllowedOps?: string[] | null;
  diffMods: readonly number[];
  t?: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  getActingStarter: (state: SafeState) => BattleStarter;
  getMoveDiffLevel: MoveDiffLevelResolver;
  genQuestion: GenQuestion;
  startTimer: (durationSec?: number) => void;
  markQStart: () => void;
  sfx: { play: (name: string) => void };
  setSelIdx: (value: number) => void;
  setDiffLevel: (value: number) => void;
  setQ: (value: BattleQuestion | null) => void;
  setFb: (value: null) => void;
  setAnswered: (value: boolean) => void;
  setPhase: (value: string) => void;
};

function isFn(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

export function runSelectMoveFlow({
  index,
  state,
  timedMode,
  questionTimeLimitSec,
  questionAllowedOps,
  diffMods,
  t,
  getActingStarter,
  getMoveDiffLevel,
  genQuestion,
  startTimer,
  markQStart,
  sfx,
  setSelIdx,
  setDiffLevel,
  setQ,
  setFb,
  setAnswered,
  setPhase,
}: RunSelectMoveFlowArgs): boolean {
  if (state.phase !== 'menu') return false;

  const activeStarter = getActingStarter(state);
  if (!activeStarter) return false;
  const move = activeStarter.moves[index];
  if (!move) return false;

  if (!isFn(setSelIdx) || !isFn(setDiffLevel) || !isFn(setQ) || !isFn(setFb) || !isFn(setAnswered) || !isFn(setPhase)) {
    return false;
  }
  if (state.battleMode === 'pvp' && move?.risky) {
    const currentTurn = getResolvedPvpTurn(state);
    const chargeNow = getResolvedPvpCombatant(state, currentTurn).charge;
    if (chargeNow < 3) return false;
  }

  if (state.battleMode !== 'pvp' && state.sealedMove === index) return false;

  sfx.play('select');
  setSelIdx(index);

  const lv = getMoveDiffLevel(move);
  const diffMod = diffMods[lv] ?? diffMods[2];
  setDiffLevel(lv);
  const allowedOps = Array.isArray(questionAllowedOps) && questionAllowedOps.length > 0
    ? questionAllowedOps
    : undefined;
  setQ(genQuestion(move, diffMod, { t, allowedOps }));
  setFb(null);
  setAnswered(false);
  setPhase('question');
  markQStart();

  if (state.battleMode === 'pvp') {
    startTimer(PVP_TIMER_SEC);
  } else if (timedMode) {
    startTimer(questionTimeLimitSec ?? undefined);
  }
  return true;
}
