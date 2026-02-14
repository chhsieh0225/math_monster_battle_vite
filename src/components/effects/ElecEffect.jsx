import { useEffect } from 'react';

// Primary bolt paths (jagged lightning shapes)
const BOLT_A = "M60,0 L55,30 L70,32 L50,65 L62,42 L48,40 L60,0";
const BOLT_B = "M45,0 L42,22 L54,24 L38,52 L49,34 L37,32 L45,0";
const BOLT_C = "M52,0 L48,18 L60,20 L44,48 L55,30 L43,28 L52,0";

// Small spark polygon (6-pointed star)
const SPARK = "M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5Z";

const DEF_TARGET = { top: "34%", right: "16%" };

export default function ElecEffect({ idx = 0, lvl = 1, target = DEF_TARGET, onDone }) {
  const dur = 600 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  const T = target;
  useEffect(() => { const t = setTimeout(onDone, dur + 400); return () => clearTimeout(t); }, [onDone]);

  // --- idx 0: 基礎電擊 (Basic Bolt) — bolts strike near enemy ---
  if (idx === 0) {
    const n = 1 + Math.floor(lvl / 2);
    const sc = 0.8 + lvl * 0.1;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"lightningFlash 0.8s ease" }}>
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width="60" height="80" viewBox="0 0 80 70"
            style={{
              position:"absolute", right:`calc(${T.right} - ${2+i*5}%)`, top:`calc(${T.top} - ${10+i*3}%)`,
              transform:`scale(${sc})`,
              filter:`drop-shadow(0 0 ${glow}px #fbbf24) drop-shadow(0 0 ${glow+3}px #f59e0b)`,
              animation:`lightningStrike 0.5s ease ${i*0.12}s both`, opacity:0,
            }}>
            <defs>
              <linearGradient id={`bg${i}`} x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#fef08a"/>
                <stop offset="50%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#f59e0b"/>
              </linearGradient>
            </defs>
            <path d={BOLT_A} fill={`url(#bg${i})`}/>
          </svg>
        ))}
        {/* Electric sparks near enemy */}
        {Array.from({ length: 2 + lvl }, (_, i) => (
          <svg key={`s${i}`} width="16" height="16" viewBox="-8 -8 16 16"
            style={{
              position:"absolute", right:`calc(${T.right} - ${i*4}%)`, top:`calc(${T.top} + ${i*3}%)`,
              opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
              animation:`sparkle 0.4s ease ${0.08+i*0.08}s both`,
            }}>
            <path d={SPARK} fill="#fde68a" opacity={0.7+lvl*0.05}/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 1: 連鎖閃電 (Chain Lightning) — bolts near enemy ---
  if (idx === 1) {
    const n = 2 + Math.floor(lvl / 2);
    const sc = 0.85 + lvl * 0.08;
    const bolts = [BOLT_A, BOLT_B, BOLT_C];
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"lightningFlash 0.8s ease" }}>
        {/* Main bolts */}
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width="60" height="80" viewBox="0 0 80 70"
            style={{
              position:"absolute", right:`calc(${T.right} - ${i*6}%)`, top:`calc(${T.top} - ${12+i*4}%)`,
              transform:`scale(${sc}) rotate(${-8+i*6}deg)`,
              filter:`drop-shadow(0 0 ${glow}px #fbbf24) drop-shadow(0 0 ${glow+4}px #f59e0b)`,
              animation:`lightningStrike 0.5s ease ${i*0.1}s both`, opacity:0,
            }}>
            <defs>
              <linearGradient id={`cg${i}`} x1="30%" y1="0%" x2="70%" y2="100%">
                <stop offset="0%" stopColor="#fef9c3"/>
                <stop offset="45%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#d97706"/>
              </linearGradient>
            </defs>
            <path d={bolts[i % 3]} fill={`url(#cg${i})`}/>
          </svg>
        ))}
        {/* Branch bolts (smaller, translucent) */}
        {Array.from({ length: 1 + lvl }, (_, i) => (
          <svg key={`b${i}`} width="35" height="48" viewBox="0 0 80 70"
            style={{
              position:"absolute", right:`calc(${T.right} + ${i*4}%)`, top:`calc(${T.top} - ${6+i*5}%)`,
              transform:`rotate(${15+i*20}deg)`,
              filter:`drop-shadow(0 0 ${glow-1}px #fbbf24)`,
              animation:`lightningStrike 0.4s ease ${0.15+i*0.09}s both`, opacity:0,
            }}>
            <path d={BOLT_B} fill="#fde68a" opacity={0.4}/>
          </svg>
        ))}
        {/* Sparks */}
        {Array.from({ length: 3 + lvl }, (_, i) => (
          <svg key={`s${i}`} width="14" height="14" viewBox="-8 -8 16 16"
            style={{
              position:"absolute", right:`calc(${T.right} + ${-8+Math.random()*16}%)`, top:`calc(${T.top} + ${-5+Math.random()*15}%)`,
              opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
              animation:`sparkle 0.4s ease ${0.08+i*0.07}s both`,
            }}>
            <path d={SPARK} fill="#fde68a" opacity="0.7"/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 2: 雷霆萬鈞 (Thunder Storm) — centered on enemy ---
  if (idx === 2) {
    const n = 3 + Math.floor(lvl / 2);
    const sc = 0.9 + lvl * 0.1;
    const bolts = [BOLT_A, BOLT_B, BOLT_C];
    const arcN = 1 + Math.floor(lvl / 2);
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"lightningFlash 0.8s ease" }}>
        {/* Main bolts from above enemy */}
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width="65" height="85" viewBox="0 0 80 70"
            style={{
              position:"absolute", right:`calc(${T.right} - ${i*5}%)`, top:`calc(${T.top} - ${14+i*3}%)`,
              transform:`scale(${sc}) rotate(${-10+i*7}deg)`,
              filter:`drop-shadow(0 0 ${glow+2}px #fbbf24) drop-shadow(0 0 ${glow+6}px #f59e0b)`,
              animation:`lightningStrike 0.5s ease ${i*0.08}s both`, opacity:0,
            }}>
            <defs>
              <linearGradient id={`tg${i}`} x1="40%" y1="0%" x2="60%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                <stop offset="30%" stopColor="#fef08a"/>
                <stop offset="65%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#d97706"/>
              </linearGradient>
            </defs>
            <path d={bolts[i % 3]} fill={`url(#tg${i})`}/>
          </svg>
        ))}
        {/* Electric arcs near enemy */}
        {Array.from({ length: arcN }, (_, i) => (
          <svg key={`a${i}`} width="100%" height="60" viewBox="0 0 200 40"
            preserveAspectRatio="none"
            style={{
              position:"absolute", right:T.right, top:`calc(${T.top} + ${i*8}%)`,
              filter:`drop-shadow(0 0 ${glow}px #fbbf24)`,
              animation:`lightningStrike 0.6s ease ${0.2+i*0.12}s both`, opacity:0,
            }}>
            <defs>
              <linearGradient id={`ag${i}`} x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6"/>
                <stop offset="50%" stopColor="#fde68a" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
            <path d={`M0,20 L15,${8+i*4} L30,22 L50,${6+i*3} L70,24 L90,${10+i*2} L110,18 L130,${8+i*3} L150,22 L170,${12+i*2} L200,20`}
              fill="none" stroke={`url(#ag${i})`} strokeWidth={1.5+lvl*0.3} strokeLinecap="round"
              strokeDasharray="200" strokeDashoffset="200"
              style={{ animation:`arcFlow ${dur/1000*0.8}s ease ${0.15+i*0.1}s forwards` }}/>
          </svg>
        ))}
        {/* Branch bolts */}
        {Array.from({ length: 2 + lvl }, (_, i) => (
          <svg key={`b${i}`} width="30" height="42" viewBox="0 0 80 70"
            style={{
              position:"absolute", right:`calc(${T.right} + ${-3+i*4}%)`, top:`calc(${T.top} - ${4+i*4}%)`,
              transform:`rotate(${10+i*25}deg)`,
              filter:`drop-shadow(0 0 ${glow-1}px #fbbf24)`,
              animation:`lightningStrike 0.35s ease ${0.1+i*0.06}s both`, opacity:0,
            }}>
            <path d={BOLT_C} fill="#fde68a" opacity={0.35}/>
          </svg>
        ))}
        {/* Many sparks around enemy */}
        {Array.from({ length: 4 + lvl * 2 }, (_, i) => (
          <svg key={`s${i}`} width="12" height="12" viewBox="-8 -8 16 16"
            style={{
              position:"absolute", right:`calc(${T.right} + ${-10+Math.random()*20}%)`, top:`calc(${T.top} + ${-8+Math.random()*20}%)`,
              opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
              animation:`sparkle 0.35s ease ${0.05+i*0.05}s both`,
            }}>
            <path d={SPARK} fill="#fde68a" opacity="0.65"/>
          </svg>
        ))}
        {/* Screen glow centered on enemy */}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(251,191,36,${0.1+lvl*0.03}), transparent 55%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
      </div>
    );
  }

  // --- idx 3: 終極爆破 — purple core + lightning sparks ---
  const D = 0.5;
  const ringN = 3 + lvl;
  const rayN = 8 + lvl * 2;
  const boltN = 4 + lvl;
  const sc = 0.7 + lvl * 0.06;
  const boltPaths = [BOLT_A, BOLT_B, BOLT_C];
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
      {/* Phase 1: Purple orb approach */}
      <svg width="34" height="34" viewBox="0 0 34 34"
        style={{
          position:"absolute", left:"10%", bottom:"35%",
          "--fly-x":`${100-parseFloat(T.right)-10}vw`,
          "--fly-y":`${parseFloat(T.top)-65}vh`,
          filter:`drop-shadow(0 0 ${glow}px #7c3aed) drop-shadow(0 0 ${glow+4}px #581c87)`,
          animation:`ultApproach 0.55s ease forwards`,
        }}>
        <defs><radialGradient id="eOrb" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#581c87" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="17" cy="17" r="13" fill="url(#eOrb)"/>
      </svg>
      {/* Phase 2: Purple void core */}
      <svg width="160" height="160" viewBox="0 0 160 160"
        style={{
          position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
          filter:`drop-shadow(0 0 ${glow+6}px #581c87) drop-shadow(0 0 ${glow+10}px #7c3aed)`,
        }}>
        <defs><radialGradient id="eVoid" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.9"/>
          <stop offset="35%" stopColor="#581c87" stopOpacity="0.7"/>
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="80" cy="80" r={20+lvl*4} fill="url(#eVoid)"
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
            <defs><linearGradient id={`eray${i}`} x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
            </linearGradient></defs>
            <rect x="1" y="0" width={w} height={len} rx={w/2} fill={`url(#eray${i})`}/>
          </svg>
        );
      })}
      {/* Phase 5: Electric-specific bolts + sparks */}
      {Array.from({ length: boltN }, (_, i) => {
        const angle = (i / boltN) * 360;
        return (
          <svg key={`bl${i}`} width="45" height="65" viewBox="0 0 80 70"
            style={{
              position:"absolute", right:`calc(${T.right} + ${Math.cos(angle*Math.PI/180)*5}px)`,
              top:`calc(${T.top} + ${Math.sin(angle*Math.PI/180)*5}px)`,
              transformOrigin:"center top", transform:`rotate(${angle}deg) scale(${sc})`,
              filter:`drop-shadow(0 0 ${glow+2}px #fbbf24)`,
              animation:`lightningStrike 0.45s ease ${D+0.08+i*0.04}s both`, opacity:0,
            }}>
            <path d={boltPaths[i % 3]} fill="#fde68a"/>
          </svg>
        );
      })}
      {Array.from({ length: 4 + lvl }, (_, i) => (
        <svg key={`sk${i}`} width="12" height="12" viewBox="-8 -8 16 16"
          style={{
            position:"absolute", right:`calc(${T.right} + ${-8+Math.random()*16}%)`, top:`calc(${T.top} + ${-6+Math.random()*16}%)`,
            opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
            animation:`sparkle 0.4s ease ${D+0.12+i*0.04}s both`,
          }}>
          <path d={SPARK} fill="#fde68a" opacity="0.65"/>
        </svg>
      ))}
      {/* Phase 6: Purple glow */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(124,58,237,${0.08+lvl*0.02}), rgba(88,28,135,${0.04+lvl*0.01}) 40%, transparent 70%)`, animation:`ultGlow ${dur/1000*1.2}s ease ${D}s` }}/>
    </div>
  );
}
