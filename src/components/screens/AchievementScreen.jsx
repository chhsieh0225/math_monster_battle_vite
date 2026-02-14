import { ACHIEVEMENTS } from '../../data/achievements';

export default function AchievementScreen({ unlockedIds = [], onBack }) {
  const unlocked = new Set(unlockedIds);
  const total = ACHIEVEMENTS.length;
  const done = unlockedIds.length;
  const pct = Math.round(done / total * 100);

  return (
    <div style={{
      height:"100%", display:"flex", flexDirection:"column",
      background:"linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)",
      color:"white", overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{ padding:"18px 16px 10px", textAlign:"center" }}>
        <h2 style={{ fontSize:22, fontWeight:900, margin:0, letterSpacing:1 }}>⭐ 成就</h2>
        <div style={{ fontSize:12, opacity:0.5, marginTop:4 }}>
          {done} / {total} 已解鎖（{pct}%）
        </div>
        {/* Progress bar */}
        <div style={{ margin:"8px auto 0", width:"70%", height:6, background:"rgba(255,255,255,0.1)", borderRadius:3 }}>
          <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#6366f1,#a855f7)", borderRadius:3, transition:"width 0.5s ease" }}/>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 12px 16px", WebkitOverflowScrolling:"touch" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {ACHIEVEMENTS.map(a => {
            const ok = unlocked.has(a.id);
            return (
              <div key={a.id} style={{
                background: ok ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                border: ok ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius:14, padding:"10px 12px",
                opacity: ok ? 1 : 0.45,
                filter: ok ? "none" : "grayscale(0.8)",
                transition:"all 0.3s",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:24 }}>{ok ? a.icon : "🔒"}</span>
                  <span style={{ fontSize:13, fontWeight:700 }}>{a.name}</span>
                </div>
                <div style={{ fontSize:11, opacity:0.6, lineHeight:1.4 }}>{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:"10px 16px 18px", textAlign:"center" }}>
        <button onClick={onBack} style={{
          background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
          color:"white", fontSize:14, fontWeight:600, padding:"8px 32px", borderRadius:50,
        }}>← 返回</button>
      </div>
    </div>
  );
}
