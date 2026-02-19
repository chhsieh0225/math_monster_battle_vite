import { seedRange } from '../../utils/prng';
import { DEFAULT_EFFECT_TARGET, type AttackElementEffectProps } from './effectTypes.ts';
import type { SpriteTarget } from '../../hooks/useSpriteTargets';

type EffectLevelSeedMode = 'raw' | 'clamped';

type EffectTemplateConfig = {
  elementKey: string;
  uidPrefix?: string;
  minLevel?: number;
  maxLevel?: number;
  seedMode?: EffectLevelSeedMode;
  duration: (args: { idx: number; lvl: number; fxLvl: number }) => number;
  glow: (args: { idx: number; lvl: number; fxLvl: number }) => number;
};

export type EffectTemplateContext = {
  idx: number;
  lvl: number;
  fxLvl: number;
  dur: number;
  glow: number;
  T: SpriteTarget;
  uid: string;
  rr: (slot: string, i: number, min: number, max: number) => number;
};

function toSafeInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  return fallback;
}

function toSafeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

export function createEffectTemplate(config: EffectTemplateConfig) {
  const {
    elementKey,
    uidPrefix = '',
    minLevel = 1,
    maxLevel = 12,
    seedMode = 'raw',
    duration,
    glow,
  } = config;

  return function resolveEffectTemplateContext(
    props: AttackElementEffectProps,
  ): EffectTemplateContext {
    const idx = toSafeInt(props.idx, 0);
    const lvl = Math.max(1, toSafeNumber(props.lvl, 1));
    const fxLvl = Math.max(minLevel, Math.min(maxLevel, lvl));
    const seedLvl = seedMode === 'clamped' ? fxLvl : lvl;
    const T = props.target ?? DEFAULT_EFFECT_TARGET;
    const uid = `${uidPrefix}${idx}-${fxLvl}-${Math.round((T.flyRight || 0) * 10)}-${Math.round((T.flyTop || 0) * 10)}`;
    const rr = (slot: string, i: number, min: number, max: number): number =>
      seedRange(`${elementKey}-${idx}-${seedLvl}-${slot}-${i}`, min, max);

    return {
      idx,
      lvl,
      fxLvl,
      dur: duration({ idx, lvl, fxLvl }),
      glow: glow({ idx, lvl, fxLvl }),
      T,
      uid,
      rr,
    };
  };
}
