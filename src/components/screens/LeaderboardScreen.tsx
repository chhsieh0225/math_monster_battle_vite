import { loadScores } from '../../utils/leaderboard.ts';
import type { LeaderboardEntry } from '../../types/game';
import { useI18n } from '../../i18n';
import { localizeStarterDisplayName } from '../../utils/contentLocalization.ts';
import './LeaderboardScreen.css';

type LeaderboardScreenProps = {
  totalEnemies: number;
  onBack: () => void;
};

export default function LeaderboardScreen({ totalEnemies, onBack }: LeaderboardScreenProps) {
  const { t, locale } = useI18n();
  const scores: LeaderboardEntry[] = loadScores();
  return (
    <div className="leaderboard-screen">
      {/* Header */}
      <div className="leaderboard-header">
        <button className="back-touch-btn leaderboard-back-btn" onClick={onBack} aria-label={t("a11y.common.backToTitle", "Back to title")}>←</button>
        <div className="leaderboard-title">🏆 {t("leaderboard.title", "Leaderboard")}</div>
      </div>

      {/* Content */}
      <div className="leaderboard-list-wrap">
        {scores.length === 0
          ? <div className="leaderboard-empty">{t("leaderboard.empty", "No records yet. Start a run!")}</div>
          : scores.map((s, i) => {
              const d = new Date(s.date);
              const ds = `${d.getMonth() + 1}/${d.getDate()}`;
              const starterName = String(localizeStarterDisplayName(
                s.starterName,
                s.starterId,
                locale,
                s.starterStageIdx ?? null,
              ) || '');
              const rowClass = i === 0 ? "leaderboard-row is-first" : i < 3 ? "leaderboard-row is-top" : "leaderboard-row";
              const rankClass = i === 0
                ? "leaderboard-rank is-first"
                : i === 1
                  ? "leaderboard-rank is-second"
                  : i === 2
                    ? "leaderboard-rank is-third"
                    : "leaderboard-rank is-other";
              return (
                <div key={s.date + "_" + i} className={rowClass}>
                  <div className={rankClass}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}`}
                  </div>
                  <div className="leaderboard-main">
                    <div className="leaderboard-name">{s.name || t("leaderboard.playerUnknown", "???")}</div>
                    <div className="leaderboard-score-row">
                      <span className="leaderboard-score">{s.score}</span>
                      {s.timed && <span className="leaderboard-badge leaderboard-badge-timed">⏱️</span>}
                      {s.completed && <span className="leaderboard-badge leaderboard-badge-complete">👑</span>}
                    </div>
                    <div className="leaderboard-stat-line">
                      {t("leaderboard.statLine", "Monsters {defeated}/{total} · Accuracy {accuracy}% · Lv.{level}", { defeated: s.defeated, total: totalEnemies, accuracy: s.accuracy, level: s.level })}
                    </div>
                    <div className="leaderboard-starter-line">
                      {t("leaderboard.starterLine", "Starter: {name}", {
                        name: starterName || t("leaderboard.starterUnknown", "Not recorded"),
                      })}
                    </div>
                  </div>
                  <div className="leaderboard-date">{ds}</div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
