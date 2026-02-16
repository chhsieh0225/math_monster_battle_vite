import { canSwitchCoopActiveSlot } from './coopFlow.ts';

type CoopSlotSwitchState = {
  battleMode?: string;
  allySub?: unknown;
  pHpSub?: number;
};

type RotationAction = 'none' | 'set-main' | 'toggle';

type ResolveCoopTurnRotationDecisionArgs = {
  phase: string;
  pending: boolean;
  state: CoopSlotSwitchState | null | undefined;
};

type RotationDecision = {
  consumePending: boolean;
  action: RotationAction;
};

export function resolveCoopTurnRotationDecision({
  phase,
  pending,
  state,
}: ResolveCoopTurnRotationDecisionArgs): RotationDecision {
  if (phase !== 'menu' || !pending) {
    return { consumePending: false, action: 'none' };
  }
  if (!canSwitchCoopActiveSlot(state)) {
    return { consumePending: true, action: 'set-main' };
  }
  return { consumePending: true, action: 'toggle' };
}
