import { useCallback, useState } from 'react';
import { getStageMaxHp } from '../utils/playerHp';

type PvpTurn = 'p1' | 'p2';

type StarterLite = {
  id?: string;
  name?: string;
  type?: string;
  selectedStageIdx?: number;
  moves?: unknown[];
} | null;

type UsePvpStateResult = {
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
  const [pvpHp2, setPvpHp2] = useState(() => getStageMaxHp(0));
  const [pvpTurn, setPvpTurn] = useState<PvpTurn>('p1');
  const [pvpWinner, setPvpWinner] = useState<PvpTurn | null>(null);
  const [pvpChargeP1, setPvpChargeP1] = useState(0);
  const [pvpChargeP2, setPvpChargeP2] = useState(0);
  const [pvpActionCount, setPvpActionCount] = useState(0);
  const [pvpBurnP1, setPvpBurnP1] = useState(0);
  const [pvpBurnP2, setPvpBurnP2] = useState(0);
  const [pvpFreezeP1, setPvpFreezeP1] = useState(false);
  const [pvpFreezeP2, setPvpFreezeP2] = useState(false);
  const [pvpStaticP1, setPvpStaticP1] = useState(0);
  const [pvpStaticP2, setPvpStaticP2] = useState(0);
  const [pvpParalyzeP1, setPvpParalyzeP1] = useState(false);
  const [pvpParalyzeP2, setPvpParalyzeP2] = useState(false);
  const [pvpComboP1, setPvpComboP1] = useState(0);
  const [pvpComboP2, setPvpComboP2] = useState(0);
  const [pvpSpecDefP1, setPvpSpecDefP1] = useState(false);
  const [pvpSpecDefP2, setPvpSpecDefP2] = useState(false);

  const resetPvpRuntime = useCallback(() => {
    setPvpWinner(null);
    setPvpChargeP1(0);
    setPvpChargeP2(0);
    setPvpActionCount(0);
    setPvpBurnP1(0);
    setPvpBurnP2(0);
    setPvpFreezeP1(false);
    setPvpFreezeP2(false);
    setPvpStaticP1(0);
    setPvpStaticP2(0);
    setPvpParalyzeP1(false);
    setPvpParalyzeP2(false);
    setPvpComboP1(0);
    setPvpComboP2(0);
    setPvpSpecDefP1(false);
    setPvpSpecDefP2(false);
  }, []);

  return {
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
