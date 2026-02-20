import { useMemo, useState } from 'react';

import { STREAK_TOWER_BLUEPRINT } from '../../data/challengeCatalog.ts';
import { useI18n } from '../../i18n';
import type { DailyChallengePlan, StreakTowerPlan } from '../../types/challenges.ts';
import { buildDailyChallengePlan, buildStreakTowerPlan, nextDailyReset } from '../../utils/challengePlanner.ts';
import { getModifierDisplayInfo } from '../../utils/challengeModifiers.ts';
import {
  beginDailyChallengeRun,
  loadDailyChallengeProgress,
  loadTowerProgress,
  startTowerRun,
} from '../../utils/challengeProgress.ts';
import './DailyChallengeScreen.css';

type DailyChallengeScreenProps = {
  onBack: () => void;
  onStartDaily: (plan: DailyChallengePlan) => void;
  onStartTower: (plan: StreakTowerPlan) => void;
};

/** Classify a modifier tag as buff / debuff / context for chip colour. */
function modChipClass(tag: string): string {
  const fx = getModifierDisplayInfo(tag);
  if (!fx) return 'daily-mod-chip mod-context';
  // If any multiplier hurts the player → debuff (red)
  const hurts =
    (fx.enemyHpMult != null && fx.enemyHpMult > 1) ||
    (fx.enemyAtkMult != null && fx.enemyAtkMult > 1) ||
    (fx.timerMult != null && fx.timerMult < 1);
  // If any multiplier helps the player → buff (green)
  const helps =
    (fx.playerDamageMult != null && fx.playerDamageMult > 1) ||
    (fx.comboScaleMult != null && fx.comboScaleMult > 1) ||
    (fx.enemyHpMult != null && fx.enemyHpMult < 1);
  if (hurts && !helps) return 'daily-mod-chip mod-debuff';
  if (helps && !hurts) return 'daily-mod-chip mod-buff';
  // Mixed effects (e.g. precision: +dmg but -time) → debuff to signal challenge
  if (hurts) return 'daily-mod-chip mod-debuff';
  return 'daily-mod-chip mod-buff';
}

/** Filter out tower-internal tags that are noise in the UI. */
function visibleTags(tags: readonly string[]): string[] {
  return tags.filter((t) => !t.startsWith('tower-floor-') && !t.startsWith('tower-difficulty-'));
}

function statusClass(status: string): string {
  if (status === 'cleared') return 'daily-status is-cleared';
  if (status === 'failed') return 'daily-status is-failed';
  if (status === 'in_progress') return 'daily-status is-progress';
  return 'daily-status';
}

export default function DailyChallengeScreen({
  onBack,
  onStartDaily,
  onStartTower,
}: DailyChallengeScreenProps) {
  const { locale, t } = useI18n();
  const [dailyProgress, setDailyProgress] = useState(() => loadDailyChallengeProgress());
  const [towerProgress, setTowerProgress] = useState(() => loadTowerProgress());
  const dailyPlan = useMemo(() => buildDailyChallengePlan(), []);
  const towerPlan = useMemo(
    () => buildStreakTowerPlan({
      runId: towerProgress.currentRunId || undefined,
      startFloor: towerProgress.currentFloor,
      floorCount: 3,
    }),
    [towerProgress.currentRunId, towerProgress.currentFloor],
  );

  const todayRun = dailyProgress.runs[dailyPlan.dateKey] || null;
  const dailyStatus = todayRun?.status || 'idle';
  const dailyStatusLabel = dailyStatus === 'cleared'
    ? t('daily.status.cleared', 'Cleared')
    : dailyStatus === 'failed'
      ? t('daily.status.failed', 'Failed')
    : dailyStatus === 'in_progress'
      ? t('daily.status.inProgress', 'In Progress')
      : t('daily.status.idle', 'Not Started');
  const resetAt = nextDailyReset().toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleStartDaily = () => {
    const next = beginDailyChallengeRun(dailyPlan);
    setDailyProgress(next);
    onStartDaily(dailyPlan);
  };

  const handleEnterTower = () => {
    const nextProgress = towerProgress.currentRunId
      ? loadTowerProgress()
      : startTowerRun(Math.max(1, towerProgress.currentFloor));
    setTowerProgress(nextProgress);
    const nextPlan = buildStreakTowerPlan({
      runId: nextProgress.currentRunId || undefined,
      startFloor: nextProgress.currentFloor,
      floorCount: 3,
    });
    onStartTower(nextPlan);
  };

  const towerActionLabel = towerProgress.currentRunId
    ? t('daily.tower.continue', 'Continue Tower')
    : t('daily.tower.start', 'Start Tower Run');

  return (
    <main className="daily-screen">
      <header className="daily-header">
        <button
          className="daily-back-btn"
          onClick={onBack}
          aria-label={t('a11y.common.backToTitle', 'Back to title')}
        >
          ←
        </button>
        <div className="daily-header-text">
          <h1 className="daily-title">
            🗓️ {t('daily.title', 'Daily Challenge')}
          </h1>
          <div className="daily-subtitle">
            {t('daily.subtitle', 'Fixed daily seed + streak tower progression')}
          </div>
        </div>
      </header>

      <section className="daily-card daily-card-gap">
        <div className="daily-row daily-row-between">
          <div className="daily-card-title">{dailyPlan.label}</div>
          <div className={statusClass(dailyStatus)}>{dailyStatusLabel}</div>
        </div>
        <div className="daily-description">{dailyPlan.description}</div>
        <div className="daily-chip-row">
          <span className="daily-chip daily-chip-seed">
            {t('daily.seed', 'Seed')} {dailyPlan.seedKey}
          </span>
          <span className="daily-chip daily-chip-reset">
            {t('daily.resetAt', 'Reset at')} {resetAt}
          </span>
          <span className="daily-chip daily-chip-streak">
            {t('daily.streak', 'Streak')} {dailyProgress.streakCount}
          </span>
        </div>

        <div className="daily-battle-list">
          {dailyPlan.battles.map((battle) => (
            <div key={battle.battleSeed} className="daily-battle-item">
              <div className="daily-battle-title">
                {t('daily.battle.label', 'Battle {index}', { index: battle.index })} · {battle.label}
              </div>
              <div className="daily-battle-meta">
                ⏱️ {battle.timeLimitSec}s · {t('daily.enemy.count', 'Enemies x{count}', { count: battle.enemyCount })} · {battle.enemyTier}
              </div>
              {battle.modifierTags.length > 0 && (
                <div className="daily-modifier-row">
                  {visibleTags(battle.modifierTags).map((tag) => (
                    <span key={tag} className={modChipClass(tag)}>
                      {t(`mod.${tag}`, tag)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="touch-btn daily-action-btn daily-action-btn-primary"
          onClick={handleStartDaily}
        >
          ⚔️ {t('daily.start', 'Start Daily Challenge')}
        </button>
      </section>

      <section className="daily-card">
        <div className="daily-row daily-row-between">
          <div className="daily-card-title">
            🏯 {t('daily.tower.title', 'Streak Tower')} · {STREAK_TOWER_BLUEPRINT.label}
          </div>
          <div className="daily-floor-label">
            {t('daily.tower.floor', 'F{floor}', { floor: towerProgress.currentFloor })}
          </div>
        </div>

        <div className="daily-stat-grid">
          <StatCard label={t('daily.tower.best', 'Best')} value={String(towerProgress.bestFloor)} />
          <StatCard label={t('daily.tower.winStreak', 'Win Streak')} value={String(towerProgress.winStreak)} />
          <StatCard label={t('daily.tower.totalClears', 'Clears')} value={String(towerProgress.totalClears)} />
        </div>

        <div className="daily-floor-list">
          {towerPlan.floors.map((floor) => {
            const floorTags = visibleTags(floor.battle.modifierTags);
            return (
              <div key={floor.floorSeed} className="daily-floor-item">
                <div>
                  <b>F{floor.floor}</b> · {floor.battle.label}
                </div>
                <div className="daily-floor-meta">
                  ⏱️{floor.battle.timeLimitSec}s · 👾x{floor.battle.enemyCount} · 🧠{floor.battle.difficulty.toUpperCase()}
                  {' · '}HP×{floor.levelScale.toFixed(2)}
                  {typeof floor.atkScale === 'number' ? ` · ATK×${floor.atkScale.toFixed(2)}` : ''}
                </div>
                {floorTags.length > 0 && (
                  <div className="daily-modifier-row">
                    {floorTags.map((tag) => (
                      <span key={tag} className={modChipClass(tag)}>
                        {t(`mod.${tag}`, tag)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          className="touch-btn daily-action-btn daily-action-btn-secondary"
          onClick={handleEnterTower}
        >
          🧗 {towerActionLabel}
        </button>
      </section>
    </main>
  );
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="daily-stat-card">
      <div className="daily-stat-label">{label}</div>
      <div className="daily-stat-value">{value}</div>
    </div>
  );
}
