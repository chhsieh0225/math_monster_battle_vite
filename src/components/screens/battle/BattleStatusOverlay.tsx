import { memo } from 'react';
import { BALANCE_CONFIG } from '../../../data/balanceConfig.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type BattleStatusOverlayProps = {
  t: Translator;
  lowPerfMode: boolean;
  streak: number;
  passiveCount: number;
  specDef: boolean;
  timedMode: boolean;
  diffLevel: number;
  chargeDisplay: number;
  chargeReadyDisplay: boolean;
  bossPhase: number;
  specDefToneClass: string;
  specDefReadyLabel: string;
  bossCharging: boolean;
};

export const BattleStatusOverlay = memo(function BattleStatusOverlay({
  t,
  lowPerfMode,
  streak,
  passiveCount,
  specDef,
  timedMode,
  diffLevel,
  chargeDisplay,
  chargeReadyDisplay,
  bossPhase,
  specDefToneClass,
  specDefReadyLabel,
  bossCharging,
}: BattleStatusOverlayProps) {
  return (
    <div className="battle-status-dock">
      <div className={`battle-top-right-stack ${lowPerfMode ? 'low-perf' : ''}`} aria-live="polite" aria-atomic="true">
        {streak >= 2 && <div className="battle-pill is-streak">🔥 {t('battle.streak', '{count} combo!', { count: streak })}</div>}
        {passiveCount >= 1 && !specDef && <div className="battle-pill is-passive">🛡️ {passiveCount}/8</div>}
        {timedMode && streak < 2 && <div className="battle-pill is-timed">⏱️ {t('battle.timed', 'Timed')}</div>}
        {diffLevel !== 2 && (
          <div className={`battle-pill ${diffLevel > 2 ? 'is-diff-up' : 'is-diff-down'}`}>
            {diffLevel > 2
              ? t('battle.diff.up', '📈 Difficulty +{value}', { value: diffLevel - 2 })
              : t('battle.diff.down', '📉 Difficulty {value}', { value: diffLevel - 2 })}
          </div>
        )}
      </div>

      <div className={`battle-charge-meter ${lowPerfMode ? 'low-perf' : ''}`}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`battle-charge-dot ${i < chargeDisplay ? 'is-on' : ''} ${!lowPerfMode && i < chargeDisplay ? 'is-glow' : ''}`}
          />
        ))}
        {chargeReadyDisplay && <span className="battle-charge-max">{t('battle.charge.max', 'MAX!')}</span>}
      </div>

      <div className="battle-left-badge-stack" aria-live="polite" aria-atomic="true">
        {bossPhase >= 3 && <div className="battle-pill is-last-stand">{t('battle.lastStand', '🔥 Last Stand DMGx{multiplier}', { multiplier: BALANCE_CONFIG.traits.player.bossPhase3DamageScale })}</div>}
        {specDef && (
          <div className={`battle-pill is-specdef ${specDefToneClass}`}>
            {specDefReadyLabel} {t('battle.ready', 'Ready!')}
          </div>
        )}
      </div>

      {bossCharging && <div className="battle-boss-hint" role="status">
        <div>⚠️ {t('battle.bossBreakHint', 'Answer correctly to interrupt charging!')}</div>
        {BALANCE_CONFIG.traits.boss.chargeCounterRatio > 0 && (
          <div className="battle-boss-hint-detail">{t('battle.bossCounterHint', 'Guarded Break avoids charge retaliation at reduced damage.')}</div>
        )}
      </div>}
    </div>
  );
});
