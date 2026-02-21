import type { SpriteTarget } from '../../hooks/useSpriteTargets';

export interface AttackElementEffectProps {
  idx?: number;
  lvl?: number;
  target?: SpriteTarget;
}

export const DEFAULT_EFFECT_TARGET: SpriteTarget = {
  top: 'calc(26% + 60px)',
  right: 'calc(10% + 60px)',
  flyRight: 25,
  flyTop: 37,
  cx: 292.5,
  cy: 203.5,
};
