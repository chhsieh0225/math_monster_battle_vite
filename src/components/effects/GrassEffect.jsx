import { seedRange } from '../../utils/prng';

// SVG paths
const LEAF = "M0,-10 C5,-10 10,-4 10,0 C10,4 5,10 0,10 C-2,6 -3,2 -3,0 C-3,-2 -2,-6 0,-10Z";
const VEIN = "M0,-8 Q1,-3 0,0 Q-1,3 0,8";
const DEF_TARGET = { top: "calc(26% + 60px)", right: "calc(10% + 60px)", flyRight: 25, flyTop: 37 };

export default function GrassEffect({ idx = 0, lvl = 1, target = DEF_TARGET }) {
  const dur = 700 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  const T = target;
  const rr = (slot, i, min, max) => seedRange(`grass-${idx}-${lvl}-${slot}-${i}`, min, max);

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

  // --- idx 3: 終極爆破 — purple core + leaf particles ---
  const D = 0.5;
  const ringN = 3 + lvl;
  const rayN = 8 + lvl * 2;
  const leafN = 5 + lvl * 2;
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
      {/* Phase 1: Purple orb approach */}
      <svg width="34" height="34" viewBox="0 0 34 34"
        style={{
          position:"absolute", left:"10%", bottom:"35%",
          "--fly-x":`${100-T.flyRight-10}vw`,
          "--fly-y":`${T.flyTop-65}vh`,
          filter:`drop-shadow(0 0 ${glow}px #7c3aed) drop-shadow(0 0 ${glow+4}px #581c87)`,
          animation:`ultApproach 0.55s ease forwards`,
        }}>
        <defs><radialGradient id="gOrb" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#581c87" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="17" cy="17" r="13" fill="url(#gOrb)"/>
      </svg>
      {/* Phase 2: Purple void core */}
      <svg width="160" height="160" viewBox="0 0 160 160"
        style={{
          position:"absolute", right:T.right, top:T.top, transform:"translate(50%,-30%)",
          filter:`drop-shadow(0 0 ${glow+6}px #581c87) drop-shadow(0 0 ${glow+10}px #7c3aed)`,
        }}>
        <defs><radialGradient id="gVoid" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.9"/>
          <stop offset="35%" stopColor="#581c87" stopOpacity="0.7"/>
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
        </radialGradient></defs>
        <circle cx="80" cy="80" r={20+lvl*4} fill="url(#gVoid)"
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
              animation:`sparkle ${0.4 + rr("ult-ray-anim", i, 0, 0.3)}s ease ${D+0.06+i*0.03}s both`,
            }}>
            <defs><linearGradient id={`gray${i}`} x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
            </linearGradient></defs>
            <rect x="1" y="0" width={w} height={len} rx={w/2} fill={`url(#gray${i})`}/>
          </svg>
        );
      })}
      {/* Phase 5: Grass-specific leaf explosion */}
      {Array.from({ length: leafN }, (_, i) => {
        const angle = (i / leafN) * 360;
        const dist = 30 + rr("ult-leaf-dist", i, 0, 50);
        return (
          <svg key={`lf${i}`} width="22" height="22" viewBox="-12 -12 24 24"
            style={{
              position:"absolute", right:T.right, top:T.top,
              opacity:0, filter:`drop-shadow(0 0 ${glow}px #4ade80)`,
              "--lx":`${Math.cos(angle*Math.PI/180)*dist}px`,
              "--ly":`${Math.sin(angle*Math.PI/180)*dist}px`,
              animation:`leafSpin ${0.5 + rr("ult-leaf-anim", i, 0, 0.35)}s ease ${D+0.1+i*0.04}s forwards`,
            }}>
            <path d={LEAF} fill={i%2===0?"#4ade80":"#22c55e"} transform={`rotate(${angle})`}/>
          </svg>
        );
      })}
      {/* Phase 6: Purple glow */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(124,58,237,${0.08+lvl*0.02}), rgba(88,28,135,${0.04+lvl*0.01}) 40%, transparent 70%)`, animation:`ultGlow ${dur/1000*1.2}s ease ${D}s` }}/>
    </div>
  );
}
