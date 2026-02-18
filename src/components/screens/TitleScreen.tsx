import { useMemo } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters.ts';
import { VERSION } from '../../data/constants';
import type { StarterLite, StarterStage } from '../../types/game';
import { useI18n } from '../../i18n';
import { localizeStarterList } from '../../utils/contentLocalization';
import './TitleScreen.css';

type TitleStarter = StarterLite & {
  id: string;
  stages: StarterStage[];
};

type UnknownRecord = Record<string, unknown>;
type TitleAction = () => void;

type TitleScreenProps = {
  onStartNormal: TitleAction;
  onStartTimed: TitleAction;
  onStartCoop: TitleAction;
  onStartPvp: TitleAction;
  onLeaderboard: TitleAction;
  onAchievements: TitleAction;
  onEncyclopedia: TitleAction;
  onDashboard: TitleAction;
  onDailyChallenge: TitleAction;
  onSettings: TitleAction;
  lowPerfMode?: boolean;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isStarterStage(value: unknown): value is StarterStage {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.emoji === 'string' &&
    typeof value.svgFn === 'function'
  );
}

function isTitleStarter(value: unknown): value is TitleStarter {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.name !== 'string') return false;
  if (typeof value.c1 !== 'string' || typeof value.c2 !== 'string') return false;
  if (!Array.isArray(value.stages) || value.stages.length === 0) return false;
  return value.stages.every(isStarterStage);
}

function normalizeTitleStarters(value: unknown): TitleStarter[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isTitleStarter);
}

export default function TitleScreen({
  onStartNormal,
  onStartTimed,
  onStartCoop,
  onStartPvp,
  onLeaderboard,
  onAchievements,
  onEncyclopedia,
  onDashboard,
  onDailyChallenge,
  onSettings,
  lowPerfMode = false,
}: TitleScreenProps) {
  const { t, locale } = useI18n();
  const starters = useMemo(
    () => normalizeTitleStarters(localizeStarterList(STARTERS, locale)),
    [locale],
  );
  const row1 = starters.slice(0, 3);
  const row2 = starters.slice(3);
  const versionText = String(VERSION);

  const featureButtons = [
    { icon: '🏆', label: t('title.feature.leaderboard', 'Leaderboard'), fn: onLeaderboard, aria: t('a11y.title.openLeaderboard', 'Open leaderboard') },
    { icon: '⭐', label: t('title.feature.achievements', 'Achievements'), fn: onAchievements, aria: t('a11y.title.openAchievements', 'Open achievements') },
    { icon: '📚', label: t('title.feature.encyclopedia', 'Encyclopedia'), fn: onEncyclopedia, aria: t('a11y.title.openEncyclopedia', 'Open encyclopedia') },
    { icon: '📊', label: t('title.feature.dashboard', 'Parent Dashboard'), fn: onDashboard, aria: t('a11y.title.openDashboard', 'Open parent dashboard') },
    { icon: '🗓️', label: t('title.feature.daily', 'Daily Challenge'), fn: onDailyChallenge, aria: t('a11y.title.openDailyChallenge', 'Open daily challenge') },
    { icon: '⚙️', label: t('title.feature.settings', 'Settings'), fn: onSettings, aria: t('a11y.title.openSettings', 'Open settings') },
  ];

  return (
    <main className={`title-screen${lowPerfMode ? ' is-low-perf' : ''}`}>
      <div className="title-star title-star-one">⭐</div>
      <div className="title-star title-star-two">✨</div>
      <div className="title-star title-star-three">⭐</div>

      <div className="title-hero">
        <div className="title-sprite-row title-sprite-row-top">
          {row1.map((s, i) => (
            <div key={s.id} className={`title-monster-float title-monster-float-${i}`}>
              <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={60} ariaLabel={`${s.name} ${t('a11y.sprite.default', 'Monster sprite')}`} />
            </div>
          ))}
        </div>
        <div className="title-sprite-row title-sprite-row-bottom">
          {row2.map((s, i) => (
            <div key={s.id} className={`title-monster-float title-monster-float-${i + 3}`}>
              <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={60} ariaLabel={`${s.name} ${t('a11y.sprite.default', 'Monster sprite')}`} />
            </div>
          ))}
        </div>
        <h1 className="title-game-name">{t('title.gameName', 'Math Monster')}</h1>
        <div className="title-tagline">{t('title.tagline', 'Math Monster Battle')}</div>
      </div>

      <section className="title-actions" aria-label="Game start actions">
        <div className="title-action-row">
          <button className="title-action-btn title-action-btn-normal touch-btn" onClick={onStartNormal} aria-label={t('a11y.title.startNormal', 'Start normal mode')}>
            ⚔️ {t('title.mode.normal', 'Normal')}
          </button>
          <button className="title-action-btn title-action-btn-timed touch-btn" onClick={onStartTimed} aria-label={t('a11y.title.startTimed', 'Start timed mode')}>
            ⏱️ {t('title.mode.timed', 'Timed')}
          </button>
        </div>
        <div className="title-mode-grid">
          <button className="title-action-btn title-action-btn-coop touch-btn" onClick={onStartCoop} aria-label={t('a11y.title.startCoop', 'Start co-op mode')}>
            🤝 {t('title.mode.coop', 'Co-op')}
          </button>
          <button className="title-action-btn title-action-btn-pvp touch-btn" onClick={onStartPvp} aria-label={t('a11y.title.startPvp', 'Start PvP mode')}>
            ⚔️ {t('title.mode.pvp', 'PvP')}
          </button>
        </div>
        <div className="title-timed-hint">{t('title.timedHint', 'Timed mode: answer within 5 seconds')}</div>

        <div className="title-feature-grid">
          {featureButtons.map((b) => (
            <button className="title-feature-btn touch-btn" key={b.label} onClick={b.fn} aria-label={b.aria}>
              {b.icon} {b.label}
            </button>
          ))}
        </div>
      </section>

      <footer className="title-footer">
        <div>{t('title.credits.design', 'Design: Chung-Han Hsieh (ch.hsieh@mx.nthu.edu.tw)')}</div>
        <div>{t('title.credits.assist', 'Built with Claude (Anthropic)')}</div>
        <div className="title-footer-line">{t('title.credits.rights', '© 2025-2026 Chung-Han Hsieh. All rights reserved.')}</div>
        <div className="title-version">{versionText}</div>
      </footer>
    </main>
  );
}
