import type { PvpStateVm } from '../../types/battle';

export type PvpTurn = 'p1' | 'p2';

type PvpStructuredStateLike = {
  p1?: Partial<PvpStateVm['p1']>;
  p2?: Partial<PvpStateVm['p2']>;
  turn?: PvpTurn;
  winner?: PvpTurn | null;
  actionCount?: number;
} | null;

export type PvpStateReadLike = {
  pvpState?: PvpStructuredStateLike;
};

export type PvpCombatantSnapshot = {
  charge: number;
  burn: number;
  freeze: boolean;
  static: number;
  paralyze: boolean;
  combo: number;
  specDef: boolean;
};

function asNumber(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

export function getResolvedPvpTurn(state: PvpStateReadLike | null | undefined): PvpTurn {
  const turn = state?.pvpState?.turn;
  return turn === 'p2' ? 'p2' : 'p1';
}

export function getResolvedPvpWinner(state: PvpStateReadLike | null | undefined): PvpTurn | null {
  const winner = state?.pvpState?.winner ?? null;
  return winner === 'p1' || winner === 'p2' ? winner : null;
}

export function getResolvedPvpActionCount(state: PvpStateReadLike | null | undefined): number {
  return asNumber(state?.pvpState?.actionCount);
}

export function getResolvedPvpCombatant(
  state: PvpStateReadLike | null | undefined,
  turn: PvpTurn,
): PvpCombatantSnapshot {
  const structured = turn === 'p1' ? state?.pvpState?.p1 : state?.pvpState?.p2;
  return {
    charge: asNumber(structured?.charge),
    burn: asNumber(structured?.burn),
    freeze: asBoolean(structured?.freeze),
    static: asNumber(structured?.static),
    paralyze: asBoolean(structured?.paralyze),
    combo: asNumber(structured?.combo),
    specDef: asBoolean(structured?.specDef),
  };
}
