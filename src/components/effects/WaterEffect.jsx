import { useEffect } from 'react';

export default function WaterEffect({ idx = 0, lvl = 1, onDone }) {
  const dur = 800 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  useEffect(() => { const t = setTimeout(onDone, dur + 350); return () => clearTimeout(t); }, [onDone]);

  // --- idx 0: 水泡攻擊 (Bubble Attack) ---
  if (idx === 0) {
    const n = 2 + lvl;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
        {Array.from({ length: n }, (_, i) => {
          const r = 7 + lvl * 2 + Math.random() * 5;
          const sz = r * 2 + 12;
          return (
            <svg key={i} width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
              style={{
                position:"absolute", left:`${8+i*8}%`, bottom:`${30+i*5+Math.random()*8}%`,
                opacity:0, filter:`drop-shadow(0 0 ${glow/2}px rgba(59,130,246,0.5))`,
                animation:`bubbleFloat ${dur/1000+i*0.15}s ease ${i*0.1}s forwards`,
              }}>
              <defs>
                <radialGradient id={`bbl${i}`} cx="35%" cy="35%">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85"/>
                  <stop offset="55%" stopColor="#60a5fa" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.25"/>
                </radialGradient>
              </defs>
              <circle cx={sz/2} cy={sz/2} r={r} fill={`url(#bbl${i})`}
                stroke="rgba(147,197,253,0.45)" strokeWidth="0.7"/>
              {/* Shine highlight */}
              <ellipse cx={sz/2-r*0.22} cy={sz/2-r*0.22} rx={r*0.28} ry={r*0.18}
                fill="rgba(255,255,255,0.5)" transform={`rotate(-25 ${sz/2-r*0.22} ${sz/2-r*0.22})`}/>
            </svg>
          );
        })}
      </div>
    );
  }

  // --- idx 1: 水流波 (Water Wave) ---
  if (idx === 1) {
    const waveN = 1 + Math.floor(lvl / 2);
    const waveH = 22 + lvl * 4;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, overflow:"hidden" }}>
        {Array.from({ length: waveN }, (_, i) => (
          <svg key={i} width="100%" height={waveH + 15} viewBox={`0 0 200 ${waveH+10}`}
            preserveAspectRatio="none"
            style={{
              position:"absolute", right:"5%", top:`${10+i*10}%`,
              opacity:0, filter:`drop-shadow(0 0 ${glow}px rgba(59,130,246,0.55))`,
              animation:`waveSweep ${dur/1000+i*0.15}s ease ${i*0.1}s forwards`,
            }}>
            <defs>
              <linearGradient id={`wvg${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.65"/>
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.45"/>
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.2"/>
              </linearGradient>
            </defs>
            <path d={`M0,${waveH*0.5} Q25,${waveH*0.1} 50,${waveH*0.5} T100,${waveH*0.5} T150,${waveH*0.5} T200,${waveH*0.5} L200,${waveH+10} L0,${waveH+10} Z`}
              fill={`url(#wvg${i})`}/>
            {/* Crest highlight */}
            <path d={`M0,${waveH*0.5} Q25,${waveH*0.1} 50,${waveH*0.5} T100,${waveH*0.5} T150,${waveH*0.5} T200,${waveH*0.5}`}
              fill="none" stroke="rgba(224,242,254,0.55)" strokeWidth="1.5"/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 2: 海嘯衝擊 (Tsunami Strike) ---
  if (idx === 2) {
    const splashN = 4 + lvl * 2;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, overflow:"hidden" }}>
        {/* Main tsunami wave */}
        <svg width="100%" height="75%" viewBox="0 0 200 120" preserveAspectRatio="none"
          style={{
            position:"absolute", right:"0", top:"5%",
            filter:`drop-shadow(0 0 ${glow+4}px rgba(37,99,235,0.6))`,
            animation:`waveSweep ${dur/1000}s ease forwards`, opacity:0,
          }}>
          <defs>
            <linearGradient id="tsuG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.8"/>
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.65"/>
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.35"/>
            </linearGradient>
          </defs>
          <path d="M-10,80 Q20,10 60,35 Q100,60 130,20 Q150,0 180,15 Q200,25 210,20 L210,120 L-10,120 Z"
            fill="url(#tsuG)"/>
          {/* Foam line */}
          <path d="M-10,80 Q20,10 60,35 Q100,60 130,20 Q150,0 180,15 Q200,25 210,20"
            fill="none" stroke="rgba(224,242,254,0.7)" strokeWidth="2.5"/>
        </svg>
        {/* Secondary wave */}
        <svg width="90%" height="55%" viewBox="0 0 200 100" preserveAspectRatio="none"
          style={{
            position:"absolute", right:"2%", top:"15%",
            filter:`drop-shadow(0 0 ${glow}px rgba(59,130,246,0.4))`,
            animation:`waveSweep ${dur/1000*1.1}s ease 0.1s forwards`, opacity:0,
          }}>
          <path d="M-10,70 Q30,20 70,45 Q110,70 150,30 Q180,10 210,25 L210,100 L-10,100 Z"
            fill="rgba(59,130,246,0.3)"/>
        </svg>
        {/* Splash droplets */}
        {Array.from({ length: splashN }, (_, i) => {
          const r = 3 + lvl + Math.random() * 3;
          const sz = r * 2 + 6;
          return (
            <svg key={`s${i}`} width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
              style={{
                position:"absolute",
                right:`${5+Math.random()*30}%`, top:`${6+Math.random()*22}%`,
                opacity:0, filter:`drop-shadow(0 0 3px #60a5fa)`,
                "--px":`${-18+Math.random()*36}px`, "--py":`${-8+Math.random()*28}px`,
                animation:`splashBurst 0.6s ease ${0.12+i*0.04}s forwards`,
              }}>
              <defs>
                <radialGradient id={`sp${i}`} cx="38%" cy="38%">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.75"/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.35"/>
                </radialGradient>
              </defs>
              <circle cx={sz/2} cy={sz/2} r={r} fill={`url(#sp${i})`}/>
            </svg>
          );
        })}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 65% 25%, rgba(59,130,246,${0.12+lvl*0.03}), transparent 60%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
      </div>
    );
  }

  // --- idx 3: 終極爆破 (dark+water) ---
  const ringN = 2 + lvl;
  const burstN = 3 + lvl * 2;
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, overflow:"hidden" }}>
      {/* Dark-water vortex rings */}
      {Array.from({ length: ringN }, (_, i) => (
        <svg key={`r${i}`} width="140" height="140" viewBox="0 0 140 140"
          style={{
            position:"absolute", right:"10%", top:"12%",
            animation:`darkRingExpand ${0.8+lvl*0.05}s ease ${i*0.12}s forwards`, opacity:0,
          }}>
          <circle cx="70" cy="70" r={20+i*10} fill="none"
            stroke={i%2===0?"#2563eb":"#0ea5e9"} strokeWidth={2.5-i*0.25}
            style={{ filter:`drop-shadow(0 0 ${glow}px #1d4ed8)` }} opacity={1-i*0.1}/>
        </svg>
      ))}
      {/* Radial splash burst */}
      {Array.from({ length: burstN }, (_, i) => {
        const angle = (i / burstN) * 360;
        const dist = 30 + Math.random() * 50;
        const r = 4 + lvl + Math.random() * 2;
        const sz = r * 2 + 6;
        return (
          <svg key={`b${i}`} width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
            style={{
              position:"absolute", right:"17%", top:"20%",
              opacity:0, filter:`drop-shadow(0 0 4px #60a5fa)`,
              "--px":`${Math.cos(angle*Math.PI/180)*dist}px`,
              "--py":`${Math.sin(angle*Math.PI/180)*dist}px`,
              animation:`splashBurst 0.65s ease ${0.08+i*0.035}s forwards`,
            }}>
            <circle cx={sz/2} cy={sz/2} r={r} fill="#60a5fa" opacity="0.65"/>
            <ellipse cx={sz/2-1} cy={sz/2-1} rx={r*0.25} ry={r*0.18}
              fill="rgba(255,255,255,0.4)"/>
          </svg>
        );
      })}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 65% 25%, rgba(37,99,235,${0.18+lvl*0.04}), transparent 55%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
    </div>
  );
}
