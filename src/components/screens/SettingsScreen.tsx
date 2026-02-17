/**
 * SettingsScreen — Unified runtime settings.
 * Includes performance, audio, and language controls.
 */
import type { CSSProperties } from 'react';
import { useI18n } from '../../i18n';
import type { LocaleCode } from '../../i18n';

const PAGE_BG = 'radial-gradient(120% 80% at 50% 0%, #1f2a44 0%, #131a2f 45%, #0a1020 100%)';

type PerfMode = 'auto' | 'on' | 'off';

type SettingsScreenProps = {
  onBack: () => void;
  perfMode: PerfMode;
  lowPerfMode: boolean;
  autoLowEnd: boolean;
  onSetPerfMode: (nextMode: PerfMode) => void;
  bgmMuted: boolean;
  sfxMuted: boolean;
  onSetBgmMuted: (muted: boolean) => void;
  onSetSfxMuted: (muted: boolean) => void;
};

const cardStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.05))',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 16,
  padding: '14px 14px 12px',
  textAlign: 'left',
  boxShadow: '0 10px 26px rgba(0,0,0,0.25)',
};

export default function SettingsScreen({
  onBack,
  perfMode,
  lowPerfMode,
  autoLowEnd,
  onSetPerfMode,
  bgmMuted,
  sfxMuted,
  onSetBgmMuted,
  onSetSfxMuted,
}: SettingsScreenProps) {
  const { locale, setLocale, t } = useI18n();
  const bgmOn = !bgmMuted;
  const sfxOn = !sfxMuted;
  const perfResolved = lowPerfMode
    ? t('settings.perf.resolved.low', 'Battery mode')
    : t('settings.perf.resolved.std', 'Standard mode');
  const localeLabel = locale === 'zh-TW'
    ? t('settings.locale.zhTW', 'Traditional Chinese')
    : t('settings.locale.enUS', 'English');

  return (
    <main style={{ height: '100%', display: 'flex', flexDirection: 'column', background: PAGE_BG, color: 'white', padding: '16px 12px', overflowY: 'auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="back-touch-btn" onClick={onBack} aria-label={t('a11y.settings.back', 'Back to title')} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 17, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>←</button>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.6, margin: 0 }}>⚙️ {t('settings.title', 'Settings')}</h1>
          <div style={{ fontSize: 11, opacity: 0.55 }}>{t('settings.subtitle', 'Simple controls for performance and audio')}</div>
        </div>
      </header>

      <section style={{ ...cardStyle, marginBottom: 10 }} aria-label={t('settings.bgm.title', 'Background Music')}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>🎵 {t('settings.bgm.title', 'Background Music')}</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 10 }}>{t('settings.bgm.subtitle', 'Toggle background music (saved locally)')}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

        <div style={{ marginTop: 10, fontSize: 11, color: bgmOn ? '#86efac' : '#cbd5e1', fontWeight: 700 }}>
          {bgmOn ? t('settings.bgm.statusOn', 'Status: BGM enabled') : t('settings.bgm.statusOff', 'Status: BGM muted')}
        </div>
      </section>

      <section style={{ ...cardStyle, marginBottom: 10 }} aria-label={t('settings.sfx.title', 'Sound Effects')}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>🔊 {t('settings.sfx.title', 'Sound Effects')}</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 10 }}>{t('settings.sfx.subtitle', 'Toggle battle sound effects (saved locally)')}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

        <div style={{ marginTop: 10, fontSize: 11, color: sfxOn ? '#86efac' : '#cbd5e1', fontWeight: 700 }}>
          {sfxOn ? t('settings.sfx.statusOn', 'Status: SFX enabled') : t('settings.sfx.statusOff', 'Status: SFX muted')}
        </div>
      </section>

      <section style={{ ...cardStyle, marginBottom: 10 }} aria-label={t('settings.perf.title', 'Performance')}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>🚀 {t('settings.perf.title', 'Performance')}</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 10 }}>{t('settings.perf.subtitle', 'Reduce animation/effects for better stability')}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
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

        <div style={{ marginTop: 10, fontSize: 11, color: lowPerfMode ? '#fbbf24' : '#93c5fd', fontWeight: 700 }}>
          {t('settings.perf.resolved', 'Applied: {mode}', { mode: perfResolved })}
        </div>
      </section>

      <section style={{ ...cardStyle, marginBottom: 10 }} aria-label={t('settings.locale.title', 'Language')}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>🌐 {t('settings.locale.title', 'Language')}</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 10 }}>{t('settings.locale.subtitle', 'You can switch UI language anytime')}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

        <div style={{ marginTop: 10, fontSize: 11, color: '#cbd5e1', fontWeight: 700 }}>
          {t('settings.locale.current', 'Current language: {lang}', { lang: localeLabel })}
        </div>
      </section>

      <section style={{ ...cardStyle, padding: '10px 12px', opacity: 0.82 }}>
        <div style={{ fontSize: 10, lineHeight: 1.8, opacity: 0.72 }}>
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
  const activeStyle = tone === 'green'
    ? 'linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))'
    : 'linear-gradient(135deg, rgba(100,116,139,0.9), rgba(71,85,105,0.9))';

  return (
    <button
      className="touch-btn"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      style={{
        background: active ? activeStyle : 'rgba(255,255,255,0.06)',
        color: 'white',
        border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: '10px 0',
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
      }}
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
      className="touch-btn"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      style={{
        textAlign: 'left',
        background: active
          ? 'linear-gradient(135deg, rgba(59,130,246,0.32), rgba(14,165,233,0.22))'
          : 'rgba(255,255,255,0.05)',
        border: active ? '1px solid rgba(56,189,248,0.7)' : '1px solid rgba(255,255,255,0.12)',
        color: 'white',
        borderRadius: 12,
        padding: '10px 12px',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.4 }}>{subtitle}</div>
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
      className="touch-btn"
      onClick={() => onPick(locale)}
      aria-label={ariaLabel}
      aria-pressed={active}
      style={{
        background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(168,85,247,0.25))' : 'rgba(255,255,255,0.06)',
        color: 'white',
        border: active ? '1px solid rgba(139,92,246,0.7)' : '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: '10px 0',
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
