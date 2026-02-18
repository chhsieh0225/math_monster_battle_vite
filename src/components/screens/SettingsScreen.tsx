/**
 * SettingsScreen — Unified runtime settings.
 * Includes performance, audio, and language controls.
 */
import { useI18n } from '../../i18n';
import type { LocaleCode } from '../../i18n';
import './SettingsScreen.css';

type PerfMode = 'auto' | 'on' | 'off';

type SettingsScreenProps = {
  onBack: () => void;
  perfMode: PerfMode;
  lowPerfMode: boolean;
  autoLowEnd: boolean;
  onSetPerfMode: (nextMode: PerfMode) => void;
  bgmMuted: boolean;
  bgmVolume: number;
  sfxMuted: boolean;
  onSetBgmMuted: (muted: boolean) => void;
  onSetBgmVolume: (nextVolume: number) => void;
  onSetSfxMuted: (muted: boolean) => void;
};

export default function SettingsScreen({
  onBack,
  perfMode,
  lowPerfMode,
  autoLowEnd,
  onSetPerfMode,
  bgmMuted,
  bgmVolume,
  sfxMuted,
  onSetBgmMuted,
  onSetBgmVolume,
  onSetSfxMuted,
}: SettingsScreenProps) {
  const { locale, setLocale, t } = useI18n();
  const bgmOn = !bgmMuted;
  const sfxOn = !sfxMuted;
  const bgmPercent = Math.round(Math.max(0, Math.min(100, bgmVolume * 100)));
  const perfResolved = lowPerfMode
    ? t('settings.perf.resolved.low', 'Battery mode')
    : t('settings.perf.resolved.std', 'Standard mode');
  const localeLabel = locale === 'zh-TW'
    ? t('settings.locale.zhTW', 'Traditional Chinese')
    : t('settings.locale.enUS', 'English');

  return (
    <main className="settings-root">
      <header className="settings-header">
        <button
          className="back-touch-btn settings-back-btn"
          onClick={onBack}
          aria-label={t('a11y.settings.back', 'Back to title')}
        >
          ←
        </button>
        <div className="settings-header-text">
          <h1 className="settings-title">⚙️ {t('settings.title', 'Settings')}</h1>
          <div className="settings-subtitle">{t('settings.subtitle', 'Simple controls for performance and audio')}</div>
        </div>
      </header>

      <section className="settings-card" aria-label={t('settings.bgm.title', 'Background Music')}>
        <div className="settings-card-title">🎵 {t('settings.bgm.title', 'Background Music')}</div>
        <div className="settings-card-subtitle">{t('settings.bgm.subtitle', 'Toggle background music (saved locally)')}</div>

        <div className="settings-option-grid settings-option-grid-two">
          <OptionButton
            label={t('common.on', 'On')}
            active={bgmOn}
            tone="green"
            ariaLabel={t('a11y.settings.bgmOn', 'Enable background music')}
            onClick={() => onSetBgmMuted(false)}
          />
          <OptionButton
            label={t('common.off', 'Off')}
            active={!bgmOn}
            tone="gray"
            ariaLabel={t('a11y.settings.bgmOff', 'Mute background music')}
            onClick={() => onSetBgmMuted(true)}
          />
        </div>

        <div className={`settings-status-line ${bgmOn ? 'is-on' : 'is-off'}`}>
          {bgmOn ? t('settings.bgm.statusOn', 'Status: BGM enabled') : t('settings.bgm.statusOff', 'Status: BGM muted')}
        </div>

        <div className="settings-volume-wrap">
          <div className="settings-volume-row">
            <span>{t('settings.bgm.volume', 'Volume')}</span>
            <span className="settings-volume-value">{bgmPercent}%</span>
          </div>
          <input
            className="settings-range-input"
            type="range"
            min={0}
            max={100}
            step={5}
            value={bgmPercent}
            onChange={(e) => onSetBgmVolume(Number(e.currentTarget.value) / 100)}
            aria-label={t('a11y.settings.bgmVolume', 'Adjust background music volume')}
          />
        </div>
      </section>

      <section className="settings-card" aria-label={t('settings.sfx.title', 'Sound Effects')}>
        <div className="settings-card-title">🔊 {t('settings.sfx.title', 'Sound Effects')}</div>
        <div className="settings-card-subtitle">{t('settings.sfx.subtitle', 'Toggle battle sound effects (saved locally)')}</div>

        <div className="settings-option-grid settings-option-grid-two">
          <OptionButton
            label={t('common.on', 'On')}
            active={sfxOn}
            tone="green"
            ariaLabel={t('a11y.settings.sfxOn', 'Enable sound effects')}
            onClick={() => onSetSfxMuted(false)}
          />
          <OptionButton
            label={t('common.off', 'Off')}
            active={!sfxOn}
            tone="gray"
            ariaLabel={t('a11y.settings.sfxOff', 'Mute sound effects')}
            onClick={() => onSetSfxMuted(true)}
          />
        </div>

        <div className={`settings-status-line ${sfxOn ? 'is-on' : 'is-off'}`}>
          {sfxOn ? t('settings.sfx.statusOn', 'Status: SFX enabled') : t('settings.sfx.statusOff', 'Status: SFX muted')}
        </div>
      </section>

      <section className="settings-card" aria-label={t('settings.perf.title', 'Performance')}>
        <div className="settings-card-title">🚀 {t('settings.perf.title', 'Performance')}</div>
        <div className="settings-card-subtitle">{t('settings.perf.subtitle', 'Reduce animation/effects for better stability')}</div>

        <div className="settings-option-grid settings-option-grid-one">
          <ModeButton
            title={t('settings.perf.auto.title', 'Auto')}
            subtitle={autoLowEnd ? t('settings.perf.auto.subtitle.low', 'Low-end device detected, battery mode preferred') : t('settings.perf.auto.subtitle.normal', 'Auto choose by device capability')}
            active={perfMode === 'auto'}
            ariaLabel={t('a11y.settings.perfAuto', 'Performance auto mode')}
            onClick={() => onSetPerfMode('auto')}
          />
          <ModeButton
            title={t('settings.perf.low.title', 'Battery')}
            subtitle={t('settings.perf.low.subtitle', 'Reduce heavy animation and effects')}
            active={perfMode === 'on'}
            ariaLabel={t('a11y.settings.perfLow', 'Performance battery mode')}
            onClick={() => onSetPerfMode('on')}
          />
          <ModeButton
            title={t('settings.perf.std.title', 'Standard')}
            subtitle={t('settings.perf.std.subtitle', 'Keep full visual effects')}
            active={perfMode === 'off'}
            ariaLabel={t('a11y.settings.perfStd', 'Performance standard mode')}
            onClick={() => onSetPerfMode('off')}
          />
        </div>

        <div className={`settings-status-line ${lowPerfMode ? 'is-low-perf' : 'is-std-perf'}`}>
          {t('settings.perf.resolved', 'Applied: {mode}', { mode: perfResolved })}
        </div>
      </section>

      <section className="settings-card" aria-label={t('settings.locale.title', 'Language')}>
        <div className="settings-card-title">🌐 {t('settings.locale.title', 'Language')}</div>
        <div className="settings-card-subtitle">{t('settings.locale.subtitle', 'You can switch UI language anytime')}</div>

        <div className="settings-option-grid settings-option-grid-two">
          <LocaleButton
            locale="zh-TW"
            current={locale}
            label={t('settings.locale.zhTW', 'Traditional Chinese')}
            ariaLabel={t('a11y.settings.localeZhTW', 'Switch language to Traditional Chinese')}
            onPick={setLocale}
          />
          <LocaleButton
            locale="en-US"
            current={locale}
            label={t('settings.locale.enUS', 'English')}
            ariaLabel={t('a11y.settings.localeEnUS', 'Switch language to English')}
            onPick={setLocale}
          />
        </div>

        <div className="settings-status-line">
          {t('settings.locale.current', 'Current language: {lang}', { lang: localeLabel })}
        </div>
      </section>

      <section className="settings-card settings-card-storage">
        <div className="settings-storage-lines">
          <div>{t('settings.storage.line1', '• Settings are saved in localStorage')}</div>
          <div>{t('settings.storage.line2', '• They persist after reload/reopen')}</div>
        </div>
      </section>
    </main>
  );
}

type OptionButtonProps = {
  label: string;
  active: boolean;
  tone: 'green' | 'gray';
  ariaLabel: string;
  onClick: () => void;
};

function OptionButton({ label, active, tone, ariaLabel, onClick }: OptionButtonProps) {
  const toneClass = tone === 'green'
    ? 'settings-option-btn-green'
    : 'settings-option-btn-gray';

  return (
    <button
      className={`touch-btn settings-option-btn ${toneClass} ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

type ModeButtonProps = {
  title: string;
  subtitle: string;
  active: boolean;
  ariaLabel: string;
  onClick: () => void;
};

function ModeButton({ title, subtitle, active, ariaLabel, onClick }: ModeButtonProps) {
  return (
    <button
      className={`touch-btn settings-mode-btn ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      <div className="settings-mode-title">{title}</div>
      <div className="settings-mode-subtitle">{subtitle}</div>
    </button>
  );
}

type LocaleButtonProps = {
  locale: LocaleCode;
  current: LocaleCode;
  label: string;
  ariaLabel: string;
  onPick: (next: LocaleCode) => void;
};

function LocaleButton({ locale, current, label, ariaLabel, onPick }: LocaleButtonProps) {
  const active = locale === current;
  return (
    <button
      className={`touch-btn settings-locale-btn ${active ? 'is-active' : ''}`}
      onClick={() => onPick(locale)}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
