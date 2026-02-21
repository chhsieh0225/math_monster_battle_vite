import { getStarterStageIdx } from '../../utils/playerHp.ts';
import { applyBossDamageReduction } from '../../utils/bossDamage.ts';
import { fxt } from './battleFxTargets.ts';
import { isBattleActiveState, scheduleIfBattleActive, tryReturnToMenu } from './menuResetGuard.ts';
import type { StarterVm } from '../../types/battle';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type StarterLite = StarterVm;

type BattleState = {
  battleMode?: string;
  pHp?: number;
  pHpSub?: number;
  pLvl?: number;
  allySub?: StarterLite | null;
  enemy?: { id?: string; name?: string } | null;
  eHp?: number;
  phase?: string;
  screen?: string;
};

type CoopSlotSwitchState = {
  battleMode?: string | null;
  allySub?: unknown;
  pHpSub?: number;
};

type StateRef = {
  current: BattleState;
};

type NumberSetter = (value: number | ((prev: number) => number)) => void;
type StarterSetter = (value: StarterLite | null) => void;
type PhaseSetter = (value: string) => void;
type TextSetter = (value: string) => void;
type SlotSetter = (value: 'main' | 'sub') => void;
type SafeTo = (fn: () => void, ms: number) => void;
type ChanceFn = (probability: number) => boolean;
type RandomFn = () => number;

type HandleCoopPartyKoArgs = {
  state: BattleState;
  stateRef?: StateRef;
  target?: 'main' | 'sub';
  reason?: string;
  setStarter: StarterSetter;
  setPStg: NumberSetter;
  setPHp: NumberSetter;
  setAllySub: StarterSetter;
  setPHpSub: NumberSetter;
  setCoopActiveSlot: SlotSetter;
  setPhase: PhaseSetter;
  setBText: TextSetter;
  safeTo: SafeTo;
  endSession: (completed: boolean, reasonOverride?: string | null) => void;
  setScreen: (screen: string) => void;
  t?: Translator;
};

type RunCoopAllySupportTurnArgs = {
  sr: StateRef;
  safeTo: SafeTo;
  chance: ChanceFn;
  rand: RandomFn;
  setBText: TextSetter;
  setPhase: PhaseSetter;
  setEAnim: TextSetter;
  setEHp: NumberSetter;
  addD: (value: string, x: number, y: number, color: string) => void;
  addP: (emoji: string, x: number, y: number, count?: number) => void;
  sfx: {
    play: (name: string) => void;
    playMove?: (type: string, idx?: number) => void;
  };
  handleVictory: (verb?: string) => void;
  delayMs?: number;
  onDone?: () => void;
  t?: Translator;
};

function formatFallback(template: string, params?: TranslatorParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m: string, key: string) => String(params[key] ?? ''));
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

export function isCoopBattleMode(mode: string | null | undefined): boolean {
  return mode === 'coop' || mode === 'double';
}

export function canSwitchCoopActiveSlot(state: CoopSlotSwitchState | null | undefined): boolean {
  return Boolean(
    state
    && isCoopBattleMode(state.battleMode)
    && state.allySub
    && (state.pHpSub || 0) > 0,
  );
}

export function buildNextEvolvedAlly(allySub: StarterLite | null | undefined): StarterLite | null {
  if (!allySub) return null;
  const allyStage = getStarterStageIdx(allySub);
  const nextAllyStage = Math.min(allyStage + 1, 2);
  const allyStageData = allySub.stages?.[nextAllyStage] || allySub.stages?.[0];
  return {
    ...allySub,
    selectedStageIdx: nextAllyStage,
    name: allyStageData?.name || allySub.name,
  };
}

export function handleCoopPartyKo({
  state,
  stateRef,
  target = 'main',
  reason = 'Your partner has fallen...',
  setStarter,
  setPStg,
  setPHp,
  setAllySub,
  setPHpSub,
  setCoopActiveSlot,
  setPhase,
  setBText,
  safeTo,
  endSession,
  setScreen,
  t,
}: HandleCoopPartyKoArgs): 'gameover' | 'sub_down' | 'promoted' {
  const tryReturnToBattleMenu = (): void => {
    tryReturnToMenu(() => stateRef?.current || state, setPhase, setBText);
  };
  const safeToIfBattleActive = (fn: () => void, ms: number): void => (
    scheduleIfBattleActive(safeTo, () => stateRef?.current || state, fn, ms)
  );

  if (target === 'sub') {
    setAllySub(null);
    setPHpSub(0);
    setCoopActiveSlot('main');
    if ((state.pHp || 0) <= 0) {
      endSession(false);
      setPhase('ko');
      setBText(reason);
      setScreen('gameover');
      return 'gameover';
    }
    setBText(tr(t, 'battle.coop.subDown', '💫 {name} has fallen!', {
      name: state.allySub?.name || tr(t, 'battle.role.sub', 'Sub'),
    }));
    setPhase('text');
    safeToIfBattleActive(() => {
      tryReturnToBattleMenu();
    }, 1100);
    return 'sub_down';
  }

  if ((state.pHpSub || 0) > 0 && state.allySub) {
    const promoted = state.allySub;
    setStarter(promoted);
    setPStg(getStarterStageIdx(promoted));
    setPHp(state.pHpSub || 0);
    setAllySub(null);
    setPHpSub(0);
    setCoopActiveSlot('main');
    setBText(tr(t, 'battle.coop.promoted', '💫 {name} takes the field!', { name: promoted.name }));
    setPhase('text');
    safeToIfBattleActive(() => {
      tryReturnToBattleMenu();
    }, 1200);
    return 'promoted';
  }

  endSession(false);
  setPhase('ko');
  setBText(reason);
  setScreen('gameover');
  return 'gameover';
}

export function runCoopAllySupportTurn({
  sr,
  safeTo,
  chance,
  rand,
  setBText,
  setPhase,
  setEAnim,
  setEHp,
  addD,
  addP,
  sfx,
  handleVictory,
  delayMs = 850,
  onDone,
  t,
}: RunCoopAllySupportTurnArgs): boolean {
  const state = sr.current;
  if (!isBattleActiveState(state)) return false;
  if (
    !isCoopBattleMode(state.battleMode)
    || !state.allySub
    || (state.pHpSub || 0) <= 0
    || !state.enemy
  ) return false;
  if (!chance(0.45)) return false;
  const safeToIfBattleActive = (fn: () => void, ms: number): void => (
    scheduleIfBattleActive(safeTo, () => sr.current, fn, ms)
  );

  safeToIfBattleActive(() => {
    const s2 = sr.current;
    if (!s2.allySub || (s2.pHpSub || 0) <= 0 || !s2.enemy) {
      if (onDone) onDone();
      return;
    }

    const base = 16 + Math.max(0, (s2.pLvl || 1) - 1) * 2;
    const rawDmg = Math.min(28, Math.max(6, Math.round(base * (0.85 + rand() * 0.3))));
    const dmg = applyBossDamageReduction(rawDmg, s2.enemy?.id);
    const nh = Math.max(0, (s2.eHp || 0) - dmg);
    setBText(tr(t, 'battle.coop.supportAttack', '🤝 {name} launches a support attack!', { name: s2.allySub.name }));
    setPhase('playerAtk');
    setEAnim('enemyWaterHit 0.45s ease');
    setEHp(nh);
    addD(`-${dmg}`, fxt().enemyMain.x, fxt().enemyMain.y, '#60a5fa');
    addP('starter', (fxt().playerSub.x + fxt().enemyMain.x) / 2, (fxt().playerSub.y + fxt().enemyMain.y) / 2, 3);
    if (typeof sfx.playMove === 'function') sfx.playMove('water', 1);
    else sfx.play('water');

    safeToIfBattleActive(() => setEAnim(''), 450);
    if (nh <= 0) {
      safeToIfBattleActive(() => {
        handleVictory(tr(t, 'battle.victory.verb.coopCombo', 'was defeated by co-op combo'));
      }, 700);
      return;
    }
    if (onDone) safeToIfBattleActive(() => {
      onDone();
    }, 700);
  }, delayMs);

  return true;
}
