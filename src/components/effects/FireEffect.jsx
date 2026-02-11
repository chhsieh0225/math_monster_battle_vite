import { useEffect } from 'react';

export default function FireEffect({ idx = 0, lvl = 1, onDone }) {
  const n = idx === 0 ? 1 + lvl : idx === 1 ? 2 + lvl : 3 + lvl * 2;
  const sz = idx === 0 ? 20 + lvl * 3 : idx === 1 ? 28 + lvl * 3 : 34 + lvl * 4;
  const dur = 700 + idx * 100 + lvl * 30;
  useEffect(() => { const t = setTimeout(onDone, dur + 200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 80 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: `${10 + i * 4}%`, bottom: `${36 + i * 3}%`, fontSize: sz + i * 4, animation: `fireballFly ${dur / 1000 + i * 0.1}s ease ${i * 0.08}s forwards`, opacity: 0 }}>🔥</div>
      ))}
      {[...Array(3 + idx * 2 + lvl)].map((_, i) => (
        <div key={`t${i}`} style={{ position: "absolute", left: `${15 + i * 7}%`, bottom: `${40 - i * 4}%`, fontSize: 10 + lvl * 2 + Math.random() * 8, animation: `fireTrail 0.5s ease ${0.1 + i * 0.06}s forwards`, opacity: 0 }}>{"🔥✨💫"[i % 3]}</div>
      ))}
      {idx >= 2 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 70% 30%,rgba(239,68,68,${0.1 + lvl * 0.03}),transparent 60%)`, animation: `darkScreenFlash ${dur / 1000}s ease` }} />}
    </div>
  );
}
