import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { STREAK_TOWER_BLUEPRINT } from '../../data/challengeCatalog.ts';
import { useI18n } from '../../i18n';
import { buildDailyChallengePlan, buildStreakTowerPlan, nextDailyReset } from '../../utils/challengePlanner.ts';
import {
  beginDailyChallengeRun,
  loadDailyChallengeProgress,
  loadTowerProgress,
  startTowerRun,
} from '../../utils/challengeProgress.ts';

const PAGE_BG = 'linear-gradient(180deg,#0b1324 0%,#14223d 42%,#1f2a44 100%)';

const cardStyle: CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
  boxShadow: '0 10px 30px rgba(0,0,0,0.26)',
  padding: '12px 12px 10px',
};

type DailyChallengeScreenProps = {
  onBack: () => void;
  onStartDaily: () => void;
  onStartTower: () => void;
};

function statusTone(status: string): string {
  if (status === 'cleared') return '#22c55e';
  if (status === 'in_progress') return '#f59e0b';
  return '#94a3b8';
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
    onStartDaily();
  };

  const handleEnterTower = () => {
    const next = towerProgress.currentRunId
      ? loadTowerProgress()
      : startTowerRun(Math.max(1, towerProgress.currentFloor));
    setTowerProgress(next);
    onStartTower();
  };

  const towerActionLabel = towerProgress.currentRunId
    ? t('daily.tower.continue', 'Continue Tower')
    : t('daily.tower.start', 'Start Tower Run');

  return (
    <main
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: PAGE_BG,
        color: 'white',
        padding: '14px 12px 12px',
        overflow: 'auto',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button
          className="back-touch-btn"
          onClick={onBack}
          aria-label={t('a11y.common.backToTitle', 'Back to title')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)',
            color: 'white',
            fontWeight: 800,
            fontSize: 17,
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
            🗓️ {t('daily.title', 'Daily Challenge')}
          </h1>
          <div style={{ fontSize: 11, opacity: 0.66 }}>
            {t('daily.subtitle', 'Fixed daily seed + streak tower progression')}
          </div>
        </div>
      </header>

      <section style={{ ...cardStyle, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{dailyPlan.label}</div>
          <div style={{ fontSize: 11, color: statusTone(dailyStatus), fontWeight: 800 }}>{dailyStatusLabel}</div>
        </div>
        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>{dailyPlan.description}</div>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 10, opacity: 0.85, background: 'rgba(59,130,246,0.22)', borderRadius: 999, padding: '2px 8px' }}>
            {t('daily.seed', 'Seed')} {dailyPlan.seedKey}
          </span>
          <span style={{ fontSize: 10, opacity: 0.85, background: 'rgba(245,158,11,0.2)', borderRadius: 999, padding: '2px 8px' }}>
            {t('daily.resetAt', 'Reset at')} {resetAt}
          </span>
          <span style={{ fontSize: 10, opacity: 0.85, background: 'rgba(34,197,94,0.2)', borderRadius: 999, padding: '2px 8px' }}>
            {t('daily.streak', 'Streak')} {dailyProgress.streakCount}
          </span>
        </div>

        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
          {dailyPlan.battles.map((battle) => (
            <div
              key={battle.battleSeed}
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(15,23,42,0.5)',
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                {t('daily.battle.label', 'Battle {index}', { index: battle.index })} · {battle.label}
              </div>
              <div style={{ marginTop: 3, fontSize: 10, opacity: 0.76 }}>
                ⏱️ {battle.timeLimitSec}s · {t('daily.enemy.count', 'Enemies x{count}', { count: battle.enemyCount })} · {battle.enemyTier}
              </div>
            </div>
          ))}
        </div>

        <button
          className="touch-btn"
          onClick={handleStartDaily}
          style={{
            marginTop: 10,
            width: '100%',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: 'white',
            padding: '11px 0',
            fontSize: 14,
            fontWeight: 900,
            boxShadow: '0 8px 20px rgba(99,102,241,0.35)',
          }}
        >
          ⚔️ {t('daily.start', 'Start Daily Challenge')}
        </button>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>
            🏯 {t('daily.tower.title', 'Streak Tower')} · {STREAK_TOWER_BLUEPRINT.label}
          </div>
          <div style={{ fontSize: 11, opacity: 0.72 }}>
            {t('daily.tower.floor', 'F{floor}', { floor: towerProgress.currentFloor })}
          </div>
        </div>

        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <StatCard label={t('daily.tower.best', 'Best')} value={String(towerProgress.bestFloor)} />
          <StatCard label={t('daily.tower.winStreak', 'Win Streak')} value={String(towerProgress.winStreak)} />
          <StatCard label={t('daily.tower.totalClears', 'Clears')} value={String(towerProgress.totalClears)} />
        </div>

        <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
          {towerPlan.floors.map((floor) => (
            <div
              key={floor.floorSeed}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(15,23,42,0.5)',
                padding: '7px 9px',
                fontSize: 11,
              }}
            >
              <b>F{floor.floor}</b> · {floor.battle.label} · ⏱️{floor.battle.timeLimitSec}s
            </div>
          ))}
        </div>

        <button
          className="touch-btn"
          onClick={handleEnterTower}
          style={{
            marginTop: 10,
            width: '100%',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg,#0ea5e9,#22d3ee)',
            color: 'white',
            padding: '11px 0',
            fontSize: 14,
            fontWeight: 900,
            boxShadow: '0 8px 20px rgba(14,165,233,0.28)',
          }}
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
    <div
      style={{
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(15,23,42,0.55)',
        padding: '7px 8px',
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.7 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 13, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
