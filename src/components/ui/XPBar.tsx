type XPBarProps = {
  exp: number;
  max: number;
};

export default function XPBar({ exp, max }: XPBarProps) {
  const safeMax = Math.max(1, max);
  const p = Math.min(100, exp / safeMax * 100);
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
      <div style={{ width: `${p}%`, height: "100%", background: "linear-gradient(90deg,#6366f1,#a855f7)", borderRadius: 2, transition: "width 0.8s ease" }} />
    </div>
  );
}
