import { useState } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import { ENC_ENTRIES, ENC_TOTAL, STARTER_ENTRIES } from '../../data/encyclopedia';

const PAGE_BG = "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)";

// ── Type colour mapping ──
const TYPE_COLORS = {
  grass: "#22c55e", fire: "#ef4444", water: "#3b82f6", electric: "#eab308",
  ghost: "#a855f7", steel: "#94a3b8", dark: "#6b7280",
};

export default function EncyclopediaScreen({ encData = {}, onBack }) {
  const enc = encData.encountered || {};
  const def = encData.defeated || {};
  const encCount = Object.keys(enc).length;
  const pct = Math.round(encCount / ENC_TOTAL * 100);

  const [selected, setSelected] = useState(null);   // { entry, kind: "enemy"|"starter" }

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

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px 16px", WebkitOverflowScrolling: "touch" }}>

        {/* ─── Section: Enemy Monsters ─── */}
        <SectionDivider icon="🐾" label="野生怪獸" sub={`${encCount}/${ENC_TOTAL} 發現`} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
          {ENC_ENTRIES.map(e => {
            const seen = !!enc[e.key];
            const killed = !!def[e.key];
            return (
              <div key={e.key}
                onClick={() => seen && setSelected({ entry: e, kind: "enemy" })}
                style={{
                  background: seen ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                  border: killed ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12, padding: "10px 6px 8px", textAlign: "center",
                  cursor: seen ? "pointer" : "default",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}>
                <div style={{
                  margin: "0 auto 6px", width: 56, height: 48,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  filter: seen ? "none" : "brightness(0) opacity(0.15)",
                }}>
                  <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={48} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{seen ? e.name : "???"}</div>
                <div style={{ fontSize: 10, opacity: 0.5 }}>
                  {seen ? `${e.typeIcon} ${e.typeName}` : "??"}
                  {e.isEvolved && seen && <span style={{ marginLeft: 4, fontSize: 9, background: "rgba(168,85,247,0.25)", padding: "1px 5px", borderRadius: 6 }}>進化</span>}
                </div>
                {seen && <div style={{ fontSize: 9, opacity: 0.25, marginTop: 3 }}>遭遇 {enc[e.key] || 0}　擊敗 {def[e.key] || 0}</div>}
              </div>
            );
          })}
        </div>

        {/* ─── Section: Player Starters ─── */}
        <SectionDivider icon="⚔️" label="夥伴角色" sub={`${STARTER_ENTRIES.length} 種形態`} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {STARTER_ENTRIES.map(e => (
            <div key={e.key}
              onClick={() => setSelected({ entry: e, kind: "starter" })}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${(TYPE_COLORS[e.mType] || "#6366f1")}22`,
                borderRadius: 12, padding: "10px 6px 8px", textAlign: "center",
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}>
              <div style={{
                margin: "0 auto 6px", width: 56, height: 48,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={48} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{e.name}</div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>{e.typeIcon} {e.typeName}</div>
              <div style={{ fontSize: 9, opacity: 0.3, marginTop: 3 }}>{e.stageLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Detail Modals ─── */}
      {selected?.kind === "enemy" && <DetailModal entry={selected.entry} enc={enc} def={def} onClose={() => setSelected(null)} />}
      {selected?.kind === "starter" && <StarterDetailModal entry={selected.entry} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Detail overlay ──
function DetailModal({ entry, enc, def, onClose }) {
  const e = entry;
  const tc = TYPE_COLORS[e.mType] || "#6366f1";

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, animation: "fadeIn 0.2s ease",
    }}>
      <div onClick={ev => ev.stopPropagation()} style={{
        width: "100%", maxWidth: 380, maxHeight: "90%",
        background: "linear-gradient(180deg,#1e1b4b,#0f172a)",
        borderRadius: 20, border: `2px solid ${tc}33`,
        boxShadow: `0 8px 40px ${tc}22, 0 0 80px ${tc}11`,
        overflowY: "auto", WebkitOverflowScrolling: "touch",
        animation: "popIn 0.3s ease",
      }}>
        {/* Top banner with sprite */}
        <div style={{
          position: "relative", padding: "28px 20px 16px", textAlign: "center",
          background: `radial-gradient(ellipse at 50% 80%, ${tc}18, transparent 70%)`,
        }}>
          {/* Close button */}
          <button onClick={onClose} style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "white", fontSize: 16, fontWeight: 700, width: 32, height: 32,
            borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>

          {/* Rarity stars */}
          <div style={{ fontSize: 14, color: "#fbbf24", letterSpacing: 3, marginBottom: 8, opacity: 0.7 }}>{e.rarity}</div>

          {/* Large sprite with glow */}
          <div style={{
            display: "inline-block", position: "relative",
            filter: `drop-shadow(0 0 20px ${tc}55)`,
            animation: "float 3s ease-in-out infinite",
          }}>
            <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={160} />
          </div>

          {/* Name + type badge */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2, textShadow: `0 0 20px ${tc}55` }}>{e.name}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{
                background: `${tc}25`, border: `1px solid ${tc}44`,
                padding: "3px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: tc,
              }}>{e.typeIcon} {e.typeName}系</span>
              {e.isEvolved && <span style={{
                background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.3)",
                padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#c084fc",
              }}>✨ 進化型態</span>}
            </div>
          </div>
        </div>

        {/* Info sections */}
        <div style={{ padding: "0 18px 20px" }}>

          {/* Stats row */}
          <div style={{
            display: "flex", gap: 8, marginBottom: 14,
          }}>
            <StatBox icon="❤️" label="HP" value={e.hp} color="#ef4444" />
            <StatBox icon="⚔️" label="ATK" value={e.atk} color="#f59e0b" />
            <StatBox icon="📍" label="棲息地" value="" color="#6366f1" sub={e.habitat} />
          </div>

          {/* Description */}
          {e.desc && <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 12,
            padding: "12px 14px", marginBottom: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 4 }}>📖 圖鑑說明</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.8 }}>{e.desc}</div>
          </div>}

          {/* Type matchups */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12,
          }}>
            {e.weakAgainst.length > 0 && <div style={{
              background: "rgba(239,68,68,0.08)", borderRadius: 10,
              padding: "10px 12px", border: "1px solid rgba(239,68,68,0.15)",
            }}>
              <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginBottom: 4 }}>⚠️ 弱點</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{e.weakAgainst.map(t => t + "系").join("、")}</div>
            </div>}
            {e.resistAgainst.length > 0 && <div style={{
              background: "rgba(34,197,94,0.08)", borderRadius: 10,
              padding: "10px 12px", border: "1px solid rgba(34,197,94,0.15)",
            }}>
              <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginBottom: 4 }}>🛡️ 抗性</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{e.resistAgainst.map(t => t + "系").join("、")}</div>
            </div>}
          </div>

          {/* Drops */}
          {e.drops && e.drops.length > 0 && <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 10,
            padding: "10px 12px", marginBottom: 12,
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ fontSize: 10, opacity: 0.4 }}>🎁 掉落物</div>
            <div style={{ display: "flex", gap: 6 }}>
              {e.drops.map((d, i) => <span key={i} style={{ fontSize: 20 }}>{d}</span>)}
            </div>
          </div>}

          {/* Battle record */}
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 10,
            padding: "10px 12px", border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", gap: 16, justifyContent: "center",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#6366f1" }}>{enc[e.key] || 0}</div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>遭遇次數</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e" }}>{def[e.key] || 0}</div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>擊敗次數</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b" }}>
                {(enc[e.key] || 0) > 0 ? Math.round((def[e.key] || 0) / enc[e.key] * 100) : 0}%
              </div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>擊敗率</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, color, sub }) {
  return (
    <div style={{
      flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 10,
      padding: "8px 6px", textAlign: "center",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>
      {value !== "" && <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>}
      {sub && <div style={{ fontSize: 10, fontWeight: 600, color, lineHeight: 1.3 }}>{sub}</div>}
      <div style={{ fontSize: 9, opacity: 0.4, marginTop: 1 }}>{label}</div>
    </div>
  );
}

// ── Section divider ──
function SectionDivider({ icon, label, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 8px", padding: "0 2px" }}>
      <div style={{ fontSize: 16 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, opacity: 0.35 }}>{sub}</div>}
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)", marginLeft: 4 }} />
    </div>
  );
}

// ── Starter detail overlay ──
function StarterDetailModal({ entry, onClose }) {
  const e = entry;
  const tc = TYPE_COLORS[e.mType] || "#6366f1";

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, animation: "fadeIn 0.2s ease",
    }}>
      <div onClick={ev => ev.stopPropagation()} style={{
        width: "100%", maxWidth: 380, maxHeight: "90%",
        background: "linear-gradient(180deg,#1e1b4b,#0f172a)",
        borderRadius: 20, border: `2px solid ${tc}33`,
        boxShadow: `0 8px 40px ${tc}22, 0 0 80px ${tc}11`,
        overflowY: "auto", WebkitOverflowScrolling: "touch",
        animation: "popIn 0.3s ease",
      }}>
        {/* Top banner */}
        <div style={{
          position: "relative", padding: "28px 20px 16px", textAlign: "center",
          background: `radial-gradient(ellipse at 50% 80%, ${tc}18, transparent 70%)`,
        }}>
          <button onClick={onClose} style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "white", fontSize: 16, fontWeight: 700, width: 32, height: 32,
            borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>

          {/* Stage label */}
          <div style={{ fontSize: 12, color: tc, fontWeight: 700, letterSpacing: 2, marginBottom: 8, opacity: 0.8 }}>
            {["⭐", "⭐⭐", "⭐⭐⭐"][e.stageIdx]} {e.stageLabel}
          </div>

          {/* Large sprite */}
          <div style={{
            display: "inline-block", position: "relative",
            filter: `drop-shadow(0 0 20px ${tc}55)`,
            animation: "float 3s ease-in-out infinite",
          }}>
            <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={160} />
          </div>

          {/* Name + type */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2, textShadow: `0 0 20px ${tc}55` }}>{e.name}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{
                background: `${tc}25`, border: `1px solid ${tc}44`,
                padding: "3px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: tc,
              }}>{e.typeIcon} {e.typeName}系</span>
              <span style={{
                background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)",
                padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#a5b4fc",
              }}>{e.skill}</span>
            </div>
          </div>
        </div>

        {/* Info sections */}
        <div style={{ padding: "0 18px 20px" }}>

          {/* Description */}
          {e.desc && <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 12,
            padding: "12px 14px", marginBottom: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 4 }}>📖 圖鑑說明</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.8 }}>{e.desc}</div>
          </div>}

          {/* Moves */}
          {e.moves && e.moves.length > 0 && <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 12,
            padding: "12px 14px", marginBottom: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 8 }}>🎯 專屬招式</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {e.moves.map((m, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "8px 10px",
                  border: `1px solid ${m.color}22`,
                }}>
                  <div style={{ fontSize: 20 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.name}</div>
                    <div style={{ fontSize: 9, opacity: 0.4 }}>{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

const backBtn = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
