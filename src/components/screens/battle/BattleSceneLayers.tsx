import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { ComponentType } from 'react';

type BattleSceneLayersProps = {
  showHeavyFx: boolean;
  bgStyle?: CSSProperties;
  skyStyle: CSSProperties;
  groundStyle: CSSProperties;
  platformTopStyle: CSSProperties;
  Deco?: ComponentType;
};

export const BattleSceneLayers = memo(function BattleSceneLayers({
  showHeavyFx,
  bgStyle,
  skyStyle,
  groundStyle,
  platformTopStyle,
  Deco,
}: BattleSceneLayersProps) {
  return (
    <>
      {bgStyle && <div className="scene-bg" style={bgStyle} />}
      <div className="battle-scene-sky" style={skyStyle} />
      <div className="battle-scene-ground" style={groundStyle} />
      <div className="battle-scene-platform-top" style={platformTopStyle} />
      <div className="battle-scene-deco">{showHeavyFx && Deco && <Deco />}</div>
    </>
  );
});
