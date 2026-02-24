import { DEFAULT_EFFECT_TARGET, type AttackElementEffectProps } from './effectTypes.ts';
import { createEffectTemplate } from './createEffectTemplate.ts';
import { UltimateEffect, type UltimateConfig, type CoreConfig, type RingConfig, type GlowConfig } from './UltimateEffect.tsx';

const waterEffectTemplate = createEffectTemplate({
  elementKey: 'water',
  uidPrefix: 'w-',
  duration: ({ idx, lvl }) => 800 + idx * 120 + lvl * 30,
  glow: ({ lvl }) => 4 + lvl * 2,
});

const WATER_CORE: CoreConfig = {
  svgSize: 188,
  center: 94,
  radius: (fxLvl) => 24 + fxLvl * 4,
  gradientStops: [
    { offset: '0%', color: '#e0f2fe', opacity: 0.9 },
    { offset: '18%', color: '#38bdf8', opacity: 0.72 },
    { offset: '46%', color: '#1d4ed8', opacity: 0.58 },
    { offset: '74%', color: '#1e3a8a', opacity: 0.4 },
    { offset: '100%', color: '#020617', opacity: 0 },
  ],
  filter: {
    turbulenceType: 'fractalNoise',
    baseFreqValues: '0.82;0.44;0.18',
    displacement: {
      xChannel: 'R',
      yChannel: 'G',
      scaleValues: (fxLvl) => `0;${8 + fxLvl * 1.7};${2 + fxLvl * 0.5}`,
    },
    blurValues: '0;0.58;0.22',
    colorMatrix: '0.9 0 0 0 0 0 1.04 0 0 0 0.15 0.2 1.15 0 0 0 0 0 1 0',
  },
  outerFilter: (glow) => `drop-shadow(0 0 ${glow + 6}px #0ea5e9) drop-shadow(0 0 ${glow + 10}px #1e3a8a)`,
};

const WATER_RINGS: RingConfig = {
  count: (fxLvl) => Math.min(6, 2 + Math.floor(fxLvl / 2)),
  svgSize: [228, 120],
  center: [114, 60],
  baseRadius: (i) => [58 + i * 26, 18 + i * 5],
  strokeColors: ['rgba(56,189,248,0.78)', 'rgba(30,64,175,0.68)'],
  strokeWidth: (i) => 3.8 - i * 0.65,
  offset: ['32px', '20px'],
  delay: (D, i) => D + 0.07 + (i % 2) * 0.045 + Math.floor(i / 2) * 0.08,
  duration: (i) => 0.74 + i * 0.11,
  ringFilter: (glow) => `drop-shadow(0 0 ${glow}px rgba(56,189,248,0.7))`,
};

const WATER_GLOW: GlowConfig = {
  gradient: (T, fxLvl) =>
    `radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(56,189,248,${0.1 + fxLvl * 0.025}), rgba(30,64,175,${0.08 + fxLvl * 0.02}) 35%, rgba(2,6,23,${0.06 + fxLvl * 0.015}) 58%, transparent 74%)`,
  durMultiplier: 1.2,
};

const WATER_ULTIMATE: UltimateConfig = {
  D: 0.3,
  core: WATER_CORE,
  rings: WATER_RINGS,
  glow: WATER_GLOW,
};

export default function WaterEffect({ idx: moveIdx = 0, lvl = 1, target = DEFAULT_EFFECT_TARGET }: AttackElementEffectProps) {
  const {
    idx,
    fxLvl,
    dur,
    glow,
    T,
    rr,
    uid,
  } = waterEffectTemplate({ idx: moveIdx, lvl, target });

  // --- idx 0: 水泡攻擊 (Bubble Attack) ---
  if (idx === 0) {
    const n = 2 + lvl;
    return (
      <div className="move-fx-overlay">
        {Array.from({ length: n }, (_, i) => {
          const r = 7 + lvl * 2 + rr("bubble-r", i, 0, 5);
          const sz = r * 2 + 12;
          return (
            <svg key={i} width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
              style={{
                position:"absolute", left:`${8+i*8}%`, bottom:`${30+i*5}%`,
                "--fly-x":`${100-T.flyRight-(8+i*8)}vw`,
                "--fly-y":`${T.flyTop-(100-(30+i*5))}vh`,
                opacity:0, filter:`drop-shadow(0 0 ${glow/2}px rgba(59,130,246,0.5))`,
                animation:`bubbleFloat ${dur/1000+i*0.15}s ease ${i*0.1}s forwards`,
              }}>
              <defs>
                <radialGradient id={`bbl${i}`} cx="35%" cy="35%">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85"/>
                  <stop offset="55%" stopColor="#60a5fa" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.25"/>
                </radialGradient>
              </defs>
              <circle cx={sz/2} cy={sz/2} r={r} fill={`url(#bbl${i})`}
                stroke="rgba(147,197,253,0.45)" strokeWidth="0.7"/>
              {/* Shine highlight */}
              <ellipse cx={sz/2-r*0.22} cy={sz/2-r*0.22} rx={r*0.28} ry={r*0.18}
                fill="rgba(255,255,255,0.5)" transform={`rotate(-25 ${sz/2-r*0.22} ${sz/2-r*0.22})`}/>
            </svg>
          );
        })}
      </div>
    );
  }

  // --- idx 1: 水流波 (Water Wave) ---
  if (idx === 1) {
    const waveN = 1 + Math.floor(lvl / 2);
    const waveH = 16 + lvl * 3;
    return (
      <div className="move-fx-overlay" style={{ overflow:"hidden" }}>
        {Array.from({ length: waveN }, (_, i) => (
          <svg key={i} width="100%" height={waveH + 15} viewBox={`0 0 200 ${waveH+10}`}
            preserveAspectRatio="none"
            style={{
              position:"absolute", right:"5%", top:`${10+i*10}%`,
              opacity:0, filter:`drop-shadow(0 0 ${glow}px rgba(59,130,246,0.55))`,
              animation:`waveSweep ${dur/1000+i*0.15}s ease ${i*0.1}s forwards`,
            }}>
            <defs>
              <linearGradient id={`wvg${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.65"/>
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.45"/>
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.2"/>
              </linearGradient>
            </defs>
            <path d={`M0,${waveH*0.5} Q25,${waveH*0.1} 50,${waveH*0.5} T100,${waveH*0.5} T150,${waveH*0.5} T200,${waveH*0.5} L200,${waveH+10} L0,${waveH+10} Z`}
              fill={`url(#wvg${i})`}/>
            {/* Crest highlight */}
            <path d={`M0,${waveH*0.5} Q25,${waveH*0.1} 50,${waveH*0.5} T100,${waveH*0.5} T150,${waveH*0.5} T200,${waveH*0.5}`}
              fill="none" stroke="rgba(224,242,254,0.55)" strokeWidth="1.5"/>
          </svg>
        ))}
      </div>
    );
  }

  // --- idx 2: 海嘯衝擊 (Tsunami Strike) ---
  if (idx === 2) {
    const splashN = 4 + lvl * 2;
    return (
      <div className="move-fx-overlay" style={{ overflow:"hidden" }}>
        {/* Main tsunami wave */}
        <svg width="85%" height="55%" viewBox="0 0 200 120" preserveAspectRatio="none"
          style={{
            position:"absolute", right:"0", top:"5%",
            filter:`drop-shadow(0 0 ${glow+4}px rgba(37,99,235,0.6))`,
            animation:`waveSweep ${dur/1000}s ease forwards`, opacity:0,
          }}>
          <defs>
            <linearGradient id="tsuG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.8"/>
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.65"/>
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.35"/>
            </linearGradient>
          </defs>
          <path d="M-10,80 Q20,10 60,35 Q100,60 130,20 Q150,0 180,15 Q200,25 210,20 L210,120 L-10,120 Z"
            fill="url(#tsuG)"/>
          {/* Foam line */}
          <path d="M-10,80 Q20,10 60,35 Q100,60 130,20 Q150,0 180,15 Q200,25 210,20"
            fill="none" stroke="rgba(224,242,254,0.7)" strokeWidth="2.5"/>
        </svg>
        {/* Secondary wave */}
        <svg width="75%" height="40%" viewBox="0 0 200 100" preserveAspectRatio="none"
          style={{
            position:"absolute", right:"2%", top:"15%",
            filter:`drop-shadow(0 0 ${glow}px rgba(59,130,246,0.4))`,
            animation:`waveSweep ${dur/1000*1.1}s ease 0.1s forwards`, opacity:0,
          }}>
          <path d="M-10,70 Q30,20 70,45 Q110,70 150,30 Q180,10 210,25 L210,100 L-10,100 Z"
            fill="rgba(59,130,246,0.3)"/>
        </svg>
        {/* Splash droplets */}
        {Array.from({ length: splashN }, (_, i) => {
          const r = 2.5 + lvl * 0.8 + rr("splash-r", i, 0, 2);
          const sz = r * 2 + 6;
          return (
            <svg key={`s${i}`} width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
              style={{
                position:"absolute",
                right:`calc(${T.right} + ${rr("splash-right", i, -10, 10)}%)`, top:`calc(${T.top} + ${rr("splash-top", i, -6, 10)}%)`,
                opacity:0, filter:`drop-shadow(0 0 3px #60a5fa)`,
                "--px":`${rr("splash-px", i, -18, 18)}px`, "--py":`${rr("splash-py", i, -8, 20)}px`,
                animation:`splashBurst 0.6s ease ${0.12+i*0.04}s forwards`,
              }}>
              <defs>
                <radialGradient id={`sp${i}`} cx="38%" cy="38%">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.75"/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.35"/>
                </radialGradient>
              </defs>
              <circle cx={sz/2} cy={sz/2} r={r} fill={`url(#sp${i})`}/>
            </svg>
          );
        })}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(59,130,246,${0.12+lvl*0.03}), transparent 60%)`, animation:`darkScreenFlash ${dur/1000}s ease` }}/>
      </div>
    );
  }

  // --- idx 3: 暗潮渦葬 — abyss tide vortex + pressure crash ---
  const D = 0.3;
  const currentN = Math.min(9, 2 + fxLvl);
  const splashN = Math.min(16, 7 + fxLvl * 2);
  const shardN = Math.min(10, 4 + fxLvl);
  const orbId = `wOrb-${uid}`;

  return (
    <UltimateEffect config={WATER_ULTIMATE} ctx={waterEffectTemplate({ idx: moveIdx, lvl, target })}
      approach={
        <svg width="36" height="36" viewBox="0 0 36 36"
          style={{
            position:"absolute",
            left:"10%",
            bottom:"35%",
            "--fly-x":`${100-T.flyRight-10}vw`,
            "--fly-y":`${T.flyTop-65}vh`,
            filter:`drop-shadow(0 0 ${glow}px #0ea5e9) drop-shadow(0 0 ${glow+4}px #1e3a8a)`,
            animation:"ultApproach 0.58s cubic-bezier(.16,.82,.22,1) forwards",
          }}>
          <defs><radialGradient id={orbId} cx="40%" cy="35%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.78"/>
            <stop offset="38%" stopColor="#38bdf8" stopOpacity="0.62"/>
            <stop offset="72%" stopColor="#1d4ed8" stopOpacity="0.44"/>
            <stop offset="100%" stopColor="#0b1120" stopOpacity="0"/>
          </radialGradient></defs>
          <circle cx="18" cy="18" r="14" fill={`url(#${orbId})`}/>
        </svg>
      }
      sweeps={
        <>
          {Array.from({ length: currentN }, (_, i) => {
            const lane = i % 3;
            const wave = Math.floor(i / 3);
            return (
              <svg key={`c${i}`} width="100%" height="52" viewBox="0 0 220 44" preserveAspectRatio="none"
                style={{
                  position:"absolute",
                  right:`calc(${T.right} - ${16 + i * 7}px)`,
                  top:`calc(${T.top} + ${rr("ult-current-top", i, -10, 14)}px)`,
                  opacity:0,
                  filter:`drop-shadow(0 0 ${glow}px rgba(14,165,233,0.55))`,
                  animation:`waveSweep ${0.54 + rr("ult-current-anim", i, 0, 0.26)}s ease ${D + 0.1 + lane * 0.04 + wave * 0.06}s forwards`,
                }}>
                <defs><linearGradient id={`wCur-${uid}-${i}`} x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="rgba(2,6,23,0)"/>
                  <stop offset="34%" stopColor="rgba(30,64,175,0.68)"/>
                  <stop offset="68%" stopColor="rgba(56,189,248,0.82)"/>
                  <stop offset="100%" stopColor="rgba(2,6,23,0)"/>
                </linearGradient></defs>
                <path d={`M0,23 L28,${10+i} L56,26 L88,${12+i*2} L118,24 L150,${11+i} L184,25 L220,20`}
                  fill="none"
                  stroke={`url(#wCur-${uid}-${i})`}
                  strokeWidth={2.4 + fxLvl * 0.25}
                  strokeLinecap="round"/>
              </svg>
            );
          })}
        </>
      }
      burst={
        <>
          {Array.from({ length: splashN }, (_, i) => {
            const angle = (i / splashN) * 360;
            const dist = 34 + rr("ult-splash-dist", i, 0, 55);
            const r = 3.5 + fxLvl * 0.8 + rr("ult-splash-r", i, 0, 1.8);
            const sz = r * 2 + 7;
            const delay = D + 0.12 + (i % 4) * 0.02 + Math.floor(i / 4) * 0.035;
            return (
              <svg key={`sp${i}`} width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
                style={{
                  position:"absolute",
                  right:T.right,
                  top:T.top,
                  opacity:0,
                  filter:`drop-shadow(0 0 4px #38bdf8)`,
                  "--px":`${Math.cos(angle*Math.PI/180)*dist}px`,
                  "--py":`${Math.sin(angle*Math.PI/180)*dist}px`,
                  animation:`splashBurst ${0.56 + rr("ult-splash-anim", i, 0, 0.2)}s ease ${delay}s forwards`,
                }}>
                <circle cx={sz / 2} cy={sz / 2} r={r} fill={i % 2 === 0 ? "#38bdf8" : "#93c5fd"} opacity="0.75"/>
                <ellipse cx={sz / 2 - 1} cy={sz / 2 - 1} rx={r * 0.24} ry={r * 0.18} fill="rgba(255,255,255,0.45)"/>
              </svg>
            );
          })}
        </>
      }
      shards={
        <>
          {Array.from({ length: shardN }, (_, i) => (
            <div key={`sh${i}`}
              style={{
                position:"absolute",
                right:`calc(${T.right} + ${rr("ult-shard-right", i, -10, 10)}%)`,
                top:`calc(${T.top} + ${rr("ult-shard-top", i, -10, 8)}%)`,
                width:`${6 + rr("ult-shard-width", i, 0, 3)}px`,
                height:`${20 + fxLvl * 4 + rr("ult-shard-height", i, 0, 14)}px`,
                borderRadius:999,
                background:"linear-gradient(180deg, rgba(224,242,254,0.78), rgba(56,189,248,0.75) 45%, rgba(30,64,175,0))",
                opacity:0,
                transform:`rotate(${rr("ult-shard-rot", i, -24, 24)}deg)`,
                filter:`drop-shadow(0 0 ${glow}px rgba(56,189,248,0.65))`,
                animation:`sparkle ${0.4 + rr("ult-shard-anim", i, 0, 0.2)}s ease ${D + 0.14 + (i % 3) * 0.03 + Math.floor(i / 3) * 0.05}s both`,
              }}
            />
          ))}
        </>
      }
    />
  );
}
