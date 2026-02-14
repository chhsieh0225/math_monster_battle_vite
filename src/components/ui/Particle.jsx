import { useState, useEffect, useRef } from 'react';

export default function Particle({ emoji, x, y, onDone }) {
  // Stable random offsets: computed once in a ref so re-renders
  // don't change the animation target (fixes unstable-random bug).
  const offset = useRef({
    dx: Math.random() * 80 - 40,
    dy: -(Math.random() * 60 + 20),
  });

  const [s, setS] = useState({ left: x, top: y, opacity: 1, transform: "scale(0)" });

  useEffect(() => {
    const { dx, dy } = offset.current;
    requestAnimationFrame(() =>
      setS({ left: x + dx, top: y + dy, opacity: 0, transform: "scale(1.2)" })
    );
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: "absolute", ...s, fontSize: 18,
      transition: "all 0.8s ease-out", pointerEvents: "none", zIndex: 90,
    }}>{emoji}</div>
  );
}
