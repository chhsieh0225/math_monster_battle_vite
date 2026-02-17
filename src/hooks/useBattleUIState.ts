import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { EFX } from '../data/constants';

type RngDeps = {
  rand: () => number;
  randInt: (min: number, max: number) => number;
};

type BattleQuestion = {
  op?: string;
  answer?: number | string;
  steps?: string[];
  [key: string]: unknown;
};

type FeedbackState = {
  correct: boolean;
  answer?: unknown;
  steps?: string[];
} | null;

type DamageIndicator = {
  id: number;
  value: string;
  x: number;
  y: number;
  color: string;
};

type ParticleEffect = {
  id: number;
  emoji: string;
  x: number;
  y: number;
};

type AttackEffectState = {
  type: string;
  idx: number;
  lvl: number;
  targetSide?: 'player' | 'enemy';
} | null;

type EffectMessage = {
  text: string;
  color: string;
} | null;

type UseBattleUIStateResult = {
  phase: string;
  setPhase: Dispatch<SetStateAction<string>>;
  selIdx: number | null;
  setSelIdx: Dispatch<SetStateAction<number | null>>;
  q: BattleQuestion | null;
  setQ: Dispatch<SetStateAction<BattleQuestion | null>>;
  fb: FeedbackState;
  setFb: Dispatch<SetStateAction<FeedbackState>>;
  bText: string;
  setBText: Dispatch<SetStateAction<string>>;
  answered: boolean;
  setAnswered: Dispatch<SetStateAction<boolean>>;
  dmgs: DamageIndicator[];
  setDmgs: Dispatch<SetStateAction<DamageIndicator[]>>;
  parts: ParticleEffect[];
  setParts: Dispatch<SetStateAction<ParticleEffect[]>>;
  eAnim: string;
  setEAnim: Dispatch<SetStateAction<string>>;
  pAnim: string;
  setPAnim: Dispatch<SetStateAction<string>>;
  atkEffect: AttackEffectState;
  setAtkEffect: Dispatch<SetStateAction<AttackEffectState>>;
  effMsg: EffectMessage;
  setEffMsg: Dispatch<SetStateAction<EffectMessage>>;
  addD: (value: string, x: number, y: number, color: string) => void;
  rmD: (id: number) => void;
  addP: (type: string, x: number, y: number, n?: number) => void;
  rmP: (id: number) => void;
};

const EFX_MAP = EFX as Record<string, string[]>;

export function useBattleUIState({ rand, randInt }: RngDeps): UseBattleUIStateResult {
  const [phase, setPhase] = useState('menu');
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [q, setQ] = useState<BattleQuestion | null>(null);
  const [fb, setFb] = useState<FeedbackState>(null);
  const [bText, setBText] = useState('');
  const [answered, setAnswered] = useState(false);
  const [dmgs, setDmgs] = useState<DamageIndicator[]>([]);
  const [parts, setParts] = useState<ParticleEffect[]>([]);
  const [eAnim, setEAnim] = useState('');
  const [pAnim, setPAnim] = useState('');
  const [atkEffect, setAtkEffect] = useState<AttackEffectState>(null);
  const [effMsg, setEffMsgRaw] = useState<EffectMessage>(null);
  const effMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-clear wrapper: every non-null setEffMsg schedules an unconditional
  // clear after 1.6s (slightly after the CSS fade-out at 1.2s + 0.3s).
  // This guarantees cleanup even if safeToIfBattleActive skips its callback.
  const setEffMsg: Dispatch<SetStateAction<EffectMessage>> = useCallback((action) => {
    setEffMsgRaw(action);
    if (effMsgTimerRef.current) clearTimeout(effMsgTimerRef.current);
    // Only schedule auto-clear when setting a non-null value
    if (action !== null && typeof action !== 'function') {
      effMsgTimerRef.current = setTimeout(() => setEffMsgRaw(null), 1600);
    }
  }, []);

  const did = useRef(0);
  const pid = useRef(0);

  const addD = useCallback((value: string, x: number, y: number, color: string) => {
    const id = did.current++;
    setDmgs((prev) => [...prev, { id, value, x, y, color }]);
  }, []);

  const rmD = useCallback((id: number) => {
    setDmgs((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const addP = useCallback((type: string, x: number, y: number, n = 5) => {
    const emojis = EFX_MAP[type] || ['✨'];
    const nextParticles: ParticleEffect[] = [];
    for (let i = 0; i < n; i += 1) {
      nextParticles.push({
        id: pid.current++,
        emoji: emojis[randInt(0, emojis.length - 1)],
        x: x + rand() * 40 - 20,
        y: y + rand() * 20 - 10,
      });
    }
    setParts((prev) => [...prev, ...nextParticles]);
  }, [rand, randInt]);

  const rmP = useCallback((id: number) => {
    setParts((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return {
    phase,
    setPhase,
    selIdx,
    setSelIdx,
    q,
    setQ,
    fb,
    setFb,
    bText,
    setBText,
    answered,
    setAnswered,
    dmgs,
    setDmgs,
    parts,
    setParts,
    eAnim,
    setEAnim,
    pAnim,
    setPAnim,
    atkEffect,
    setAtkEffect,
    effMsg,
    setEffMsg,
    addD,
    rmD,
    addP,
    rmP,
  };
}
