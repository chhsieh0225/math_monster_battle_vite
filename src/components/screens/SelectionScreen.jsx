import { useState } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters';

const PAGE_BG = "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)";

const DESCS = {
  fire: { desc: "來自火山地帶的熱血夥伴。專精乘法運算，攻擊力成長極高。", passive: "🔥 灼燒：攻擊附帶灼燒效果，每回合持續造成傷害", specDef: "🛡️ 防護罩：8連擊時展開火焰護盾，完全擋下攻擊" },
  water: { desc: "來自深海的冷靜夥伴。專精除法運算，擅長精密的計算。", passive: "❄️ 凍結：攻擊有機率凍結敵人，使其跳過一回合", specDef: "💨 完美閃避：8連擊時化為水流，完全迴避攻擊" },
  grass: { desc: "來自古老森林的溫和夥伴。專精加減法，擁有強韌的生命力。", passive: "💚 回血：每次攻擊恢復少量HP，持久作戰的王者", specDef: "🌿 反彈：8連擊時以藤蔓反擊，將傷害反彈給敵人" },
  electric: { desc: "來自雷雲深處的敏捷夥伴。專精四則混合運算，全方位的實力派。", passive: "⚡ 靜電蓄積：答對累積靜電，滿3層自動放電造成額外傷害", specDef: "⚡ 電流麻痺：8連擊時釋放電流，使敵人麻痺無法行動" },
  lion: { desc: "來自金色草原的勇敢夥伴。專精求未知數，HP越低攻擊越強的高風險高報酬戰士。", passive: "🦁 勇氣之心：HP越低傷害加成越高（最高+50%），越危險越強大", specDef: "✨ 獅王咆哮：8連擊時擋下攻擊並對敵人造成15點固定傷害" },
};

export default function SelectionScreen({ onSelect, onBack }) {
  const [picked, setPicked] = useState(null);

  const handlePick = (s) => {
    if (picked?.id === s.id) { setPicked(null); return; }
    setPicked(s);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: PAGE_BG, color: "white", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={backBtn}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>選擇你的夥伴！</div>
          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>點選角色查看詳細資訊</div>
        </div>
      </div>

      {/* Starter cards */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 14px 10px", gap: 6, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {STARTERS.map((s) => {
          const sel = picked?.id === s.id;
          const info = DESCS[s.id];
          return (
            <button key={s.id} onClick={() => handlePick(s)} style={{
              background: sel
                ? `linear-gradient(135deg, ${s.c1}44, ${s.c2}33)`
                : `linear-gradient(135deg, ${s.c1}22, ${s.c2}18)`,
              border: sel ? `2px solid ${s.c1}` : `1px solid ${s.c1}33`,
              borderRadius: 14, padding: sel ? "12px 14px" : "12px 14px",
              display: "flex", flexDirection: "column", gap: 0,
              cursor: "pointer", textAlign: "left", color: "white",
              transition: "all 0.3s ease",
            }}>
              {/* Top row: sprite + name + moves */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  flexShrink: 0,
                  animation: sel ? "spinSelect 0.7s ease-in-out" : "none",
                  transition: "transform 0.3s",
                }}>
                  <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={sel ? 80 : 68} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>
                    {s.typeIcon} {s.name}
                    <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 6 }}>{s.typeName}系</span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.55, lineHeight: 1.5 }}>
                    {s.moves.slice(0, 3).map((m, j) => (
                      <span key={j}>{m.icon} {m.name}{j < 2 ? "　" : ""}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expanded detail when selected */}
              {sel && (
                <div style={{
                  marginTop: 10, paddingTop: 10,
                  borderTop: `1px solid ${s.c1}44`,
                  animation: "fadeIn 0.3s ease",
                }}>
                  <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.7, marginBottom: 8 }}>{info.desc}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, background: "rgba(255,255,255,0.06)", padding: "5px 8px", borderRadius: 8, lineHeight: 1.5 }}>
                      <span style={{ opacity: 0.5 }}>被動｜</span>{info.passive}
                    </div>
                    <div style={{ fontSize: 11, background: "rgba(255,255,255,0.06)", padding: "5px 8px", borderRadius: 8, lineHeight: 1.5 }}>
                      <span style={{ opacity: 0.5 }}>連擊｜</span>{info.specDef}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {s.moves.map((m, j) => (
                      <div key={j} style={{
                        flex: 1, background: "rgba(255,255,255,0.07)",
                        borderRadius: 8, padding: "6px 4px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 13 }}>{m.icon}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{m.name}</div>
                        <div style={{ fontSize: 9, opacity: 0.5, marginTop: 1 }}>{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      {picked && (
        <div style={{ padding: "8px 16px 16px", animation: "fadeIn 0.3s ease" }}>
          <button onClick={() => onSelect(picked)} style={{
            width: "100%", padding: "14px 0",
            background: `linear-gradient(135deg, ${picked.c1}, ${picked.c2})`,
            border: "none", borderRadius: 14,
            color: "white", fontSize: 17, fontWeight: 800,
            letterSpacing: 2, cursor: "pointer",
            boxShadow: `0 4px 20px ${picked.c1}66`,
          }}>
            選擇 {picked.typeIcon} {picked.name} 出發！
          </button>
        </div>
      )}
    </div>
  );
}

const backBtn = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
