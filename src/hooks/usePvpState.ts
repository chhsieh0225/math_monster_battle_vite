import { useCallback, useState } from 'react';
import { getLevelMaxHp } from '../utils/playerHp';
import type { PvpStateVm, StarterVm } from '../types/battle';

type PvpTurn = 'p1' | 'p2';

type StarterLite = StarterVm | null;
type SetStateValue<T> = T | ((prev: T) => T);

function resolveNextValue<T>(prev: T, value: SetStateValue<T>): T {
  if (typeof value === 'function') {
    return (value as (prev: T) => T)(prev);
  }
  return value;
}

type UsePvpStateResult = {
  pvpState: PvpStateVm;
  pvpStarter2: StarterLite;
  setPvpStarter2: (value: StarterLite | ((prev: StarterLite) => StarterLite)) => void;
  pvpHp2: number;
  setPvpHp2: (value: number | ((prev: number) => number)) => void;
  pvpTurn: PvpTurn;
  setPvpTurn: (value: PvpTurn | ((prev: PvpTurn) => PvpTurn)) => void;
  pvpWinner: PvpTurn | null;
  setPvpWinner: (value: PvpTurn | null | ((prev: PvpTurn | null) => PvpTurn | null)) => void;
  pvpChargeP1: number;
  setPvpChargeP1: (value: number | ((prev: number) => number)) => void;
  pvpChargeP2: number;
  setPvpChargeP2: (value: number | ((prev: number) => number)) => void;
  pvpActionCount: number;
  setPvpActionCount: (value: number | ((prev: number) => number)) => void;
  pvpBurnP1: number;
  setPvpBurnP1: (value: number | ((prev: number) => number)) => void;
  pvpBurnP2: number;
  setPvpBurnP2: (value: number | ((prev: number) => number)) => void;
  pvpFreezeP1: boolean;
  setPvpFreezeP1: (value: boolean | ((prev: boolean) => boolean)) => void;
  pvpFreezeP2: boolean;
  setPvpFreezeP2: (value: boolean | ((prev: boolean) => boolean)) => void;
  pvpStaticP1: number;
  setPvpStaticP1: (value: number | ((prev: number) => number)) => void;
  pvpStaticP2: number;
  setPvpStaticP2: (value: number | ((prev: number) => number)) => void;
  pvpParalyzeP1: boolean;
  setPvpParalyzeP1: (value: boolean | ((prev: boolean) => boolean)) => void;
  pvpParalyzeP2: boolean;
  setPvpParalyzeP2: (value: boolean | ((prev: boolean) => boolean)) => void;
  pvpComboP1: number;
  setPvpComboP1: (value: number | ((prev: number) => number)) => void;
  pvpComboP2: number;
  setPvpComboP2: (value: number | ((prev: number) => number)) => void;
  pvpSpecDefP1: boolean;
  setPvpSpecDefP1: (value: boolean | ((prev: boolean) => boolean)) => void;
  pvpSpecDefP2: boolean;
  setPvpSpecDefP2: (value: boolean | ((prev: boolean) => boolean)) => void;
  resetPvpRuntime: () => void;
};

export function usePvpState(): UsePvpStateResult {
  const [pvpStarter2, setPvpStarter2] = useState<StarterLite>(null);
  const [pvpHp2, setPvpHp2] = useState(() => getLevelMaxHp(1, 0));
  const [pvpState, setPvpState] = useState<PvpStateVm>({
    p1: {
      charge: 0,
      burn: 0,
      freeze: false,
      static: 0,
      paralyze: false,
      combo: 0,
      specDef: false,
    },
    p2: {
      charge: 0,
      burn: 0,
      freeze: false,
      static: 0,
      paralyze: false,
      combo: 0,
      specDef: false,
    },
    turn: 'p1',
    winner: null,
    actionCount: 0,
  });

  const setPvpTurn = useCallback((value: SetStateValue<PvpTurn>) => {
    setPvpState((prev) => ({
      ...prev,
      turn: resolveNextValue(prev.turn, value),
    }));
  }, []);

  const setPvpWinner = useCallback((value: SetStateValue<PvpTurn | null>) => {
    setPvpState((prev) => ({
      ...prev,
      winner: resolveNextValue(prev.winner, value),
    }));
  }, []);

  const setPvpActionCount = useCallback((value: SetStateValue<number>) => {
    setPvpState((prev) => ({
      ...prev,
      actionCount: resolveNextValue(prev.actionCount, value),
    }));
  }, []);

  const setPvpChargeP1 = useCallback((value: SetStateValue<number>) => {
    setPvpState((prev) => ({
      ...prev,
      p1: {
        ...prev.p1,
        charge: resolveNextValue(prev.p1.charge, value),
      },
    }));
  }, []);

  const setPvpChargeP2 = useCallback((value: SetStateValue<number>) => {
    setPvpState((prev) => ({
      ...prev,
      p2: {
        ...prev.p2,
        charge: resolveNextValue(prev.p2.charge, value),
      },
    }));
  }, []);

  const setPvpBurnP1 = useCallback((value: SetStateValue<number>) => {
    setPvpState((prev) => ({
      ...prev,
      p1: {
        ...prev.p1,
        burn: resolveNextValue(prev.p1.burn, value),
      },
    }));
  }, []);

  const setPvpBurnP2 = useCallback((value: SetStateValue<number>) => {
    setPvpState((prev) => ({
      ...prev,
      p2: {
        ...prev.p2,
        burn: resolveNextValue(prev.p2.burn, value),
      },
    }));
  }, []);

  const setPvpFreezeP1 = useCallback((value: SetStateValue<boolean>) => {
    setPvpState((prev) => ({
      ...prev,
      p1: {
        ...prev.p1,
        freeze: resolveNextValue(prev.p1.freeze, value),
      },
    }));
  }, []);

  const setPvpFreezeP2 = useCallback((value: SetStateValue<boolean>) => {
    setPvpState((prev) => ({
      ...prev,
      p2: {
        ...prev.p2,
        freeze: resolveNextValue(prev.p2.freeze, value),
      },
    }));
  }, []);

  const setPvpStaticP1 = useCallback((value: SetStateValue<number>) => {
    setPvpState((prev) => ({
      ...prev,
      p1: {
        ...prev.p1,
        static: resolveNextValue(prev.p1.static, value),
      },
    }));
  }, []);

  const setPvpStaticP2 = useCallback((value: SetStateValue<number>) => {
    setPvpState((prev) => ({
      ...prev,
      p2: {
        ...prev.p2,
        static: resolveNextValue(prev.p2.static, value),
      },
    }));
  }, []);

  const setPvpParalyzeP1 = useCallback((value: SetStateValue<boolean>) => {
    setPvpState((prev) => ({
      ...prev,
      p1: {
        ...prev.p1,
        paralyze: resolveNextValue(prev.p1.paralyze, value),
      },
    }));
  }, []);

  const setPvpParalyzeP2 = useCallback((value: SetStateValue<boolean>) => {
    setPvpState((prev) => ({
      ...prev,
      p2: {
        ...prev.p2,
        paralyze: resolveNextValue(prev.p2.paralyze, value),
      },
    }));
  }, []);

  const setPvpComboP1 = useCallback((value: SetStateValue<number>) => {
    setPvpState((prev) => ({
      ...prev,
      p1: {
        ...prev.p1,
        combo: resolveNextValue(prev.p1.combo, value),
      },
    }));
  }, []);

  const setPvpComboP2 = useCallback((value: SetStateValue<number>) => {
    setPvpState((prev) => ({
      ...prev,
      p2: {
        ...prev.p2,
        combo: resolveNextValue(prev.p2.combo, value),
      },
    }));
  }, []);

  const setPvpSpecDefP1 = useCallback((value: SetStateValue<boolean>) => {
    setPvpState((prev) => ({
      ...prev,
      p1: {
        ...prev.p1,
        specDef: resolveNextValue(prev.p1.specDef, value),
      },
    }));
  }, []);

  const setPvpSpecDefP2 = useCallback((value: SetStateValue<boolean>) => {
    setPvpState((prev) => ({
      ...prev,
      p2: {
        ...prev.p2,
        specDef: resolveNextValue(prev.p2.specDef, value),
      },
    }));
  }, []);

  const pvpTurn = pvpState.turn;
  const pvpWinner = pvpState.winner;
  const pvpActionCount = pvpState.actionCount;
  const pvpChargeP1 = pvpState.p1.charge;
  const pvpChargeP2 = pvpState.p2.charge;
  const pvpBurnP1 = pvpState.p1.burn;
  const pvpBurnP2 = pvpState.p2.burn;
  const pvpFreezeP1 = pvpState.p1.freeze;
  const pvpFreezeP2 = pvpState.p2.freeze;
  const pvpStaticP1 = pvpState.p1.static;
  const pvpStaticP2 = pvpState.p2.static;
  const pvpParalyzeP1 = pvpState.p1.paralyze;
  const pvpParalyzeP2 = pvpState.p2.paralyze;
  const pvpComboP1 = pvpState.p1.combo;
  const pvpComboP2 = pvpState.p2.combo;
  const pvpSpecDefP1 = pvpState.p1.specDef;
  const pvpSpecDefP2 = pvpState.p2.specDef;

  const resetPvpRuntime = useCallback(() => {
    setPvpState((prev) => ({
      ...prev,
      winner: null,
      actionCount: 0,
      p1: {
        charge: 0,
        burn: 0,
        freeze: false,
        static: 0,
        paralyze: false,
        combo: 0,
        specDef: false,
      },
      p2: {
        charge: 0,
        burn: 0,
        freeze: false,
        static: 0,
        paralyze: false,
        combo: 0,
        specDef: false,
      },
    }));
  }, []);

  return {
    pvpState,
    pvpStarter2,
    setPvpStarter2,
    pvpHp2,
    setPvpHp2,
    pvpTurn,
    setPvpTurn,
    pvpWinner,
    setPvpWinner,
    pvpChargeP1,
    setPvpChargeP1,
    pvpChargeP2,
    setPvpChargeP2,
    pvpActionCount,
    setPvpActionCount,
    pvpBurnP1,
    setPvpBurnP1,
    pvpBurnP2,
    setPvpBurnP2,
    pvpFreezeP1,
    setPvpFreezeP1,
    pvpFreezeP2,
    setPvpFreezeP2,
    pvpStaticP1,
    setPvpStaticP1,
    pvpStaticP2,
    setPvpStaticP2,
    pvpParalyzeP1,
    setPvpParalyzeP1,
    pvpParalyzeP2,
    setPvpParalyzeP2,
    pvpComboP1,
    setPvpComboP1,
    pvpComboP2,
    setPvpComboP2,
    pvpSpecDefP1,
    setPvpSpecDefP1,
    pvpSpecDefP2,
    setPvpSpecDefP2,
    resetPvpRuntime,
  };
}
