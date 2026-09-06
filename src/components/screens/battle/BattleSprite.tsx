import { memo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { fitSpriteAtlas, getSpriteAnimationAsset } from '../../../data/spriteAnimationAssets.ts';
import MonsterSprite from '../../ui/MonsterSprite';
import { decodeBattleSprite, resolveBattleSpriteClip } from './battleSpriteMotion.ts';
import './BattleSprite.css';

type BattleSpriteProps = {
  profileKey?: string;
  svgStr: string;
  size: number;
  style?: CSSProperties;
  animation: string;
};

type AtlasProps = BattleSpriteProps & {
  asset: NonNullable<ReturnType<typeof getSpriteAnimationAsset>>;
};

function AtlasSprite({ asset, svgStr, size, style, animation }: AtlasProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void decodeBattleSprite(asset.src).then((decoded) => { if (active) setReady(decoded); });
    return () => { active = false; };
  }, [asset.src]);

  // Retain the same outer 120x100 frame through loading, attacks and hit reactions.
  if (!ready) return <MonsterSprite svgStr={svgStr} size={size} style={style} />;
  const frame = fitSpriteAtlas(asset.profile, asset.art);
  const { clip, durationMs } = resolveBattleSpriteClip(animation);
  return <div className="battle-art-sprite" role="img" aria-label="Monster sprite"
    data-sprite-art={asset.profile.imgKey} data-clip={clip}
    style={{ ...style, width: size, height: size * 100 / 120 }}>
    <span className="battle-art-facing" style={{ transform: asset.profile.flip ? 'scaleX(-1)' : undefined }}>
      <span key={animation} className="battle-art-atlas" style={{
        left: `${frame.x / 120 * 100}%`, top: `${frame.y}%`,
        width: `${frame.width / 120 * 100}%`, height: `${frame.height}%`,
        backgroundImage: `url("${asset.src}")`, animationDuration: `${durationMs}ms`,
      }} />
    </span>
  </div>;
}

export const BattleSprite = memo(function BattleSprite(props: BattleSpriteProps) {
  const asset = getSpriteAnimationAsset(props.profileKey);
  return asset
    ? <AtlasSprite key={asset.src} {...props} asset={asset} />
    : <MonsterSprite svgStr={props.svgStr} size={props.size} style={props.style} />;
});
