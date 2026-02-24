import { DEFAULT_EFFECT_TARGET, type AttackElementEffectProps } from './effectTypes.ts';
import { createEffectTemplate } from './createEffectTemplate.ts';
import { UltimateEffect, type UltimateConfig, type CoreConfig, type RingConfig, type GlowConfig } from './UltimateEffect.tsx';

// Golden light orb shape
const ORB = "M12,2 C6,2 2,6 2,12 C2,18 6,22 12,22 C18,22 22,18 22,12 C22,6 18,2 12,2Z";

const lightEffectTemplate = createEffectTemplate({
  elementKey: 'light',
  uidPrefix: 'l-',
  duration: ({ idx, lvl }) => 700 + idx * 120 + lvl * 30,
  glow: ({ lvl }) => 4 + lvl * 2,
});


const LIGHT_CORE: CoreConfig = {
  svgSize: 190,
  center: 95,
  radius: (fxLvl) => 24 + fxLvl * 4,
  gradientStops: [
    { offset: '0%', color: '#fff9db', opacity: 0.94 },
    { offset: '20%', color: '#fbbf24', opacity: 0.82 },
    { offset: '48%', color: '#f59e0b', opacity: 0.66 },
    { offset: '76%', color: '#6b5f86', opacity: 0.32 },
    { offset: '100%', color: '#0f172a', opacity: 0 },
  ],
  filter: {
    turbulenceType: 'fractalNoise',
    baseFreqValues: '0.78;0.42;0.16',
    displacement: {
      xChannel: 'R',
      yChannel: 'G',
      scaleValues: (fxLvl) => `0;${9 + fxLvl * 1.6};${2 + fxLvl * 0.5}`,
    },
    blurValues: '0;0.58;0.22',
    colorMatrix: '1.1 0 0 0 0 0 0.94 0 0 0 0.12 0.08 0.86 0 0 0 0 0 1 0',
  },
  outerFilter: (glow) => `drop-shadow(0 0 ${glow + 7}px #f59e0b) drop-shadow(0 0 ${glow + 11}px #6b5f86)`,
};

const LIGHT_RINGS: RingConfig = {
  count: (fxLvl) => Math.min(6, 2 + Math.floor(fxLvl / 2)),
  svgSize: [228, 120],
  center: [114, 60],
  baseRadius: (i) => [58 + i * 24, 18 + i * 5],
  strokeColors: ['rgba(251,191,36,0.76)', 'rgba(176,158,207,0.46)'],
  strokeWidth: (i) => 3.8 - i * 0.6,
  offset: ['32px', '20px'],
  delay: (D, i) => D + 0.08 + (i % 2) * 0.04 + Math.floor(i / 2) * 0.08,
  duration: (i) => 0.72 + i * 0.11,
  ringFilter: (glow) => `drop-shadow(0 0 ${glow}px rgba(251,191,36,0.64))`,
};

const LIGHT_GLOW: GlowConfig = {
  gradient: (T, fxLvl) =>
    `radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(251,191,36,${0.1 + fxLvl * 0.024}), rgba(107,95,134,${0.034 + fxLvl * 0.009}) 36%, rgba(15,23,42,${0.06 + fxLvl * 0.014}) 58%, transparent 74%)`,
  durMultiplier: 1.2,
};

const LIGHT_ULTIMATE: UltimateConfig = {
  D: 0.3,
  core: LIGHT_CORE,
  rings: LIGHT_RINGS,
  glow: LIGHT_GLOW,
};

export default function LightEffect({ idx: moveIdx = 0, lvl = 1, target = DEFAULT_EFFECT_TARGET }: AttackElementEffectProps) {
  const {
    idx,
    fxLvl,
    dur,
    glow,
    T,
    rr,
    uid,
  } = lightEffectTemplate({ idx: moveIdx, lvl, target });

  // --- idx 0: 獵爪撲 (Light Claw) — golden orbs fly toward enemy ---
  if (idx === 0) {
    const n = 1 + Math.floor(lvl / 2);
    const sz = 28 + lvl * 4;
    return (
      <div className="move-fx-overlay">
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
      <div className="move-fx-overlay">
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
      <div className="move-fx-overlay">
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

  // --- idx 3: 日蝕獅吼 — eclipse lion roar ---
  const D = 0.3;
  const roarN = Math.min(9, 2 + fxLvl);
  const shardN = Math.min(10, 4 + fxLvl);
  const moteN = Math.min(16, 6 + fxLvl * 2);
  const orbId = `lOrb-${uid}`;

  return (
    <UltimateEffect config={LIGHT_ULTIMATE} ctx={lightEffectTemplate({ idx: moveIdx, lvl, target })}
      approach={
        <svg width="40" height="40" viewBox="0 0 24 24"
          style={{
            position:"absolute",
            left:"10%",
            bottom:"35%",
            "--fly-x":`${100-T.flyRight-10}vw`,
            "--fly-y":`${T.flyTop-65}vh`,
            filter:`drop-shadow(0 0 ${glow}px #fbbf24) drop-shadow(0 0 ${glow+4}px #6b5f86)`,
            animation:"ultApproach 0.58s cubic-bezier(.16,.82,.22,1) forwards",
          }}>
          <defs><radialGradient id={orbId} cx="42%" cy="40%">
            <stop offset="0%" stopColor="#fff7c2" stopOpacity="0.84"/>
            <stop offset="36%" stopColor="#fbbf24" stopOpacity="0.72"/>
            <stop offset="72%" stopColor="#d97706" stopOpacity="0.52"/>
            <stop offset="100%" stopColor="#5b4f72" stopOpacity="0"/>
          </radialGradient></defs>
          <path d={ORB} fill={`url(#${orbId})`}/>
        </svg>
      }
      sweeps={
        <>
          {Array.from({ length: roarN }, (_, i) => {
            const lane = i % 3;
            const wave = Math.floor(i / 3);
            const roarDelay = D + 0.1 + lane * 0.04 + wave * 0.06;
            return (
              <svg key={`rw${i}`} width="100%" height="52" viewBox="0 0 220 44" preserveAspectRatio="none"
                style={{
                  position:"absolute",
                  right:`calc(${T.right} - ${14 + i * 8}px)`,
                  top:`calc(${T.top} + ${rr("ult-roar-top", i, -10, 14)}px)`,
                  opacity:0,
                  filter:`drop-shadow(0 0 ${glow}px rgba(251,191,36,0.52))`,
                  animation:`waveSweep ${0.54 + rr("ult-roar-anim", i, 0, 0.2)}s ease ${roarDelay}s forwards`,
                }}>
                <defs><linearGradient id={`lRoar-${uid}-${i}`} x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="rgba(15,23,42,0)"/>
                  <stop offset="36%" stopColor="rgba(245,158,11,0.62)"/>
                  <stop offset="70%" stopColor="rgba(251,191,36,0.82)"/>
                  <stop offset="100%" stopColor="rgba(15,23,42,0)"/>
                </linearGradient></defs>
                <path
                  d={`M0,22 L24,${9+i} L52,25 L82,${11+i*2} L114,24 L146,${10+i} L182,26 L220,20`}
                  fill="none"
                  stroke={`url(#lRoar-${uid}-${i})`}
                  strokeWidth={2.6 + fxLvl * 0.24}
                  strokeLinecap="round"
                />
              </svg>
            );
          })}
        </>
      }
      burst={
        <>
          {Array.from({ length: moteN }, (_, i) => {
            const angle = (i / moteN) * 360;
            const dist = 30 + rr("ult-mote-dist", i, 0, 50);
            const delay = D + 0.12 + (i % 4) * 0.02 + Math.floor(i / 4) * 0.03;
            return (
              <svg key={`m${i}`} width="20" height="20" viewBox="0 0 20 20"
                style={{
                  position:"absolute",
                  right:T.right,
                  top:T.top,
                  opacity:0,
                  filter:`drop-shadow(0 0 ${glow}px #fbbf24)`,
                  "--lx":`${Math.cos(angle*Math.PI/180)*dist}px`,
                  "--ly":`${Math.sin(angle*Math.PI/180)*dist}px`,
                  animation:`leafSpin ${0.48 + rr("ult-mote-anim", i, 0, 0.26)}s ease ${delay}s forwards`,
                }}>
                <circle cx="10" cy="10" r={3.8 + rr("ult-mote-r", i, 0, 1.6)}
                  fill={i % 3 === 0 ? "#fde68a" : i % 3 === 1 ? "#fbbf24" : "#f59e0b"} opacity="0.74"/>
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
                width:`${6 + rr("ult-shard-width", i, 0, 2.5)}px`,
                height:`${20 + fxLvl * 4 + rr("ult-shard-height", i, 0, 12)}px`,
                borderRadius:999,
                background:"linear-gradient(180deg, rgba(255,248,220,0.82), rgba(251,191,36,0.78) 45%, rgba(107,95,134,0))",
                opacity:0,
                transform:`rotate(${rr("ult-shard-rot", i, -22, 22)}deg)`,
                filter:`drop-shadow(0 0 ${glow}px rgba(251,191,36,0.6))`,
                animation:`sparkle ${0.38 + rr("ult-shard-anim", i, 0, 0.2)}s ease ${D + 0.14 + (i % 3) * 0.03 + Math.floor(i / 3) * 0.05}s both`,
              }}
            />
          ))}
        </>
      }
    />
  );
}