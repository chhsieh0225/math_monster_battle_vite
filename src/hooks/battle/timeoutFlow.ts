import { isCoopBattleMode } from './coopFlow.ts';
import { isBattleActiveState, scheduleIfBattleActive } from './menuResetGuard.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type BattleQuestion = {
  answer?: number;
  steps?: string[];
  op?: string;
  display?: string;
};

type BattleState = {
  battleMode?: string;
  phase?: string;
  screen?: string;
  q?: BattleQuestion | null;
  selIdx?: number | null;
  diffLevel?: number;
  round?: number;
  timedMode?: boolean;
  pvpTurn?: 'p1' | 'p2';
};

type StateRef = { current: BattleState };

type TimeoutFlowArgs = {
  sr: StateRef;
  t?: Translator;
  getPvpTurnName: (state: BattleState, turn: 'p1' | 'p2') => string;
  getOtherPvpTurn: (turn: 'p1' | 'p2') => 'p1' | 'p2';
  setAnswered: (value: boolean) => void;
  setFb: (value: { correct: boolean; answer?: number; steps?: string[] }) => void;
  setTW: (value: number | ((prev: number) => number)) => void;
  setPvpChargeP1: (value: number | ((prev: number) => number)) => void;
  setPvpChargeP2: (value: number | ((prev: number) => number)) => void;
  setPvpComboP1: (value: number | ((prev: number) => number)) => void;
  setPvpComboP2: (value: number | ((prev: number) => number)) => void;
  setBText: (value: string) => void;
  setPvpTurn: (value: 'p1' | 'p2' | ((prev: 'p1' | 'p2') => 'p1' | 'p2')) => void;
  setPvpActionCount: (value: number | ((prev: number) => number)) => void;
  setPhase: (value: string) => void;
  sfx: { play: (name: string) => void };
  setStreak: (value: number | ((prev: number) => number)) => void;
  setPassiveCount: (value: number | ((prev: number) => number)) => void;
  setCharge: (value: number | ((prev: number) => number)) => void;
  logAns: (question: BattleQuestion | null | undefined, isCorrect: boolean) => number;
  updateAbility: (op: string | undefined, correct: boolean) => void;
  getActingStarter: (state: BattleState) => {
    moves?: Array<{ name?: string; type?: string }>;
  } | null;
  appendSessionEvent: (name: string, payload: Record<string, unknown>) => void;
  markCoopRotatePending: () => void;
  safeTo: (fn: () => void, ms: number) => void;
  doEnemyTurn: () => void;
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

export function handleTimeoutFlow({
  sr,
  t,
  getPvpTurnName,
  getOtherPvpTurn,
  setAnswered,
  setFb,
  setTW,
  setPvpChargeP1,
  setPvpChargeP2,
  setPvpComboP1,
  setPvpComboP2,
  setBText,
  setPvpTurn,
  setPvpActionCount,
  setPhase,
  sfx,
  setStreak,
  setPassiveCount,
  setCharge,
  logAns,
  updateAbility,
  getActingStarter,
  appendSessionEvent,
  markCoopRotatePending,
  safeTo,
  doEnemyTurn,
}: TimeoutFlowArgs): void {
  const s = sr.current;
  if (!isBattleActiveState(s)) return;
  if (typeof s.phase === 'string' && s.phase !== 'question') return;
  const hasActiveQuestion = s.selIdx != null && !!s.q && typeof s.q.answer === 'number';
  if (!hasActiveQuestion) return;

  if (s.battleMode === 'pvp') {
    setAnswered(true);
    setFb({ correct: false, answer: s.q?.answer, steps: s.q?.steps || [] });
    setTW((prev) => prev + 1);

    const currentTurn = s.pvpTurn || 'p1';
    const nextTurn = getOtherPvpTurn(currentTurn);
    if (currentTurn === 'p1') {
      setPvpChargeP1(0);
      setPvpComboP1(0);
    } else {
      setPvpChargeP2(0);
      setPvpComboP2(0);
    }

    setBText(tr(
      t,
      'battle.pvp.timeoutSwap',
      '⏰ {name} timed out. Turn swapped!',
      { name: getPvpTurnName(s, currentTurn) },
    ));
    setPvpTurn(nextTurn);
    setPvpActionCount((prev) => prev + 1);
    setPhase('text');
    return;
  }

  setAnswered(true);
  setFb({ correct: false, answer: s.q?.answer, steps: s.q?.steps || [] });
  sfx.play('timeout');
  setTW((prev) => prev + 1);
  setStreak(0);
  setPassiveCount(0);
  setCharge(0);

  const answerTimeMs = logAns(s.q, false);
  updateAbility(s.q?.op, false);
  const actingStarter = getActingStarter(s);
  const moveIndex = s.selIdx ?? -1;

  appendSessionEvent('question_answered', {
    outcome: 'timeout',
    correct: false,
    selectedAnswer: null,
    expectedAnswer: s.q?.answer ?? null,
    answerTimeMs,
    op: s.q?.op ?? null,
    display: s.q?.display ?? null,
    moveIndex,
    moveName: actingStarter?.moves?.[moveIndex]?.name || null,
    moveType: actingStarter?.moves?.[moveIndex]?.type || null,
    timedMode: !!s.timedMode,
    diffLevel: s.diffLevel ?? null,
    round: s.round ?? 0,
  });

  if (isCoopBattleMode(s.battleMode)) {
    markCoopRotatePending();
  }

  setBText(tr(t, 'battle.timeoutMiss', "⏰ Time's up! Too late to attack!"));
  setPhase('text');
  scheduleIfBattleActive(safeTo, () => sr.current, doEnemyTurn, 1500);
}
