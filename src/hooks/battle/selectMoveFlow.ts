type BattleMove = {
  risky?: boolean;
};

type BattleStarter = {
  moves: BattleMove[];
} | null;

type BattleQuestion = unknown;

type BattleState = {
  phase: string;
  battleMode: string;
  pvpTurn: 'p1' | 'p2';
  pvpChargeP1: number;
  pvpChargeP2: number;
  sealedMove: number | null;
};

type SafeState = BattleState & Record<string, unknown>;

type MoveDiffLevelResolver = (move: BattleMove | undefined) => number;
type GenQuestion = (
  move: BattleMove | undefined,
  diffMod: number,
  options?: { t?: (key: string, fallback?: string, params?: Record<string, string | number>) => string },
) => BattleQuestion;

type RunSelectMoveFlowArgs = {
  index: number;
  state: SafeState;
  timedMode: boolean;
  diffMods: number[];
  t?: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  getActingStarter: (state: SafeState) => BattleStarter;
  getMoveDiffLevel: MoveDiffLevelResolver;
  genQuestion: GenQuestion;
  startTimer: () => void;
  markQStart: () => void;
  sfx: { play: (name: string) => void };
  setSelIdx: (value: number) => void;
  setDiffLevel: (value: number) => void;
  setQ: (value: BattleQuestion) => void;
  setFb: (value: unknown) => void;
  setAnswered: (value: boolean) => void;
  setPhase: (value: string) => void;
};

export function runSelectMoveFlow({
  index,
  state,
  timedMode,
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
  if (state.battleMode === 'pvp' && move?.risky) {
    const chargeNow = state.pvpTurn === 'p1' ? (state.pvpChargeP1 || 0) : (state.pvpChargeP2 || 0);
    if (chargeNow < 3) return false;
  }

  if (state.battleMode !== 'pvp' && state.sealedMove === index) return false;

  sfx.play('select');
  setSelIdx(index);

  const lv = getMoveDiffLevel(move);
  const diffMod = diffMods[lv] ?? diffMods[2];
  setDiffLevel(lv);
  setQ(genQuestion(move, diffMod, { t }));
  setFb(null);
  setAnswered(false);
  setPhase('question');
  markQStart();

  if (timedMode || state.battleMode === 'pvp') startTimer();
  return true;
}
