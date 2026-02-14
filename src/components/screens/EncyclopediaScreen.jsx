import MonsterSprite from '../ui/MonsterSprite';
import { ENC_ENTRIES, ENC_TOTAL } from '../../data/encyclopedia';

export default function EncyclopediaScreen({ encData = {}, onBack }) {
  const enc = encData.encountered || {};
  const def = encData.defeated || {};
  const encCount = Object.keys(enc).length;
  const defCount = Object.keys(def).length;

  return (
    <div style={{
      height:"100%", display:"flex", flexDirection:"column",
      background:"linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)",
      color:"white", overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{ padding:"18px 16px 8px", textAlign:"center" }}>
        <h2 style={{ fontSize:22, fontWeight:900, margin:0, letterSpacing:1 }}>📚 怪獸圖鑑</h2>
        <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:6, fontSize:11, opacity:0.5 }}>
          <span>遭遇 {encCount}/{ENC_TOTAL}</span>
          <span>擊敗 {defCount}/{ENC_TOTAL}</span>
        </div>
        {/* Progress bar */}
        <div style={{ margin:"8px auto 0", width:"70%", height:6, background:"rgba(255,255,255,0.1)", borderRadius:3 }}>
          <div style={{ width:`${Math.round(encCount/ENC_TOTAL*100)}%`, height:"100%", background:"linear-gradient(90deg,#22c55e,#3b82f6)", borderRadius:3, transition:"width 0.5s ease" }}/>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 10px 16px", WebkitOverflowScrolling:"touch" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {ENC_ENTRIES.map(e => {
            const seen = !!enc[e.key];
            const killed = !!def[e.key];
            return (
              <div key={e.key} style={{
                background: seen ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)",
                border: killed ? "1px solid rgba(34,197,94,0.3)" : seen ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.04)",
                borderRadius:14, padding:"10px 6px 8px", textAlign:"center",
                transition:"all 0.3s",
              }}>
                {/* Sprite or silhouette */}
                <div style={{
                  margin:"0 auto 6px", width:60, height:50,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  filter: seen ? "none" : "brightness(0) opacity(0.2)",
                }}>
                  <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={50} />
                </div>

                {/* Name */}
                <div style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>
                  {seen ? e.name : "???"}
                </div>

                {/* Type badge */}
                <div style={{ fontSize:10, opacity:0.5, marginBottom:4 }}>
                  {seen ? `${e.typeIcon} ${e.typeName}` : "??"}
                  {e.isEvolved && seen && <span style={{ marginLeft:4, fontSize:9, background:"rgba(168,85,247,0.3)", padding:"1px 5px", borderRadius:6 }}>進化</span>}
                </div>

                {seen && (
                  <>
                    {/* Stats */}
                    <div style={{ fontSize:10, opacity:0.45, lineHeight:1.6 }}>
                      HP {e.hp}　ATK {e.atk}
                    </div>
                    {/* Weakness */}
                    {e.weakAgainst.length > 0 && (
                      <div style={{ fontSize:9, opacity:0.35, marginTop:2 }}>
                        弱點：{e.weakAgainst.join("、")}系
                      </div>
                    )}
                    {/* Encounter / Defeat counts */}
                    <div style={{ fontSize:9, opacity:0.3, marginTop:3 }}>
                      遭遇 {enc[e.key] || 0}　擊敗 {def[e.key] || 0}
                    </div>
                  </>
                )}
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
