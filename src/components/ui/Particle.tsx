import { useState, useEffect, useMemo } from 'react';
import { seedRange } from '../../utils/prng';

type ParticleProps = {
  emoji: string;
  x: number;
  y: number;
  seed: number;
  onDone: () => void;
};

type ParticleState = {
  left: number;
  top: number;
  opacity: number;
  transform: string;
};

export default function Particle({ emoji, x, y, seed, onDone }: ParticleProps) {
  const offset = useMemo(() => ({
    dx: seedRange(`p-${seed}-dx`, -40, 40),
    dy: -seedRange(`p-${seed}-dy`, 20, 80),
  }), [seed]);

  const [s, setS] = useState<ParticleState>({ left: x, top: y, opacity: 1, transform: "scale(0)" });

  useEffect(() => {
    const { dx, dy } = offset;
    requestAnimationFrame(() =>
      setS({ left: x + dx, top: y + dy, opacity: 0, transform: "scale(1.2)" })
    );
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [offset, onDone, x, y]);

  return (
    <div style={{
      position: "absolute", ...s, fontSize: 18,
      transition: "all 0.8s ease-out", pointerEvents: "none", zIndex: 90,
    }}>{emoji}</div>
  );
}
