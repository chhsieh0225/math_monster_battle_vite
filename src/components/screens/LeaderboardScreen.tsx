import type { CSSProperties } from 'react';
import { loadScores } from '../../utils/leaderboard';
import type { LeaderboardEntry } from '../../types/game';

const PAGE_BG = "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)";

type LeaderboardScreenProps = {
  totalEnemies: number;
  onBack: () => void;
};

export default function LeaderboardScreen({ totalEnemies, onBack }: LeaderboardScreenProps) {
  const scores = loadScores() as LeaderboardEntry[];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: PAGE_BG, color: "white", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="back-touch-btn" onClick={onBack} style={backBtn}>←</button>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>🏆 排行榜</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 20px", WebkitOverflowScrolling: "touch" }}>
        {scores.length === 0
          ? <div style={{ opacity: 0.4, fontSize: 13, marginTop: 60, textAlign: "center" }}>尚無紀錄，快去挑戰吧！</div>
          : scores.map((s, i) => {
              const d = new Date(s.date);
              const ds = `${d.getMonth() + 1}/${d.getDate()}`;
              return (
                <div key={s.date + "_" + i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: i === 0 ? "rgba(251,191,36,0.1)" : i < 3 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                  borderRadius: 12, padding: "10px 14px", marginBottom: 6,
                  border: `1px solid ${i === 0 ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.06)"}`,
                  animation: `fadeSlide 0.3s ease ${i * 0.04}s both`,
                }}>
                  <div style={{ width: 28, fontSize: i < 3 ? 20 : 14, textAlign: "center", fontWeight: 900, color: i === 0 ? "#fbbf24" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.4)" }}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}`}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{s.name || "???"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 17, fontWeight: 900, color: "#fbbf24", fontFamily: "'Press Start 2P',monospace" }}>{s.score}</span>
                      {s.timed && <span style={{ fontSize: 9, background: "rgba(239,68,68,0.25)", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>⏱️</span>}
                      {s.completed && <span style={{ fontSize: 9, background: "rgba(34,197,94,0.25)", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>👑</span>}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.45, marginTop: 2 }}>怪獸 {s.defeated}/{totalEnemies} · 正確率 {s.accuracy}% · Lv.{s.level}</div>
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.3, flexShrink: 0 }}>{ds}</div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

const backBtn: CSSProperties = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
