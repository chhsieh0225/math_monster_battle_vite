import { seedRange } from '../../utils/prng';
import { DEFAULT_EFFECT_TARGET, type AttackElementEffectProps } from './effectTypes.ts';

// SVG paths
const LEAF = "M0,-10 C5,-10 10,-4 10,0 C10,4 5,10 0,10 C-2,6 -3,2 -3,0 C-3,-2 -2,-6 0,-10Z";
const VEIN = "M0,-8 Q1,-3 0,0 Q-1,3 0,8";
export default function GrassEffect({ idx = 0, lvl = 1, target = DEFAULT_EFFECT_TARGET }: AttackElementEffectProps) {
  const dur = 700 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  const T = target;
  const rr = (slot: string, i: number, min: number, max: number): number =>
    seedRange(`grass-${idx}-${lvl}-${slot}-${i}`, min, max);

  // --- idx 0: 葉刃切 (Leaf Blade) ---
  if (idx === 0) {
    const n = 1 + Math.floor(lvl / 2);
    const sz = 30 + lvl * 5;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width={sz} height={sz} viewBox="-12 -12 24 24"
            style={{
              position:"absolute", left:`${8+i*6}%`, bottom:`${36+i*5}%`,
              "--fly-x":`${100-T.flyRight-(8+i*6)}vw`,
              "--fly-y":`${T.flyTop-(100-(36+i*5))}vh`,
              filter:`drop-shadow(0 0 ${glow}px #22c55e)`,
              animation:`leafBladeFly ${dur/1000+i*0.12}s ease ${i*0.1}s forwards`, opacity:0,
            }}>
            <defs>
              <linearGradient id={`glf${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#15803d"/>
              </linearGradient>
            </defs>
            <path d={LEAF} fill={`url(#glf${i})`} stroke="#14532d" strokeWidth="0.5"/>
            <path d={VEIN} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7"/>
          </svg>
        ))}
        {Array.from({ length: 2 + lvl }, (_, i) => (
          <svg key={`t${i}`} width="16" height="16" viewBox="-12 -12 24 24"
            style={{
              position:"absolute", left:`${14+i*7}%`, bottom:`${38-i*3}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #4ade80)`,
              "--lx":`${rr("leaf-trail-x", i, 25, 75)}px`, "--ly":`${rr("leaf-trail-y", i, -45, -15)}px`,
              animation:`leafSpin 0.55s ease ${0.06+i*0.06}s forwards`,
            }}>
            <path d={LEAF} fill="#4ade80" opacity="0.5" transform={`scale(0.4) rotate(${i*55})`}/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 1: 藤鞭打 (Vine Whip) ---
  if (idx === 1) {
    const sw = 3 + lvl;
    const branches = Math.floor(lvl / 2);
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
        <svg width="100%" height="100%" viewBox="0 0 200 160" preserveAspectRatio="none"
          style={{ position:"absolute", inset:0, filter:`drop-shadow(0 0 ${glow+2}px rgba(34,197,94,0.35)) blur(0.6px)` }}>
          <defs>
            <linearGradient id="vineG" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.45"/>
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#86efac" stopOpacity="0.25"/>
            </linearGradient>
          </defs>
          {/* Main vine whip */}
          <path d="M12,135 Q50,115 85,78 Q115,45 145,38 Q165,30 185,28"
            fill="none" stroke="url(#vineG)" strokeWidth={sw+1} strokeLinecap="round"
            strokeDasharray="300" strokeDashoffset="300"
            style={{ animation:`vineWhipDraw ${dur/1000}s ease forwards` }} />
          {/* Branch vines */}
          {branches >= 1 && <path d="M100,62 Q118,48 128,54"
            fill="none" stroke="rgba(74,222,128,0.3)" strokeWidth={sw*0.55} strokeLinecap="round"
            strokeDasharray="60" strokeDashoffset="60"
            style={{ animation:`vineWhipDraw ${dur/1000*0.7}s ease 0.2s forwards` }} />}
          {branches >= 2 && <path d="M135,42 Q150,28 160,36"
            fill="none" stroke="rgba(74,222,128,0.25)" strokeWidth={sw*0.5} strokeLinecap="round"
            strokeDasharray="50" strokeDashoffset="50"
            style={{ animation:`vineWhipDraw ${dur/1000*0.6}s ease 0.32s forwards` }} />}
          {branches >= 3 && <path d="M75,85 Q88,68 98,75"
            fill="none" stroke="rgba(74,222,128,0.25)" strokeWidth={sw*0.5} strokeLinecap="round"
            strokeDasharray="50" strokeDashoffset="50"
            style={{ animation:`vineWhipDraw ${dur/1000*0.6}s ease 0.15s forwards` }} />}
          {/* Leaf tip */}
          <path d={LEAF} fill="rgba(34,197,94,0.4)" stroke="none"
            transform="translate(183,26) scale(0.7) rotate(-25)"
            style={{ opacity:0, animation:`leafBladeFly ${dur/1000*0.5}s ease ${dur/1000*0.6}s forwards` }}/>
        </svg>
        {/* Small leaf particles at impact */}
        {Array.from({ length: 1 + lvl }, (_, i) => (
          <svg key={`p${i}`} width="14" height="14" viewBox="-12 -12 24 24"
            style={{
              position:"absolute", right:`${10+i*4}%`, top:`${15+i*5}%`,
              opacity:0, filter:`drop-shadow(0 0 4px rgba(74,222,128,0.3)) blur(0.4px)`,
              "--lx":`${rr("branch-leaf-x", i, -15, 15)}px`, "--ly":`${rr("branch-leaf-y", i, -10, 10)}px`,
              animation:`leafSpin 0.5s ease ${dur/1000*0.7+i*0.06}s forwards`,
            }}>
            <path d={LEAF} fill="rgba(74,222,128,0.35)" transform={`scale(0.35) rotate(${i*70})`}/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 2: 森林風暴 (Forest Storm) ---
  if (idx === 2) {
    const n = 8 + lvl * 3;
    const windN = 2 + Math.floor(lvl / 2);
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"grassScreenFlash 0.9s ease" }}>
        {/* Wind streaks */}
        {Array.from({ length: windN }, (_, i) => (
          <svg key={`w${i}`} width="100%" height="30" viewBox="0 0 200 20" preserveAspectRatio="none"
            style={{
              position:"absolute", right:"5%", top:`${14+i*12}%`,
              opacity:0, filter:`drop-shadow(0 0 4px rgba(34,197,94,0.5))`,
              animation:`windSweep ${0.6+i*0.1}s ease ${i*0.08}s forwards`,
            }}>
            <path d={`M0,10 Q50,${2+i*3} 100,10 T200,10`}
              fill="none" stroke={`rgba(74,222,128,${0.35+i*0.05})`} strokeWidth={2+lvl*0.4} strokeLinecap="round"/>
          </svg>
        ))}
        {/* Scattered leaf blades */}
        {Array.from({ length: n }, (_, i) => {
          const sz = 20 + lvl * 3 + rr("storm-size", i, 0, 8);
          return (
            <svg key={i} width={sz} height={sz} viewBox="-12 -12 24 24"
              style={{
                position:"absolute",
                right:`calc(${T.right} + ${rr("storm-right", i, -12, 12)}%)`, top:`calc(${T.top} + ${rr("storm-top", i, -10, 15)}%)`,
                opacity:0, filter:`drop-shadow(0 0 ${glow}px #22c55e)`,
                "--lx":`${rr("storm-lx", i, 40, 120)}px`, "--ly":`${rr("storm-ly", i, -65, -20)}px`,
                animation:`leafSpin ${0.45 + rr("storm-anim", i, 0, 0.25)}s ease ${i*0.04}s forwards`,
              }}>
              <defs>
                <linearGradient id={`slf${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#166534"/>
                </linearGradient>
              </defs>
              <path d={LEAF} fill={`url(#slf${i})`} transform={`rotate(${rr("storm-rot", i, 0, 360)})`}/>
            </svg>
          );
        })}
        {/* Green screen glow */}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(34,197,94,${0.1+lvl*0.03}), transparent 60%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
      </div>
    );
  }

  // --- idx 3: 暗棘森崩 — abyss bramble collapse ---
  const fxLvl = Math.max(1, Math.min(12, lvl));
  const uid = `g-${idx}-${fxLvl}-${Math.round((T.flyRight || 0) * 10)}-${Math.round((T.flyTop || 0) * 10)}`;
  const D = 0.3;
  const ringN = Math.min(6, 2 + Math.floor(fxLvl / 2));
  const vineN = Math.min(10, 3 + fxLvl);
  const leafN = Math.min(16, 7 + fxLvl * 2);
  const thornN = Math.min(10, 4 + fxLvl);
  const orbId = `gOrb-${uid}`;
  const coreId = `gVoid-${uid}`;
  const coreFilterId = `gVoidFilter-${uid}`;
  const coreSeed = Math.max(1, Math.floor(rr("ult-core-seed", 0, 2, 90)));

  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
      {/* Phase 1: Dark seed rush */}
      <svg width="36" height="36" viewBox="0 0 36 36"
        style={{
          position:"absolute",
          left:"10%",
          bottom:"35%",
          "--fly-x":`${100-T.flyRight-10}vw`,
          "--fly-y":`${T.flyTop-65}vh`,
          filter:`drop-shadow(0 0 ${glow}px #4ade80) drop-shadow(0 0 ${glow+4}px #14532d)`,
          animation:"ultApproach 0.58s cubic-bezier(.16,.82,.22,1) forwards",
        }}>
        <defs><radialGradient id={orbId} cx="40%" cy="40%">
          <stop offset="0%" stopColor="#dcfce7" stopOpacity="0.82"/>
          <stop offset="34%" stopColor="#4ade80" stopOpacity="0.66"/>
          <stop offset="66%" stopColor="#166534" stopOpacity="0.54"/>
          <stop offset="100%" stopColor="#020617" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="18" cy="18" r="14" fill={`url(#${orbId})`}/>
      </svg>

      {/* Phase 2: Abyss bramble core */}
      <svg width="188" height="188" viewBox="0 0 188 188"
        style={{
          position:"absolute",
          right:T.right,
          top:T.top,
          transform:"translate(50%,-30%)",
          filter:`drop-shadow(0 0 ${glow+6}px #4ade80) drop-shadow(0 0 ${glow+10}px #14532d)`,
        }}>
        <defs>
          <radialGradient id={coreId} cx="50%" cy="50%">
            <stop offset="0%" stopColor="#f0fdf4" stopOpacity="0.9"/>
            <stop offset="20%" stopColor="#4ade80" stopOpacity="0.78"/>
            <stop offset="48%" stopColor="#16a34a" stopOpacity="0.62"/>
            <stop offset="74%" stopColor="#14532d" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#020617" stopOpacity="0"/>
          </radialGradient>
          <filter id={coreFilterId} x="-70%" y="-70%" width="240%" height="240%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.84" numOctaves="2" seed={coreSeed} result="noise">
              <animate attributeName="baseFrequency" values="0.84;0.46;0.2" dur={`${dur / 1000}s`} fill="freeze"/>
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="warp">
              <animate attributeName="scale" values={`0;${9 + fxLvl * 1.6};${2 + fxLvl * 0.5}`} dur={`${dur / 1000}s`} fill="freeze"/>
            </feDisplacementMap>
            <feGaussianBlur in="warp" stdDeviation="0" result="soft">
              <animate attributeName="stdDeviation" values="0;0.62;0.24" dur={`${dur / 1000}s`} fill="freeze"/>
            </feGaussianBlur>
            <feColorMatrix in="soft" type="matrix" values="0.92 0 0 0 0 0 1.06 0 0 0 0.1 0.12 0.86 0 0 0 0 0 1 0"/>
          </filter>
        </defs>
        <circle cx="94" cy="94" r={24 + fxLvl * 4} fill={`url(#${coreId})`} filter={`url(#${coreFilterId})`}
          style={{ animation:`fireExpand ${dur/1000}s ease ${D}s forwards` }}/>
      </svg>

      {/* Phase 3: Thorn pressure rings */}
      {Array.from({ length: ringN }, (_, i) => {
        const ringDelay = D + 0.08 + (i % 2) * 0.042 + Math.floor(i / 2) * 0.082;
        return (
          <svg key={`r${i}`} width="224" height="116" viewBox="0 0 224 116"
            style={{
              position:"absolute",
              right:`calc(${T.right} - 30px)`,
              top:`calc(${T.top} - 18px)`,
              opacity:0,
              animation:`darkRingExpand ${0.72 + i * 0.11}s ease ${ringDelay}s forwards`,
            }}>
            <ellipse cx="112" cy="58" rx={56 + i * 24} ry={17 + i * 5}
              fill="none"
              stroke={i % 2 === 0 ? "rgba(74,222,128,0.78)" : "rgba(20,83,45,0.74)"}
              strokeWidth={3.8 - i * 0.65}
              style={{ filter:`drop-shadow(0 0 ${glow}px rgba(74,222,128,0.65))` }}/>
          </svg>
        );
      })}

      {/* Phase 4: Converging vine lashes */}
      {Array.from({ length: vineN }, (_, i) => {
        const lane = i % 3;
        const wave = Math.floor(i / 3);
        const vineDelay = D + 0.1 + lane * 0.035 + wave * 0.055;
        return (
          <svg key={`v${i}`} width="100%" height="100%" viewBox="0 0 220 170" preserveAspectRatio="none"
            style={{
              position:"absolute",
              inset:0,
              opacity:0,
              filter:`drop-shadow(0 0 ${glow}px rgba(74,222,128,0.45))`,
              animation:`sparkle ${0.48 + rr("ult-vine-anim", i, 0, 0.2)}s ease ${vineDelay}s both`,
            }}>
            <defs><linearGradient id={`gVine-${uid}-${i}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(22,163,74,0.2)"/>
              <stop offset="46%" stopColor="rgba(74,222,128,0.62)"/>
              <stop offset="100%" stopColor="rgba(220,252,231,0.78)"/>
            </linearGradient></defs>
            <path
              d={`M${12 + i * 14},${140 - i * 8} Q${58 + i * 12},${102 - i * 6} ${106 + i * 8},${66 - i * 5} Q${146 + i * 6},${40 - i * 4} ${176 + i * 4},${28 - i * 2}`}
              fill="none"
              stroke={`url(#gVine-${uid}-${i})`}
              strokeWidth={2.8 + fxLvl * 0.35}
              strokeLinecap="round"
              strokeDasharray="300"
              strokeDashoffset="300"
              style={{ animation:`vineWhipDraw ${0.52 + rr("ult-vine-draw", i, 0, 0.24)}s ease ${vineDelay}s forwards` }}
            />
          </svg>
        );
      })}

      {/* Phase 5: Leaf burst */}
      {Array.from({ length: leafN }, (_, i) => {
        const angle = (i / leafN) * 360;
        const dist = 34 + rr("ult-leaf-dist", i, 0, 58);
        const delay = D + 0.12 + (i % 4) * 0.018 + Math.floor(i / 4) * 0.03;
        return (
          <svg key={`lf${i}`} width="22" height="22" viewBox="-12 -12 24 24"
            style={{
              position:"absolute",
              right:T.right,
              top:T.top,
              opacity:0,
              filter:`drop-shadow(0 0 ${glow}px #4ade80)`,
              "--lx":`${Math.cos(angle*Math.PI/180)*dist}px`,
              "--ly":`${Math.sin(angle*Math.PI/180)*dist}px`,
              animation:`leafSpin ${0.48 + rr("ult-leaf-anim", i, 0, 0.3)}s ease ${delay}s forwards`,
            }}>
            <path d={LEAF} fill={i % 3 === 0 ? "#86efac" : i % 3 === 1 ? "#4ade80" : "#166534"} transform={`rotate(${angle})`}/>
          </svg>
        );
      })}

      {/* Phase 6: Thorn shards */}
      {Array.from({ length: thornN }, (_, i) => (
        <div key={`th${i}`}
          style={{
            position:"absolute",
            right:`calc(${T.right} + ${rr("ult-thorn-right", i, -10, 10)}%)`,
            top:`calc(${T.top} + ${rr("ult-thorn-top", i, -10, 10)}%)`,
            width:`${6 + rr("ult-thorn-width", i, 0, 2.8)}px`,
            height:`${18 + fxLvl * 4 + rr("ult-thorn-height", i, 0, 14)}px`,
            borderRadius:999,
            background:"linear-gradient(180deg, rgba(220,252,231,0.8), rgba(34,197,94,0.78) 45%, rgba(20,83,45,0))",
            opacity:0,
            transform:`rotate(${rr("ult-thorn-rot", i, -26, 26)}deg)`,
            filter:`drop-shadow(0 0 ${glow}px rgba(74,222,128,0.62))`,
            animation:`sparkle ${0.38 + rr("ult-thorn-anim", i, 0, 0.22)}s ease ${D + 0.14 + (i % 3) * 0.03 + Math.floor(i / 3) * 0.05}s both`,
          }}
        />
      ))}

      {/* Phase 7: Deep-forest glow */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(74,222,128,${0.1+fxLvl*0.025}), rgba(22,101,52,${0.08+fxLvl*0.02}) 35%, rgba(2,6,23,${0.06+fxLvl*0.015}) 58%, transparent 74%)`, animation:`ultGlow ${dur/1000*1.2}s ease ${D}s` }}/>
    </div>
  );
}
