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
  return (
    <>
      {/* Enemy sprite */}
      <div ref={enemySpriteRef} className="battle-sprite-enemy-main" style={enemyMainSpriteStyle}>
        <MonsterSprite svgStr={eSvg} size={eSize} />
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
          <MonsterSprite svgStr={eSubSvg} size={enemySubSize} />
        </div>
      )}
      {showEnemyShadow && <div className="battle-sprite-enemy-shadow" style={enemyMainShadowStyle} />}

      {/* Player sprite */}
      <div ref={playerSpriteRef} className="battle-sprite-player-main" style={playerMainSpriteStyle}>
        <MonsterSprite svgStr={pSvg} size={mainPlayerSize} />
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
          <MonsterSprite svgStr={pSubSvg} size={subPlayerSize} />
        </div>
      )}
      {showPlayerShadow && <div className="battle-sprite-player-shadow" style={playerMainShadowStyle} />}
    </>
  );
});
