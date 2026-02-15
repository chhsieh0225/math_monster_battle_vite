import { memo, useId } from 'react';
import type { CSSProperties } from 'react';

type MonsterSpriteProps = {
  svgStr: string;
  size?: number;
  anim?: string;
  style?: CSSProperties;
};

const MonsterSprite = memo(function MonsterSprite({
  svgStr,
  size = 120,
  anim = "",
  style = {},
}: MonsterSpriteProps) {
  // useId() generates a unique, stable ID per component instance,
  // avoiding SVG gradient/filter ID collisions when multiple sprites are on screen.
  const uid = useId();
  const gsId = `gs-${uid}`;
  const glowId = `glow-${uid}`;

  return (
    <svg
      width={size}
      height={size * 100 / 120}
      viewBox="0 0 120 100"
      overflow="hidden"
      style={{ ...style, animation: anim || "none", imageRendering: "pixelated" }}
    >
      <defs>
        <radialGradient id={gsId} cx="35%" cy="25%">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g dangerouslySetInnerHTML={{ __html: svgStr }} />
    </svg>
  );
}, (a: MonsterSpriteProps, b: MonsterSpriteProps) => a.svgStr === b.svgStr && a.size === b.size && a.anim === b.anim);

export default MonsterSprite;
