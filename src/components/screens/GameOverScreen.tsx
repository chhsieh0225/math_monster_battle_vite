import { useState, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent, CSSProperties } from 'react';
import { calcScore, saveScore } from '../../utils/leaderboard.ts';
import { readText, writeText } from '../../utils/storage.ts';
import type { LeaderboardEntry } from '../../types/game';
import type { DailyChallengeFeedback, TowerChallengeFeedback } from '../../types/challenges';
import { useI18n } from '../../i18n';
import './GameOverScreen.css';

type StarterMoveLite = {
  icon: string;
  color: string;
};

type GameOverStarterStageLite = {
  name: string;
};

type GameOverStarterLite = {
  id?: string;
  name?: string;
  selectedStageIdx?: number;
  stages?: GameOverStarterStageLite[];
  moves: StarterMoveLite[];
};

type GameOverScreenProps = {
  defeated: number;
  totalEnemies: number;
  tC: number;
  tW: number;
  pLvl: number;
  pStg: number;
  timedMode: boolean;
  maxStreak?: number;
  starter: GameOverStarterLite | null;
  mLvls: number[];
  getPow: (moveIdx: number) => number;
  dailyChallengeFeedback?: DailyChallengeFeedback | null;
  towerChallengeFeedback?: TowerChallengeFeedback | null;
  onRestart: () => void;
  onLeaderboard: () => void;
  onHome: () => void;
};

export default function GameOverScreen({
  defeated,
  totalEnemies,
  tC,
  tW,
  pLvl,
  pStg,
  timedMode,
  maxStreak = 0,
  starter,
  mLvls,
  getPow,
  dailyChallengeFeedback = null,
  towerChallengeFeedback = null,
  onRestart,
  onLeaderboard,
  onHome,
}: GameOverScreenProps) {
  const { t } = useI18n();
  const won = defeated >= totalEnemies;
  const finalScore = calcScore(defeated, tC, tW, pLvl, timedMode, maxStreak);
  const [lastRank, setLastRank] = useState(-1);
  const [nameSaved, setNameSaved] = useState(false);
  const [playerName, setPlayerName] = useState(() => readText('mathMonsterBattle_name', ''));
  const scoreSaved = useRef(false);
  const hasDailyFeedback = Boolean(dailyChallengeFeedback);
  const dailySuccess = dailyChallengeFeedback?.outcome === 'cleared';
  const streakDeltaPrefix = (dailyChallengeFeedback?.streakDelta || 0) > 0 ? '+' : '';
  const hasTowerFeedback = Boolean(towerChallengeFeedback);
  const towerSuccess = towerChallengeFeedback?.outcome === 'cleared';
  const towerStreakDeltaPrefix = (towerChallengeFeedback?.winStreakDelta || 0) > 0 ? '+' : '';
  const resolvedStarterStageIdx = starter
    ? Number.isFinite(pStg)
      ? Math.max(0, Math.floor(Number(pStg)))
      : Number.isFinite(starter.selectedStageIdx)
        ? Math.max(0, Math.floor(Number(starter.selectedStageIdx)))
        : 0
    : null;
  const resolvedStarterName = starter && resolvedStarterStageIdx !== null
    ? (starter.stages?.[resolvedStarterStageIdx]?.name || starter.name || '')
    : '';

  const handleSaveScore = () => {
    if (scoreSaved.current) return;
    scoreSaved.current = true;
    const acc = (tC + tW > 0) ? Math.round(tC / (tC + tW) * 100) : 0;
    const nm = playerName.trim() || '???';
    writeText('mathMonsterBattle_name', nm);
    const entry: LeaderboardEntry = {
      score: finalScore,
      name: nm,
      starterId: starter?.id || undefined,
      starterName: resolvedStarterName || undefined,
      starterStageIdx: resolvedStarterStageIdx ?? undefined,
      defeated,
      correct: tC,
      wrong: tW,
      accuracy: acc,
      level: pLvl,
      timed: timedMode,
      maxStreak,
      completed: won,
      date: new Date().toISOString(),
    };
    setLastRank(Number(saveScore(entry)));
    setNameSaved(true);
  };

  return (
    <div className={`game-over-root ${won ? 'is-win' : 'is-lose'}`}>
      <div className="game-over-icon">{won ? '🏆' : '💀'}</div>
      <h2 className="game-over-title">
        {won ? t('gameOver.winTitle', 'Stage Cleared!') : t('gameOver.loseTitle', 'Challenge Over')}
        {timedMode && (
          <span className="game-over-timed-badge">
            ⏱️ {t('gameOver.timedBadge', 'Timed')}
          </span>
        )}
      </h2>

      {hasDailyFeedback && dailyChallengeFeedback && (
        <div className={`game-over-result-card ${dailySuccess ? 'is-success' : 'is-fail'}`}>
          <div className="game-over-result-head">
            <div className="game-over-result-title">{t('daily.result.title', 'Daily Challenge Result')}</div>
            <div className={`game-over-result-outcome ${dailySuccess ? 'is-success' : 'is-fail'}`}>
              {dailySuccess ? `✅ ${t('daily.result.cleared', 'Cleared')}` : `❌ ${t('daily.result.failed', 'Failed')}`}
            </div>
          </div>
          <div className="game-over-result-stats-two">
            <div className="game-over-result-stat-box">
              <div className="game-over-result-stat-label">{t('daily.result.battles', 'Battles')}</div>
              <div className="game-over-result-stat-value">{dailyChallengeFeedback.battlesCleared}/{dailyChallengeFeedback.battlesTotal}</div>
            </div>
            <div className="game-over-result-stat-box">
              <div className="game-over-result-stat-label">{t('daily.result.streakNow', 'Streak')}</div>
              <div className="game-over-result-stat-value">{dailyChallengeFeedback.streakAfter}</div>
            </div>
          </div>
          <div className="game-over-result-meta">
            {t('daily.result.streakDelta', 'Streak Change')} {streakDeltaPrefix}{dailyChallengeFeedback.streakDelta} ({dailyChallengeFeedback.streakBefore} → {dailyChallengeFeedback.streakAfter})
          </div>
          {dailyChallengeFeedback.preservedClear && (
            <div className="game-over-result-note-warn">
              {t('daily.result.preserved', 'Today was already cleared. Streak is preserved.')}
            </div>
          )}
          {dailyChallengeFeedback.rewardLabels.length > 0 && (
            <div className="game-over-result-rewards">
              <div className="game-over-result-reward-label">{t('daily.result.rewards', 'Rewards')}</div>
              {dailyChallengeFeedback.rewardLabels.map((label, idx) => (
                <div key={`${label}-${idx}`} className="game-over-result-reward-item">
                  • {label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasTowerFeedback && towerChallengeFeedback && (
        <div className={`game-over-result-card is-tower ${towerSuccess ? 'is-success' : 'is-fail'}`}>
          <div className="game-over-result-head">
            <div className="game-over-result-title">{t('daily.tower.result.title', 'Streak Tower Result')}</div>
            <div className={`game-over-result-outcome ${towerSuccess ? 'is-tower-success' : 'is-fail'}`}>
              {towerSuccess ? `✅ ${t('daily.tower.result.cleared', 'Cleared')}` : `❌ ${t('daily.tower.result.failed', 'Failed')}`}
            </div>
          </div>
          <div className="game-over-result-stats-two">
            <div className="game-over-result-stat-box">
              <div className="game-over-result-stat-label">{t('daily.tower.result.floor', 'Cleared Floor')}</div>
              <div className="game-over-result-stat-value">{towerChallengeFeedback.floor}</div>
            </div>
            <div className="game-over-result-stat-box">
              <div className="game-over-result-stat-label">{t('daily.tower.result.nextFloor', 'Next Floor')}</div>
              <div className="game-over-result-stat-value">{towerChallengeFeedback.nextFloor}</div>
            </div>
            <div className="game-over-result-stat-box">
              <div className="game-over-result-stat-label">{t('daily.tower.result.best', 'Best Floor')}</div>
              <div className="game-over-result-stat-value">{towerChallengeFeedback.bestFloorAfter}</div>
            </div>
            <div className="game-over-result-stat-box">
              <div className="game-over-result-stat-label">{t('daily.tower.result.winStreak', 'Win Streak')}</div>
              <div className="game-over-result-stat-value">
                {towerChallengeFeedback.winStreakAfter} ({towerStreakDeltaPrefix}{towerChallengeFeedback.winStreakDelta})
              </div>
            </div>
          </div>
          {towerChallengeFeedback.checkpointReached && (
            <div className="game-over-result-note-good">
              {t('daily.tower.result.checkpoint', 'Checkpoint reached!')}
            </div>
          )}
          {towerChallengeFeedback.rewardLabels.length > 0 && (
            <div className="game-over-result-rewards">
              <div className="game-over-result-reward-label">{t('daily.result.rewards', 'Rewards')}</div>
              {towerChallengeFeedback.rewardLabels.map((label, idx) => (
                <div key={`${label}-${idx}`} className="game-over-result-reward-item">
                  • {label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="game-over-score-block">
        <div className="game-over-score-label">{t('gameOver.scoreLabel', 'Score')}</div>
        <div className="game-over-score-value">{finalScore}</div>
        {lastRank >= 0 && lastRank < 3 && (
          <div className="game-over-rank-top">
            {[
              t('gameOver.rank.top1', '🥇 New record! #1!'),
              t('gameOver.rank.top2', '🥈 #2 place!'),
              t('gameOver.rank.top3', '🥉 #3 place!'),
            ][lastRank]}
          </div>
        )}
        {lastRank >= 3 && (
          <div className="game-over-rank-generic">
            {t('gameOver.rank.generic', 'Leaderboard rank #{rank}', { rank: lastRank + 1 })}
          </div>
        )}
      </div>

      {!nameSaved ? (
        <div className="game-over-name-wrap">
          <div className="game-over-name-row">
            <input
              className="game-over-name-input"
              value={playerName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
              placeholder={t('gameOver.playerName.placeholder', 'Your name')}
              maxLength={8}
              aria-label={t('a11y.common.playerName', 'Enter player name')}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') handleSaveScore();
              }}
            />
            <button
              className="touch-btn game-over-save-btn"
              onClick={handleSaveScore}
              aria-label={t('a11y.common.saveScore', 'Save score')}
            >
              {t('gameOver.save', 'Save')}
            </button>
          </div>
        </div>
      ) : (
        <div className="game-over-saved">{t('gameOver.saved', '✅ Saved')}</div>
      )}

      <div className="game-over-stats-panel">
        <div className="game-over-stats-grid">
          <Stat value={tC} label={t('gameOver.stat.correct', 'Correct')} color="#22c55e" />
          <Stat value={tW} label={t('gameOver.stat.wrong', 'Wrong')} color="#ef4444" />
          <Stat value={maxStreak} label={t('gameOver.stat.streak', 'Streak')} color="#f97316" />
          <Stat value={defeated} label={t('gameOver.stat.defeated', 'Defeated')} color="#f59e0b" />
          <Stat value={`Lv.${pLvl}`} label={t('gameOver.stat.level', 'Level')} color="#a855f7" />
          <Stat value={`${tC + tW > 0 ? Math.round(tC / (tC + tW) * 100) : 0}%`} label={t('gameOver.stat.accuracy', 'Accuracy')} color="#38bdf8" />
        </div>
      </div>

      {starter && (
        <div className="game-over-move-levels">
          {starter.moves.map((move, idx) => (
            <div key={idx} className="game-over-move-level-item">
              <div className="game-over-move-icon">{move.icon}</div>
              <div className="game-over-move-level" style={{ '--move-color': move.color } as CSSProperties}>Lv.{mLvls[idx]}</div>
              <div className="game-over-move-power">{getPow(idx)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="game-over-actions">
        <button className="end-action-btn touch-btn game-over-action-restart" onClick={onRestart} aria-label={t('gameOver.restart', 'Retry')}>
          🔄 {t('gameOver.restart', 'Retry')}
        </button>
        <button className="end-action-btn touch-btn game-over-action-leaderboard" onClick={onLeaderboard} aria-label={t('a11y.common.openLeaderboard', 'Open leaderboard')}>
          🏆
        </button>
        <button className="end-action-btn touch-btn game-over-action-home" onClick={onHome} aria-label={t('a11y.common.goHome', 'Back to title')}>
          🏠
        </button>
      </div>
    </div>
  );
}

type StatProps = {
  value: string | number;
  label: string;
  color: string;
};

function Stat({ value, label, color }: StatProps) {
  return (
    <div className="game-over-stat">
      <div className="game-over-stat-value" style={{ '--stat-color': color } as CSSProperties}>{value}</div>
      <div className="game-over-stat-label">{label}</div>
    </div>
  );
}
