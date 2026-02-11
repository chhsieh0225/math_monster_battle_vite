import { useEffect } from 'react';

export default function GrassEffect({ idx = 0, lvl = 1, onDone }) {
  const dur = 700 + idx * 100 + lvl * 30;
  const slashes = idx === 0 ? 1 : idx === 1 ? 2 + lvl : 3 + lvl;
  const bursts = 2 + idx * 3 + lvl * 2;
  useEffect(() => { const t = setTimeout(onDone, dur + 200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 80, animation: "grassScreenFlash 0.9s ease" }}>
      {Array.from({ length: slashes }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: `${8 + i * 5}%`, bottom: `${34 + i * 4}%`, fontSize: 18 + idx * 6 + lvl * 3 + i * 4, animation: `leafSlash ${dur / 1000 + i * 0.1}s ease ${i * 0.07}s forwards`, opacity: 0 }}>{"🍃🌿🍀"[i % 3]}</div>
      ))}
      {[...Array(bursts)].map((_, i) => (
        <div key={`l${i}`} style={{ position: "absolute", right: `${8 + i * 5}%`, top: `${8 + Math.random() * 25}%`, fontSize: 8 + idx * 3 + lvl * 2 + Math.random() * 10, opacity: 0, "--lx": `${-30 + Math.random() * 60}px`, "--ly": `${-20 + Math.random() * 40}px`, "--lr": `${Math.random() * 360}deg`, animation: `leafBurst 0.6s ease ${0.1 + i * 0.05}s forwards` }}>{"🍃🌿🍀✨"[i % 4]}</div>
      ))}
      {idx >= 2 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 65% 30%,rgba(34,197,94,${0.1 + lvl * 0.03}),transparent 60%)`, animation: `darkScreenFlash ${dur / 1000}s ease` }} />}
    </div>
  );
}
