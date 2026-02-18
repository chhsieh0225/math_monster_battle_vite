/**
 * AmbientParticles — lightweight idle elemental particles around a monster.
 * Each element type has a distinct visual motif (embers, bubbles, sparks, etc.).
 * Pure CSS animation, no JS timers, respects prefers-reduced-motion via parent.
 */
import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { seedRange } from '../../utils/prng';

type ElementType = 'fire' | 'water' | 'electric' | 'grass' | 'dark' | 'light'
  | 'ghost' | 'steel' | 'rock' | 'poison';

type Props = {
  /** Monster element type (mType) */
  type: string;
  /** Optional secondary type */
  type2?: string | null;
  /** Sprite container size in px (particles scale to this) */
  size?: number;
  /** Unique seed for deterministic randomisation */
  seed?: string;
  /** Number of particles (default 6) */
  count?: number;
};

const TYPE_THEMES: Record<string, {
  emoji?: string;
  colors: string[];
  shape: 'circle' | 'diamond' | 'star' | 'drop' | 'leaf' | 'spark';
  glow: string;
  drift: 'rise' | 'fall' | 'orbit' | 'float' | 'flicker';
  sizeRange: [number, number];
}> = {
  fire: {
    colors: ['#fbbf24', '#f97316', '#ef4444', '#fef08a'],
    shape: 'diamond',
    glow: 'rgba(251,146,60,0.7)',
    drift: 'rise',
    sizeRange: [6, 11],
  },
  water: {
    colors: ['#60a5fa', '#38bdf8', '#93c5fd', '#e0f2fe'],
    shape: 'circle',
    glow: 'rgba(59,130,246,0.6)',
    drift: 'float',
    sizeRange: [6, 10],
  },
  electric: {
    colors: ['#facc15', '#fde047', '#fef9c3', '#eab308'],
    shape: 'spark',
    glow: 'rgba(250,204,21,0.7)',
    drift: 'flicker',
    sizeRange: [5, 10],
  },
  grass: {
    colors: ['#4ade80', '#22c55e', '#86efac', '#a3e635'],
    shape: 'leaf',
    glow: 'rgba(74,222,128,0.5)',
    drift: 'fall',
    sizeRange: [6, 11],
  },
  dark: {
    colors: ['#a78bfa', '#7c3aed', '#6d28d9', '#c4b5fd'],
    shape: 'diamond',
    glow: 'rgba(124,58,237,0.6)',
    drift: 'orbit',
    sizeRange: [6, 10],
  },
  light: {
    colors: ['#fef08a', '#fde68a', '#fffbeb', '#fcd34d'],
    shape: 'star',
    glow: 'rgba(253,224,71,0.6)',
    drift: 'float',
    sizeRange: [5, 10],
  },
  ghost: {
    colors: ['#c084fc', '#a855f7', '#e9d5ff', '#d8b4fe'],
    shape: 'circle',
    glow: 'rgba(168,85,247,0.5)',
    drift: 'orbit',
    sizeRange: [6, 10],
  },
  steel: {
    colors: ['#94a3b8', '#cbd5e1', '#e2e8f0', '#64748b'],
    shape: 'spark',
    glow: 'rgba(148,163,184,0.5)',
    drift: 'flicker',
    sizeRange: [5, 9],
  },
  rock: {
    colors: ['#a8a29e', '#78716c', '#d6d3d1', '#57534e'],
    shape: 'diamond',
    glow: 'rgba(120,113,108,0.4)',
    drift: 'fall',
    sizeRange: [6, 11],
  },
  poison: {
    colors: ['#a855f7', '#c026d3', '#e879f9', '#d946ef'],
    shape: 'circle',
    glow: 'rgba(192,38,211,0.6)',
    drift: 'rise',
    sizeRange: [6, 10],
  },
};

const DRIFT_KEYFRAMES: Record<string, string> = {
  rise:    'ambientRise',
  fall:    'ambientFall',
  orbit:   'ambientOrbit',
  float:   'ambientFloat',
  flicker: 'ambientFlicker',
};

function rr(seed: string, slot: string, i: number, min: number, max: number): number {
  return Number(seedRange(`ambient-${seed}-${slot}-${i}`, min, max));
}

function renderShape(
  shape: string,
  size: number,
  color: string,
): ReactElement {
  switch (shape) {
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 10 10">
          <polygon points="5,0 10,5 5,10 0,5" fill={color} opacity="0.9" />
        </svg>
      );
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 10 10">
          <polygon points="5,0 6.2,3.8 10,3.8 7,6.2 8.1,10 5,7.6 1.9,10 3,6.2 0,3.8 3.8,3.8" fill={color} opacity="0.9" />
        </svg>
      );
    case 'leaf':
      return (
        <svg width={size} height={size} viewBox="0 0 10 12">
          <ellipse cx="5" cy="6" rx="3" ry="5" fill={color} opacity="0.85" transform="rotate(-15 5 6)" />
        </svg>
      );
    case 'spark':
      return (
        <svg width={size} height={size} viewBox="0 0 10 10">
          <line x1="5" y1="0" x2="5" y2="10" stroke={color} strokeWidth="2" opacity="0.9" />
          <line x1="0" y1="5" x2="10" y2="5" stroke={color} strokeWidth="2" opacity="0.9" />
        </svg>
      );
    case 'drop':
      return (
        <svg width={size} height={size} viewBox="0 0 10 12">
          <path d="M5,0 C5,0 9,5 9,7.5 C9,10 7,12 5,12 C3,12 1,10 1,7.5 C1,5 5,0 5,0Z" fill={color} opacity="0.85" />
        </svg>
      );
    default: // circle
      return (
        <svg width={size} height={size} viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill={color} opacity="0.85" />
        </svg>
      );
  }
}

export default function AmbientParticles({ type, type2, size = 160, seed = 'default', count = 6 }: Props) {
  const theme = TYPE_THEMES[type] || TYPE_THEMES.grass;
  const theme2 = type2 ? TYPE_THEMES[type2] : null;
  const totalCount = theme2 ? count : count;
  const primaryCount = theme2 ? Math.ceil(count * 0.6) : count;

  const particles = useMemo(() => {
    const result: Array<{
      key: string;
      color: string;
      shape: string;
      sz: number;
      x: number;
      y: number;
      dur: number;
      delay: number;
      glow: string;
      drift: string;
      rotation: number;
    }> = [];

    for (let i = 0; i < totalCount; i++) {
      const isPrimary = i < primaryCount;
      const t = isPrimary ? theme : theme2!;
      const pfx = isPrimary ? 'p' : 's';
      const color = t.colors[i % t.colors.length];
      const sz = rr(seed, `${pfx}sz`, i, t.sizeRange[0], t.sizeRange[1]);
      // Distribute particles in a ring around the sprite center
      const angle = (i / totalCount) * 360 + rr(seed, `${pfx}ang`, i, -30, 30);
      const dist = rr(seed, `${pfx}dist`, i, 35, 55); // % of half-size
      const x = 50 + Math.cos(angle * Math.PI / 180) * dist;
      const y = 50 + Math.sin(angle * Math.PI / 180) * dist;
      const dur = rr(seed, `${pfx}dur`, i, 2.5, 4.5);
      const delay = rr(seed, `${pfx}del`, i, 0, 3);
      const rotation = rr(seed, `${pfx}rot`, i, -45, 45);

      result.push({
        key: `${pfx}-${i}`,
        color,
        shape: t.shape,
        sz,
        x,
        y,
        dur,
        delay,
        glow: t.glow,
        drift: DRIFT_KEYFRAMES[t.drift] || 'ambientFloat',
        rotation,
      });
    }
    return result;
  }, [type, type2, seed, count, totalCount, primaryCount, theme, theme2]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${size}px`,
        height: `${size}px`,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.key}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
            filter: `drop-shadow(0 0 ${Math.round(p.sz * 1.2)}px ${p.glow})`,
            animation: `${p.drift} ${p.dur.toFixed(2)}s ease-in-out ${p.delay.toFixed(2)}s infinite`,
            opacity: 0.85,
          }}
        >
          {renderShape(p.shape, Math.round(p.sz * (size / 160)), p.color)}
        </div>
      ))}
    </div>
  );
}
