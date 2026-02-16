type XPBarProps = {
  exp: number;
  max: number;
};

export default function XPBar({ exp, max }: XPBarProps) {
  const safeMax = Math.max(1, max);
  const safeExp = Math.max(0, Math.floor(exp));
  const shownExp = Math.min(safeExp, safeMax);
  const p = Math.min(100, shownExp / safeMax * 100);
  return (
    <div
      style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}
      role="progressbar"
      aria-label="Experience progress"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={shownExp}
      aria-valuetext={`${shownExp}/${safeMax}`}
    >
      <div style={{ width: `${p}%`, height: "100%", background: "linear-gradient(90deg,#6366f1,#a855f7)", borderRadius: 2, transition: "width 0.8s ease" }} />
    </div>
  );
}
