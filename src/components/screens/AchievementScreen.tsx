import type { CSSProperties } from 'react';
import { ACHIEVEMENTS } from '../../data/achievements';
import type { AchievementDef, AchievementId } from '../../types/game';
import { useI18n } from '../../i18n';

const PAGE_BG = "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)";

type AchievementScreenProps = {
  unlockedIds?: AchievementId[];
  onBack: () => void;
};

export default function AchievementScreen({ unlockedIds = [], onBack }: AchievementScreenProps) {
  const { t } = useI18n();
  const achievements: AchievementDef[] = ACHIEVEMENTS;
  const unlocked = new Set<AchievementId>(unlockedIds);
  const total = achievements.length;
  const done = unlockedIds.length;
  const pct = Math.round(done / Math.max(1, total) * 100);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: PAGE_BG, color: "white", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button className="back-touch-btn" onClick={onBack} aria-label={t("a11y.common.backToTitle", "Back to title")} style={backBtn}>←</button>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>⭐ {t("achievement.title", "Achievements")}</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, opacity: 0.5 }}>{done}/{total}</div>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#6366f1,#a855f7)", borderRadius: 3, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px 16px", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {achievements.map((a) => {
            const ok = unlocked.has(a.id);
            return (
              <div key={a.id} style={{
                background: ok ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.025)",
                border: ok ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.05)",
                borderRadius: 12, padding: "10px 12px",
                opacity: ok ? 1 : 0.4,
                filter: ok ? "none" : "grayscale(0.8)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 22 }}>{ok ? a.icon : "🔒"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, lineHeight: 1.4 }}>{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const backBtn: CSSProperties = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
