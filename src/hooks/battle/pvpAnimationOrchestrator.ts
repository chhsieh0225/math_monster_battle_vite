import { effectOrchestrator } from './effectOrchestrator.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type PvpTurn = 'p1' | 'p2';

type TextSetter = (value: string) => void;
type SafeTo = (fn: () => void, ms: number) => void;
type ScheduleFn = (fn: () => void, ms: number) => void;

type EffectMessage = {
  text: string;
  color: string;
};

type StrikeSummary = {
  isCrit: boolean;
  eff: number;
};

type EffectOrchestratorApi = {
  runPlayerLunge: (args: {
    safeTo: SafeTo;
    setPAnim: TextSetter;
    onReady?: () => void;
    startDelay?: number;
    settleDelay?: number;
  }) => void;
  runEnemyLunge: (args: {
    safeTo: SafeTo;
    setEAnim: TextSetter;
    onStrike?: () => void;
    strikeDelay?: number;
  }) => void;
};

type ShowPvpEffectivenessMessageArgs = {
  strike: StrikeSummary;
  t?: Translator;
  setEffMsg: (value: EffectMessage | null) => void;
  scheduleClear: ScheduleFn;
  clearDelayMs?: number;
};

type RunPvpAttackAnimationArgs = {
  turn: PvpTurn;
  safeTo: SafeTo;
  setPhase: (value: string) => void;
  setPAnim: TextSetter;
  setEAnim: TextSetter;
  onStrike: () => void;
  orchestratorApi?: EffectOrchestratorApi;
};

function formatFallback(template: string, params?: TranslatorParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m: string, token: string) => String(params[token] ?? ''));
}

function tr(
  t: Translator | undefined,
  key: string,
  fallback: string,
  params?: TranslatorParams,
): string {
  if (typeof t === 'function') return t(key, fallback, params);
  return formatFallback(fallback, params);
}

export function showPvpEffectivenessMessage({
  strike,
  t,
  setEffMsg,
  scheduleClear,
  clearDelayMs = 1200,
}: ShowPvpEffectivenessMessageArgs): void {
  if (strike.isCrit) {
    setEffMsg({ text: tr(t, 'battle.pvp.effect.crit', '💥 Critical!'), color: '#ff6b00' });
    scheduleClear(() => setEffMsg(null), clearDelayMs);
    return;
  }

  if (strike.eff > 1) {
    setEffMsg({ text: tr(t, 'battle.pvp.effect.super', 'Super effective!'), color: '#22c55e' });
    scheduleClear(() => setEffMsg(null), clearDelayMs);
    return;
  }

  if (strike.eff < 1) {
    setEffMsg({ text: tr(t, 'battle.pvp.effect.notVery', 'Not very effective'), color: '#94a3b8' });
    scheduleClear(() => setEffMsg(null), clearDelayMs);
  }
}

export function runPvpAttackAnimation({
  turn,
  safeTo,
  setPhase,
  setPAnim,
  setEAnim,
  onStrike,
  orchestratorApi = effectOrchestrator as unknown as EffectOrchestratorApi,
}: RunPvpAttackAnimationArgs): void {
  setPhase('playerAtk');
  if (turn === 'p1') {
    orchestratorApi.runPlayerLunge({
      safeTo,
      setPAnim,
      startDelay: 120,
      settleDelay: 280,
      onReady: onStrike,
    });
    return;
  }
  orchestratorApi.runEnemyLunge({
    safeTo,
    setEAnim,
    strikeDelay: 320,
    onStrike,
  });
}
