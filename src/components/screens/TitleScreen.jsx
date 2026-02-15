import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters';
import { VERSION } from '../../data/constants';

export default function TitleScreen({
  onStartNormal,
  onStartTimed,
  onStartDouble,
  onLeaderboard,
  onAchievements,
  onEncyclopedia,
  onDashboard,
  onSettings,
  lowPerfMode = false,
}) {
  const row1 = STARTERS.slice(0, 3);
  const row2 = STARTERS.slice(3);

  return (
    <div className="title-screen" style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 20,
      background: "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)",
      color: "white", padding: "24px 20px 16px", textAlign: "center",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background sparkles */}
      <div style={{ position: "absolute", top: "8%", left: "12%", fontSize: 40, opacity: 0.1, animation: lowPerfMode ? "none" : "sparkle 3s ease infinite" }}>⭐</div>
      <div style={{ position: "absolute", top: "18%", right: "18%", fontSize: 30, opacity: 0.06, animation: lowPerfMode ? "none" : "sparkle 4s ease 1s infinite" }}>✨</div>
      <div style={{ position: "absolute", bottom: "15%", left: "8%", fontSize: 24, opacity: 0.05, animation: lowPerfMode ? "none" : "sparkle 5s ease 2s infinite" }}>⭐</div>

      {/* ─── Top: Branding ─── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Row 1: 3 starters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 6, justifyContent: "center" }}>
          {row1.map((s, i) => (
            <div key={s.id} style={{ animation: lowPerfMode ? "none" : `float ${3 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }}>
              <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={60} />
            </div>
          ))}
        </div>
        {/* Row 2: remaining starters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12, justifyContent: "center" }}>
          {row2.map((s, i) => (
            <div key={s.id} style={{ animation: lowPerfMode ? "none" : `float ${3 + (i + 3) * 0.4}s ease-in-out ${(i + 3) * 0.3}s infinite` }}>
              <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={60} />
            </div>
          ))}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: 2, textShadow: "0 0 30px rgba(99,102,241,0.5)" }}>數學寶可夢</h1>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.4, marginTop: 4 }}>Math Monster Battle</div>
      </div>

      {/* ─── Middle: Actions ─── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%", maxWidth: 320 }}>
        {/* Play buttons */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button className="title-action-btn touch-btn" onClick={onStartNormal} style={{
            flex: 1, background: "linear-gradient(135deg,#6366f1,#a855f7)",
            border: "none", color: "white", fontSize: 16, fontWeight: 800,
            padding: "14px 0", borderRadius: 14,
            boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
          }}>⚔️ 一般模式</button>
          <button className="title-action-btn touch-btn" onClick={onStartTimed} style={{
            flex: 1, background: "linear-gradient(135deg,#ef4444,#f59e0b)",
            border: "none", color: "white", fontSize: 16, fontWeight: 800,
            padding: "14px 0", borderRadius: 14,
            boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
          }}>⏱️ 計時模式</button>
        </div>
        <button className="title-action-btn touch-btn" onClick={onStartDouble} style={{
          width: "100%", background: "linear-gradient(135deg,#0ea5e9,#22d3ee)",
          border: "none", color: "white", fontSize: 15, fontWeight: 800,
          padding: "12px 0", borderRadius: 14,
          boxShadow: "0 4px 20px rgba(14,165,233,0.28)",
        }}>⚔️ 雙打測試</button>
        <div style={{ fontSize: 11, opacity: 0.3, marginTop: -4 }}>計時模式：5 秒內回答</div>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
          {[
            { icon: "🏆", label: "排行榜", fn: onLeaderboard },
            { icon: "⭐", label: "成就", fn: onAchievements },
            { icon: "📚", label: "圖鑑", fn: onEncyclopedia },
            { icon: "📊", label: "家長專區", fn: onDashboard },
            { icon: "⚙️", label: "設定", fn: onSettings, full: true },
          ].map(b => (
            <button className="title-feature-btn touch-btn" key={b.label} onClick={b.fn} style={{
              gridColumn: b.full ? "1 / -1" : "auto",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white", fontSize: 13, fontWeight: 600,
              padding: "10px 0", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>{b.icon} {b.label}</button>
          ))}
        </div>
      </div>

      {/* ─── Bottom: Credits ─── */}
      <div style={{ opacity: 0.2, fontSize: 10, lineHeight: 1.7 }}>
        <div>設計：Chung-Han Hsieh (ch.hsieh@mx.nthu.edu.tw)</div>
        <div>Claude (Anthropic) 協助開發</div>
        <div style={{ marginTop: 2 }}>© 2025-2026 Chung-Han Hsieh. All rights reserved.</div>
        <div style={{ fontFamily: "monospace", marginTop: 2 }}>{VERSION}</div>
      </div>
    </div>
  );
}
