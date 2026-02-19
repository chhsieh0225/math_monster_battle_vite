import { memo, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n';
import MonsterSprite from '../../ui/MonsterSprite.tsx';

type BossIntroOverlayProps = {
  enemyName: string;
  enemySvg: string;
  enemySize: number;
  onComplete: () => void;
};

/**
 * Full-screen cinematic overlay for boss encounters.
 *
 * Timeline (all CSS-driven):
 *   0.0 s  – screen black, BGM already playing
 *   0.8 s  – white flash begins
 *   1.2 s  – flash peak, boss silhouette fades in (brightness 0 → 1)
 *   2.0 s  – boss name pops in
 *   2.8 s  – fully visible
 *   3.2 s  – overlay fades out
 *   3.5 s  – onComplete() fires → phase transitions to 'text'
 */
export const BossIntroOverlay = memo(function BossIntroOverlay({
  enemyName,
  enemySvg,
  enemySize,
  onComplete,
}: BossIntroOverlayProps) {
  const { t } = useI18n();
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const id = window.setTimeout(finish, 3500);
    return () => clearTimeout(id);
  }, [finish]);

  return (
    <div
      className="boss-intro-overlay"
      role="button"
      tabIndex={0}
      aria-live="assertive"
      aria-label={t('a11y.bossIntro.skip', 'Tap to skip boss intro cinematic')}
      onClick={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          finish();
        }
      }}
    >
      {/* Phase 1: black veil (opacity 1→0 at ~1.2 s) */}
      <div className="boss-intro-black" />

      {/* Phase 2: white flash burst (0.8–1.6 s) */}
      <div className="boss-intro-flash" />

      {/* Phase 3: boss silhouette → fully visible (1.2–2.8 s) */}
      <div className="boss-intro-silhouette">
        <MonsterSprite
          svgStr={enemySvg}
          size={enemySize}
          decorative
        />
      </div>

      {/* Phase 4: boss name pop (2.0–3.2 s) */}
      <div className="boss-intro-name">{enemyName}</div>

      <div className="boss-intro-skip-hint">{t('battle.boss.introSkip', 'Tap to skip')}</div>

      {/* Dim-out veil (3.0–3.5 s) */}
      <div className="boss-intro-fadeout" />
    </div>
  );
});
