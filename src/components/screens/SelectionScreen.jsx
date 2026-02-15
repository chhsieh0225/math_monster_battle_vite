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

export default function SelectionScreen({ mode = "single", onSelect, onBack }) {
  const isDual = mode === "coop" || mode === "pvp";
  const [picked, setPicked] = useState(null);
  const [picked1, setPicked1] = useState(null);
  const [picked2, setPicked2] = useState(null);
  const [focusSlot, setFocusSlot] = useState("p1");

  const handlePick = (s) => {
    if (!isDual) {
      if (picked?.id === s.id) { setPicked(null); return; }
      setPicked(s);
      return;
    }

    if (focusSlot === "p1") {
      if (picked2?.id === s.id) return;
      if (picked1?.id === s.id) {
        setPicked1(null);
        setFocusSlot("p1");
        return;
      }
      setPicked1(s);
      if (!picked2) setFocusSlot("p2");
      return;
    }

    if (picked1?.id === s.id) return;
    if (picked2?.id === s.id) {
      setPicked2(null);
      return;
    }
    setPicked2(s);
  };

  const confirmSingle = () => {
    if (!picked) return;
    onSelect(picked);
  };

  const confirmDual = () => {
    if (!picked1 || !picked2) return;
    onSelect({ p1: picked1, p2: picked2 });
  };

  return (
    <div className="selection-screen" style={{ height: "100%", display: "flex", flexDirection: "column", background: PAGE_BG, color: "white", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button className="back-touch-btn" onClick={onBack} style={backBtn}>←</button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 1 }}>
            {isDual ? (mode === "pvp" ? "選擇雙方角色！" : "選擇雙人夥伴！") : "選擇你的夥伴！"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 1 }}>
            {isDual ? "每個角色只能被一位玩家選取" : "點選角色查看詳細資訊"}
          </div>
        </div>
      </div>

      {isDual && (
        <div style={{ padding: "0 16px 6px", display: "flex", gap: 8, flexShrink: 0 }}>
          <button className="touch-btn" onClick={() => setFocusSlot("p1")} style={{
            flex: 1,
            borderRadius: 10,
            border: focusSlot === "p1" ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,0.12)",
            background: focusSlot === "p1" ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.04)",
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 8px",
          }}>
            玩家1：{picked1 ? `${picked1.typeIcon}${picked1.name}` : "未選"}
          </button>
          <button className="touch-btn" onClick={() => setFocusSlot("p2")} style={{
            flex: 1,
            borderRadius: 10,
            border: focusSlot === "p2" ? "1px solid #f472b6" : "1px solid rgba(255,255,255,0.12)",
            background: focusSlot === "p2" ? "rgba(244,114,182,0.2)" : "rgba(255,255,255,0.04)",
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 8px",
          }}>
            玩家2：{picked2 ? `${picked2.typeIcon}${picked2.name}` : "未選"}
          </button>
        </div>
      )}

      {/* Starter cards */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 12px 8px", gap: 5, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {STARTERS.map((s) => {
          const isP1 = picked1?.id === s.id;
          const isP2 = picked2?.id === s.id;
          const sel = isDual ? (isP1 || isP2) : picked?.id === s.id;
          const info = DESCS[s.id];
          return (
            <button className="selection-card-btn" key={s.id} onClick={() => handlePick(s)} style={{
              background: sel
                ? `linear-gradient(135deg, ${s.c1}44, ${s.c2}33)`
                : `linear-gradient(135deg, ${s.c1}18, ${s.c2}10)`,
              border: isDual
                ? isP1 ? "2px solid #60a5fa" : isP2 ? "2px solid #f472b6" : `1px solid ${s.c1}22`
                : sel ? `2px solid ${s.c1}` : `1px solid ${s.c1}22`,
              borderRadius: 12, padding: sel ? "10px 12px" : "8px 12px",
              display: "flex", flexDirection: "column", gap: 0,
              cursor: "pointer", textAlign: "left", color: "white",
              transition: "all 0.3s ease", flexShrink: 0,
            }}>
              {/* Top row: sprite + name + moves */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  flexShrink: 0,
                  animation: sel ? "spinSelect 0.7s ease-in-out" : "none",
                  transition: "transform 0.3s",
                }}>
                  <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={sel ? 72 : 56} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>
                    {s.typeIcon} {s.name}
                    <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 5 }}>{s.typeName}系</span>
                    {isDual && isP1 && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 8, background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.5)" }}>玩家1</span>}
                    {isDual && isP2 && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 8, background: "rgba(244,114,182,0.2)", border: "1px solid rgba(244,114,182,0.5)" }}>玩家2</span>}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.5, lineHeight: 1.4 }}>
                    {s.moves.slice(0, 3).map((m, j) => (
                      <span key={j}>{m.icon} {m.name}{j < 2 ? "　" : ""}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expanded detail when selected */}
              {sel && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: `1px solid ${s.c1}44`,
                  animation: "fadeIn 0.3s ease",
                }}>
                  <div style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.6, marginBottom: 6 }}>{info.desc}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: 8, lineHeight: 1.5 }}>
                      <span style={{ opacity: 0.5 }}>被動｜</span>{info.passive}
                    </div>
                    <div style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: 8, lineHeight: 1.5 }}>
                      <span style={{ opacity: 0.5 }}>連擊｜</span>{info.specDef}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {s.moves.map((m, j) => (
                      <div key={j} style={{
                        flex: 1, background: "rgba(255,255,255,0.07)",
                        borderRadius: 8, padding: "5px 3px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 12 }}>{m.icon}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, marginTop: 1 }}>{m.name}</div>
                        <div style={{ fontSize: 8, opacity: 0.5, marginTop: 1 }}>{m.desc}</div>
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
      {!isDual && picked && (
        <div style={{ padding: "6px 14px 14px", animation: "fadeIn 0.3s ease", flexShrink: 0 }}>
          <button className="selection-confirm-btn touch-btn" onClick={confirmSingle} style={{
            width: "100%", padding: "13px 0",
            background: `linear-gradient(135deg, ${picked.c1}, ${picked.c2})`,
            border: "none", borderRadius: 14,
            color: "white", fontSize: 16, fontWeight: 800,
            letterSpacing: 2, cursor: "pointer",
            boxShadow: `0 4px 20px ${picked.c1}66`,
          }}>
            選擇 {picked.typeIcon} {picked.name} 出發！
          </button>
        </div>
      )}
      {isDual && picked1 && picked2 && (
        <div style={{ padding: "6px 14px 14px", animation: "fadeIn 0.3s ease", flexShrink: 0 }}>
          <button className="selection-confirm-btn touch-btn" onClick={confirmDual} style={{
            width: "100%", padding: "13px 0",
            background: mode === "pvp"
              ? "linear-gradient(135deg,#ec4899,#f43f5e)"
              : "linear-gradient(135deg,#0ea5e9,#22d3ee)",
            border: "none", borderRadius: 14,
            color: "white", fontSize: 16, fontWeight: 800,
            letterSpacing: 1, cursor: "pointer",
            boxShadow: mode === "pvp"
              ? "0 4px 20px rgba(244,63,94,0.32)"
              : "0 4px 20px rgba(14,165,233,0.32)",
          }}>
            {mode === "pvp"
              ? `玩家1 ${picked1.typeIcon}${picked1.name} vs 玩家2 ${picked2.typeIcon}${picked2.name}`
              : `雙人出發：${picked1.typeIcon}${picked1.name} + ${picked2.typeIcon}${picked2.name}`}
          </button>
        </div>
      )}
    </div>
  );
}

const backBtn = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
