import { isCoopBattleMode } from './coopFlow';
import { handlePvpAnswer } from './pvpFlow';
import { runPlayerAnswer } from './playerFlow';

type MoveLite = {
  name?: string;
  type?: string;
  [key: string]: unknown;
};

type StarterLite = {
  id?: string;
  moves?: MoveLite[];
  [key: string]: unknown;
};

type BattleQuestion = {
  answer?: number;
  op?: string;
  display?: string;
  [key: string]: unknown;
};

type BattleState = {
  battleMode?: string;
  allySub?: StarterLite | null;
  selIdx?: number;
  q?: BattleQuestion | null;
  timedMode?: boolean;
  diffLevel?: number;
  round?: number;
  [key: string]: unknown;
};

type BuildAnswerContextArgs = {
  state: BattleState;
  choice: number;
  getActingStarter: (state: BattleState) => StarterLite | null;
};

type AnswerContext = {
  actingStarter: StarterLite;
  isCoopSubActive: boolean;
  move: MoveLite;
  correct: boolean;
};

type LogSubmittedAnswerArgs = {
  state: BattleState;
  choice: number;
  move: MoveLite;
  logAns: (question: BattleQuestion | null | undefined, isCorrect: boolean) => number;
  appendSessionEvent: (name: string, payload: Record<string, unknown>) => void;
  updateAbility: (op: string | undefined, correct: boolean) => void;
  markCoopRotatePending: () => void;
  correct: boolean;
};

type PvpAnswerArgs = Parameters<typeof handlePvpAnswer>[0];

type TryHandlePvpAnswerArgs = {
  choice: number;
  state: PvpAnswerArgs['state'];
  handlers: Omit<PvpAnswerArgs, 'choice' | 'state'>;
};

type PlayerAnswerArgs = Parameters<typeof runPlayerAnswer>[0];
type StandardAnswerHandlers = Omit<PlayerAnswerArgs, 'correct' | 'move' | 'starter' | 'attackerSlot'>;

type RunStandardAnswerFlowArgs = {
  choice: number;
  state: BattleState;
  getActingStarter: (state: BattleState) => StarterLite | null;
  logAns: (question: BattleQuestion | null | undefined, isCorrect: boolean) => number;
  appendSessionEvent: (name: string, payload: Record<string, unknown>) => void;
  updateAbility: (op: string | undefined, correct: boolean) => void;
  markCoopRotatePending: () => void;
  handlers: StandardAnswerHandlers;
};

export function buildAnswerContext({
  state,
  choice,
  getActingStarter,
}: BuildAnswerContextArgs): AnswerContext | null {
  const actingStarter = getActingStarter(state);
  if (!actingStarter || state.selIdx == null) return null;

  const move = actingStarter.moves?.[state.selIdx];
  if (!move) return null;

  const isCoopSubActive = Boolean(
    isCoopBattleMode(state.battleMode)
    && actingStarter
    && state.allySub
    && actingStarter.id === state.allySub.id,
  );

  const correct = choice === state.q?.answer;

  return {
    actingStarter,
    isCoopSubActive,
    move,
    correct,
  };
}

export function logSubmittedAnswer({
  state,
  choice,
  move,
  logAns,
  appendSessionEvent,
  updateAbility,
  markCoopRotatePending,
  correct,
}: LogSubmittedAnswerArgs): void {
  const answerTimeMs = logAns(state.q, correct);

  appendSessionEvent('question_answered', {
    outcome: 'submitted',
    correct,
    selectedAnswer: choice,
    expectedAnswer: state.q?.answer ?? null,
    answerTimeMs,
    op: state.q?.op ?? null,
    display: state.q?.display ?? null,
    moveIndex: state.selIdx ?? -1,
    moveName: move?.name || null,
    moveType: move?.type || null,
    timedMode: !!state.timedMode,
    diffLevel: state.diffLevel ?? null,
    round: state.round ?? 0,
  });

  updateAbility(state.q?.op, correct);

  if (isCoopBattleMode(state.battleMode)) {
    markCoopRotatePending();
  }
}

export function tryHandlePvpAnswer({
  choice,
  state,
  handlers,
}: TryHandlePvpAnswerArgs): boolean {
  return handlePvpAnswer({
    choice,
    state,
    ...handlers,
  });
}

export function runStandardAnswerFlow({
  choice,
  state,
  getActingStarter,
  logAns,
  appendSessionEvent,
  updateAbility,
  markCoopRotatePending,
  handlers,
}: RunStandardAnswerFlowArgs): boolean {
  const answerContext = buildAnswerContext({
    state,
    choice,
    getActingStarter,
  });
  if (!answerContext) return false;

  const {
    actingStarter,
    isCoopSubActive,
    move,
    correct,
  } = answerContext;

  logSubmittedAnswer({
    state,
    choice,
    move,
    logAns,
    appendSessionEvent,
    updateAbility,
    markCoopRotatePending,
    correct,
  });

  runPlayerAnswer({
    correct,
    move: move as PlayerAnswerArgs['move'],
    starter: actingStarter as PlayerAnswerArgs['starter'],
    attackerSlot: isCoopSubActive ? 'sub' : 'main',
    ...handlers,
  });

  return true;
}
