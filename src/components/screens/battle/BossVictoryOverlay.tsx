import { memo, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n';
import './BossVictoryOverlay.css';

type BossVictoryOverlayProps = {
  enemyName: string;
  onComplete: () => void;
};

/**
 * Full-screen cinematic overlay for boss defeat.
 *
 * Timeline (all CSS-driven):
 *   0.0 s  – screen flash + impact shake
 *   0.3 s  – shatter particles explode outward
 *   0.8 s  – radial light burst expands
 *   1.2 s  – "BOSS DEFEATED" text slams in
 *   1.8 s  – enemy name fades in below
 *   2.4 s  – sparkle shower
 *   3.4 s  – hold for emphasis
 *   3.8 s  – overlay fades out
 *   4.2 s  – onComplete() fires → phase transitions to 'victory'
 */
export const BossVictoryOverlay = memo(function BossVictoryOverlay({
  enemyName,
  onComplete,
}: BossVictoryOverlayProps) {
  const { t } = useI18n();
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const id = window.setTimeout(finish, 4200);
    return () => clearTimeout(id);
  }, [finish]);

  return (
    <div
      className="boss-victory-overlay"
      role="button"
      tabIndex={0}
      aria-live="assertive"
      aria-label={t('a11y.bossVictory.skip', 'Tap to skip boss victory cinematic')}
      onClick={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          finish();
        }
      }}
    >
      {/* Phase 1: White flash impact */}
      <div className="boss-victory-flash" />

      {/* Phase 2: Screen shake container */}
      <div className="boss-victory-shake">
        {/* Phase 3: Shatter particles */}
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={`shard-${i}`}
            className="boss-victory-shard"
            style={{
              '--shard-angle': `${(i / 16) * 360}deg`,
              '--shard-dist': `${120 + (i % 3) * 40}px`,
              '--shard-size': `${6 + (i % 4) * 3}px`,
              '--shard-delay': `${0.3 + (i % 5) * 0.04}s`,
              '--shard-hue': `${(i * 30) % 360}`,
            } as React.CSSProperties}
          />
        ))}

        {/* Phase 4: Radial light burst */}
        <div className="boss-victory-burst" />
        <div className="boss-victory-burst boss-victory-burst-2" />

        {/* Phase 5: Victory text slam */}
        <div className="boss-victory-text-wrap">
          <div className="boss-victory-title">
            {t('battle.boss.defeated', 'BOSS DEFEATED!')}
          </div>
          <div className="boss-victory-enemy-name">{enemyName}</div>
        </div>

        {/* Phase 6: Sparkle shower */}
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={`spark-${i}`}
            className="boss-victory-sparkle"
            style={{
              '--sparkle-x': `${5 + (i * 4.7) % 90}%`,
              '--sparkle-delay': `${2.4 + (i % 8) * 0.12}s`,
              '--sparkle-dur': `${0.8 + (i % 3) * 0.3}s`,
              '--sparkle-size': `${8 + (i % 4) * 4}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="boss-victory-skip-hint">
        {t('battle.boss.victorySkip', 'Tap to skip')}
      </div>

      {/* Fadeout veil */}
      <div className="boss-victory-fadeout" />
    </div>
  );
});
