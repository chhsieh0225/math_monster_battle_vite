import { useEffect } from 'react';

// SVG paths
const LEAF = "M0,-10 C5,-10 10,-4 10,0 C10,4 5,10 0,10 C-2,6 -3,2 -3,0 C-3,-2 -2,-6 0,-10Z";
const VEIN = "M0,-8 Q1,-3 0,0 Q-1,3 0,8";

export default function GrassEffect({ idx = 0, lvl = 1, onDone }) {
  const dur = 700 + idx * 120 + lvl * 30;
  const glow = 4 + lvl * 2;
  useEffect(() => { const t = setTimeout(onDone, dur + 350); return () => clearTimeout(t); }, [onDone]);

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
              "--lx":`${25+Math.random()*50}px`, "--ly":`${-15-Math.random()*30}px`,
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
          style={{ position:"absolute", inset:0, filter:`drop-shadow(0 0 ${glow}px #22c55e)` }}>
          <defs>
            <linearGradient id="vineG" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80"/><stop offset="40%" stopColor="#22c55e"/>
              <stop offset="100%" stopColor="#15803d"/>
            </linearGradient>
          </defs>
          {/* Main vine whip */}
          <path d="M12,135 Q50,115 85,78 Q115,45 145,38 Q165,30 185,28"
            fill="none" stroke="url(#vineG)" strokeWidth={sw} strokeLinecap="round"
            strokeDasharray="300" strokeDashoffset="300"
            style={{ animation:`vineWhipDraw ${dur/1000}s ease forwards` }} />
          {/* Branch vines */}
          {branches >= 1 && <path d="M100,62 Q118,48 128,54"
            fill="none" stroke="#4ade80" strokeWidth={sw*0.55} strokeLinecap="round"
            strokeDasharray="60" strokeDashoffset="60"
            style={{ animation:`vineWhipDraw ${dur/1000*0.7}s ease 0.2s forwards`, opacity:0.7 }} />}
          {branches >= 2 && <path d="M135,42 Q150,28 160,36"
            fill="none" stroke="#4ade80" strokeWidth={sw*0.5} strokeLinecap="round"
            strokeDasharray="50" strokeDashoffset="50"
            style={{ animation:`vineWhipDraw ${dur/1000*0.6}s ease 0.32s forwards`, opacity:0.6 }} />}
          {branches >= 3 && <path d="M75,85 Q88,68 98,75"
            fill="none" stroke="#4ade80" strokeWidth={sw*0.5} strokeLinecap="round"
            strokeDasharray="50" strokeDashoffset="50"
            style={{ animation:`vineWhipDraw ${dur/1000*0.6}s ease 0.15s forwards`, opacity:0.6 }} />}
          {/* Leaf tip */}
          <path d={LEAF} fill="#22c55e" stroke="#15803d" strokeWidth="0.3"
            transform="translate(183,26) scale(0.7) rotate(-25)"
            style={{ opacity:0, animation:`leafBladeFly ${dur/1000*0.5}s ease ${dur/1000*0.6}s forwards` }}/>
        </svg>
        {/* Small leaf particles at impact */}
        {Array.from({ length: 1 + lvl }, (_, i) => (
          <svg key={`p${i}`} width="14" height="14" viewBox="-12 -12 24 24"
            style={{
              position:"absolute", right:`${10+i*4}%`, top:`${15+i*5}%`,
              opacity:0, filter:`drop-shadow(0 0 3px #4ade80)`,
              "--lx":`${-15+Math.random()*30}px`, "--ly":`${-10+Math.random()*20}px`,
              animation:`leafSpin 0.5s ease ${dur/1000*0.7+i*0.06}s forwards`,
            }}>
            <path d={LEAF} fill="#4ade80" opacity="0.6" transform={`scale(0.35) rotate(${i*70})`}/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 2: 森林風暴 (Forest Storm) ---
  if (idx === 2) {
    const n = 4 + lvl * 2;
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
          const sz = 20 + lvl * 3 + Math.random() * 8;
          return (
            <svg key={i} width={sz} height={sz} viewBox="-12 -12 24 24"
              style={{
                position:"absolute",
                left:`${5+Math.random()*30}%`, bottom:`${22+Math.random()*30}%`,
                opacity:0, filter:`drop-shadow(0 0 ${glow}px #22c55e)`,
                "--lx":`${40+Math.random()*80}px`, "--ly":`${-20-Math.random()*45}px`,
                animation:`leafSpin ${0.45+Math.random()*0.25}s ease ${i*0.04}s forwards`,
              }}>
              <defs>
                <linearGradient id={`slf${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#166534"/>
                </linearGradient>
              </defs>
              <path d={LEAF} fill={`url(#slf${i})`} transform={`rotate(${Math.random()*360})`}/>
            </svg>
          );
        })}
        {/* Green screen glow */}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 65% 30%, rgba(34,197,94,${0.1+lvl*0.03}), transparent 60%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
      </div>
    );
  }

  // --- idx 3: 終極爆破 (dark+grass) ---
  const n = 4 + lvl * 2;
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:80, animation:"grassScreenFlash 0.9s ease" }}>
      {/* Dark-green pulse rings */}
      {Array.from({ length: 2 + lvl }, (_, i) => (
        <svg key={`r${i}`} width="130" height="130" viewBox="0 0 130 130"
          style={{
            position:"absolute", right:"12%", top:"13%",
            animation:`darkRingExpand ${0.8+lvl*0.05}s ease ${i*0.12}s forwards`, opacity:0,
          }}>
          <circle cx="65" cy="65" r={18+i*9} fill="none"
            stroke={i%2===0?"#22c55e":"#15803d"} strokeWidth={2.5-i*0.2}
            style={{ filter:`drop-shadow(0 0 ${glow}px #15803d)` }} opacity={1-i*0.12}/>
        </svg>
      ))}
      {/* Central vine spiral */}
      <svg width="100%" height="100%" viewBox="0 0 200 160" preserveAspectRatio="none"
        style={{ position:"absolute", inset:0, filter:`drop-shadow(0 0 ${glow+4}px #22c55e)` }}>
        <path d="M15,135 Q55,105 95,72 Q135,40 178,28"
          fill="none" stroke="#15803d" strokeWidth={4+lvl} strokeLinecap="round"
          strokeDasharray="300" strokeDashoffset="300"
          style={{ animation:`vineWhipDraw ${dur/1000}s ease forwards` }}/>
      </svg>
      {/* Leaf explosion from impact point */}
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 360;
        const dist = 35 + Math.random() * 55;
        return (
          <svg key={`l${i}`} width="22" height="22" viewBox="-12 -12 24 24"
            style={{
              position:"absolute", right:"17%", top:"20%",
              opacity:0, filter:`drop-shadow(0 0 ${glow}px #4ade80)`,
              "--lx":`${Math.cos(angle*Math.PI/180)*dist}px`,
              "--ly":`${Math.sin(angle*Math.PI/180)*dist}px`,
              animation:`leafSpin ${0.45+Math.random()*0.35}s ease ${0.1+i*0.035}s forwards`,
            }}>
            <path d={LEAF} fill="#4ade80" transform={`rotate(${angle})`}/>
          </svg>
        );
      })}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 65% 28%, rgba(34,197,94,${0.15+lvl*0.04}), transparent 55%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
    </div>
  );
}
