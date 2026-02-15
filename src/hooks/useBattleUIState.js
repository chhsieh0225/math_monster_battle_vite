import { useCallback, useRef, useState } from 'react';
import { EFX } from '../data/constants';

export function useBattleUIState({ rand, randInt }) {
  const [phase, setPhase] = useState("menu");
  const [selIdx, setSelIdx] = useState(null);
  const [q, setQ] = useState(null);
  const [fb, setFb] = useState(null);
  const [bText, setBText] = useState("");
  const [answered, setAnswered] = useState(false);
  const [dmgs, setDmgs] = useState([]);
  const [parts, setParts] = useState([]);
  const [eAnim, setEAnim] = useState("");
  const [pAnim, setPAnim] = useState("");
  const [atkEffect, setAtkEffect] = useState(null);
  const [effMsg, setEffMsg] = useState(null);

  const did = useRef(0);
  const pid = useRef(0);

  const addD = useCallback((value, x, y, color) => {
    const id = did.current++;
    setDmgs((prev) => [...prev, { id, value, x, y, color }]);
  }, []);

  const rmD = useCallback((id) => {
    setDmgs((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const addP = useCallback((type, x, y, n = 5) => {
    const es = EFX[type] || ["✨"];
    const nextParticles = [];
    for (let i = 0; i < n; i++) {
      nextParticles.push({
        id: pid.current++,
        emoji: es[randInt(0, es.length - 1)],
        x: x + rand() * 40 - 20,
        y: y + rand() * 20 - 10,
      });
    }
    setParts((prev) => [...prev, ...nextParticles]);
  }, [rand, randInt]);

  const rmP = useCallback((id) => {
    setParts((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return {
    phase, setPhase,
    selIdx, setSelIdx,
    q, setQ,
    fb, setFb,
    bText, setBText,
    answered, setAnswered,
    dmgs, setDmgs,
    parts, setParts,
    eAnim, setEAnim,
    pAnim, setPAnim,
    atkEffect, setAtkEffect,
    effMsg, setEffMsg,
    addD, rmD,
    addP, rmP,
  };
}
