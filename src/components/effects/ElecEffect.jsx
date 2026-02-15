import { seedRange } from '../../utils/prng';

// Primary bolt paths (jagged lightning shapes)
const BOLT_A = "M60,0 L55,30 L70,32 L50,65 L62,42 L48,40 L60,0";
const BOLT_B = "M45,0 L42,22 L54,24 L38,52 L49,34 L37,32 L45,0";
const BOLT_C = "M52,0 L48,18 L60,20 L44,48 L55,30 L43,28 L52,0";

// Small spark polygon (6-pointed star)
const SPARK = "M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5Z";

const DEF_TARGET = { top: "calc(26% + 60px)", right: "calc(10% + 60px)", flyRight: 25, flyTop: 37 };

export default function ElecEffect({ idx = 0, lvl = 1, target = DEF_TARGET }) {
  const dur = 600 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  const T = target;
  const rr = (slot, i, min, max) => seedRange(`elec-${idx}-${lvl}-${slot}-${i}`, min, max);

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
              position:"absolute", right:`calc(${T.right} + ${rr("chain-spark-right", i, -8, 8)}%)`, top:`calc(${T.top} + ${rr("chain-spark-top", i, -5, 10)}%)`,
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
              position:"absolute", right:`calc(${T.right} + ${rr("storm-spark-right", i, -10, 10)}%)`, top:`calc(${T.top} + ${rr("storm-spark-top", i, -8, 12)}%)`,
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

  // --- idx 3: 終極爆破 — dark thunder prison + chain lightning ---
  const D = 0.34;
  const boltN = 5 + lvl;
  const arcN = 2 + Math.floor(lvl / 2);
  const sparkN = 6 + lvl * 2;
  const cageN = 6 + lvl;
  const boltPaths = [BOLT_A, BOLT_B, BOLT_C];
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80 }}>
      {/* Phase 1: Dark thunder cage forms around target */}
      <svg width="190" height="190" viewBox="0 0 190 190"
        style={{
          position:"absolute",
          right:T.right,
          top:T.top,
          transform:"translate(50%,-30%)",
          filter:`drop-shadow(0 0 ${glow + 4}px rgba(141,125,180,0.45))`,
        }}>
        <defs>
          <radialGradient id="eCore" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9"/>
            <stop offset="20%" stopColor="#fbbf24" stopOpacity="0.78"/>
            <stop offset="45%" stopColor="#9d8ec3" stopOpacity="0.42"/>
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="95" cy="95" r={20 + lvl * 4} fill="url(#eCore)"
          style={{ animation:`fireExpand ${dur/1000}s ease ${D}s forwards` }}/>
      </svg>
      {Array.from({ length: cageN }, (_, i) => {
        const angle = (i / cageN) * 360;
        const len = 34 + lvl * 5;
        return (
          <svg key={`c${i}`} width="8" height={len} viewBox={`0 0 8 ${len}`}
            style={{
              position:"absolute",
              right:`calc(${T.right} + ${Math.cos(angle * Math.PI / 180) * 8}px)`,
              top:`calc(${T.top} + ${Math.sin(angle * Math.PI / 180) * 8}px)`,
              transformOrigin:"center bottom",
              transform:`rotate(${angle}deg)`,
              opacity:0,
              filter:`drop-shadow(0 0 ${glow}px rgba(167,149,199,0.45))`,
              animation:`sparkle ${0.35 + rr("cage-anim", i, 0, 0.25)}s ease ${D + i * 0.03}s both`,
            }}>
            <rect x="2" y="0" width="4" height={len} rx="2" fill={i % 2 === 0 ? "rgba(167,149,199,0.42)" : "rgba(251,191,36,0.72)"} />
          </svg>
        );
      })}

      {/* Phase 2: Vertical thunder punish */}
      {Array.from({ length: boltN }, (_, i) => {
        const xOff = rr("bolt-x", i, -8, 10);
        const yOff = rr("bolt-y", i, -18, 4);
        return (
          <svg key={`bl${i}`} width="45" height="65" viewBox="0 0 80 70"
            style={{
              position:"absolute",
              right:`calc(${T.right} + ${xOff}%)`,
              top:`calc(${T.top} + ${yOff}%)`,
              transform:`scale(${0.65 + lvl * 0.05 + rr("bolt-sc", i, 0, 0.22)}) rotate(${rr("bolt-rot", i, -16, 16)}deg)`,
              transformOrigin:"center top",
              filter:`drop-shadow(0 0 ${glow+3}px #fbbf24) drop-shadow(0 0 ${glow+8}px rgba(141,125,180,0.52))`,
              animation:`lightningStrike ${0.42 + rr("bolt-anim", i, 0, 0.2)}s ease ${D+0.08+i*0.035}s both`,
              opacity:0,
            }}>
            <path d={boltPaths[i % 3]} fill={i % 2 === 0 ? "#fde68a" : "#c4b5fd"} />
          </svg>
        );
      })}

      {/* Phase 3: Chain arcs */}
      {Array.from({ length: arcN }, (_, i) => (
        <svg key={`a${i}`} width="100%" height="58" viewBox="0 0 210 45" preserveAspectRatio="none"
          style={{
            position:"absolute",
            right:`calc(${T.right} - ${14 + i * 4}px)`,
            top:`calc(${T.top} + ${4 + i * 10}px)`,
            filter:`drop-shadow(0 0 ${glow+2}px rgba(251,191,36,0.7))`,
            opacity:0,
            animation:`lightningStrike 0.65s ease ${D+0.12+i*0.08}s both`,
          }}>
          <defs>
            <linearGradient id={`eArc${i}`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="rgba(141,125,180,0.32)"/>
              <stop offset="45%" stopColor="rgba(251,191,36,0.9)"/>
              <stop offset="100%" stopColor="rgba(236,72,153,0.45)"/>
            </linearGradient>
          </defs>
          <path
            d={`M0,22 L22,${7+i*2} L45,26 L72,${10+i} L98,24 L123,${8+i*2} L148,25 L176,${12+i} L210,21`}
            fill="none"
            stroke={`url(#eArc${i})`}
            strokeWidth={2.2 + lvl * 0.25}
            strokeLinecap="round"
            strokeDasharray="220"
            strokeDashoffset="220"
            style={{ animation:`arcFlow ${0.55 + rr("arc-flow", i, 0, 0.25)}s ease ${D+0.15+i*0.09}s forwards` }}
          />
        </svg>
      ))}

      {/* Phase 4: Static sparks */}
      {Array.from({ length: sparkN }, (_, i) => (
        <svg key={`sk${i}`} width="13" height="13" viewBox="-8 -8 16 16"
          style={{
            position:"absolute",
            right:`calc(${T.right} + ${rr("ult-spark-right", i, -10, 11)}%)`,
            top:`calc(${T.top} + ${rr("ult-spark-top", i, -8, 13)}%)`,
            opacity:0,
            filter:`drop-shadow(0 0 4px #fbbf24) drop-shadow(0 0 6px rgba(141,125,180,0.5))`,
            animation:`sparkle ${0.35 + rr("sk-anim", i, 0, 0.3)}s ease ${D+0.14+i*0.03}s both`,
          }}>
          <path d={SPARK} fill={i % 2 === 0 ? "#fde68a" : "#c4b5fd"} opacity="0.72"/>
        </svg>
      ))}

      {/* Phase 5: Dark thunder global glow */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(141,125,180,${0.07+lvl*0.018}), rgba(251,191,36,${0.08+lvl*0.02}) 30%, rgba(30,27,75,${0.06+lvl*0.015}) 54%, transparent 72%)`, animation:`ultGlow ${dur/1000*1.2}s ease ${D}s` }}/>
    </div>
  );
}
