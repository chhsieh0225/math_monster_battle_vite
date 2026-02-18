import { applyGameCompletionAchievements } from './achievementFlow.ts';
import { tryReturnToMenu } from './menuResetGuard.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type SessionBattleState = {
  enemy?: {
    id?: string;
    name?: string;
  } | null;
  pHp?: number;
  tW?: number;
  timedMode?: boolean;
  pLvl?: number;
  pStg?: number;
  starter?: { id?: string } | null;
  [key: string]: unknown;
};

type SessionStateRef = {
  current: SessionBattleState;
};

type EndSessionReason = string | null;
type EndSessionOnce = (state: SessionStateRef['current'], isCompleted: boolean, reasonOverride?: EndSessionReason) => void;

type RunEndSessionControllerArgs = {
  sr: SessionStateRef;
  endSessionOnce: EndSessionOnce;
  isCompleted: boolean;
  reasonOverride?: EndSessionReason;
};

type RunQuitGameControllerArgs = {
  clearTimer: () => void;
  appendQuitEventIfOpen: (state: SessionStateRef['current']) => void;
  sr: SessionStateRef;
  endSession: (isCompleted: boolean, reasonOverride?: EndSessionReason) => void;
  setScreen: (screen: string) => void;
};

type RunFinishGameControllerArgs = {
  sr: SessionStateRef;
  tryUnlock: Parameters<typeof applyGameCompletionAchievements>[0]['tryUnlock'];
  setEncData: Parameters<typeof applyGameCompletionAchievements>[0]['setEncData'];
  encTotal: Parameters<typeof applyGameCompletionAchievements>[0]['encTotal'];
  endSession: (isCompleted: boolean, reasonOverride?: EndSessionReason) => void;
  setScreen: (screen: string) => void;
};

type RunHandleFreezeControllerArgs = {
  sr: SessionStateRef;
  frozenRef: { current: boolean };
  setFrozen: (value: boolean) => void;
  setBText: (text: string) => void;
  setPhase: (phase: string) => void;
  safeTo: (fn: () => void, ms: number) => void;
  t?: Translator;
};

type RunToggleCoopActiveControllerArgs = {
  sr: SessionStateRef;
  canSwitchCoopActiveSlot: (state: SessionStateRef['current']) => boolean;
  setCoopActiveSlot: (value: 'main' | 'sub' | ((prev: 'main' | 'sub') => 'main' | 'sub')) => void;
};

function tr(
  t: Translator | undefined,
  key: string,
  fallback: string,
  params?: TranslatorParams,
): string {
  if (typeof t === 'function') return t(key, fallback, params);
  return fallback;
}

export function runEndSessionController({
  sr,
  endSessionOnce,
  isCompleted,
  reasonOverride = null,
}: RunEndSessionControllerArgs): void {
  endSessionOnce(sr.current, isCompleted, reasonOverride);
}

export function runQuitGameController({
  clearTimer,
  appendQuitEventIfOpen,
  sr,
  endSession,
  setScreen,
}: RunQuitGameControllerArgs): void {
  clearTimer();
  appendQuitEventIfOpen(sr.current);
  endSession(false, 'quit');
  setScreen('gameover');
}

export function runFinishGameController({
  sr,
  tryUnlock,
  setEncData,
  encTotal,
  endSession,
  setScreen,
}: RunFinishGameControllerArgs): void {
  applyGameCompletionAchievements({
    state: sr.current,
    tryUnlock,
    setEncData,
    encTotal,
  });
  endSession(true);
  setScreen('gameover');
}

export function runHandleFreezeController({
  sr,
  frozenRef,
  setFrozen,
  setBText,
  setPhase,
  safeTo,
  t,
}: RunHandleFreezeControllerArgs): void {
  const state = sr.current;

  frozenRef.current = false;
  setFrozen(false);
  setBText(tr(t, 'battle.freeze.enemySkip', '❄️ {enemy} is frozen and cannot attack!', { enemy: state.enemy?.name || '' }));
  setPhase('text');
  safeTo(() => {
    tryReturnToMenu(() => sr.current, setPhase, setBText);
  }, 1500);
}

export function runToggleCoopActiveController({
  sr,
  canSwitchCoopActiveSlot,
  setCoopActiveSlot,
}: RunToggleCoopActiveControllerArgs): void {
  if (!canSwitchCoopActiveSlot(sr.current)) return;
  setCoopActiveSlot((prev) => (prev === 'main' ? 'sub' : 'main'));
}
