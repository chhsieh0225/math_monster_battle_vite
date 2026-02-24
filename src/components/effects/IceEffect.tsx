import type { CSSProperties } from 'react';
import { DEFAULT_EFFECT_TARGET, type AttackElementEffectProps } from './effectTypes.ts';
import { createEffectTemplate } from './createEffectTemplate.ts';
import { UltimateEffect, type UltimateConfig, type CoreConfig, type RingConfig } from './UltimateEffect.tsx';

const SHARD = 'M10,0 L18,10 L10,24 L2,10 Z';

const iceEffectTemplate = createEffectTemplate({
  elementKey: 'ice',
  uidPrefix: 'ice-',
  duration: ({ idx, lvl }) => 760 + idx * 120 + lvl * 26,
  glow: ({ lvl }) => 5 + lvl * 1.9,
});

const ICE_CORE: CoreConfig = {
  svgSize: 196,
  center: 98,
  radius: (fxLvl) => 24 + fxLvl * 4,
  gradientStops: [
    { offset: '0%', color: '#f0f9ff', opacity: 0.94 },
    { offset: '28%', color: '#bae6fd', opacity: 0.78 },
    { offset: '62%', color: '#38bdf8', opacity: 0.46 },
    { offset: '100%', color: '#082f49', opacity: 0 },
  ],
  outerFilter: (glow) => `drop-shadow(0 0 ${glow + 8}px rgba(56,189,248,0.82))`,
};

const ICE_RINGS: RingConfig = {
  count: (fxLvl) => Math.min(8, 3 + fxLvl),
  svgSize: [236, 118],
  center: [118, 59],
  baseRadius: (i) => [58 + i * 24, 16 + i * 5],
  strokeColors: ['rgba(191,219,254,0.84)', 'rgba(56,189,248,0.68)'],
  strokeWidth: (i) => 3.6 - i * 0.55,
  offset: ['34px', '22px'],
  delay: (D, i) => D + 0.08 + i * 0.07,
  duration: (i) => 0.72 + i * 0.1,
  ringFilter: (glow) => `drop-shadow(0 0 ${glow}px rgba(125,211,252,0.8))`,
};

const ICE_ULTIMATE: UltimateConfig = {
  D: 0.3,
  core: ICE_CORE,
  rings: ICE_RINGS,
  glow: null,
};

export default function IceEffect({
  idx: moveIdx = 0,
  lvl = 1,
  target = DEFAULT_EFFECT_TARGET,
}: AttackElementEffectProps) {
  const {
    idx,
    fxLvl,
    dur,
    glow,
    T,
    rr,
    uid,
  } = iceEffectTemplate({ idx: moveIdx, lvl, target });

  // idx 0: 冰晶彈
  if (idx === 0) {
    const shardCount = 2 + Math.floor(fxLvl / 2);
    return (
      <div className="move-fx-overlay">
        {Array.from({ length: shardCount }, (_unused, i) => (
          <svg
            key={`ice-bolt-${i}`}
            width="28"
            height="28"
            viewBox="0 0 20 24"
            style={{
              position: 'absolute',
              left: `${8 + i * 8}%`,
              bottom: `${35 + i * 4}%`,
              '--fly-x': `${100 - T.flyRight - (8 + i * 8)}vw`,
              '--fly-y': `${T.flyTop - (100 - (35 + i * 4))}vh`,
              opacity: 0,
              filter: `drop-shadow(0 0 ${glow}px rgba(125,211,252,0.85))`,
              animation: `flameFly ${dur / 1000 + i * 0.08}s ease ${i * 0.06}s forwards`,
              transform: `rotate(${rr('bolt-rot', i, -28, 28)}deg)`,
            } as CSSProperties}
          >
            <defs>
              <linearGradient id={`iceBolt-${uid}-${i}`} x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="48%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <path d={SHARD} fill={`url(#iceBolt-${uid}-${i})`} />
          </svg>
        ))}
      </div>
    );
  }

  // idx 1: 霜鏡轉換
  if (idx === 1) {
    const ringCount = 2 + Math.floor(fxLvl / 3);
    const flakeCount = 6 + fxLvl;
    return (
      <div className="move-fx-overlay">
        {Array.from({ length: ringCount }, (_unused, i) => (
          <svg
            key={`ice-ring-${i}`}
            width="190"
            height="90"
            viewBox="0 0 190 90"
            style={{
              position: 'absolute',
              right: `calc(${T.right} - ${22 + i * 8}px)`,
              top: `calc(${T.top} - ${16 + i * 3}px)`,
              opacity: 0,
              animation: `darkRingExpand ${0.66 + i * 0.1}s ease ${0.05 + i * 0.07}s forwards`,
              filter: `drop-shadow(0 0 ${glow}px rgba(125,211,252,0.7))`,
            }}
          >
            <ellipse
              cx="95"
              cy="45"
              rx={48 + i * 16}
              ry={16 + i * 5}
              fill="none"
              stroke={i % 2 === 0 ? 'rgba(191,219,254,0.82)' : 'rgba(56,189,248,0.72)'}
              strokeWidth={3 - i * 0.6}
            />
          </svg>
        ))}
        {Array.from({ length: flakeCount }, (_unused, i) => (
          <svg
            key={`ice-flake-${i}`}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            style={{
              position: 'absolute',
              right: `calc(${T.right} + ${rr('flake-r', i, -12, 10)}%)`,
              top: `calc(${T.top} + ${rr('flake-t', i, -6, 8)}%)`,
              opacity: 0,
              animation: `sparkle ${0.4 + rr('flake-anim', i, 0, 0.3)}s ease ${0.08 + i * 0.03}s both`,
              filter: `drop-shadow(0 0 3px rgba(224,242,254,0.9))`,
            }}
          >
            <path d="M7 1 L8 5 L13 7 L8 9 L7 13 L6 9 L1 7 L6 5 Z" fill="rgba(224,242,254,0.85)" />
          </svg>
        ))}
      </div>
    );
  }

  // idx 2: 極寒裂爪
  if (idx === 2) {
    const slashCount = 3 + Math.floor(fxLvl / 2);
    return (
      <div className="move-fx-overlay">
        {Array.from({ length: slashCount }, (_unused, i) => (
          <svg
            key={`ice-slash-${i}`}
            width="100%"
            height="78"
            viewBox="0 0 220 64"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              right: `calc(${T.right} - ${10 + i * 5}px)`,
              top: `calc(${T.top} + ${rr('slash-top', i, -10, 16)}px)`,
              opacity: 0,
              filter: `drop-shadow(0 0 ${glow}px rgba(125,211,252,0.7))`,
              animation: `waveSweep ${0.44 + rr('slash-anim', i, 0, 0.2)}s ease ${i * 0.06}s forwards`,
            }}
          >
            <defs>
              <linearGradient id={`iceSlash-${uid}-${i}`} x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="rgba(147,197,253,0)" />
                <stop offset="45%" stopColor="rgba(191,219,254,0.88)" />
                <stop offset="100%" stopColor="rgba(14,116,144,0)" />
              </linearGradient>
            </defs>
            <path
              d={`M0,32 L28,${10 + i} L56,30 L92,${12 + i} L132,28 L172,${16 + i} L220,32`}
              fill="none"
              stroke={`url(#iceSlash-${uid}-${i})`}
              strokeWidth={2.3 + fxLvl * 0.22}
              strokeLinecap="round"
            />
          </svg>
        ))}
      </div>
    );
  }

  // idx 3: 永凍審判
  const D = 0.3;
  const shardCount = Math.min(16, 8 + fxLvl * 2);

  return (
    <UltimateEffect config={ICE_ULTIMATE} ctx={iceEffectTemplate({ idx: moveIdx, lvl, target })}
      approach={
        <svg
          width="38"
          height="38"
          viewBox="0 0 20 24"
          style={{
            position: 'absolute',
            left: '10%',
            bottom: '35%',
            '--fly-x': `${100 - T.flyRight - 10}vw`,
            '--fly-y': `${T.flyTop - 65}vh`,
            filter: `drop-shadow(0 0 ${glow + 2}px rgba(186,230,253,0.9))`,
            animation: 'ultApproach 0.56s cubic-bezier(.16,.82,.22,1) forwards',
          } as CSSProperties}
        >
          <path d={SHARD} fill="rgba(224,242,254,0.92)" />
        </svg>
      }
      burst={
        <>
          {Array.from({ length: shardCount }, (_unused, i) => {
            const angle = (i / shardCount) * 360;
            const radius = 18 + fxLvl * 5 + rr('ult-rad', i, 0, 12);
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;
            return (
              <svg
                key={`ice-ult-shard-${i}`}
                width="16"
                height="22"
                viewBox="0 0 20 24"
                style={{
                  position: 'absolute',
                  right: `calc(${T.right} + ${x}px)`,
                  top: `calc(${T.top} + ${y}px)`,
                  opacity: 0,
                  transformOrigin: 'center center',
                  transform: `rotate(${angle + rr('ult-rot', i, -20, 20)}deg)`,
                  filter: `drop-shadow(0 0 4px rgba(186,230,253,0.9))`,
                  animation: `sparkle ${0.52 + rr('ult-anim', i, 0, 0.2)}s ease ${D + 0.12 + i * 0.018}s both`,
                }}
              >
                <path d={SHARD} fill="rgba(224,242,254,0.88)" />
              </svg>
            );
          })}
        </>
      }
    />
  );
}
