import { useEffect } from 'react';

export default function DamagePopup({ value, x, y, color, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "absolute", left: x, top: y, fontSize: 24, fontWeight: 900, color,
      textShadow: `0 2px 8px ${color}88`,
      animation: "dmgPop 1s ease forwards", pointerEvents: "none", zIndex: 100,
      fontFamily: "'Press Start 2P',monospace"
    }}>{value}</div>
  );
}
