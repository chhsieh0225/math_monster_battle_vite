import { memo, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n';
import MonsterSprite from '../../ui/MonsterSprite.tsx';

type BossIntroOverlayProps = {
  enemyName: string;
  enemySvg: string;
  enemySize: number;
  enemySubName?: string;
  enemySubSvg?: string;
  enemySubSize?: number;
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
 *   3.6~4.1 s – hold for emphasis
 *   4.1 s  – overlay fades out
 *   4.6 s  – onComplete() fires → phase transitions to 'text'
 */
export const BossIntroOverlay = memo(function BossIntroOverlay({
  enemyName,
  enemySvg,
  enemySize,
  enemySubName,
  enemySubSvg,
  enemySubSize,
  onComplete,
}: BossIntroOverlayProps) {
  const { t } = useI18n();
  const completedRef = useRef(false);
  const hasDualSilhouette = Boolean(enemySubName && enemySubSvg);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const id = window.setTimeout(finish, 4600);
    return () => clearTimeout(id);
  }, [finish]);

  return (
    <div
      className="boss-intro-overlay"
      role="button"
      tabIndex={0}
      aria-live="assertive"
      aria-label={hasDualSilhouette
        ? t('a11y.bossIntro.skipDual', 'Tap to skip dual boss intro cinematic')
        : t('a11y.bossIntro.skip', 'Tap to skip boss intro cinematic')}
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
      <div className={`boss-intro-silhouette-wrap ${hasDualSilhouette ? 'is-dual' : ''}`}>
        <div className="boss-intro-silhouette boss-intro-silhouette-main">
          <div className="boss-intro-sprite-stack">
            <div className="boss-intro-sprite boss-intro-sprite-shadow">
              <MonsterSprite
                svgStr={enemySvg}
                size={enemySize}
                decorative
              />
            </div>
            <div className="boss-intro-sprite boss-intro-sprite-color">
              <MonsterSprite
                svgStr={enemySvg}
                size={enemySize}
                decorative
              />
            </div>
          </div>
        </div>
        {enemySubName && enemySubSvg && (
          <div className="boss-intro-silhouette boss-intro-silhouette-sub">
            <div className="boss-intro-sprite-stack">
              <div className="boss-intro-sprite boss-intro-sprite-shadow">
                <MonsterSprite
                  svgStr={enemySubSvg}
                  size={enemySubSize ?? enemySize}
                  decorative
                />
              </div>
              <div className="boss-intro-sprite boss-intro-sprite-color">
                <MonsterSprite
                  svgStr={enemySubSvg}
                  size={enemySubSize ?? enemySize}
                  decorative
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Phase 4: boss name pop (2.0–3.2 s) */}
      <div className={`boss-intro-name ${hasDualSilhouette ? 'is-dual' : ''}`}>
        {!hasDualSilhouette && enemyName}
        {hasDualSilhouette && (
          <>
            <span>{enemyName}</span>
            <span className="boss-intro-name-separator">
              {t('battle.boss.intro.dualSeparator', ' + ')}
            </span>
            <span>{enemySubName}</span>
          </>
        )}
      </div>

      <div className="boss-intro-skip-hint">{t('battle.boss.introSkip', 'Tap to skip')}</div>

      {/* Dim-out veil (3.0–3.5 s) */}
      <div className="boss-intro-fadeout" />
    </div>
  );
});
