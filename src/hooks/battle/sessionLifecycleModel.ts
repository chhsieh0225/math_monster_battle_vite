type SessionStateSnapshot = {
  screen?: string;
  phase?: string;
  round?: number;
  defeated?: number;
  pLvl?: number;
  maxStreak?: number;
  pHp?: number;
  tC?: number;
  tW?: number;
  timedMode?: boolean;
};

type SessionFinalizeStats = {
  defeated: number;
  finalLevel: number;
  maxStreak: number;
  pHp: number;
  completed: boolean;
};

type SessionResult = {
  reason: string;
  result: 'win' | 'quit' | 'lose';
};

type BuildBattleResultPayloadArgs = {
  state: SessionStateSnapshot;
  isCompleted: boolean;
  reasonOverride?: string | null;
  durationMs: number | null;
};

type BattleResultPayload = {
  result: SessionResult['result'];
  reason: string;
  defeated: number;
  finalLevel: number;
  maxStreak: number;
  pHp: number;
  tC: number;
  tW: number;
  timedMode: boolean;
  durationMs: number | null;
};

type QuitPayload = {
  reason: 'quit_button';
  screen: string | null;
  phase: string | null;
  round: number;
  defeated: number;
  pHp: number;
};

export function resolveBattleResult(
  isCompleted: boolean,
  reasonOverride: string | null = null,
): SessionResult {
  const reason = reasonOverride || (isCompleted ? 'clear' : 'player_ko');
  const result: SessionResult['result'] = isCompleted
    ? 'win'
    : reason === 'quit'
      ? 'quit'
      : 'lose';
  return { reason, result };
}

export function buildBattleResultPayload({
  state,
  isCompleted,
  reasonOverride = null,
  durationMs,
}: BuildBattleResultPayloadArgs): BattleResultPayload {
  const { reason, result } = resolveBattleResult(isCompleted, reasonOverride);
  return {
    result,
    reason,
    defeated: state.defeated || 0,
    finalLevel: state.pLvl || 1,
    maxStreak: state.maxStreak || 0,
    pHp: state.pHp || 0,
    tC: state.tC || 0,
    tW: state.tW || 0,
    timedMode: !!state.timedMode,
    durationMs,
  };
}

export function buildSessionFinalizeStats(
  state: SessionStateSnapshot,
  isCompleted: boolean,
): SessionFinalizeStats {
  return {
    defeated: state.defeated || 0,
    finalLevel: state.pLvl || 1,
    maxStreak: state.maxStreak || 0,
    pHp: state.pHp || 0,
    completed: !!isCompleted,
  };
}

export function buildQuitPayload(state: SessionStateSnapshot): QuitPayload {
  return {
    reason: 'quit_button',
    screen: state.screen || null,
    phase: state.phase || null,
    round: state.round || 0,
    defeated: state.defeated || 0,
    pHp: state.pHp || 0,
  };
}
