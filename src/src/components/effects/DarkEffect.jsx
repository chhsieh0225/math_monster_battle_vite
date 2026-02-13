import { useEffect } from 'react';

export default function DarkEffect({ idx = 0, lvl = 1, onDone }) {
  const n = 2 + lvl;
  const sz = 50 + lvl * 8;
  useEffect(() => { const t = setTimeout(onDone, 1100 + lvl * 30); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 80, animation: "darkScreenFlash 1s ease" }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ position: "absolute", right: "18%", top: "20%", width: sz, height: sz, borderRadius: "50%", animation: `darkPulse ${0.6 + lvl * 0.05}s ease ${i * 0.12}s forwards` }} />
      ))}
      {[...Array(5 + lvl * 2)].map((_, i) => (
        <div key={`s${i}`} style={{ position: "absolute", right: `${3 + Math.random() * 30}%`, top: `${3 + Math.random() * 35}%`, fontSize: 12 + lvl * 3 + Math.random() * 12, animation: `sparkle 0.5s ease ${0.15 + i * 0.07}s both` }}>{"💥⭐🌟✨"[i % 4]}</div>
      ))}
    </div>
  );
}
