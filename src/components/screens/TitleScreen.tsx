import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters.ts';
import { VERSION } from '../../data/constants';
import { BG_IMGS, BG_IMGS_LOW } from '../../data/sprites.ts';
import type { StarterId, StarterStage } from '../../types/game';
import { useI18n } from '../../i18n';
import { localizeStarterList } from '../../utils/contentLocalization.ts';
import { getCollectionPerks, loadCollection } from '../../utils/collectionStore.ts';
import { randomInt, shuffled } from '../../utils/prng.ts';
import './TitleScreen.css';

type TitleStarter = {
  id: StarterId;
  name: string;
  c1: string;
  c2: string;
  stages: StarterStage[];
};

type UnknownRecord = Record<string, unknown>;
type TitleAction = () => void;
type TitleStarterId = TitleStarter['id'];

const TITLE_BG_POOL: readonly string[] = [
  BG_IMGS.grass,
  BG_IMGS.fire,
  BG_IMGS.water,
  BG_IMGS.electric,
  BG_IMGS.ghost,
  BG_IMGS.steel,
  BG_IMGS.dark,
  BG_IMGS.rock,
];
const TITLE_BG_POOL_LOW: readonly string[] = [
  BG_IMGS_LOW.grass,
  BG_IMGS_LOW.fire,
  BG_IMGS_LOW.water,
  BG_IMGS_LOW.electric,
  BG_IMGS_LOW.ghost,
  BG_IMGS_LOW.steel,
  BG_IMGS_LOW.dark,
  BG_IMGS_LOW.rock,
];
const TITLE_STARTER_IDS: readonly TitleStarterId[] = STARTERS
  .map((starter) => starter.id)
  .filter((id): id is TitleStarterId => typeof id === 'string');

type TitleScreenProps = {
  onStartNormal: TitleAction;
  onStartTimed: TitleAction;
  onStartCoop: TitleAction;
  onStartPvp: TitleAction;
  onHowTo: TitleAction;
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

type TitleSpriteRandomConfig = {
  order: TitleStarterId[];
  flipById: Record<TitleStarterId, boolean>;
};

function buildRandomTitleSpriteConfig(ids: readonly TitleStarterId[]): TitleSpriteRandomConfig {
  const order = shuffled(ids);
  const flipById = Object.fromEntries(order.map((id) => [id, randomInt(0, 1) === 1])) as Record<TitleStarterId, boolean>;
  return {
    order,
    flipById,
  };
}

export default function TitleScreen({
  onStartNormal,
  onStartTimed,
  onStartCoop,
  onStartPvp,
  onHowTo,
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
  const titleRandomConfig = useMemo(() => {
    const pool = lowPerfMode ? TITLE_BG_POOL_LOW : TITLE_BG_POOL;
    const bgIdx = pool.length > 1 ? randomInt(0, pool.length - 1) : 0;
    return {
      titleBgImage: pool[bgIdx] || '',
      spriteRandomConfig: buildRandomTitleSpriteConfig(TITLE_STARTER_IDS),
    };
  }, [lowPerfMode]);
  const titleBgImage = titleRandomConfig.titleBgImage;
  const spriteRandomConfig = titleRandomConfig.spriteRandomConfig;
  const titleStyle = useMemo<CSSProperties>(() => ({
    backgroundImage: titleBgImage
      ? `linear-gradient(180deg, rgba(7, 12, 26, 0.86) 0%, rgba(17, 24, 39, 0.8) 42%, rgba(30, 27, 75, 0.82) 100%), radial-gradient(140% 120% at 20% 10%, rgba(59, 130, 246, 0.18), rgba(15, 23, 42, 0) 55%), url("${titleBgImage}")`
      : 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
    backgroundSize: 'cover, cover, cover',
    backgroundPosition: 'center, center, center',
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
  }), [titleBgImage]);
  const startersById = useMemo(() => new Map(starters.map((starter) => [starter.id, starter])), [starters]);
  const randomizedStarters = useMemo(
    () => spriteRandomConfig.order
      .map((id) => startersById.get(id))
      .filter((starter): starter is TitleStarter => Boolean(starter)),
    [spriteRandomConfig.order, startersById],
  );
  const row1 = randomizedStarters.slice(0, 3);
  const row2 = randomizedStarters.slice(3);
  const collectionPerks = useMemo(() => getCollectionPerks(loadCollection()), []);
  const activeTitle = collectionPerks.unlockedTitles.length > 0
    ? collectionPerks.unlockedTitles[collectionPerks.unlockedTitles.length - 1]
    : null;
  const activeTitleText = activeTitle
    ? t(activeTitle.nameKey, activeTitle.nameFallback)
    : t('title.playerTitle.none', 'No title yet');
  const versionText = String(VERSION);

  const featureButtons = [
    { icon: '🏆', label: t('title.feature.leaderboard', 'Leaderboard'), fn: onLeaderboard, aria: t('a11y.title.openLeaderboard', 'Open leaderboard') },
    { icon: '⭐', label: t('title.feature.achievements', 'Achievements'), fn: onAchievements, aria: t('a11y.title.openAchievements', 'Open achievements') },
    { icon: '📚', label: t('title.feature.encyclopedia', 'Encyclopedia'), fn: onEncyclopedia, aria: t('a11y.title.openEncyclopedia', 'Open encyclopedia') },
    { icon: '📊', label: t('title.feature.dashboard', 'Parent Dashboard'), fn: onDashboard, aria: t('a11y.title.openDashboard', 'Open parent dashboard') },
    { icon: '🗓️', label: t('title.feature.daily', 'Daily Challenge'), fn: onDailyChallenge, aria: t('a11y.title.openDailyChallenge', 'Open daily challenge') },
  ];

  return (
    <main className={`title-screen${lowPerfMode ? ' is-low-perf' : ''}`} style={titleStyle}>
      <div className="title-star title-star-main">✨</div>
      <div className="title-quick-actions">
        <button
          className="title-quick-btn touch-btn"
          onClick={onHowTo}
          aria-label={t('a11y.title.openHowTo', 'Open game guide')}
          title={t('title.feature.howto', 'How to Play')}
        >
          ℹ️
        </button>
        <button
          className="title-quick-btn touch-btn"
          onClick={onSettings}
          aria-label={t('a11y.title.openSettings', 'Open settings')}
          title={t('title.feature.settings', 'Settings')}
        >
          ⚙️
        </button>
      </div>

      <div className="title-hero">
        <div className="title-sprite-row title-sprite-row-top">
          {row1.map((s, i) => (
            <div key={s.id} className={`title-monster-float title-monster-float-${i}`}>
              <div className={`title-monster-face${spriteRandomConfig.flipById[s.id] ? ' is-flipped' : ''}`}>
                <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={60} ariaLabel={`${s.name} ${t('a11y.sprite.default', 'Monster sprite')}`} />
              </div>
            </div>
          ))}
        </div>
        <div className="title-sprite-row title-sprite-row-bottom">
          {row2.map((s, i) => (
            <div key={s.id} className={`title-monster-float title-monster-float-${i + 3}`}>
              <div className={`title-monster-face${spriteRandomConfig.flipById[s.id] ? ' is-flipped' : ''}`}>
                <MonsterSprite svgStr={s.stages[0].svgFn(s.c1, s.c2)} size={60} ariaLabel={`${s.name} ${t('a11y.sprite.default', 'Monster sprite')}`} />
              </div>
            </div>
          ))}
        </div>
        <h1 className="title-game-name">{t('title.gameName', 'Math Monster')}</h1>
        <div className="title-tagline">{t('title.tagline', 'Math Monster Battle')}</div>
        <div className="title-player-title">🏷️ {t('title.playerTitle.label', 'Title')}: {activeTitleText}</div>
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
