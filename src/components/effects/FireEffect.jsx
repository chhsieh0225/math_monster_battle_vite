import { seedRange } from '../../utils/prng';

// SVG flame shape (teardrop)
const FLAME = "M10,28 C10,28 2,18 2,12 C2,5 5.5,0 10,0 C14.5,0 18,5 18,12 C18,18 10,28 10,28Z";

const DEF_TARGET = { top: "calc(26% + 60px)", right: "calc(10% + 60px)", flyRight: 25, flyTop: 37 };

export default function FireEffect({ idx = 0, lvl = 1, target = DEF_TARGET }) {
  const dur = 700 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  const T = target;
  const rr = (slot, i, min, max) => seedRange(`fire-${idx}-${lvl}-${slot}-${i}`, min, max);

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
              "--fly-x":`${100-T.flyRight-(10+i*5)}vw`,
              "--fly-y":`${T.flyTop-(100-(36+i*4))}vh`,
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
              "--fly-x":`${100-T.flyRight-(6+i*4)}vw`,
              "--fly-y":`${T.flyTop-(100-(34+i*3))}vh`,
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
          const len = 25 + lvl * 7 + rr("ray-len", i, 0, 15);
          const w = 4 + lvl * 0.5;
          return (
            <svg key={i} width={w+4} height={len} viewBox={`0 0 ${w+4} ${len}`}
              style={{
                position:"absolute", right:`calc(${T.right} + ${Math.cos(angle*Math.PI/180)*5}px)`,
                top:`calc(${T.top} + ${Math.sin(angle*Math.PI/180)*5}px)`,
                transformOrigin:"center bottom", transform:`rotate(${angle}deg)`,
                opacity:0, filter:`drop-shadow(0 0 ${glow}px #fbbf24)`,
                animation:`sparkle ${0.35 + rr("ray-anim", i, 0, 0.25)}s ease ${i*0.025}s both`,
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

  // --- idx 3: 終極爆破 — darkfire meteor + abyss heatwave ---
  const D = 0.34;
  const meteorN = 3 + lvl;
  const shockN = 2 + Math.floor(lvl / 2);
  const emberN = 7 + lvl * 2;
  const ashN = 4 + lvl;
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
      {/* Phase 1: Darkfire meteors fall from sky toward target */}
      {Array.from({ length: meteorN }, (_, i) => {
        const startLeft = 10 + i * 8 + rr("meteor-left", i, -2, 4);
        const startTop = 8 + rr("meteor-top", i, -2, 8);
        const meteorScale = 0.9 + rr("meteor-scale", i, 0, 0.4);
        return (
          <svg key={`m${i}`} width="34" height="42" viewBox="0 0 20 30"
            style={{
              position:"absolute",
              left:`${startLeft}%`,
              top:`${startTop}%`,
              "--fly-x":`${100 - T.flyRight - startLeft}vw`,
              "--fly-y":`${T.flyTop - startTop}vh`,
              opacity:0,
              transform:`scale(${meteorScale}) rotate(${rr("meteor-rot", i, -20, 20)}deg)`,
              filter:`drop-shadow(0 0 ${glow + 2}px #fbbf24) drop-shadow(0 0 ${glow + 8}px #ea580c)`,
              animation:`flameFly ${0.55 + lvl * 0.05 + i * 0.07}s cubic-bezier(.18,.82,.34,1) ${i * 0.06}s forwards`,
            }}>
            <defs>
              <radialGradient id={`fmtr${i}`} cx="45%" cy="30%">
                <stop offset="0%" stopColor="#f5d0fe"/>
                <stop offset="25%" stopColor="#7c3aed"/>
                <stop offset="58%" stopColor="#f97316"/>
                <stop offset="100%" stopColor="#991b1b"/>
              </radialGradient>
            </defs>
            <path d={FLAME} fill={`url(#fmtr${i})`} />
          </svg>
        );
      })}

      {/* Phase 2: Darkfire impact core */}
      <svg width="190" height="190" viewBox="0 0 190 190"
        style={{
          position:"absolute",
          right:T.right,
          top:T.top,
          transform:"translate(50%,-30%)",
          filter:`drop-shadow(0 0 ${glow + 7}px #7c3aed) drop-shadow(0 0 ${glow + 14}px #ea580c)`,
        }}>
        <defs>
          <radialGradient id="fImpact" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#f5d0fe" stopOpacity="0.95"/>
            <stop offset="22%" stopColor="#7c3aed" stopOpacity="0.85"/>
            <stop offset="48%" stopColor="#f97316" stopOpacity="0.74"/>
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="95" cy="95" r={26 + lvl * 4} fill="url(#fImpact)"
          style={{ animation:`fireExpand ${dur / 1000}s ease ${D}s forwards` }}/>
      </svg>

      {/* Phase 3: Abyss heatwave rings */}
      {Array.from({ length: shockN }, (_, i) => (
        <svg key={`h${i}`} width="220" height="120" viewBox="0 0 220 120"
          style={{
            position:"absolute",
            right:`calc(${T.right} - 28px)`,
            top:`calc(${T.top} - 22px)`,
            opacity:0,
            filter:`drop-shadow(0 0 ${glow + 2}px rgba(124,58,237,0.5))`,
            animation:`fireExpand ${0.62 + i * 0.12}s ease ${D + 0.08 + i * 0.1}s forwards`,
          }}>
          <ellipse cx="110" cy="60" rx={62 + i * 26} ry={18 + i * 6}
            fill="none" stroke={i % 2 === 0 ? "rgba(124,58,237,0.72)" : "rgba(251,113,133,0.62)"} strokeWidth={4 - i * 0.7}/>
        </svg>
      ))}

      {/* Phase 4: Lateral darkfire wind */}
      {Array.from({ length: 2 + lvl }, (_, i) => (
        <div key={`w${i}`}
          style={{
            position:"absolute",
            right:`calc(${T.right} - ${32 + i * 8}px)`,
            top:`calc(${T.top} + ${rr("wind-top", i, -8, 12)}px)`,
            width:`${120 + lvl * 18}px`,
            height:`${7 + rr("wind-h", i, 0, 4)}px`,
            borderRadius:999,
            background:"linear-gradient(90deg,rgba(255,255,255,0),rgba(124,58,237,0.78),rgba(251,146,60,0.84),rgba(127,29,29,0.55),rgba(255,255,255,0))",
            opacity:0,
            filter:`blur(${0.4 + rr("wind-blur", i, 0, 0.7)}px)`,
            animation:`windSweep ${0.5 + rr("wind-anim", i, 0, 0.25)}s ease ${D + 0.1 + i * 0.04}s forwards`,
          }}
        />
      ))}

      {/* Phase 5: Embers scatter */}
      {Array.from({ length: emberN }, (_, i) => {
        const angle = (i / emberN) * 360;
        const dist = 35 + rr("ember-dist", i, 0, 55);
        return (
          <svg key={`e${i}`} width="28" height="34" viewBox="0 0 20 30"
            style={{
              position:"absolute",
              right:T.right,
              top:T.top,
              opacity:0,
              filter:`drop-shadow(0 0 ${glow}px #fbbf24)`,
              "--lx":`${Math.cos(angle * Math.PI / 180) * dist}px`,
              "--ly":`${Math.sin(angle * Math.PI / 180) * dist}px`,
              animation:`leafSpin ${0.48 + rr("ember-anim", i, 0, 0.35)}s ease ${D + 0.12 + i * 0.035}s forwards`,
            }}>
            <path d={FLAME} fill={i % 4 === 0 ? "#a855f7" : i % 4 === 1 ? "#fbbf24" : i % 4 === 2 ? "#fb923c" : "#ef4444"} opacity="0.8"/>
          </svg>
        );
      })}

      {/* Phase 6: Ash smoke drift */}
      {Array.from({ length: ashN }, (_, i) => (
        <div key={`a${i}`}
          style={{
            position:"absolute",
            right:`calc(${T.right} + ${rr("ash-r", i, -10, 10)}px)`,
            top:`calc(${T.top} + ${rr("ash-t", i, -8, 8)}px)`,
            width:`${22 + rr("ash-sz", i, 0, 18)}px`,
            height:`${12 + rr("ash-sz2", i, 0, 10)}px`,
            borderRadius:"50%",
            background:"radial-gradient(ellipse,rgba(76,29,149,0.45),rgba(30,27,75,0.14),transparent 72%)",
            opacity:0,
            "--lx":`${rr("ash-lx", i, -45, 45)}px`,
            "--ly":`${rr("ash-ly", i, -60, 20)}px`,
            animation:`leafSpin ${0.8 + rr("ash-anim", i, 0, 0.5)}s ease ${D + 0.06 + i * 0.05}s forwards`,
          }}
        />
      ))}

      {/* Phase 7: Screen darkfire glow */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(124,58,237,${0.12 + lvl * 0.03}), rgba(249,115,22,${0.08 + lvl * 0.02}) 32%, rgba(127,29,29,${0.05 + lvl * 0.015}) 52%, transparent 74%)`, animation:`ultGlow ${dur/1000*1.15}s ease ${D}s` }}/>
    </div>
  );
}
