import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters';
import { VERSION } from '../../data/constants';

export default function TitleScreen({ onStartNormal, onStartTimed, onLeaderboard, onAchievements, onEncyclopedia, onDashboard }) {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 28,
      background: "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)",
      color: "white", padding: "32px 20px 20px", textAlign: "center",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background sparkles */}
      <div style={{ position: "absolute", top: "8%", left: "12%", fontSize: 40, opacity: 0.1, animation: "sparkle 3s ease infinite" }}>⭐</div>
      <div style={{ position: "absolute", top: "18%", right: "18%", fontSize: 30, opacity: 0.06, animation: "sparkle 4s ease 1s infinite" }}>✨</div>
      <div style={{ position: "absolute", bottom: "15%", left: "8%", fontSize: 24, opacity: 0.05, animation: "sparkle 5s ease 2s infinite" }}>⭐</div>

      {/* ─── Top: Branding ─── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "flex-end" }}>
          {STARTERS.map((s, i) => (
            <div key={s.id} style={{ animation: `float ${3 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }}>
              <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={75} />
            </div>
          ))}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: 2, textShadow: "0 0 30px rgba(99,102,241,0.5)" }}>數學寶可夢</h1>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.4, marginTop: 4 }}>Math Monster Battle</div>
      </div>

      {/* ─── Middle: Actions ─── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 320 }}>
        {/* Play buttons */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button onClick={onStartNormal} style={{
            flex: 1, background: "linear-gradient(135deg,#6366f1,#a855f7)",
            border: "none", color: "white", fontSize: 16, fontWeight: 800,
            padding: "14px 0", borderRadius: 14,
            boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
          }}>⚔️ 一般模式</button>
          <button onClick={onStartTimed} style={{
            flex: 1, background: "linear-gradient(135deg,#ef4444,#f59e0b)",
            border: "none", color: "white", fontSize: 16, fontWeight: 800,
            padding: "14px 0", borderRadius: 14,
            boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
          }}>⏱️ 計時模式</button>
        </div>
        <div style={{ fontSize: 11, opacity: 0.3, marginTop: -6 }}>計時模式：5 秒內回答</div>

        {/* Feature grid — 2×2 icon buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
          {[
            { icon: "🏆", label: "排行榜", fn: onLeaderboard },
            { icon: "⭐", label: "成就", fn: onAchievements },
            { icon: "📚", label: "圖鑑", fn: onEncyclopedia },
            { icon: "📊", label: "家長專區", fn: onDashboard },
          ].map(b => (
            <button key={b.label} onClick={b.fn} style={{
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
        <div>設計：Chung-Han Hsieh　·　Claude (Anthropic) 協助開發</div>
        <div style={{ marginTop: 2 }}>ch.hsieh@mx.nthu.edu.tw</div>
        <div style={{ fontFamily: "monospace", marginTop: 2 }}>{VERSION}</div>
      </div>
    </div>
  );
}
