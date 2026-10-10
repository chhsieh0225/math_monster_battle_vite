import type { CSSProperties } from 'react';
import MonsterSprite from './MonsterSprite';
import { fitSpriteAtlas, getSpriteAnimationAsset } from '../../data/spriteAnimationAssets.ts';

type MonsterPortraitProps = {
  /** Sprite profile key (e.g. 'bossHydraSVG'); with a registered atlas the battle art is shown. */
  profileKey?: string;
  /** Legacy art, used when the form has no battle atlas yet. */
  svgStr: string;
  size: number;
  style?: CSSProperties;
  ariaLabel?: string;
  /** Purely visual (e.g. a silhouette layer): hidden from assistive tech. */
  decorative?: boolean;
};

/**
 * The monster exactly as it stands in battle (the atlas idle pose, same framing
 * as BattleSprite) but from a small single-pose image, so menus, the
 * encyclopedia and the map match the battlefield without loading full atlases.
 */
export default function MonsterPortrait({ profileKey, svgStr, size, style, ariaLabel, decorative = false }: MonsterPortraitProps) {
  const asset = getSpriteAnimationAsset(profileKey);
  if (!asset) return <MonsterSprite svgStr={svgStr} size={size} style={style} ariaLabel={ariaLabel} decorative={decorative} />;
  const frame = fitSpriteAtlas(asset.profile, asset.art);
  return (
    <div
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : ariaLabel || 'Monster sprite'}
      aria-hidden={decorative || undefined}
      data-sprite-art={asset.profile.imgKey}
      style={{ ...style, position: 'relative', display: 'block', width: size, height: (size * 100) / 120 }}
    >
      <span style={{ position: 'absolute', inset: 0, transform: asset.profile.flip ? 'scaleX(-1)' : undefined }}>
        <span
          style={{
            position: 'absolute',
            left: `${(frame.x / 120) * 100}%`,
            top: `${frame.y}%`,
            width: `${(frame.width / 120) * 100}%`,
            height: `${frame.height}%`,
            backgroundImage: `url("${asset.portrait}")`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </span>
    </div>
  );
}
