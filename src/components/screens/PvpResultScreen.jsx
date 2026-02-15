export default function PvpResultScreen({
  p1Starter,
  p2Starter,
  winner,
  onRematch,
  onHome,
}) {
  const winnerName = winner === "p1" ? (p1Starter?.name || "玩家1") : (p2Starter?.name || "玩家2");
  const loserName = winner === "p1" ? (p2Starter?.name || "玩家2") : (p1Starter?.name || "玩家1");

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      background: "linear-gradient(180deg,#0f172a,#1e1b4b,#312e81)",
      padding: "24px 20px",
      textAlign: "center",
      gap: 14,
    }}>
      <div style={{ fontSize: 56 }}>🏆</div>
      <div style={{ fontSize: 24, fontWeight: 900 }}>雙人對戰結束</div>
      <div style={{ fontSize: 16, opacity: 0.95 }}>
        {winnerName} 擊敗了 {loserName}
      </div>
      <div style={{ fontSize: 12, opacity: 0.45 }}>同機雙人模式</div>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button className="touch-btn" onClick={onRematch} style={{
          background: "linear-gradient(135deg,#6366f1,#a855f7)",
          border: "none",
          color: "white",
          fontSize: 14,
          fontWeight: 700,
          padding: "12px 24px",
          borderRadius: 14,
          cursor: "pointer",
        }}>🔄 再戰</button>
        <button className="touch-btn" onClick={onHome} style={{
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "white",
          fontSize: 14,
          fontWeight: 600,
          padding: "12px 20px",
          borderRadius: 14,
          cursor: "pointer",
        }}>🏠 首頁</button>
      </div>
    </div>
  );
}
