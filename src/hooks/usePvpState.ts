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
  setPvpTurn: (value: PvpTurn | ((prev: PvpTurn) => PvpTurn)) => void;
  setPvpWinner: (value: PvpTurn | null | ((prev: PvpTurn | null) => PvpTurn | null)) => void;
  setPvpChargeP1: (value: number | ((prev: number) => number)) => void;
  setPvpChargeP2: (value: number | ((prev: number) => number)) => void;
  setPvpActionCount: (value: number | ((prev: number) => number)) => void;
  setPvpBurnP1: (value: number | ((prev: number) => number)) => void;
  setPvpBurnP2: (value: number | ((prev: number) => number)) => void;
  setPvpFreezeP1: (value: boolean | ((prev: boolean) => boolean)) => void;
  setPvpFreezeP2: (value: boolean | ((prev: boolean) => boolean)) => void;
  setPvpStaticP1: (value: number | ((prev: number) => number)) => void;
  setPvpStaticP2: (value: number | ((prev: number) => number)) => void;
  setPvpParalyzeP1: (value: boolean | ((prev: boolean) => boolean)) => void;
  setPvpParalyzeP2: (value: boolean | ((prev: boolean) => boolean)) => void;
  setPvpComboP1: (value: number | ((prev: number) => number)) => void;
  setPvpComboP2: (value: number | ((prev: number) => number)) => void;
  setPvpSpecDefP1: (value: boolean | ((prev: boolean) => boolean)) => void;
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
    setPvpTurn,
    setPvpWinner,
    setPvpChargeP1,
    setPvpChargeP2,
    setPvpActionCount,
    setPvpBurnP1,
    setPvpBurnP2,
    setPvpFreezeP1,
    setPvpFreezeP2,
    setPvpStaticP1,
    setPvpStaticP2,
    setPvpParalyzeP1,
    setPvpParalyzeP2,
    setPvpComboP1,
    setPvpComboP2,
    setPvpSpecDefP1,
    setPvpSpecDefP2,
    resetPvpRuntime,
  };
}
