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
  pvpTurn?: PvpTurn;
  pvpWinner?: PvpTurn | null;
  pvpActionCount?: number;
  pvpChargeP1?: number;
  pvpChargeP2?: number;
  pvpBurnP1?: number;
  pvpBurnP2?: number;
  pvpFreezeP1?: boolean;
  pvpFreezeP2?: boolean;
  pvpStaticP1?: number;
  pvpStaticP2?: number;
  pvpParalyzeP1?: boolean;
  pvpParalyzeP2?: boolean;
  pvpComboP1?: number;
  pvpComboP2?: number;
  pvpSpecDefP1?: boolean;
  pvpSpecDefP2?: boolean;
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

function getLegacyCombatant(state: PvpStateReadLike | null | undefined, turn: PvpTurn): PvpCombatantSnapshot {
  if (turn === 'p1') {
    return {
      charge: asNumber(state?.pvpChargeP1),
      burn: asNumber(state?.pvpBurnP1),
      freeze: asBoolean(state?.pvpFreezeP1),
      static: asNumber(state?.pvpStaticP1),
      paralyze: asBoolean(state?.pvpParalyzeP1),
      combo: asNumber(state?.pvpComboP1),
      specDef: asBoolean(state?.pvpSpecDefP1),
    };
  }
  return {
    charge: asNumber(state?.pvpChargeP2),
    burn: asNumber(state?.pvpBurnP2),
    freeze: asBoolean(state?.pvpFreezeP2),
    static: asNumber(state?.pvpStaticP2),
    paralyze: asBoolean(state?.pvpParalyzeP2),
    combo: asNumber(state?.pvpComboP2),
    specDef: asBoolean(state?.pvpSpecDefP2),
  };
}

export function getResolvedPvpTurn(state: PvpStateReadLike | null | undefined): PvpTurn {
  const turn = state?.pvpState?.turn ?? state?.pvpTurn;
  return turn === 'p2' ? 'p2' : 'p1';
}

export function getResolvedPvpWinner(state: PvpStateReadLike | null | undefined): PvpTurn | null {
  const winner = state?.pvpState?.winner ?? state?.pvpWinner ?? null;
  return winner === 'p1' || winner === 'p2' ? winner : null;
}

export function getResolvedPvpActionCount(state: PvpStateReadLike | null | undefined): number {
  return asNumber(state?.pvpState?.actionCount, asNumber(state?.pvpActionCount));
}

export function getResolvedPvpCombatant(
  state: PvpStateReadLike | null | undefined,
  turn: PvpTurn,
): PvpCombatantSnapshot {
  const structured = turn === 'p1' ? state?.pvpState?.p1 : state?.pvpState?.p2;
  const legacy = getLegacyCombatant(state, turn);
  return {
    charge: asNumber(structured?.charge, legacy.charge),
    burn: asNumber(structured?.burn, legacy.burn),
    freeze: asBoolean(structured?.freeze, legacy.freeze),
    static: asNumber(structured?.static, legacy.static),
    paralyze: asBoolean(structured?.paralyze, legacy.paralyze),
    combo: asNumber(structured?.combo, legacy.combo),
    specDef: asBoolean(structured?.specDef, legacy.specDef),
  };
}
