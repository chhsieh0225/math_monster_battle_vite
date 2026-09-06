import { useEffect, useState } from 'react';
import type { AttackEffectVm } from '../../../types/battle';
import { getAttackImpactPhase, getAttackImpactProfile } from '../../../utils/effectTiming.ts';
import type { AttackImpactEvent, ImpactPhase } from '../../../utils/effectTiming.ts';

type UseAttackImpactPhaseArgs = {
  atkEffect: AttackEffectVm | null;
  enabled: boolean;
};

export function useAttackImpactPhase({ atkEffect, enabled }: UseAttackImpactPhaseArgs): ImpactPhase {
  const impact = enabled ? atkEffect?.impact : undefined;
  const idx = atkEffect?.idx ?? 0;
  const [frame, setFrame] = useState<{ impact?: AttackImpactEvent; phase: ImpactPhase }>({ phase: 'idle' });

  useEffect(() => {
    if (!impact) return;
    const { freezeMs, shakeMs, settleMs } = getAttackImpactProfile(idx, impact.outcome);
    const update = () => setFrame({
      impact,
      phase: getAttackImpactPhase(idx, impact.outcome, performance.now() - impact.at),
    });
    // Catch up to the actual beat after throttled timers, rather than replaying each phase.
    const elapsed = performance.now() - impact.at;
    const boundaries = [0, freezeMs, freezeMs + shakeMs, freezeMs + shakeMs + settleMs];
    const timers = [...new Set(boundaries)].filter((ms) => ms === 0 || ms > elapsed)
      .map((ms) => window.setTimeout(update, Math.max(0, Math.ceil(ms - elapsed))));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [impact, idx]);

  if (!enabled || !atkEffect) return 'idle';
  if (!impact) return 'charge';
  // Begin on the same render as HP/recoil, rather than one timer tick later.
  return frame.impact === impact
    ? frame.phase
    : getAttackImpactPhase(idx, impact.outcome, 0);
}
