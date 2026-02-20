import type { CSSProperties } from 'react';
import { DEFAULT_EFFECT_TARGET, type AttackElementEffectProps } from './effectTypes.ts';
import { createEffectTemplate } from './createEffectTemplate.ts';

const BLADE = "M12,1 L16,10 L12,23 L8,10 Z";
const SHARD = "M0,-8 L3,-2 L8,0 L3,2 L0,8 L-3,2 L-8,0 L-3,-2Z";

const steelEffectTemplate = createEffectTemplate({
  elementKey: 'steel',
  uidPrefix: 's-',
  duration: ({ idx, lvl }) => 650 + idx * 120 + lvl * 28,
  glow: ({ lvl }) => 4 + lvl * 1.8,
});

export default function SteelEffect({
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
  } = steelEffectTemplate({ idx: moveIdx, lvl, target });

  // idx 0: 分數判勢 - fast probing blades
  if (idx === 0) {
    const n = 1 + Math.floor(fxLvl / 2);
    const size = 24 + fxLvl * 2;
    return (
      <div className="move-fx-overlay">
        {Array.from({ length: n }, (_, i) => (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              left: `${8 + i * 7}%`,
              bottom: `${34 + i * 5}%`,
              '--fly-x': `${100 - T.flyRight - (8 + i * 7)}vw`,
              '--fly-y': `${T.flyTop - (100 - (34 + i * 5))}vh`,
              filter: `drop-shadow(0 0 ${glow}px #cbd5e1) drop-shadow(0 0 ${glow + 3}px #64748b)`,
              animation: `flameFly ${dur / 1000 + i * 0.08}s ease ${i * 0.07}s forwards`,
              opacity: 0,
              transform: `rotate(${rr('probe-rot', i, -22, 22)}deg)`,
            } as CSSProperties}
          >
            <defs>
              <linearGradient id={`steelProbe-${uid}-${i}`} x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="45%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
            </defs>
            <path d={BLADE} fill={`url(#steelProbe-${uid}-${i})`} />
          </svg>
        ))}
        {Array.from({ length: 2 + fxLvl }, (_, i) => (
          <svg
            key={`spark-${i}`}
            width="16"
            height="16"
            viewBox="-8 -8 16 16"
            style={{
              position: 'absolute',
              right: `calc(${T.right} + ${rr('probe-spark-r', i, -8, 8)}%)`,
              top: `calc(${T.top} + ${rr('probe-spark-t', i, -6, 8)}%)`,
              opacity: 0,
              filter: `drop-shadow(0 0 3px #cbd5e1)`,
              animation: `sparkle 0.4s ease ${0.05 + i * 0.05}s both`,
            }}
          >
            <path d={SHARD} fill="#e2e8f0" opacity="0.75" />
          </svg>
        ))}
      </div>
    );
  }

  // idx 1: 同分斬 - parallel steel arcs
  if (idx === 1) {
    const arcN = 3 + Math.floor(fxLvl / 2);
    return (
      <div className="move-fx-overlay">
        {Array.from({ length: arcN }, (_, i) => (
          <svg
            key={i}
            width="100%"
            height="70"
            viewBox="0 0 220 48"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              right: `calc(${T.right} - ${8 + i * 5}px)`,
              top: `calc(${T.top} + ${rr('slash-top', i, -8, 16)}px)`,
              opacity: 0,
              filter: `drop-shadow(0 0 ${glow}px #94a3b8)`,
              animation: `waveSweep ${0.42 + rr('slash-anim', i, 0, 0.2)}s ease ${i * 0.06}s forwards`,
            }}
          >
            <defs>
              <linearGradient id={`steelSlash-${uid}-${i}`} x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="rgba(148,163,184,0)" />
                <stop offset="45%" stopColor="rgba(226,232,240,0.8)" />
                <stop offset="100%" stopColor="rgba(100,116,139,0)" />
              </linearGradient>
            </defs>
            <path
              d={`M0,24 L28,${10 + i} L58,30 L94,${12 + i} L132,28 L170,${14 + i} L220,24`}
              fill="none"
              stroke={`url(#steelSlash-${uid}-${i})`}
              strokeWidth={2.2 + fxLvl * 0.2}
              strokeLinecap="round"
            />
          </svg>
        ))}
      </div>
    );
  }

  // idx 2: 通分裂鋒 - focused impact burst
  if (idx === 2) {
    const rayN = 10 + Math.floor(fxLvl * 1.4);
    return (
      <div className="move-fx-overlay">
        <svg
          width="170"
          height="170"
          viewBox="0 0 170 170"
          style={{
            position: 'absolute',
            right: T.right,
            top: T.top,
            transform: 'translate(50%,-30%)',
            filter: `drop-shadow(0 0 ${glow + 5}px #64748b) drop-shadow(0 0 ${glow + 8}px #cbd5e1)`,
          }}
        >
          <defs>
            <radialGradient id={`steelCore-${uid}`} cx="50%" cy="50%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.92" />
              <stop offset="35%" stopColor="#cbd5e1" stopOpacity="0.72" />
              <stop offset="75%" stopColor="#64748b" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle
            cx="85"
            cy="85"
            r={20 + fxLvl * 4}
            fill={`url(#steelCore-${uid})`}
            style={{ animation: `fireExpand ${dur / 1000}s ease forwards` }}
          />
        </svg>

        {Array.from({ length: rayN }, (_, i) => {
          const angle = (i / rayN) * 360;
          const len = 24 + fxLvl * 5 + rr('burst-len', i, 0, 10);
          const delay = 0.08 + i * 0.02;
          return (
            <svg
              key={i}
              width="8"
              height={len}
              viewBox={`0 0 8 ${len}`}
              style={{
                position: 'absolute',
                right: `calc(${T.right} + ${Math.cos(angle * Math.PI / 180) * 4}px)`,
                top: `calc(${T.top} + ${Math.sin(angle * Math.PI / 180) * 4}px)`,
                transformOrigin: 'center bottom',
                transform: `rotate(${angle}deg)`,
                opacity: 0,
                filter: `drop-shadow(0 0 ${glow}px #cbd5e1)`,
                animation: `sparkle ${0.34 + rr('burst-anim', i, 0, 0.2)}s ease ${delay}s both`,
              }}
            >
              <rect
                x="2"
                y="0"
                width="4"
                height={len}
                rx="2"
                fill={i % 2 === 0 ? 'rgba(226,232,240,0.86)' : 'rgba(100,116,139,0.72)'}
              />
            </svg>
          );
        })}
      </div>
    );
  }

  // idx 3: 鋼域終式 - dark-steel final burst
  const D = 0.3;
  const ringN = Math.min(10, 3 + fxLvl);
  const shardN = Math.min(18, 8 + fxLvl * 2);
  const coreId = `steelUltCore-${uid}`;
  return (
    <div className="move-fx-overlay">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          left: '10%',
          bottom: '35%',
          '--fly-x': `${100 - T.flyRight - 10}vw`,
          '--fly-y': `${T.flyTop - 65}vh`,
          filter: `drop-shadow(0 0 ${glow}px #cbd5e1) drop-shadow(0 0 ${glow + 4}px #334155)`,
          animation: 'ultApproach 0.56s cubic-bezier(.16,.82,.22,1) forwards',
        } as CSSProperties}
      >
        <path d={BLADE} fill="rgba(226,232,240,0.9)" />
      </svg>

      <svg
        width="190"
        height="190"
        viewBox="0 0 190 190"
        style={{
          position: 'absolute',
          right: T.right,
          top: T.top,
          transform: 'translate(50%,-30%)',
          filter: `drop-shadow(0 0 ${glow + 8}px #334155) drop-shadow(0 0 ${glow + 11}px #94a3b8)`,
        }}
      >
        <defs>
          <radialGradient id={coreId} cx="50%" cy="50%">
            <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.95" />
            <stop offset="22%" stopColor="#cbd5e1" stopOpacity="0.82" />
            <stop offset="52%" stopColor="#94a3b8" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle
          cx="95"
          cy="95"
          r={24 + fxLvl * 4}
          fill={`url(#${coreId})`}
          style={{ animation: `fireExpand ${dur / 1000}s ease ${D}s forwards` }}
        />
      </svg>

      {Array.from({ length: ringN }, (_, i) => (
        <svg
          key={`ring-${i}`}
          width="190"
          height="190"
          viewBox="0 0 190 190"
          style={{
            position: 'absolute',
            right: T.right,
            top: T.top,
            transform: 'translate(50%,-30%)',
            opacity: 0,
            animation: `darkRingExpand ${0.72 + i * 0.08}s ease ${D + i * 0.05}s forwards`,
          }}
        >
          <circle
            cx="95"
            cy="95"
            r={22 + i * 10}
            fill="none"
            stroke={i % 2 === 0 ? 'rgba(203,213,225,0.84)' : 'rgba(100,116,139,0.66)'}
            strokeWidth={3 - i * 0.2}
            style={{ filter: `drop-shadow(0 0 ${glow}px #cbd5e1)` }}
          />
        </svg>
      ))}

      {Array.from({ length: shardN }, (_, i) => {
        const angle = (i / shardN) * 360;
        const dist = 26 + rr('ult-dist', i, 0, 52);
        const delay = D + 0.1 + (i % 4) * 0.02 + Math.floor(i / 4) * 0.03;
        return (
          <svg
            key={`shard-${i}`}
            width="20"
            height="20"
            viewBox="-10 -10 20 20"
            style={{
              position: 'absolute',
              right: T.right,
              top: T.top,
              opacity: 0,
              filter: `drop-shadow(0 0 ${glow}px #cbd5e1)`,
              '--sx': `${Math.cos(angle * Math.PI / 180) * dist}px`,
              '--sy': `${Math.sin(angle * Math.PI / 180) * dist}px`,
              animation: `darkStarSpin ${0.42 + rr('ult-anim', i, 0, 0.24)}s ease ${delay}s forwards`,
            } as CSSProperties}
          >
            <path
              d={SHARD}
              fill={i % 2 === 0 ? '#e2e8f0' : '#94a3b8'}
              opacity={0.7 + fxLvl * 0.03}
              transform={`rotate(${angle})`}
            />
          </svg>
        );
      })}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(148,163,184,${0.12 + fxLvl * 0.03}), rgba(30,41,59,${0.05 + fxLvl * 0.01}) 42%, transparent 72%)`,
          animation: `ultGlow ${dur / 1000 * 1.2}s ease ${D}s`,
        }}
      />
    </div>
  );
}
