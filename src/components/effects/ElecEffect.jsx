import { useEffect } from 'react';

// Primary bolt paths (jagged lightning shapes)
const BOLT_A = "M60,0 L55,30 L70,32 L50,65 L62,42 L48,40 L60,0";
const BOLT_B = "M45,0 L42,22 L54,24 L38,52 L49,34 L37,32 L45,0";
const BOLT_C = "M52,0 L48,18 L60,20 L44,48 L55,30 L43,28 L52,0";

// Small spark polygon (6-pointed star)
const SPARK = "M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5Z";

export default function ElecEffect({ idx = 0, lvl = 1, onDone }) {
  const dur = 600 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  useEffect(() => { const t = setTimeout(onDone, dur + 400); return () => clearTimeout(t); }, [onDone]);

  // --- idx 0: 基礎電擊 (Basic Bolt) ---
  if (idx === 0) {
    const n = 1 + Math.floor(lvl / 2);
    const sc = 0.8 + lvl * 0.1;
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"lightningFlash 0.8s ease" }}>
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width="60" height="80" viewBox="0 0 80 70"
            style={{
              position:"absolute", right:`${8+i*10}%`, top:`${3+i*4}%`,
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
        {/* Electric sparks */}
        {Array.from({ length: 2 + lvl }, (_, i) => (
          <svg key={`s${i}`} width="16" height="16" viewBox="-8 -8 16 16"
            style={{
              position:"absolute", right:`${6+i*7}%`, top:`${10+i*6}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
              animation:`sparkle 0.4s ease ${0.08+i*0.08}s both`,
            }}>
            <path d={SPARK} fill="#fde68a" opacity={0.7+lvl*0.05}/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 1: 連鎖閃電 (Chain Lightning) ---
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
              position:"absolute", right:`${6+i*9}%`, top:`${2+i*5}%`,
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
              position:"absolute", right:`${12+i*8}%`, top:`${8+i*7}%`,
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
              position:"absolute", right:`${5+Math.random()*25}%`, top:`${5+Math.random()*30}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
              animation:`sparkle 0.4s ease ${0.08+i*0.07}s both`,
            }}>
            <path d={SPARK} fill="#fde68a" opacity="0.7"/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 2: 雷霆萬鈞 (Thunder Storm) ---
  if (idx === 2) {
    const n = 3 + Math.floor(lvl / 2);
    const sc = 0.9 + lvl * 0.1;
    const bolts = [BOLT_A, BOLT_B, BOLT_C];
    const arcN = 1 + Math.floor(lvl / 2);
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"lightningFlash 0.8s ease" }}>
        {/* Main bolts with full gradient */}
        {Array.from({ length: n }, (_, i) => (
          <svg key={i} width="65" height="85" viewBox="0 0 80 70"
            style={{
              position:"absolute", right:`${5+i*8}%`, top:`${1+i*4}%`,
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
        {/* Electric arcs connecting bolts */}
        {Array.from({ length: arcN }, (_, i) => (
          <svg key={`a${i}`} width="100%" height="60" viewBox="0 0 200 40"
            preserveAspectRatio="none"
            style={{
              position:"absolute", right:"5%", top:`${12+i*14}%`,
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
              position:"absolute", right:`${8+i*7}%`, top:`${6+i*6}%`,
              transform:`rotate(${10+i*25}deg)`,
              filter:`drop-shadow(0 0 ${glow-1}px #fbbf24)`,
              animation:`lightningStrike 0.35s ease ${0.1+i*0.06}s both`, opacity:0,
            }}>
            <path d={BOLT_C} fill="#fde68a" opacity={0.35}/>
          </svg>
        ))}
        {/* Many sparks */}
        {Array.from({ length: 4 + lvl * 2 }, (_, i) => (
          <svg key={`s${i}`} width="12" height="12" viewBox="-8 -8 16 16"
            style={{
              position:"absolute", right:`${3+Math.random()*30}%`, top:`${3+Math.random()*35}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
              animation:`sparkle 0.35s ease ${0.05+i*0.05}s both`,
            }}>
            <path d={SPARK} fill="#fde68a" opacity="0.65"/>
          </svg>
        ))}
        {/* Screen glow */}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 65% 25%, rgba(251,191,36,${0.1+lvl*0.03}), transparent 55%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
      </div>
    );
  }

  // --- idx 3: 終極爆破 (dark+electric) ---
  const ringN = 2 + lvl;
  const boltN = 4 + lvl;
  const sc = 1.0 + lvl * 0.08;
  const bolts = [BOLT_A, BOLT_B, BOLT_C];
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"lightningFlash 0.8s ease" }}>
      {/* Dark-electric pulse rings */}
      {Array.from({ length: ringN }, (_, i) => (
        <svg key={`r${i}`} width="150" height="150" viewBox="0 0 150 150"
          style={{
            position:"absolute", right:"10%", top:"10%",
            animation:`darkRingExpand ${0.8+lvl*0.05}s ease ${i*0.12}s forwards`, opacity:0,
          }}>
          <circle cx="75" cy="75" r={18+i*10} fill="none"
            stroke={i%2===0?"#7c3aed":"#fbbf24"} strokeWidth={2.5-i*0.25}
            style={{ filter:`drop-shadow(0 0 ${glow}px ${i%2===0?"#7c3aed":"#fbbf24"})` }}/>
        </svg>
      ))}
      {/* Radial bolts from center */}
      {Array.from({ length: boltN }, (_, i) => {
        const angle = (i / boltN) * 360;
        return (
          <svg key={`f${i}`} width="50" height="70" viewBox="0 0 80 70"
            style={{
              position:"absolute", right:`calc(17% + ${Math.cos(angle*Math.PI/180)*6}px)`,
              top:`calc(22% + ${Math.sin(angle*Math.PI/180)*6}px)`,
              transformOrigin:"center top", transform:`rotate(${angle}deg) scale(${sc*0.7})`,
              filter:`drop-shadow(0 0 ${glow+2}px #fbbf24) drop-shadow(0 0 ${glow}px #7c3aed)`,
              animation:`lightningStrike 0.45s ease ${0.08+i*0.04}s both`, opacity:0,
            }}>
            <defs>
              <linearGradient id={`ug${i}`} x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9"/>
                <stop offset="55%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#d97706"/>
              </linearGradient>
            </defs>
            <path d={bolts[i % 3]} fill={`url(#ug${i})`}/>
          </svg>
        );
      })}
      {/* Central dark-electric core */}
      <svg width="100" height="100" viewBox="0 0 100 100"
        style={{
          position:"absolute", right:"14%", top:"14%",
          filter:`drop-shadow(0 0 ${glow+6}px #7c3aed) drop-shadow(0 0 ${glow+4}px #fbbf24)`,
        }}>
        <defs>
          <radialGradient id="elecCore" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.8"/>
            <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.6"/>
            <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#581c87" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r={16+lvl*3} fill="url(#elecCore)"
          style={{ animation:`fireExpand ${dur/1000}s ease forwards` }}/>
      </svg>
      {/* Sparks scattered */}
      {Array.from({ length: 5 + lvl * 2 }, (_, i) => (
        <svg key={`s${i}`} width="12" height="12" viewBox="-8 -8 16 16"
          style={{
            position:"absolute", right:`${3+Math.random()*30}%`, top:`${3+Math.random()*35}%`,
            opacity:0, filter:`drop-shadow(0 0 3px #fbbf24)`,
            animation:`sparkle 0.4s ease ${0.1+i*0.04}s both`,
          }}>
          <path d={SPARK} fill="#fde68a" opacity="0.6"/>
        </svg>
      ))}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 65% 28%, rgba(251,191,36,${0.12+lvl*0.03}), rgba(124,58,237,${0.08+lvl*0.02}), transparent 55%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
    </div>
  );
}
