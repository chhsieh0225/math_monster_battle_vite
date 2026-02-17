import { lazy, Suspense } from 'react';
import type { SpriteTarget } from '../../hooks/useSpriteTargets';

const FireEffect = lazy(() => import('./FireEffect'));
const ElecEffect = lazy(() => import('./ElecEffect'));
const WaterEffect = lazy(() => import('./WaterEffect'));
const GrassEffect = lazy(() => import('./GrassEffect'));
const DarkEffect = lazy(() => import('./DarkEffect'));
const LightEffect = lazy(() => import('./LightEffect'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EFFECT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  fire: FireEffect,
  electric: ElecEffect,
  water: WaterEffect,
  grass: GrassEffect,
  dark: DarkEffect,
  light: LightEffect,
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
