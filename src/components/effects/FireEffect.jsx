import { useEffect } from 'react';

// SVG flame shape (teardrop)
const FLAME = "M10,28 C10,28 2,18 2,12 C2,5 5.5,0 10,0 C14.5,0 18,5 18,12 C18,18 10,28 10,28Z";

const DEF_TARGET = { top: "34%", right: "16%" };

export default function FireEffect({ idx = 0, lvl = 1, target = DEF_TARGET, onDone }) {
  const dur = 700 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  const T = target;
  useEffect(() => { const t = setTimeout(onDone, dur + 350); return () => clearTimeout(t); }, [onDone]);

  // --- idx 0: 火花彈 (Fireball) ---
  if (idx === 0) {
    const n = 1 + Math.floor(lvl / 2);
    const sz = 32 + lvl * 5;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width={sz} height={sz+4} viewBox="0 0 20 30"
            style={{
              position:"absolute", left:`${10+i*5}%`, bottom:`${36+i*4}%`,
              filter:`drop-shadow(0 0 ${glow}px #fbbf24) drop-shadow(0 0 ${glow+4}px #ea580c)`,
              animation:`flameFly ${dur/1000+i*0.12}s ease ${i*0.08}s forwards`, opacity:0,
            }}>
            <defs>
              <radialGradient id={`fb${i}`} cx="50%" cy="38%">
                <stop offset="0%" stopColor="#fef08a"/>
                <stop offset="45%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#ea580c"/>
              </radialGradient>
            </defs>
            <path d={FLAME} fill={`url(#fb${i})`}/>
          </svg>
        ))}
        {/* Trail sparks */}
        {Array.from({ length: 2 + lvl }, (_, i) => (
          <svg key={`t${i}`} width="14" height="14" viewBox="0 0 14 14"
            style={{
              position:"absolute", left:`${14+i*7}%`, bottom:`${38-i*3}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
              animation:`sparkle 0.45s ease ${0.05+i*0.06}s both`,
            }}>
            <circle cx="7" cy="7" r={2.5+lvl*0.4} fill="#fbbf24" opacity="0.65"/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 1: 烈焰衝 (Flame Rush) ---
  if (idx === 1) {
    const n = 2 + lvl;
    const sz = 28 + lvl * 4;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width={sz} height={sz+6} viewBox="0 0 20 30"
            style={{
              position:"absolute", left:`${6+i*4}%`, bottom:`${34+i*3}%`,
              filter:`drop-shadow(0 0 ${glow}px #fbbf24) drop-shadow(0 0 ${glow+2}px #ea580c)`,
              animation:`flameFly ${dur/1000+i*0.07}s ease ${i*0.05}s forwards`, opacity:0,
            }}>
            <defs>
              <radialGradient id={`fr${i}`} cx="50%" cy="38%">
                <stop offset="0%" stopColor="#fef08a"/>
                <stop offset="50%" stopColor="#f97316"/>
                <stop offset="100%" stopColor="#dc2626"/>
              </radialGradient>
            </defs>
            <path d={FLAME} fill={`url(#fr${i})`}/>
          </svg>
        ))}
        {/* Ghost trail flames */}
        {Array.from({ length: 3 + lvl }, (_, i) => (
          <svg key={`s${i}`} width="18" height="22" viewBox="0 0 20 30"
            style={{
              position:"absolute", left:`${10+i*5}%`, bottom:`${38-i*3}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #f97316)`,
              animation:`sparkle 0.4s ease ${0.03+i*0.04}s both`,
            }}>
            <path d={FLAME} fill="#f97316" opacity="0.35" transform="scale(0.55)"/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 2: 爆炎轟 (Explosive Blaze) — centered on enemy ---
  if (idx === 2) {
    const rayN = 8 + Math.floor(lvl * 1.5);
    const coreR = 22 + lvl * 5;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
        {/* Explosion core */}
        <svg width="180" height="180" viewBox="0 0 180 180"
          style={{
            position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
            filter:`drop-shadow(0 0 ${glow+6}px #ea580c) drop-shadow(0 0 ${glow+10}px #fbbf24)`,
          }}>
          <defs>
            <radialGradient id="expCore" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9"/>
              <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.7"/>
              <stop offset="65%" stopColor="#ea580c" stopOpacity="0.45"/>
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="90" cy="90" r={coreR} fill="url(#expCore)"
            style={{ animation:`fireExpand ${dur/1000}s ease forwards` }}/>
        </svg>
        {/* Radial flame rays */}
        {Array.from({ length: rayN }, (_, i) => {
          const angle = (i / rayN) * 360;
          const len = 25 + lvl * 7 + Math.random() * 15;
          const w = 4 + lvl * 0.5;
          return (
            <svg key={i} width={w+4} height={len} viewBox={`0 0 ${w+4} ${len}`}
              style={{
                position:"absolute", right:`calc(${T.right} + ${Math.cos(angle*Math.PI/180)*5}px)`,
                top:`calc(${T.top} + ${Math.sin(angle*Math.PI/180)*5}px)`,
                transformOrigin:"center bottom", transform:`rotate(${angle}deg)`,
                opacity:0, filter:`drop-shadow(0 0 ${glow}px #fbbf24)`,
                animation:`sparkle ${0.35+Math.random()*0.25}s ease ${i*0.025}s both`,
              }}>
              <defs>
                <linearGradient id={`ray${i}`} x1="50%" y1="100%" x2="50%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <rect x="1" y="0" width={w} height={len} rx={w/2} fill={`url(#ray${i})`}/>
            </svg>
          );
        })}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(251,191,36,${0.12+lvl*0.03}), transparent 55%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
      </div>
    );
  }

  // --- idx 3: 終極爆破 (dark+fire) — centered on enemy ---
  const D = 0.5;
  const ringN = 2 + lvl;
  const rayN = 6 + lvl * 2;
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
      {/* Phase 1: Faint orb approach */}
      <svg width="36" height="36" viewBox="0 0 36 36"
        style={{
          position:"absolute", left:"10%", bottom:"35%",
          filter:`drop-shadow(0 0 ${glow}px #ea580c) drop-shadow(0 0 ${glow+4}px #7c3aed)`,
          animation:`ultApproach 0.55s ease forwards`,
        }}>
        <defs><radialGradient id="fOrb" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5"/>
          <stop offset="50%" stopColor="#ea580c" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="18" cy="18" r="14" fill="url(#fOrb)"/>
      </svg>
      {/* Phase 2: Dark-fire pulse rings on enemy */}
      {Array.from({ length: ringN }, (_, i) => (
        <svg key={`r${i}`} width="150" height="150" viewBox="0 0 150 150"
          style={{
            position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
            animation:`darkRingExpand ${0.8+lvl*0.05}s ease ${D+i*0.12}s forwards`, opacity:0,
          }}>
          <circle cx="75" cy="75" r={18+i*10} fill="none"
            stroke={i%2===0?"#7c3aed":"#ea580c"} strokeWidth={2.5-i*0.25}
            style={{ filter:`drop-shadow(0 0 ${glow}px ${i%2===0?"#7c3aed":"#ea580c"})` }}/>
        </svg>
      ))}
      {/* Radial fire rays from enemy center */}
      {Array.from({ length: rayN }, (_, i) => {
        const angle = (i / rayN) * 360;
        const len = 22 + lvl * 6;
        const w = 4 + lvl * 0.4;
        return (
          <svg key={`f${i}`} width={w+4} height={len} viewBox={`0 0 ${w+4} ${len}`}
            style={{
              position:"absolute", right:`calc(${T.right} + ${Math.cos(angle*Math.PI/180)*4}px)`,
              top:`calc(${T.top} + ${Math.sin(angle*Math.PI/180)*4}px)`,
              transformOrigin:"center bottom", transform:`rotate(${angle}deg)`,
              opacity:0, filter:`drop-shadow(0 0 ${glow}px #fbbf24)`,
              animation:`sparkle ${0.4+Math.random()*0.3}s ease ${D+0.06+i*0.035}s both`,
            }}>
            <defs>
              <linearGradient id={`dray${i}`} x1="50%" y1="100%" x2="50%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.75"/>
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <rect x="1" y="0" width={w} height={len} rx={w/2} fill={`url(#dray${i})`}/>
          </svg>
        );
      })}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(234,88,12,${0.06+lvl*0.015}), rgba(124,58,237,${0.03+lvl*0.01}) 40%, transparent 70%)`, animation:`ultGlow ${dur/1000*1.2}s ease ${D}s` }}/>
    </div>
  );
}
