import { lazy, Suspense } from 'react';
import type { SpriteTarget } from '../../hooks/useSpriteTargets';
import type { AttackElementEffectProps } from './effectTypes.ts';

const FireEffect = lazy(() => import('./FireEffect'));
const ElecEffect = lazy(() => import('./ElecEffect'));
const WaterEffect = lazy(() => import('./WaterEffect'));
const GrassEffect = lazy(() => import('./GrassEffect'));
const DarkEffect = lazy(() => import('./DarkEffect'));
const LightEffect = lazy(() => import('./LightEffect'));
const SteelEffect = lazy(() => import('./SteelEffect'));
const IceEffect = lazy(() => import('./IceEffect'));

const EFFECT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<AttackElementEffectProps>>> = {
  fire: FireEffect,
  electric: ElecEffect,
  water: WaterEffect,
  grass: GrassEffect,
  dark: DarkEffect,
  light: LightEffect,
  steel: SteelEffect,
  ice: IceEffect,
};

interface AttackEffectProps {
  type: string;
  idx: number;
  lvl: number;
  target: SpriteTarget;
}

export default function AttackEffect({ type, idx, lvl, target }: AttackEffectProps) {
  const Comp = EFFECT_MAP[type];
  if (!Comp) return null;
  return (
    <Suspense fallback={null}>
      <Comp idx={idx} lvl={lvl} target={target} />
    </Suspense>
  );
}
