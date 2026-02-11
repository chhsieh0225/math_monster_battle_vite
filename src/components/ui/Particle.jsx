import { useState, useEffect } from 'react';

export default function Particle({ emoji, x, y, onDone }) {
  const dx = Math.random() * 80 - 40;
  const dy = -(Math.random() * 60 + 20);
  const [s, setS] = useState({ left: x, top: y, opacity: 1, transform: "scale(0)" });
  useEffect(() => {
    requestAnimationFrame(() => setS({ left: x + dx, top: y + dy, opacity: 0, transform: "scale(1.2)" }));
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "absolute", ...s, fontSize: 18,
      transition: "all 0.8s ease-out", pointerEvents: "none", zIndex: 90
    }}>{emoji}</div>
  );
}
