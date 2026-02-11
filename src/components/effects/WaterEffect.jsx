import { useEffect } from 'react';

export default function WaterEffect({ idx = 0, lvl = 1, onDone }) {
  const dur = 800 + idx * 100 + lvl * 30;
  const waves = idx === 0 ? 1 : idx === 1 ? 2 : 3;
  const drops = 3 + idx * 3 + lvl * 2;
  useEffect(() => { const t = setTimeout(onDone, dur + 200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 80, overflow: "hidden" }}>
      {Array.from({ length: waves }, (_, i) => (
        <div key={`w${i}`} style={{ position: "absolute", right: "5%", top: `${8 + i * 8}%`, width: `${40 + idx * 10 + lvl * 3}%`, height: 25 + idx * 8 + lvl * 3, background: `linear-gradient(90deg,transparent,rgba(59,130,246,${0.3 + idx * 0.15}),rgba(96,165,250,${0.4 + idx * 0.1}),transparent)`, borderRadius: 20, animation: `waterWave ${dur / 1000}s ease ${i * 0.12}s forwards`, opacity: 0 }} />
      ))}
      {[...Array(drops)].map((_, i) => (
        <div key={i} style={{ position: "absolute", right: `${8 + i * 4}%`, top: `${6 + Math.random() * 25}%`, fontSize: 8 + idx * 4 + lvl * 2 + Math.random() * 8, opacity: 0, "--dx": `${-20 + Math.random() * 40}px`, "--dy": `${-10 + Math.random() * 20}px`, animation: `waterDrop 0.7s ease ${0.15 + i * 0.05}s forwards` }}>{"💧🌊💦"[i % 3]}</div>
      ))}
      {idx >= 2 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 65% 25%,rgba(59,130,246,${0.12 + lvl * 0.03}),transparent 65%)`, animation: `darkScreenFlash ${dur / 1000}s ease` }} />}
    </div>
  );
}
