import { memo, useState, useEffect, useMemo } from 'react';
import { seedRange } from '../../utils/prng';

type ParticleProps = {
  id: number;
  emoji: string;
  x: number;
  y: number;
  seed: number;
  onDone: (id: number) => void;
};

type ParticleState = {
  left: number;
  top: number;
  opacity: number;
  transform: string;
};

const Particle = memo(function Particle({ id, emoji, x, y, seed, onDone }: ParticleProps) {
  const offset = useMemo<{ dx: number; dy: number }>(() => ({
    dx: Number(seedRange(`p-${seed}-dx`, -40, 40)),
    dy: -Number(seedRange(`p-${seed}-dy`, 20, 80)),
  }), [seed]);

  const [s, setS] = useState<ParticleState>({ left: x, top: y, opacity: 1, transform: "scale(0)" });

  useEffect(() => {
    const { dx, dy } = offset;
    requestAnimationFrame(() =>
      setS({ left: x + dx, top: y + dy, opacity: 0, transform: "scale(1.2)" })
    );
    const t = setTimeout(() => onDone(id), 800);
    return () => clearTimeout(t);
  }, [id, offset, onDone, x, y]);

  return (
    <div style={{
      position: "absolute", ...s, fontSize: 18,
      transition: "all 0.8s ease-out", pointerEvents: "none", zIndex: 90,
    }}>{emoji}</div>
  );
});

export default Particle;
