import { useCallback, useEffect, useRef, useState } from 'react';
import type { AttackEffectVm } from '../../../types/battle';

export type ImpactPhase = 'idle' | 'charge' | 'freeze' | 'shake' | 'settle';

type ImpactProfile = {
  chargeMs: number;
  freezeMs: number;
  shakeMs: number;
  settleMs: number;
};

function resolveImpactProfile(idx = 0, lvl = 1): ImpactProfile {
  const levelBoost = Math.min(36, Math.max(0, (lvl - 1) * 6));
  if (idx >= 3) {
    return {
      chargeMs: 95 + levelBoost,
      freezeMs: 100,
      shakeMs: 230,
      settleMs: 190,
    };
  }
  if (idx === 2) {
    return {
      chargeMs: 75 + levelBoost,
      freezeMs: 86,
      shakeMs: 175,
      settleMs: 150,
    };
  }
  return {
    chargeMs: 44 + Math.floor(levelBoost * 0.4),
    freezeMs: 68,
    shakeMs: 130,
    settleMs: 116,
  };
}

type UseAttackImpactPhaseArgs = {
  atkEffect: AttackEffectVm | null;
  enabled: boolean;
};

export function useAttackImpactPhase({
  atkEffect,
  enabled,
}: UseAttackImpactPhaseArgs): ImpactPhase {
  const [phase, setPhase] = useState<ImpactPhase>('idle');
  const timersRef = useRef<number[]>([]);
  const lastAtkEffectKeyRef = useRef('');

  const clearImpactTimers = useCallback(() => {
    if (timersRef.current.length === 0) return;
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearImpactTimers(), [clearImpactTimers]);

  useEffect(() => {
    if (!enabled || !atkEffect) {
      clearImpactTimers();
      lastAtkEffectKeyRef.current = '';
      const toIdle = window.setTimeout(() => setPhase('idle'), 0);
      timersRef.current = [toIdle];
      return clearImpactTimers;
    }

    const atkKey = `${atkEffect.type}-${atkEffect.idx}-${atkEffect.lvl}-${atkEffect.targetSide || 'enemy'}`;
    if (lastAtkEffectKeyRef.current === atkKey) return;
    lastAtkEffectKeyRef.current = atkKey;

    clearImpactTimers();
    const profile = resolveImpactProfile(atkEffect.idx, atkEffect.lvl);

    const toCharge = window.setTimeout(() => setPhase('charge'), 0);
    const toFreeze = window.setTimeout(() => setPhase('freeze'), profile.chargeMs);
    const toShake = window.setTimeout(() => setPhase('shake'), profile.chargeMs + profile.freezeMs);
    const toSettle = window.setTimeout(
      () => setPhase('settle'),
      profile.chargeMs + profile.freezeMs + profile.shakeMs,
    );
    const toIdle = window.setTimeout(
      () => setPhase('idle'),
      profile.chargeMs + profile.freezeMs + profile.shakeMs + profile.settleMs,
    );

    timersRef.current = [toCharge, toFreeze, toShake, toSettle, toIdle];
    return clearImpactTimers;
  }, [atkEffect, clearImpactTimers, enabled]);

  return phase;
}
