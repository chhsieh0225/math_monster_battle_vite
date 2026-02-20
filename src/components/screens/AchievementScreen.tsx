import { ACHIEVEMENTS } from '../../data/achievements';
import type { AchievementDef, AchievementId } from '../../types/game';
import { useI18n } from '../../i18n';
import './AchievementScreen.css';

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

  return (
    <div className="achievement-screen">
      {/* Header */}
      <div className="achievement-header">
        <div className="achievement-head-row">
          <button className="back-touch-btn achievement-back-btn" onClick={onBack} aria-label={t("a11y.common.backToTitle", "Back to title")}>←</button>
          <div className="achievement-title">⭐ {t("achievement.title", "Achievements")}</div>
          <div className="achievement-head-spacer" />
          <div className="achievement-count">{done}/{total}</div>
        </div>
        <progress
          className="achievement-progress"
          value={done}
          max={Math.max(1, total)}
          aria-label={t("achievement.progress", "Achievement progress")}
        />
      </div>

      {/* Grid */}
      <div className="achievement-grid-wrap">
        <div className="achievement-grid">
          {achievements.map((a) => {
            const ok = unlocked.has(a.id);
            const cardClass = ok ? "achievement-card is-unlocked" : "achievement-card is-locked";
            return (
              <div key={a.id} className={cardClass}>
                <div className="achievement-card-head">
                  <span className="achievement-card-icon">{ok ? a.icon : "🔒"}</span>
                  <span className="achievement-card-name">{t(`ach.${a.id}.name`, a.name)}</span>
                </div>
                <div className="achievement-card-desc">{t(`ach.${a.id}.desc`, a.desc)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
