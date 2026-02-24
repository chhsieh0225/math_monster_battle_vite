/**
 * Shared scaffold for ultimate (idx 3) effect rendering.
 *
 * Phases 2 (core), 3 (rings), and 7 (glow) are data-driven via config.
 * Phases 1 (approach), 4 (sweeps), 5 (burst), 6 (shards) are passed as
 * named ReactNode slots because they vary dramatically between elements.
 */
import type { ReactNode, CSSProperties } from 'react';
import type { EffectTemplateContext } from './createEffectTemplate.ts';
import type { SpriteTarget } from '../../hooks/useSpriteTargets';

// ─── Config types ───

export type GradientStop = {
  offset: string;
  color: string;
  opacity: number;
};

export type CoreFilterConfig = {
  turbulenceType: 'fractalNoise' | 'turbulence';
  baseFreqValues: string;
  displacement: {
    xChannel: string;
    yChannel: string;
    scaleValues: (fxLvl: number) => string;
  };
  blurValues: string;
  colorMatrix?: string;
};

export type CoreConfig = {
  svgSize: number;
  center: number;
  radius: (fxLvl: number) => number;
  gradientStops: GradientStop[];
  filter?: CoreFilterConfig;
  outerFilter: (glow: number) => string;
};

export type RingConfig = {
  count: (fxLvl: number) => number;
  svgSize: [number, number];
  center: [number, number];
  baseRadius: (i: number) => [number, number];
  useCircle?: boolean;
  strokeColors: [string, string];
  strokeWidth: (i: number) => number;
  offset: [string, string];
  delay: (D: number, i: number, fxLvl: number) => number;
  duration: (i: number, fxLvl: number) => number;
  ringFilter?: (glow: number) => string;
  opacity?: (i: number) => number | undefined;
};

export type GlowConfig = {
  gradient: (T: SpriteTarget, fxLvl: number) => string;
  durMultiplier: number;
};

export type UltimateConfig = {
  D: number;
  core: CoreConfig;
  rings: RingConfig | null;
  glow: GlowConfig | null;
};

type UltimateEffectProps = {
  config: UltimateConfig;
  ctx: EffectTemplateContext;
  approach?: ReactNode;
  sweeps?: ReactNode;
  burst?: ReactNode;
  shards?: ReactNode;
};

// ─── Component ───

export function UltimateEffect({
  config,
  ctx,
  approach,
  sweeps,
  burst,
  shards,
}: UltimateEffectProps) {
  const { fxLvl, dur, glow, T, rr, uid } = ctx;
  const { D, core, rings, glow: glowCfg } = config;

  const coreGradientId = `ult-core-${uid}`;
  const coreFilterId = `ult-core-filter-${uid}`;
  const coreSeed = Math.max(1, Math.floor(rr('ult-core-seed', 0, 2, 90)));
  const durSec = dur / 1000;

  return (
    <div className="move-fx-overlay">
      {/* Phase 1: approach orb (element-specific) */}
      {approach}

      {/* Phase 2: impact core */}
      <svg
        width={core.svgSize}
        height={core.svgSize}
        viewBox={`0 0 ${core.svgSize} ${core.svgSize}`}
        style={{
          position: 'absolute',
          right: T.right,
          top: T.top,
          transform: 'translate(50%,-30%)',
          filter: core.outerFilter(glow),
        }}
      >
        <defs>
          <radialGradient id={coreGradientId} cx="50%" cy="50%">
            {core.gradientStops.map((s, i) => (
              <stop
                key={i}
                offset={s.offset}
                stopColor={s.color}
                stopOpacity={s.opacity}
              />
            ))}
          </radialGradient>
          {core.filter && (
            <filter
              id={coreFilterId}
              x="-70%"
              y="-70%"
              width="240%"
              height="240%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type={core.filter.turbulenceType}
                baseFrequency="0"
                numOctaves={3}
                seed={coreSeed}
                result="noise"
              >
                <animate
                  attributeName="baseFrequency"
                  values={core.filter.baseFreqValues}
                  dur={`${durSec}s`}
                  fill="freeze"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={0}
                xChannelSelector={core.filter.displacement.xChannel}
                yChannelSelector={core.filter.displacement.yChannel}
                result="warp"
              >
                <animate
                  attributeName="scale"
                  values={core.filter.displacement.scaleValues(fxLvl)}
                  dur={`${durSec}s`}
                  fill="freeze"
                />
              </feDisplacementMap>
              <feGaussianBlur in="warp" stdDeviation={0} result="soft">
                <animate
                  attributeName="stdDeviation"
                  values={core.filter.blurValues}
                  dur={`${durSec}s`}
                  fill="freeze"
                />
              </feGaussianBlur>
              {core.filter.colorMatrix && (
                <feColorMatrix
                  in="soft"
                  type="matrix"
                  values={core.filter.colorMatrix}
                />
              )}
            </filter>
          )}
        </defs>
        <circle
          cx={core.center}
          cy={core.center}
          r={core.radius(fxLvl)}
          fill={`url(#${coreGradientId})`}
          filter={core.filter ? `url(#${coreFilterId})` : undefined}
          style={{
            animation: `fireExpand ${durSec}s ease ${D}s forwards`,
          }}
        />
      </svg>

      {/* Phase 3: pressure rings */}
      {rings &&
        Array.from({ length: rings.count(fxLvl) }, (_, i) => {
          const [rx, ry] = rings.baseRadius(i);
          const ringStyle: CSSProperties = {
            position: 'absolute',
            right: `calc(${T.right} - ${rings.offset[0]})`,
            top: `calc(${T.top} - ${rings.offset[1]})`,
            opacity: 0,
            animation: `darkRingExpand ${rings.duration(i, fxLvl)}s ease ${rings.delay(D, i, fxLvl)}s forwards`,
            ...(rings.ringFilter
              ? { filter: rings.ringFilter(glow) }
              : {}),
          };
          const opVal = rings.opacity?.(i);
          return (
            <svg
              key={`ring-${i}`}
              width={rings.svgSize[0]}
              height={rings.svgSize[1]}
              viewBox={`0 0 ${rings.svgSize[0]} ${rings.svgSize[1]}`}
              style={ringStyle}
            >
              {rings.useCircle ? (
                <circle
                  cx={rings.center[0]}
                  cy={rings.center[1]}
                  r={rx}
                  fill="none"
                  stroke={i % 2 === 0 ? rings.strokeColors[0] : rings.strokeColors[1]}
                  strokeWidth={rings.strokeWidth(i)}
                  style={rings.ringFilter ? { filter: rings.ringFilter(glow) } : undefined}
                  opacity={opVal}
                />
              ) : (
                <ellipse
                  cx={rings.center[0]}
                  cy={rings.center[1]}
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke={i % 2 === 0 ? rings.strokeColors[0] : rings.strokeColors[1]}
                  strokeWidth={rings.strokeWidth(i)}
                  style={rings.ringFilter ? { filter: rings.ringFilter(glow) } : undefined}
                />
              )}
            </svg>
          );
        })}

      {/* Phase 4: sweeps / rays (element-specific) */}
      {sweeps}

      {/* Phase 5: burst particles (element-specific) */}
      {burst}

      {/* Phase 6: extra shards / fragments (element-specific) */}
      {shards}

      {/* Phase 7: global glow */}
      {glowCfg && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: glowCfg.gradient(T, fxLvl),
            animation: `ultGlow ${durSec * glowCfg.durMultiplier}s ease ${D}s`,
          }}
        />
      )}
    </div>
  );
}
