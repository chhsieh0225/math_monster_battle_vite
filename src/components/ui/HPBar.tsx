type HPBarProps = {
  cur: number;
  max: number;
  color: string;
  label: string;
};

export default function HPBar({ cur, max, color, label }: HPBarProps) {
  const safeMax = Math.max(1, max);
  const p = Math.max(0, cur / safeMax * 100);
  const bc = p > 50 ? color : p > 25 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ background: "rgba(0,0,0,0.65)", borderRadius: 12, padding: "8px 12px", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{label}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Press Start 2P',monospace" }}>{Math.max(0, Math.ceil(cur))}/{safeMax}</span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${p}%`, height: "100%", background: `linear-gradient(90deg,${bc},${bc}cc)`, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}
