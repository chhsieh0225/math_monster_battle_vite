import { useEffect } from 'react';

// SVG 8-pointed star
const STAR = "M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2Z";
// SVG 4-pointed spark (smaller)
const SPARK4 = "M0,-5 L1,-1 L5,0 L1,1 L0,5 L-1,1 L-5,0 L-1,-1Z";
const DEF_TARGET = { top: "34%", right: "16%" };

export default function DarkEffect({ idx = 0, lvl = 1, target = DEF_TARGET, onDone }) {
  const dur = 800 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  const T = target;
  useEffect(() => { const t = setTimeout(onDone, dur + 400); return () => clearTimeout(t); }, [onDone]);

  // --- idx 0: 暗影彈 (Shadow Bolt) ---
  if (idx === 0) {
    const n = 1 + Math.floor(lvl / 2);
    const coreR = 14 + lvl * 3;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"darkScreenFlash 1s ease" }}>
        {/* Dark projectiles */}
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width={coreR*2+16} height={coreR*2+16}
            viewBox={`0 0 ${coreR*2+16} ${coreR*2+16}`}
            style={{
              position:"absolute", left:`${8+i*8}%`, bottom:`${32+i*6}%`,
              "--fly-x":`${100-parseFloat(T.right)-(8+i*8)}vw`,
              "--fly-y":`${parseFloat(T.top)-(100-(32+i*6))}vh`,
              filter:`drop-shadow(0 0 ${glow}px #7c3aed) drop-shadow(0 0 ${glow+3}px #581c87)`,
              animation:`flameFly ${dur/1000+i*0.15}s ease ${i*0.1}s forwards`, opacity:0,
            }}>
            <defs>
              <radialGradient id={`db${i}`} cx="45%" cy="45%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.85"/>
                <stop offset="55%" stopColor="#7c3aed" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="#581c87" stopOpacity="0.3"/>
              </radialGradient>
            </defs>
            <circle cx={coreR+8} cy={coreR+8} r={coreR} fill={`url(#db${i})`}/>
            {/* Inner glow highlight */}
            <circle cx={coreR+4} cy={coreR+4} r={coreR*0.35}
              fill="rgba(196,181,253,0.4)"/>
          </svg>
        ))}
        {/* Star sparks trailing */}
        {Array.from({ length: 2 + lvl }, (_, i) => (
          <svg key={`s${i}`} width="18" height="18" viewBox="-10 -10 20 20"
            style={{
              position:"absolute", left:`${12+i*7}%`, bottom:`${34-i*4}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #a855f7)`,
              animation:`sparkle 0.45s ease ${0.06+i*0.07}s both`,
            }}>
            <path d={SPARK4} fill="#c4b5fd" opacity={0.6+lvl*0.05}/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 1: 暗影爪 (Shadow Claw) ---
  if (idx === 1) {
    const clawN = 2 + Math.floor(lvl / 2);
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"darkScreenFlash 1s ease" }}>
        {/* Claw slash marks */}
        {Array.from({ length: clawN }, (_, i) => (
          <svg key={i} width="100%" height="100%" viewBox="0 0 200 160"
            preserveAspectRatio="none"
            style={{
              position:"absolute", inset:0,
              filter:`drop-shadow(0 0 ${glow}px #7c3aed)`,
            }}>
            <defs>
              <linearGradient id={`claw${i}`} x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8"/>
                <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="#581c87" stopOpacity="0.2"/>
              </linearGradient>
            </defs>
            <path d={`M${15+i*12},${130-i*8} Q${60+i*10},${90-i*5} ${110+i*8},${55-i*6} Q${145+i*5},${30-i*4} ${175+i*3},${20-i*3}`}
              fill="none" stroke={`url(#claw${i})`}
              strokeWidth={3+lvl*0.6} strokeLinecap="round"
              strokeDasharray="300" strokeDashoffset="300"
              style={{ animation:`vineWhipDraw ${dur/1000+i*0.08}s ease ${i*0.1}s forwards` }}/>
          </svg>
        ))}
        {/* Impact stars at endpoint */}
        {Array.from({ length: 2 + lvl }, (_, i) => (
          <svg key={`st${i}`} width="20" height="20" viewBox="-10 -10 20 20"
            style={{
              position:"absolute", right:`calc(${T.right} + ${i*3}%)`, top:`calc(${T.top} + ${i*4}%)`,
              opacity:0, filter:`drop-shadow(0 0 ${glow-1}px #a855f7)`,
              "--sx":`${-15+Math.random()*30}px`, "--sy":`${-10+Math.random()*20}px`,
              animation:`darkStarSpin ${0.5+lvl*0.04}s ease ${dur/1000*0.6+i*0.06}s forwards`,
            }}>
            <path d={STAR} fill="#c4b5fd" opacity={0.7}/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 2: 暗黑風暴 (Dark Storm) ---
  if (idx === 2) {
    const ringN = 2 + Math.floor(lvl / 2);
    const starN = 4 + lvl * 2;
    const coreR = 20 + lvl * 4;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"darkScreenFlash 1s ease" }}>
        {/* Expanding dark core */}
        <svg width="160" height="160" viewBox="0 0 160 160"
          style={{
            position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
            filter:`drop-shadow(0 0 ${glow+5}px #581c87) drop-shadow(0 0 ${glow+8}px #7c3aed)`,
          }}>
          <defs>
            <radialGradient id="dkCore" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#581c87" stopOpacity="0.9"/>
              <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.6"/>
              <stop offset="70%" stopColor="#a855f7" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="80" cy="80" r={coreR} fill="url(#dkCore)"
            style={{ animation:`fireExpand ${dur/1000}s ease forwards` }}/>
        </svg>
        {/* Expanding pulse rings */}
        {Array.from({ length: ringN }, (_, i) => (
          <svg key={`r${i}`} width="150" height="150" viewBox="0 0 150 150"
            style={{
              position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
              animation:`darkRingExpand ${0.8+lvl*0.05}s ease ${i*0.15}s forwards`, opacity:0,
            }}>
            <circle cx="75" cy="75" r={20+i*12} fill="none"
              stroke={i%2===0?"#7c3aed":"#a855f7"}
              strokeWidth={2.5-i*0.3}
              style={{ filter:`drop-shadow(0 0 ${glow}px #7c3aed)` }}
              opacity={0.8-i*0.1}/>
          </svg>
        ))}
        {/* Scattered star particles */}
        {Array.from({ length: starN }, (_, i) => {
          const angle = (i / starN) * 360;
          const dist = 30 + Math.random() * 50;
          return (
            <svg key={`s${i}`} width="20" height="20" viewBox="-10 -10 20 20"
              style={{
                position:"absolute", right:T.right, top:T.top,
                opacity:0, filter:`drop-shadow(0 0 ${glow-1}px #a855f7)`,
                "--sx":`${Math.cos(angle*Math.PI/180)*dist}px`,
                "--sy":`${Math.sin(angle*Math.PI/180)*dist}px`,
                animation:`darkStarSpin ${0.5+Math.random()*0.3}s ease ${0.1+i*0.04}s forwards`,
              }}>
              <path d={i%2===0 ? STAR : SPARK4}
                fill={i%3===0?"#c4b5fd":"#a855f7"}
                opacity={0.6+lvl*0.04}/>
            </svg>
          );
        })}
        {/* Dark mist overlay */}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at ${parseInt(T.right)}% ${parseInt(T.top)}%, rgba(88,28,135,${0.15+lvl*0.04}), transparent 55%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
      </div>
    );
  }

  // --- idx 3: 終極爆破 — purple core + dark stars ---
  const D = 0.5;
  const ringN = 3 + lvl;
  const rayN = 8 + lvl * 2;
  const starN = 6 + lvl * 2;
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
      {/* Phase 1: Purple orb approach */}
      <svg width="36" height="36" viewBox="0 0 36 36"
        style={{
          position:"absolute", left:"10%", bottom:"35%",
          "--fly-x":`${100-parseFloat(T.right)-10}vw`,
          "--fly-y":`${parseFloat(T.top)-65}vh`,
          filter:`drop-shadow(0 0 ${glow}px #7c3aed) drop-shadow(0 0 ${glow+4}px #581c87)`,
          animation:`ultApproach 0.55s ease forwards`,
        }}>
        <defs><radialGradient id="dOrb" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#581c87" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="18" cy="18" r="14" fill="url(#dOrb)"/>
      </svg>
      {/* Phase 2: Purple void core */}
      <svg width="160" height="160" viewBox="0 0 160 160"
        style={{
          position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
          filter:`drop-shadow(0 0 ${glow+6}px #581c87) drop-shadow(0 0 ${glow+10}px #7c3aed)`,
        }}>
        <defs><radialGradient id="dVoid" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.95"/>
          <stop offset="30%" stopColor="#581c87" stopOpacity="0.8"/>
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="80" cy="80" r={22+lvl*5} fill="url(#dVoid)"
          style={{ animation:`fireExpand ${dur/1000}s ease ${D}s forwards` }}/>
      </svg>
      {/* Phase 3: Purple pulse rings */}
      {Array.from({ length: ringN }, (_, i) => (
        <svg key={`r${i}`} width="160" height="160" viewBox="0 0 160 160"
          style={{
            position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
            animation:`darkRingExpand ${0.8+lvl*0.05}s ease ${D+i*0.1}s forwards`, opacity:0,
          }}>
          <circle cx="80" cy="80" r={16+i*9} fill="none"
            stroke={i%2===0?"#7c3aed":"#a855f7"} strokeWidth={2.5-i*0.2}
            style={{ filter:`drop-shadow(0 0 ${glow}px #7c3aed)` }} opacity={0.85-i*0.06}/>
        </svg>
      ))}
      {/* Phase 4: Purple radial light rays */}
      {Array.from({ length: rayN }, (_, i) => {
        const angle = (i / rayN) * 360;
        const len = 24 + lvl * 6;
        const w = 3.5 + lvl * 0.4;
        return (
          <svg key={`ray${i}`} width={w+4} height={len} viewBox={`0 0 ${w+4} ${len}`}
            style={{
              position:"absolute", right:`calc(${T.right} + ${Math.cos(angle*Math.PI/180)*4}px)`,
              top:`calc(${T.top} + ${Math.sin(angle*Math.PI/180)*4}px)`,
              transformOrigin:"center bottom", transform:`rotate(${angle}deg)`,
              opacity:0, filter:`drop-shadow(0 0 ${glow}px #a855f7)`,
              animation:`sparkle ${0.4+Math.random()*0.3}s ease ${D+0.06+i*0.03}s both`,
            }}>
            <defs><linearGradient id={`dray${i}`} x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
            </linearGradient></defs>
            <rect x="1" y="0" width={w} height={len} rx={w/2} fill={`url(#dray${i})`}/>
          </svg>
        );
      })}
      {/* Phase 5: Dark-specific star explosion */}
      {Array.from({ length: starN }, (_, i) => {
        const angle = (i / starN) * 360;
        const dist = 30 + Math.random() * 55;
        return (
          <svg key={`st${i}`} width="22" height="22" viewBox="-10 -10 20 20"
            style={{
              position:"absolute", right:T.right, top:T.top,
              opacity:0, filter:`drop-shadow(0 0 ${glow}px #a855f7)`,
              "--sx":`${Math.cos(angle*Math.PI/180)*dist}px`,
              "--sy":`${Math.sin(angle*Math.PI/180)*dist}px`,
              animation:`darkStarSpin ${0.5+Math.random()*0.35}s ease ${D+0.1+i*0.035}s forwards`,
            }}>
            <path d={i%2===0 ? STAR : SPARK4}
              fill={i%3===0?"#e9d5ff":i%3===1?"#c4b5fd":"#a855f7"}
              opacity={0.7+lvl*0.04} transform={`rotate(${angle})`}/>
          </svg>
        );
      })}
      {/* Phase 6: Purple glow (deeper for dark) */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(30,27,75,${0.1+lvl*0.02}), rgba(88,28,135,${0.05+lvl*0.015}) 40%, transparent 70%)`, animation:`ultGlow ${dur/1000*1.2}s ease ${D}s` }}/>
    </div>
  );
}
