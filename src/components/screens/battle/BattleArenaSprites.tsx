import { memo } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { EnemyVm } from '../../../types/battle';
import MonsterSprite from '../../ui/MonsterSprite';
import AmbientParticles from '../../effects/AmbientParticles';

type BattleArenaSpritesProps = {
  showHeavyFx: boolean;
  enemy: EnemyVm;
  starterType: string;
  showEnemySub: boolean;
  showAllySub: boolean;
  eSvg: string;
  pSvg: string;
  eSubSvg: string | null;
  pSubSvg: string | null;
  eSize: number;
  enemySubSize: number;
  mainPlayerSize: number;
  subPlayerSize: number;
  enemySpriteRef: RefObject<HTMLDivElement | null>;
  playerSpriteRef: RefObject<HTMLDivElement | null>;
  enemyMainSpriteStyle: CSSProperties;
  enemySubSpriteStyle: CSSProperties;
  enemyMainShadowStyle: CSSProperties;
  playerMainSpriteStyle: CSSProperties;
  playerSubSpriteStyle: CSSProperties;
  playerMainShadowStyle: CSSProperties;
  showEnemyShadow: boolean;
  showPlayerShadow: boolean;
};

export const BattleArenaSprites = memo(function BattleArenaSprites({
  showHeavyFx,
  enemy,
  starterType,
  showEnemySub,
  showAllySub,
  eSvg,
  pSvg,
  eSubSvg,
  pSubSvg,
  eSize,
  enemySubSize,
  mainPlayerSize,
  subPlayerSize,
  enemySpriteRef,
  playerSpriteRef,
  enemyMainSpriteStyle,
  enemySubSpriteStyle,
  enemyMainShadowStyle,
  playerMainSpriteStyle,
  playerSubSpriteStyle,
  playerMainShadowStyle,
  showEnemyShadow,
  showPlayerShadow,
}: BattleArenaSpritesProps) {
  const facingMainStyle: CSSProperties = {
    // Keep a subtle inward-facing posture without touching outer attack/hit transforms.
    transform: 'translate3d(var(--battle-face-shift-main, -2px), 0, 0) rotate(var(--battle-face-tilt-main, -1.6deg))',
    transformOrigin: '50% 62%',
  };
  const facingSubStyle: CSSProperties = {
    transform: 'translate3d(var(--battle-face-shift-sub, -1px), 0, 0) rotate(var(--battle-face-tilt-sub, -1deg))',
    transformOrigin: '50% 64%',
  };

  return (
    <>
      {/* Enemy sprite */}
      <div ref={enemySpriteRef} className="battle-sprite-enemy-main" style={enemyMainSpriteStyle}>
        <div className="battle-sprite-core battle-sprite-core-main battle-sprite-core-enemy">
          <MonsterSprite svgStr={eSvg} size={eSize} style={facingMainStyle} />
        </div>
        {showHeavyFx && (
          <AmbientParticles
            type={enemy.mType || 'grass'}
            type2={enemy.mType2}
            size={eSize}
            seed={`e-${enemy.id}`}
          />
        )}
      </div>
      {showEnemySub && eSubSvg && (
        <div className="battle-sprite-enemy-sub" style={enemySubSpriteStyle}>
          <div className="battle-sprite-core battle-sprite-core-sub battle-sprite-core-enemy">
            <MonsterSprite svgStr={eSubSvg} size={enemySubSize} style={facingSubStyle} />
          </div>
        </div>
      )}
      {showEnemyShadow && <div className="battle-sprite-enemy-shadow" style={enemyMainShadowStyle} />}

      {/* Player sprite */}
      <div ref={playerSpriteRef} className="battle-sprite-player-main" style={playerMainSpriteStyle}>
        <div className="battle-sprite-core battle-sprite-core-main battle-sprite-core-player">
          <MonsterSprite svgStr={pSvg} size={mainPlayerSize} style={facingMainStyle} />
        </div>
        {showHeavyFx && (
          <AmbientParticles
            type={starterType || 'grass'}
            size={mainPlayerSize}
            seed={`p-${starterType}`}
            count={5}
          />
        )}
      </div>
      {showAllySub && pSubSvg && (
        <div className="battle-sprite-player-sub" style={playerSubSpriteStyle}>
          <div className="battle-sprite-core battle-sprite-core-sub battle-sprite-core-player">
            <MonsterSprite svgStr={pSubSvg} size={subPlayerSize} style={facingSubStyle} />
          </div>
        </div>
      )}
      {showPlayerShadow && <div className="battle-sprite-player-shadow" style={playerMainShadowStyle} />}
    </>
  );
});
