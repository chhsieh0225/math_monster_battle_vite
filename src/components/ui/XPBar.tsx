import type { CSSProperties } from 'react';

type XPBarProps = {
  exp: number;
  max: number;
};

type XPFillVars = CSSProperties & {
  '--battle-xp-width': string;
};

export default function XPBar({ exp, max }: XPBarProps) {
  const safeMax = Math.max(1, max);
  const safeExp = Math.max(0, Math.floor(exp));
  const shownExp = Math.min(safeExp, safeMax);
  const p = Math.min(100, shownExp / safeMax * 100);
  const fillStyle: XPFillVars = { "--battle-xp-width": `${p}%` };
  return (
    <div
      className="battle-xp-track"
      role="progressbar"
      aria-label="Experience progress"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={shownExp}
      aria-valuetext={`${shownExp}/${safeMax}`}
    >
      <div className="battle-xp-fill" style={fillStyle} />
    </div>
  );
}
