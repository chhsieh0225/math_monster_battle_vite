import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters.ts';
import { VERSION } from '../../data/constants';
import type { StarterLite, StarterStage } from '../../types/game';
import { useI18n } from '../../i18n';
import { localizeStarterList } from '../../utils/contentLocalization';

type TitleStarter = StarterLite & {
  id: string;
  stages: StarterStage[];
};

type TitleAction = () => void;

type TitleScreenProps = {
  onStartNormal: TitleAction;
  onStartTimed: TitleAction;
  onStartCoop: TitleAction;
  onStartPvp: TitleAction;
  onLeaderboard: TitleAction;
  onAchievements: TitleAction;
  onEncyclopedia: TitleAction;
  onCollection: TitleAction;
  onDashboard: TitleAction;
  onDailyChallenge: TitleAction;
  onSettings: TitleAction;
  lowPerfMode?: boolean;
};

export default function TitleScreen({
  onStartNormal,
  onStartTimed,
  onStartCoop,
  onStartPvp,
  onLeaderboard,
  onAchievements,
  onEncyclopedia,
  onCollection,
  onDashboard,
  onDailyChallenge,
  onSettings,
  lowPerfMode = false,
}: TitleScreenProps) {
  const { t, locale } = useI18n();
  const starters = useMemo(
    () => localizeStarterList(STARTERS, locale) as TitleStarter[],
    [locale],
  );
  const row1 = starters.slice(0, 3);
  const row2 = starters.slice(3);
  const versionText = String(VERSION);

  const featureButtons = [
    { icon: '🏆', label: t('title.feature.leaderboard', 'Leaderboard'), fn: onLeaderboard, aria: t('a11y.title.openLeaderboard', 'Open leaderboard') },
    { icon: '⭐', label: t('title.feature.achievements', 'Achievements'), fn: onAchievements, aria: t('a11y.title.openAchievements', 'Open achievements') },
    { icon: '📚', label: t('title.feature.encyclopedia', 'Encyclopedia'), fn: onEncyclopedia, aria: t('a11y.title.openEncyclopedia', 'Open encyclopedia') },
    { icon: '🎒', label: t('title.feature.collection', 'Collection'), fn: onCollection, aria: t('a11y.title.openCollection', 'Open collection') },
    { icon: '📊', label: t('title.feature.dashboard', 'Parent Dashboard'), fn: onDashboard, aria: t('a11y.title.openDashboard', 'Open parent dashboard') },
    { icon: '🗓️', label: t('title.feature.daily', 'Daily Challenge'), fn: onDailyChallenge, aria: t('a11y.title.openDailyChallenge', 'Open daily challenge') },
    { icon: '⚙️', label: t('title.feature.settings', 'Settings'), fn: onSettings, aria: t('a11y.title.openSettings', 'Open settings') },
  ];

  return (
    <main className="title-screen" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      background: 'linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)',
      color: 'white', padding: '24px 20px 16px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '8%', left: '12%', fontSize: 40, opacity: 0.1, animation: lowPerfMode ? 'none' : 'sparkle 3s ease infinite' }}>⭐</div>
      <div style={{ position: 'absolute', top: '18%', right: '18%', fontSize: 30, opacity: 0.06, animation: lowPerfMode ? 'none' : 'sparkle 4s ease 1s infinite' }}>✨</div>
      <div style={{ position: 'absolute', bottom: '15%', left: '8%', fontSize: 24, opacity: 0.05, animation: lowPerfMode ? 'none' : 'sparkle 5s ease 2s infinite' }}>⭐</div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 6, justifyContent: 'center' }}>
          {row1.map((s, i) => (
            <div key={s.id} style={{ animation: lowPerfMode ? 'none' : `float ${3 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }}>
              <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={60} ariaLabel={`${s.name} ${t('a11y.sprite.default', 'Monster sprite')}`} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, justifyContent: 'center' }}>
          {row2.map((s, i) => (
            <div key={s.id} style={{ animation: lowPerfMode ? 'none' : `float ${3 + (i + 3) * 0.4}s ease-in-out ${(i + 3) * 0.3}s infinite` }}>
              <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={60} ariaLabel={`${s.name} ${t('a11y.sprite.default', 'Monster sprite')}`} />
            </div>
          ))}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: 2, textShadow: '0 0 30px rgba(99,102,241,0.5)' }}>{t('title.gameName', 'Math Monster')}</h1>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.4, marginTop: 4 }}>{t('title.tagline', 'Math Monster Battle')}</div>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 320 }} aria-label="Game start actions">
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button className="title-action-btn touch-btn" onClick={onStartNormal} aria-label={t('a11y.title.startNormal', 'Start normal mode')} style={{
            flex: 1, background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            border: 'none', color: 'white', fontSize: 16, fontWeight: 800,
            padding: '14px 0', borderRadius: 14,
            boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
          }}>⚔️ {t('title.mode.normal', 'Normal')}</button>
          <button className="title-action-btn touch-btn" onClick={onStartTimed} aria-label={t('a11y.title.startTimed', 'Start timed mode')} style={{
            flex: 1, background: 'linear-gradient(135deg,#ef4444,#f59e0b)',
            border: 'none', color: 'white', fontSize: 16, fontWeight: 800,
            padding: '14px 0', borderRadius: 14,
            boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
          }}>⏱️ {t('title.mode.timed', 'Timed')}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
          <button className="title-action-btn touch-btn" onClick={onStartCoop} aria-label={t('a11y.title.startCoop', 'Start co-op mode')} style={{
            width: '100%', background: 'linear-gradient(135deg,#0ea5e9,#22d3ee)',
            border: 'none', color: 'white', fontSize: 14, fontWeight: 800,
            padding: '12px 0', borderRadius: 14,
            boxShadow: '0 4px 20px rgba(14,165,233,0.28)',
          }}>🤝 {t('title.mode.coop', 'Co-op')}</button>
          <button className="title-action-btn touch-btn" onClick={onStartPvp} aria-label={t('a11y.title.startPvp', 'Start PvP mode')} style={{
            width: '100%', background: 'linear-gradient(135deg,#ec4899,#f43f5e)',
            border: 'none', color: 'white', fontSize: 14, fontWeight: 800,
            padding: '12px 0', borderRadius: 14,
            boxShadow: '0 4px 20px rgba(244,63,94,0.25)',
          }}>⚔️ {t('title.mode.pvp', 'PvP')}</button>
        </div>
        <div style={{ fontSize: 11, opacity: 0.3, marginTop: -4 }}>{t('title.timedHint', 'Timed mode: answer within 5 seconds')}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
          {featureButtons.map((b) => (
            <button className="title-feature-btn touch-btn" key={b.label} onClick={b.fn} aria-label={b.aria} style={{
              gridColumn: 'auto',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', fontSize: 13, fontWeight: 600,
              padding: '10px 0', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            } as CSSProperties}>{b.icon} {b.label}</button>
          ))}
        </div>
      </section>

      <footer style={{ opacity: 0.2, fontSize: 10, lineHeight: 1.7 }}>
        <div>{t('title.credits.design', 'Design: Chung-Han Hsieh (ch.hsieh@mx.nthu.edu.tw)')}</div>
        <div>{t('title.credits.assist', 'Built with Claude (Anthropic)')}</div>
        <div style={{ marginTop: 2 }}>{t('title.credits.rights', '© 2025-2026 Chung-Han Hsieh. All rights reserved.')}</div>
        <div style={{ fontFamily: 'monospace', marginTop: 2 }}>{versionText}</div>
      </footer>
    </main>
  );
}
