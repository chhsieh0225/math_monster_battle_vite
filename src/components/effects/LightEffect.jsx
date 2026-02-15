import { seedRange } from '../../utils/prng';

// Golden light orb shape
const ORB = "M12,2 C6,2 2,6 2,12 C2,18 6,22 12,22 C18,22 22,18 22,12 C22,6 18,2 12,2Z";

const DEF_TARGET = { top: "calc(26% + 60px)", right: "calc(10% + 60px)", flyRight: 25, flyTop: 37 };

export default function LightEffect({ idx = 0, lvl = 1, target = DEF_TARGET }) {
  const dur = 700 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  const T = target;
  const rr = (slot, i, min, max) => seedRange(`light-${idx}-${lvl}-${slot}-${i}`, min, max);

  // --- idx 0: 獵爪撲 (Light Claw) — golden orbs fly toward enemy ---
  if (idx === 0) {
    const n = 1 + Math.floor(lvl / 2);
    const sz = 28 + lvl * 4;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width={sz} height={sz} viewBox="0 0 24 24"
            style={{
              position:"absolute", left:`${10+i*5}%`, bottom:`${36+i*4}%`,
              "--fly-x":`${100-T.flyRight-(10+i*5)}vw`,
              "--fly-y":`${T.flyTop-(100-(36+i*4))}vh`,
              filter:`drop-shadow(0 0 ${glow}px #fbbf24) drop-shadow(0 0 ${glow+4}px #f59e0b)`,
              animation:`flameFly ${dur/1000+i*0.12}s ease ${i*0.08}s forwards`, opacity:0,
            }}>
            <defs>
              <radialGradient id={`lo${i}`} cx="40%" cy="40%">
                <stop offset="0%" stopColor="#fffbeb"/>
                <stop offset="45%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#f59e0b"/>
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r={8+lvl*0.5} fill={`url(#lo${i})`}/>
          </svg>
        ))}
        {/* Trail sparkles */}
        {Array.from({ length: 2 + lvl }, (_, i) => (
          <svg key={`t${i}`} width="16" height="16" viewBox="0 0 16 16"
            style={{
              position:"absolute", left:`${14+i*7}%`, bottom:`${38-i*3}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
              animation:`sparkle 0.45s ease ${0.05+i*0.06}s both`,
            }}>
            <polygon points="8,0 10,6 16,6 11,10 13,16 8,12 3,16 5,10 0,6 6,6"
              fill="#fbbf24" opacity="0.6" transform="scale(0.6) translate(5,5)"/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 1: 獅吼破 (Lion Roar Blast) — golden shockwave ---
  if (idx === 1) {
    const n = 3 + lvl;
    const sz = 24 + lvl * 3;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
        {/* Main projectiles */}
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width={sz} height={sz} viewBox="0 0 24 24"
            style={{
              position:"absolute", left:`${6+i*4}%`, bottom:`${34+i*3}%`,
              "--fly-x":`${100-T.flyRight-(6+i*4)}vw`,
              "--fly-y":`${T.flyTop-(100-(34+i*3))}vh`,
              filter:`drop-shadow(0 0 ${glow}px #fbbf24) drop-shadow(0 0 ${glow+2}px #d97706)`,
              animation:`flameFly ${dur/1000+i*0.07}s ease ${i*0.05}s forwards`, opacity:0,
            }}>
            <defs>
              <radialGradient id={`lr${i}`} cx="40%" cy="40%">
                <stop offset="0%" stopColor="#fffbeb"/>
                <stop offset="50%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#d97706"/>
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r={7+lvl*0.4} fill={`url(#lr${i})`}/>
          </svg>
        ))}
        {/* Star trail */}
        {Array.from({ length: 3 + lvl }, (_, i) => (
          <svg key={`s${i}`} width="14" height="14" viewBox="0 0 20 20"
            style={{
              position:"absolute", left:`${10+i*5}%`, bottom:`${38-i*3}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
              animation:`sparkle 0.4s ease ${0.03+i*0.04}s both`,
            }}>
            <polygon points="10,0 12.5,7.5 20,7.5 14,12.5 16,20 10,15 4,20 6,12.5 0,7.5 7.5,7.5"
              fill="#fbbf24" opacity="0.4" transform="scale(0.5) translate(10,10)"/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 2: 烈焰獵擊 (Blazing Hunt) — centered golden burst on enemy ---
  if (idx === 2) {
    const rayN = 10 + Math.floor(lvl * 1.5);
    const coreR = 20 + lvl * 4;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
        {/* Golden core explosion */}
        <svg width="180" height="180" viewBox="0 0 180 180"
          style={{
            position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
            filter:`drop-shadow(0 0 ${glow+6}px #f59e0b) drop-shadow(0 0 ${glow+10}px #fbbf24)`,
          }}>
          <defs>
            <radialGradient id="lightCore" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.95"/>
              <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.7"/>
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#d97706" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="90" cy="90" r={coreR} fill="url(#lightCore)"
            style={{ animation:`fireExpand ${dur/1000}s ease forwards` }}/>
        </svg>
        {/* Radial golden rays */}
        {Array.from({ length: rayN }, (_, i) => {
          const angle = (i / rayN) * 360;
          const len = 28 + lvl * 6 + rr("burst-len", i, 0, 15);
          const w = 3.5 + lvl * 0.5;
          return (
            <svg key={i} width={w+4} height={len} viewBox={`0 0 ${w+4} ${len}`}
              style={{
                position:"absolute", right:`calc(${T.right} + ${Math.cos(angle*Math.PI/180)*5}px)`,
                top:`calc(${T.top} + ${Math.sin(angle*Math.PI/180)*5}px)`,
                transformOrigin:"center bottom", transform:`rotate(${angle}deg)`,
                opacity:0, filter:`drop-shadow(0 0 ${glow}px #fbbf24)`,
                animation:`sparkle ${0.35 + rr("burst-anim", i, 0, 0.25)}s ease ${i*0.025}s both`,
              }}>
              <defs>
                <linearGradient id={`lray${i}`} x1="50%" y1="100%" x2="50%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#fef08a" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <rect x="1" y="0" width={w} height={len} rx={w/2} fill={`url(#lray${i})`}/>
            </svg>
          );
        })}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(251,191,36,${0.12+lvl*0.03}), transparent 55%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
      </div>
    );
  }

  // --- idx 3: 終極爆破 (Ultimate Burst) — dark-gold fusion ---
  const D = 0.5;
  const ringN = 3 + lvl;
  const rayN = 8 + lvl * 2;
  const orbN = 5 + lvl * 2;
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
      {/* Phase 1: Dark-gold orb approach */}
      <svg width="36" height="36" viewBox="0 0 36 36"
        style={{
          position:"absolute", left:"10%", bottom:"35%",
          "--fly-x":`${100-T.flyRight-10}vw`,
          "--fly-y":`${T.flyTop-65}vh`,
          filter:`drop-shadow(0 0 ${glow}px #f59e0b) drop-shadow(0 0 ${glow+4}px #9d8ec3)`,
          animation:`ultApproach 0.55s ease forwards`,
        }}>
        <defs><radialGradient id="lOrb" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#9d8ec3" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="18" cy="18" r="14" fill="url(#lOrb)"/>
      </svg>
      {/* Phase 2: Dark-gold void core */}
      <svg width="160" height="160" viewBox="0 0 160 160"
        style={{
          position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
          filter:`drop-shadow(0 0 ${glow+6}px #9d8ec3) drop-shadow(0 0 ${glow+10}px #f59e0b)`,
        }}>
        <defs><radialGradient id="lVoid" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8"/>
          <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.6"/>
          <stop offset="60%" stopColor="#9d8ec3" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#6b5f86" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="80" cy="80" r={20+lvl*4} fill="url(#lVoid)"
          style={{ animation:`fireExpand ${dur/1000}s ease ${D}s forwards` }}/>
      </svg>
      {/* Phase 3: Alternating gold-purple rings */}
      {Array.from({ length: ringN }, (_, i) => (
        <svg key={`r${i}`} width="160" height="160" viewBox="0 0 160 160"
          style={{
            position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
            animation:`darkRingExpand ${0.8+lvl*0.05}s ease ${D+i*0.1}s forwards`, opacity:0,
          }}>
          <circle cx="80" cy="80" r={16+i*9} fill="none"
            stroke={i%2===0?"#f59e0b":"#b19ecf"} strokeWidth={2.5-i*0.2}
            style={{ filter:`drop-shadow(0 0 ${glow}px ${i%2===0?"#f59e0b":"#9d8ec3"})` }} opacity={0.85-i*0.06}/>
        </svg>
      ))}
      {/* Phase 4: Radial light rays */}
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
              opacity:0, filter:`drop-shadow(0 0 ${glow}px #f59e0b)`,
              animation:`sparkle ${0.4 + rr("ult-ray-anim", i, 0, 0.3)}s ease ${D+0.06+i*0.03}s both`,
            }}>
            <defs><linearGradient id={`lrr${i}`} x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
            </linearGradient></defs>
            <rect x="1" y="0" width={w} height={len} rx={w/2} fill={`url(#lrr${i})`}/>
          </svg>
        );
      })}
      {/* Phase 5: Golden orb particles */}
      {Array.from({ length: orbN }, (_, i) => {
        const angle = (i / orbN) * 360;
        const dist = 28 + rr("ult-orb-dist", i, 0, 45);
        return (
          <svg key={`ob${i}`} width="24" height="24" viewBox="0 0 24 24"
            style={{
              position:"absolute", right:T.right, top:T.top,
              opacity:0, filter:`drop-shadow(0 0 ${glow}px #fbbf24)`,
              "--lx":`${Math.cos(angle*Math.PI/180)*dist}px`,
              "--ly":`${Math.sin(angle*Math.PI/180)*dist}px`,
              animation:`leafSpin ${0.5 + rr("ult-orb-anim", i, 0, 0.3)}s ease ${D+0.1+i*0.04}s forwards`,
            }}>
            <circle cx="12" cy="12" r={5+lvl*0.4}
              fill={i%3===0?"#fbbf24":i%3===1?"#f59e0b":"#fef08a"} opacity="0.7"/>
          </svg>
        );
      })}
      {/* Phase 6: Golden-purple glow */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(245,158,11,${0.08+lvl*0.02}), rgba(141,125,180,${0.025+lvl*0.006}) 40%, transparent 70%)`, animation:`ultGlow ${dur/1000*1.2}s ease ${D}s` }}/>
    </div>
  );
}
