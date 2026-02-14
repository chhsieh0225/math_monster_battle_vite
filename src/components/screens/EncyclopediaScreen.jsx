import MonsterSprite from '../ui/MonsterSprite';
import { ENC_ENTRIES, ENC_TOTAL } from '../../data/encyclopedia';

const PAGE_BG = "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)";

export default function EncyclopediaScreen({ encData = {}, onBack }) {
  const enc = encData.encountered || {};
  const def = encData.defeated || {};
  const encCount = Object.keys(enc).length;
  const pct = Math.round(encCount / ENC_TOTAL * 100);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: PAGE_BG, color: "white", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button onClick={onBack} style={backBtn}>←</button>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>📚 怪獸圖鑑</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, opacity: 0.5 }}>{encCount}/{ENC_TOTAL}</div>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#3b82f6)", borderRadius: 3, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px 16px", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {ENC_ENTRIES.map(e => {
            const seen = !!enc[e.key];
            const killed = !!def[e.key];
            return (
              <div key={e.key} style={{
                background: seen ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                border: killed ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12, padding: "10px 6px 8px", textAlign: "center",
              }}>
                <div style={{
                  margin: "0 auto 6px", width: 56, height: 48,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  filter: seen ? "none" : "brightness(0) opacity(0.15)",
                }}>
                  <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={48} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{seen ? e.name : "???"}</div>
                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 3 }}>
                  {seen ? `${e.typeIcon} ${e.typeName}` : "??"}
                  {e.isEvolved && seen && <span style={{ marginLeft: 4, fontSize: 9, background: "rgba(168,85,247,0.25)", padding: "1px 5px", borderRadius: 6 }}>進化</span>}
                </div>
                {seen && (
                  <>
                    <div style={{ fontSize: 10, opacity: 0.4, lineHeight: 1.5 }}>HP {e.hp}　ATK {e.atk}</div>
                    {e.weakAgainst.length > 0 && <div style={{ fontSize: 9, opacity: 0.3, marginTop: 2 }}>弱點：{e.weakAgainst.join("、")}系</div>}
                    <div style={{ fontSize: 9, opacity: 0.25, marginTop: 3 }}>遭遇 {enc[e.key] || 0}　擊敗 {def[e.key] || 0}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const backBtn = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
