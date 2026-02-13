import { useEffect } from 'react';

export default function ElecEffect({ idx = 0, lvl = 1, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 800 + lvl * 30); return () => clearTimeout(t); }, [onDone]);
  const bolt = "M60,0 L55,30 L70,32 L50,65 L62,42 L48,40 L60,0";
  const n = 1 + idx + Math.floor(lvl / 2);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 80, animation: "lightningFlash 0.8s ease" }}>
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} style={{ position: "absolute", right: `${8 + i * 10}%`, top: `${3 + i * 4}%`, animation: `lightningStrike 0.5s ease ${i * 0.12}s both`, transform: `scale(${0.8 + lvl * 0.1})` }} width="60" height="80" viewBox="0 0 80 70">
          <path d={bolt} fill={i === 0 ? "#fbbf24" : "#fde68a"} opacity={1 - i * 0.2} />
        </svg>
      ))}
      {[...Array(3 + idx * 2 + lvl)].map((_, i) => (
        <div key={`s${i}`} style={{ position: "absolute", right: `${5 + Math.random() * 25}%`, top: `${8 + Math.random() * 30}%`, fontSize: 10 + lvl * 2 + Math.random() * 10, animation: `sparkle 0.4s ease ${0.08 + i * 0.08}s both` }}>⚡</div>
      ))}
    </div>
  );
}
