import type { CSSProperties } from 'react';

type HPBarProps = {
  cur: number;
  max: number;
  color: string;
  label: string;
};

type HPFillVars = CSSProperties & {
  '--battle-hp-width': string;
  '--battle-hp-color': string;
};

export default function HPBar({ cur, max, color, label }: HPBarProps) {
  const safeMax = Math.max(1, max);
  const safeCur = Math.max(0, Math.ceil(cur));
  const p = Math.max(0, safeCur / safeMax * 100);
  const bc = p > 50 ? color : p > 25 ? "#f59e0b" : "#ef4444";
  const fillStyle: HPFillVars = {
    "--battle-hp-width": `${p}%`,
    "--battle-hp-color": bc,
  };
  return (
    <div
      className="battle-hp-card"
      role="group"
      aria-label={`${label} HP`}
    >
      <div className="battle-hp-row">
        <span className="battle-hp-label">{label}</span>
        <span className="battle-hp-value">{safeCur}/{safeMax}</span>
      </div>
      <div
        className="battle-hp-track"
        role="progressbar"
        aria-label={`${label} health`}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.min(safeCur, safeMax)}
        aria-valuetext={`${safeCur}/${safeMax}`}
      >
        <div className="battle-hp-fill" style={fillStyle} />
      </div>
    </div>
  );
}
