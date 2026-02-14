import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters';

const PAGE_BG = "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)";

export default function SelectionScreen({ onSelect, onBack }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: PAGE_BG, color: "white", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={backBtn}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>選擇你的夥伴！</div>
          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>每種屬性對應不同的數學技能</div>
        </div>
      </div>

      {/* Starter cards */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 16px 16px", gap: 8, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {STARTERS.map((s) => (
          <button key={s.id} onClick={() => onSelect(s)} style={{
            background: `linear-gradient(135deg, ${s.c1}22, ${s.c2}18)`,
            border: `1px solid ${s.c1}33`,
            borderRadius: 14, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 14,
            cursor: "pointer", textAlign: "left", color: "white",
            transition: "all 0.2s",
          }}>
            <div style={{ flexShrink: 0 }}>
              <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={72} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{s.typeIcon} {s.name}<span style={{ fontSize: 11, opacity: 0.5, marginLeft: 6 }}>{s.typeName}系</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {s.moves.slice(0, 3).map((m, j) => (
                  <div key={j} style={{ fontSize: 11, opacity: 0.6 }}>{m.icon} {m.name}（{m.desc}）</div>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const backBtn = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
