import { PVP_BALANCE } from '../../data/pvpBalance.ts';
import { getStageMaxHp, getStarterMaxHp, getStarterStageIdx } from '../../utils/playerHp.ts';
import { isBattleActiveState } from './menuResetGuard.ts';
import {
  runPvpAttackAnimation,
  showPvpEffectivenessMessage,
} from './pvpAnimationOrchestrator.ts';
import {
  applyCorrectTurnProgress,
  createBattleActiveScheduler,
  declarePvpWinner,
  resetCurrentTurnResources,
  swapPvpTurnToText,
} from './pvpTurnPrimitives.ts';
import { resolvePvpTurnStartStatus } from './pvpStatusResolver.ts';
import { resolvePvpStrike } from './turnResolver.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type PvpTurn = 'p1' | 'p2';
type PvpWinner = PvpTurn | null;

type StarterStage = {
  name?: string;
  svgFn: (...colors: string[]) => string;
};

type StarterMove = {
  name: string;
  type: string;
  type2?: string;
  risky?: boolean;
  basePower: number;
  growth: number;
};

type StarterLike = {
  id?: string;
  name: string;
  type: string;
  typeIcon?: string;
  typeName?: string;
  c1?: string;
  c2?: string;
  stages: StarterStage[];
  moves: StarterMove[];
  selectedStageIdx?: number;
};

type BattleQuestion = {
  answer: number;
  steps?: string[];
};

type PvpBattleState = {
  battleMode: string;
  phase?: string;
  screen?: string;
  pvpWinner: PvpWinner;
  pvpTurn: PvpTurn;
  starter: StarterLike | null;
  pvpStarter2: StarterLike | null;
  selIdx: number | null;
  q: BattleQuestion;
  pvpSpecDefP1: boolean;
  pvpSpecDefP2: boolean;
  pvpComboP1: number;
  pvpComboP2: number;
  pvpChargeP1: number;
  pvpChargeP2: number;
  pvpActionCount: number;
  pHp: number;
  pvpHp2: number;
  pStg: number;
  pvpBurnP1: number;
  pvpBurnP2: number;
  pvpFreezeP1: boolean;
  pvpFreezeP2: boolean;
  pvpStaticP1: number;
  pvpStaticP2: number;
  pvpParalyzeP1: boolean;
  pvpParalyzeP2: boolean;
};

type StateRef = {
  current: PvpBattleState;
};

type NumberSetter = (value: number | ((prev: number) => number)) => void;
type BoolSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
type TextSetter = (value: string) => void;
type PhaseSetter = (value: string) => void;

type FeedbackValue = {
  correct: boolean;
  answer: number;
  steps: string[];
};

type EffectMessage = {
  text: string;
  color: string;
};

type AttackEffect = {
  type: string;
  idx: number;
  lvl: number;
  targetSide?: 'enemy' | 'player';
};

type SafeTo = (fn: () => void, ms: number) => void;
type RandomFn = () => number;
type ChanceFn = (probability: number) => boolean;

type SfxApi = {
  play: (name: string) => void;
};

type PvpEnemyVm = {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  lvl: number;
  mType: string;
  sceneMType: string;
  typeIcon?: string;
  typeName?: string;
  c1?: string;
  c2?: string;
  trait: string;
  traitName: string;
  drops: string[];
  svgFn: (...colors: string[]) => string;
  isEvolved: boolean;
  selectedStageIdx: number;
};

type PvpCritProfile = {
  critChanceBonus?: number;
  critDamageBonus?: number;
  antiCritRate?: number;
  antiCritDamage?: number;
};

type PvpBalanceConfig = {
  baseScale: number;
  varianceMin: number;
  varianceMax: number;
  minDamage: number;
  maxDamage: number;
  riskyScale: number;
  moveSlotScale: number[];
  typeScale: Record<string, number>;
  skillScaleByType: Record<string, number[]>;
  passiveScaleByType: Record<string, number>;
  grassSustain: {
    healRatio: number;
    healCap: number;
  };
  lightComeback?: {
    maxBonus?: number;
  };
  crit?: {
    chance?: number;
    riskyBonus?: number;
    minChance?: number;
    maxChance?: number;
    multiplier?: number;
    byType?: Record<string, PvpCritProfile>;
  };
  passive: {
    fireBurnCap: number;
    fireBurnTickBase: number;
    fireBurnTickPerStack: number;
    waterFreezeChance: number;
    electricDischargeAt: number;
    electricDischargeDamage: number;
    specDefComboTrigger: number;
    lightCounterDamage: number;
    grassReflectRatio: number;
    grassReflectMin: number;
    grassReflectCap: number;
  };
  firstStrikeScale?: number;
  effectScale: {
    strong: number;
    weak: number;
    neutral: number;
  };
};

type HandlePvpAnswerArgs = {
  choice: number;
  state: PvpBattleState;
  sr: StateRef;
  rand: RandomFn;
  chance: ChanceFn;
  safeTo: SafeTo;
  sfx: SfxApi;
  getOtherPvpTurn: (turn: PvpTurn) => PvpTurn;
  pvpSpecDefTrigger?: number;
  setFb: (value: FeedbackValue) => void;
  setTC: NumberSetter;
  setTW: NumberSetter;
  setPvpChargeP1: NumberSetter;
  setPvpChargeP2: NumberSetter;
  setPvpComboP1: NumberSetter;
  setPvpComboP2: NumberSetter;
  setPvpTurn: (turn: PvpTurn) => void;
  setPvpActionCount: NumberSetter;
  setBText: TextSetter;
  setPhase: PhaseSetter;
  setPvpSpecDefP1: BoolSetter;
  setPvpSpecDefP2: BoolSetter;
  setEffMsg: (value: EffectMessage | null) => void;
  setAtkEffect: (value: AttackEffect | null) => void;
  addP: (emoji: string, x: number, y: number, count?: number) => void;
  setPvpParalyzeP1: BoolSetter;
  setPvpParalyzeP2: BoolSetter;
  setPAnim: TextSetter;
  setEAnim: TextSetter;
  addD: (value: string, x: number, y: number, color: string) => void;
  setPHp: NumberSetter;
  setPvpHp2: NumberSetter;
  setEHp: NumberSetter;
  setScreen: (screen: string) => void;
  setPvpWinner: (winner: PvpWinner) => void;
  setPvpBurnP1: NumberSetter;
  setPvpBurnP2: NumberSetter;
  setPvpFreezeP1: BoolSetter;
  setPvpFreezeP2: BoolSetter;
  setPvpStaticP1: NumberSetter;
  setPvpStaticP2: NumberSetter;
  t?: Translator;
};

type ProcessPvpTurnStartArgs = {
  state: PvpBattleState;
  sr?: StateRef;
  safeTo: SafeTo;
  getOtherPvpTurn: (turn: PvpTurn) => PvpTurn;
  getPvpTurnName: (state: PvpBattleState, turn: PvpTurn) => string;
  setPHp: NumberSetter;
  setPvpBurnP1: NumberSetter;
  setPAnim: TextSetter;
  addD: (value: string, x: number, y: number, color: string) => void;
  setPvpWinner: (winner: PvpWinner) => void;
  setScreen: (screen: string) => void;
  setPvpHp2: NumberSetter;
  setEHp: NumberSetter;
  setPvpBurnP2: NumberSetter;
  setEAnim: TextSetter;
  setBText: TextSetter;
  setPhase: PhaseSetter;
  setPvpParalyzeP1: BoolSetter;
  setPvpParalyzeP2: BoolSetter;
  setPvpTurn: (turn: PvpTurn) => void;
  setPvpFreezeP1: BoolSetter;
  setPvpFreezeP2: BoolSetter;
  t?: Translator;
};

const PVP = PVP_BALANCE as unknown as PvpBalanceConfig;
const getStageMaxHpTyped = getStageMaxHp as (stageIdx: number) => number;
const getStarterMaxHpTyped = getStarterMaxHp as (starter: StarterLike | null) => number;
const getStarterStageIdxTyped = getStarterStageIdx as (starter: StarterLike) => number;

const TYPE_TO_SCENE: Record<string, string> = {
  fire: 'fire',
  ghost: 'ghost',
  steel: 'steel',
  dark: 'dark',
  grass: 'grass',
  water: 'grass',
  electric: 'steel',
  light: 'grass',
};

const PVP_HIT_ANIMS: Record<string, string> = {
  fire: 'enemyFireHit 0.55s ease',
  electric: 'enemyElecHit 0.55s ease',
  water: 'enemyWaterHit 0.6s ease',
  grass: 'enemyGrassHit 0.55s ease',
  dark: 'enemyDarkHit 0.7s ease',
  light: 'enemyFireHit 0.55s ease',
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

export function createPvpEnemyFromStarter(starter: StarterLike | null | undefined, t?: Translator): PvpEnemyVm | null {
  if (!starter) return null;
  const stageIdx = getStarterStageIdxTyped(starter);
  const stage = starter.stages?.[stageIdx] || starter.stages?.[0];
  const maxHp = getStarterMaxHpTyped(starter);
  return {
    id: `pvp_${starter.id || 'starter'}`,
    name: stage?.name || starter.name,
    maxHp,
    hp: maxHp,
    atk: 12,
    lvl: 1,
    mType: starter.type,
    sceneMType: TYPE_TO_SCENE[starter.type] || 'grass',
    typeIcon: starter.typeIcon,
    typeName: starter.typeName,
    c1: starter.c1,
    c2: starter.c2,
    trait: 'normal',
    traitName: tr(t, 'battle.pvp.playerTrait', 'Player'),
    drops: ['🏁'],
    svgFn: stage?.svgFn || starter.stages[0].svgFn,
    isEvolved: stageIdx > 0,
    selectedStageIdx: stageIdx,
  };
}

export function handlePvpAnswer({
  choice,
  state,
  sr,
  rand,
  chance,
  safeTo,
  sfx,
  getOtherPvpTurn,
  pvpSpecDefTrigger = PVP.passive.specDefComboTrigger || 4,
  setFb,
  setTC,
  setTW,
  setPvpChargeP1,
  setPvpChargeP2,
  setPvpComboP1,
  setPvpComboP2,
  setPvpTurn,
  setPvpActionCount,
  setBText,
  setPhase,
  setPvpSpecDefP1,
  setPvpSpecDefP2,
  setEffMsg,
  setAtkEffect,
  addP,
  setPvpParalyzeP1,
  setPvpParalyzeP2,
  setPAnim,
  setEAnim,
  addD,
  setPHp,
  setPvpHp2,
  setEHp,
  setScreen,
  setPvpWinner,
  setPvpBurnP1,
  setPvpBurnP2,
  setPvpFreezeP1,
  setPvpFreezeP2,
  setPvpStaticP1,
  setPvpStaticP2,
  t,
}: HandlePvpAnswerArgs): boolean {
  if (state.battleMode !== 'pvp') return false;
  if (!isBattleActiveState(state)) return false;
  const isBattleActive = (): boolean => isBattleActiveState(sr.current);
  const safeToIfBattleActive = createBattleActiveScheduler({
    safeTo,
    getState: () => sr.current,
  });
  const attacker = state.pvpTurn === 'p1' ? state.starter : state.pvpStarter2;
  const defender = state.pvpTurn === 'p1' ? state.pvpStarter2 : state.starter;
  if (!attacker || !defender || state.selIdx == null) return false;

  const move = attacker.moves?.[state.selIdx];
  if (!move || !state.q || typeof state.q.answer !== 'number') return false;

  const correct = choice === state.q.answer;
  setFb({ correct, answer: state.q.answer, steps: state.q.steps || [] });
  if (correct) setTC((c) => c + 1);
  else setTW((w) => w + 1);
  const currentTurn = state.pvpTurn;
  const nextTurn = getOtherPvpTurn(currentTurn);

  if (!correct) {
    resetCurrentTurnResources({
      currentTurn,
      setPvpChargeP1,
      setPvpComboP1,
      setPvpChargeP2,
      setPvpComboP2,
    });
    swapPvpTurnToText({
      nextTurn,
      setPvpTurn,
      setPvpActionCount,
      setPhase,
    });
    setBText(tr(t, 'battle.pvp.miss', '❌ {name} answered wrong. Attack missed!', { name: attacker.name }));
    return true;
  }

  const unlockedSpecDef = applyCorrectTurnProgress({
    currentTurn,
    state,
    pvpSpecDefTrigger,
    setPvpChargeP1,
    setPvpChargeP2,
    setPvpComboP1,
    setPvpComboP2,
    setPvpSpecDefP1,
    setPvpSpecDefP2,
  });

  const attackerHp = currentTurn === 'p1' ? state.pHp : state.pvpHp2;
  const attackerMaxHp = currentTurn === 'p1'
    ? getStageMaxHpTyped(state.pStg)
    : getStarterMaxHpTyped(state.pvpStarter2);
  const strike = resolvePvpStrike({
    move,
    moveIdx: state.selIdx,
    attackerType: attacker.type,
    defenderType: defender.type,
    attackerHp,
    attackerMaxHp,
    firstStrike: state.pvpActionCount === 0,
    random: rand,
  });

  showPvpEffectivenessMessage({
    strike,
    t,
    setEffMsg,
    scheduleClear: safeToIfBattleActive,
  });

  const vfxType = move.risky && move.type2 ? move.type2 : move.type;
  const hitAnim = PVP_HIT_ANIMS[vfxType] || 'enemyHit 0.45s ease';
  const runStrike = () => {
    if (!isBattleActive()) return;
    const s2 = sr.current;
    const sfxKey = move.risky && move.type2 ? move.type2 : move.type;
    sfx.play(sfxKey);
    if (strike.isCrit) sfx.play('crit');
    if (currentTurn === 'p1') {
      setAtkEffect({ type: vfxType, idx: s2.selIdx || 0, lvl: 1, targetSide: 'enemy' });
    } else {
      setAtkEffect({ type: vfxType, idx: s2.selIdx || 0, lvl: 1, targetSide: 'player' });
      addP('enemy', 84, 186, 3);
    }

    const defenderSpecDefReady = currentTurn === 'p1' ? !!s2.pvpSpecDefP2 : !!s2.pvpSpecDefP1;
    if (defenderSpecDefReady) {
      if (currentTurn === 'p1') setPvpSpecDefP2(false);
      else setPvpSpecDefP1(false);

      const defenderMainX = currentTurn === 'p1' ? 140 : 60;
      const defenderMainY = currentTurn === 'p1' ? 55 : 170;
      const attackerMainX = currentTurn === 'p1' ? 60 : 140;
      const attackerMainY = currentTurn === 'p1' ? 170 : 55;
      const finishWithTurnSwap = () => {
        if (!isBattleActive()) return;
        swapPvpTurnToText({
          nextTurn,
          setPvpTurn,
          setPvpActionCount,
          setPhase,
        });
      };

      if (defender.type === 'fire') {
        addD('🛡️BLOCK', defenderMainX, defenderMainY, '#fbbf24');
        sfx.play('specDef');
        setBText(tr(t, 'battle.pvp.specdef.fire', '🛡️ {name} raised a barrier and blocked the hit!', { name: defender.name }));
        safeToIfBattleActive(() => setAtkEffect(null), 380);
        finishWithTurnSwap();
        return;
      }

      if (defender.type === 'water') {
        if (currentTurn === 'p1') setEAnim('dodgeSlide 0.9s ease');
        else setPAnim('dodgeSlide 0.9s ease');
        addD('MISS!', defenderMainX, defenderMainY, '#38bdf8');
        sfx.play('specDef');
        setBText(tr(t, 'battle.pvp.specdef.water', '💨 {name} dodged perfectly!', { name: defender.name }));
        safeToIfBattleActive(() => {
          setEAnim('');
          setPAnim('');
          setAtkEffect(null);
        }, 680);
        finishWithTurnSwap();
        return;
      }

      if (defender.type === 'electric') {
        if (currentTurn === 'p1') setPvpParalyzeP1(true);
        else setPvpParalyzeP2(true);
        if (currentTurn === 'p1') setPAnim('playerHit 0.45s ease');
        else setEAnim('enemyElecHit 0.55s ease');
        addD(tr(t, 'battle.pvp.tag.paralyze', '⚡Paralyzed'), attackerMainX, attackerMainY, '#fbbf24');
        sfx.play('specDef');
        setBText(tr(t, 'battle.pvp.specdef.electric', '⚡ {defender} triggered counter current! {attacker} will be paralyzed next turn!', {
          defender: defender.name,
          attacker: attacker.name,
        }));
        safeToIfBattleActive(() => {
          setPAnim('');
          setEAnim('');
          setAtkEffect(null);
        }, 520);
        finishWithTurnSwap();
        return;
      }

      const applyCounterToAttacker = (dmg: number, color: string, anim: string): boolean => {
        if (currentTurn === 'p1') {
          const nh = Math.max(0, s2.pHp - dmg);
          setPHp(nh);
          setPAnim('playerHit 0.45s ease');
          addD(`-${dmg}`, attackerMainX, attackerMainY, color);
          safeToIfBattleActive(() => setPAnim(''), 520);
          return nh <= 0;
        }
        const nh = Math.max(0, s2.pvpHp2 - dmg);
        setPvpHp2(nh);
        setEHp(nh);
        setEAnim(anim);
        addD(`-${dmg}`, attackerMainX, attackerMainY, color);
        safeToIfBattleActive(() => setEAnim(''), 520);
        return nh <= 0;
      };

      if (defender.type === 'light') {
        const counterDmg = PVP.passive.lightCounterDamage || 14;
        addD('🛡️BLOCK', defenderMainX, defenderMainY, '#f59e0b');
        const killed = applyCounterToAttacker(counterDmg, '#f59e0b', 'enemyFireHit 0.55s ease');
        sfx.play('light');
        setBText(tr(t, 'battle.pvp.specdef.light', '✨ {name} roared and countered!', { name: defender.name }));
        safeToIfBattleActive(() => setAtkEffect(null), 420);
        if (killed) {
          declarePvpWinner({
            winner: currentTurn === 'p1' ? 'p2' : 'p1',
            setPvpWinner,
            setScreen,
          });
          return;
        }
        finishWithTurnSwap();
        return;
      }

      const reflectRaw = Math.round(strike.dmg * (PVP.passive.grassReflectRatio || 0.32));
      const reflectDmg = Math.min(
        PVP.passive.grassReflectCap || 18,
        Math.max(PVP.passive.grassReflectMin || 8, reflectRaw),
      );
      addD('🛡️BLOCK', defenderMainX, defenderMainY, '#22c55e');
      const killed = applyCounterToAttacker(reflectDmg, '#22c55e', 'enemyGrassHit 0.55s ease');
      sfx.play('specDef');
      setBText(tr(t, 'battle.pvp.specdef.grass', '🌿 {name} reflected the attack!', { name: defender.name }));
      safeToIfBattleActive(() => setAtkEffect(null), 420);
      if (killed) {
        declarePvpWinner({
          winner: currentTurn === 'p1' ? 'p2' : 'p1',
          setPvpWinner,
          setScreen,
        });
        return;
      }
      finishWithTurnSwap();
      return;
    }

    let totalDmg = strike.dmg;
    const passiveNotes: string[] = [];
    let bonusDmg = 0;

    if (attacker.type === 'fire') {
      if (currentTurn === 'p1') setPvpBurnP2((b) => Math.min(PVP.passive.fireBurnCap, b + 1));
      else setPvpBurnP1((b) => Math.min(PVP.passive.fireBurnCap, b + 1));
      passiveNotes.push(tr(t, 'battle.pvp.note.burn', '🔥Burn'));
    }

    if (attacker.type === 'water' && chance(PVP.passive.waterFreezeChance)) {
      if (currentTurn === 'p1') setPvpFreezeP2(true);
      else setPvpFreezeP1(true);
      passiveNotes.push(tr(t, 'battle.pvp.note.freeze', '❄️Freeze'));
    }

    if (attacker.type === 'electric') {
      if (currentTurn === 'p1') {
        const stack = (s2.pvpStaticP1 || 0) + 1;
        if (stack >= PVP.passive.electricDischargeAt) {
          bonusDmg += PVP.passive.electricDischargeDamage;
          setPvpStaticP1(0);
          passiveNotes.push(tr(t, 'battle.pvp.note.discharge', '⚡Discharge'));
          addD(`⚡-${PVP.passive.electricDischargeDamage}`, 140, 55, '#fbbf24');
          sfx.play('staticDischarge');
        } else {
          setPvpStaticP1(stack);
        }
      } else {
        const stack = (s2.pvpStaticP2 || 0) + 1;
        if (stack >= PVP.passive.electricDischargeAt) {
          bonusDmg += PVP.passive.electricDischargeDamage;
          setPvpStaticP2(0);
          passiveNotes.push(tr(t, 'battle.pvp.note.discharge', '⚡Discharge'));
          addD(`⚡-${PVP.passive.electricDischargeDamage}`, 60, 170, '#fbbf24');
          sfx.play('staticDischarge');
        } else {
          setPvpStaticP2(stack);
        }
      }
    }

    totalDmg += bonusDmg;

    if (currentTurn === 'p1') {
      const nh = Math.max(0, s2.pvpHp2 - totalDmg);
      setPvpHp2(nh);
      setEHp(nh);
      setEAnim(hitAnim);
      addD(strike.isCrit ? `💥-${totalDmg}` : `-${totalDmg}`, 140, 55, '#ef4444');

      if (strike.heal > 0) {
        setPHp((h) => Math.min(getStageMaxHpTyped(s2.pStg), h + strike.heal));
        addD(`+${strike.heal}`, 52, 164, '#22c55e');
        passiveNotes.push(tr(t, 'battle.pvp.note.heal', '🌿Heal'));
      }

      safeToIfBattleActive(() => {
        setEAnim('');
        setAtkEffect(null);
      }, 520);
      if (nh <= 0) {
        declarePvpWinner({
          winner: 'p1',
          setPvpWinner,
          setScreen,
        });
        return;
      }
    } else {
      const nh = Math.max(0, s2.pHp - totalDmg);
      setPHp(nh);
      setPAnim('playerHit 0.45s ease');
      addD(strike.isCrit ? `💥-${totalDmg}` : `-${totalDmg}`, 60, 170, '#ef4444');

      if (strike.heal > 0) {
        const healed = Math.min(getStarterMaxHpTyped(s2.pvpStarter2), s2.pvpHp2 + strike.heal);
        setPvpHp2(healed);
        setEHp(healed);
        addD(`+${strike.heal}`, 146, 54, '#22c55e');
        passiveNotes.push(tr(t, 'battle.pvp.note.heal', '🌿Heal'));
      }

      safeToIfBattleActive(() => {
        setPAnim('');
        setAtkEffect(null);
      }, 520);
      if (nh <= 0) {
        declarePvpWinner({
          winner: 'p2',
          setPvpWinner,
          setScreen,
        });
        return;
      }
    }

    const passiveNote = strike.passiveLabelKey
      ? tr(t, strike.passiveLabelKey, strike.passiveLabelFallback || strike.passiveLabel || '')
      : (strike.passiveLabel || '');
    const allNotes = [
      strike.isCrit ? tr(t, 'battle.pvp.note.crit', '💥Critical') : '',
      passiveNote,
      ...passiveNotes,
      unlockedSpecDef ? tr(t, 'battle.pvp.note.specdefReady', '🛡️Counter Ready') : '',
    ].filter(Boolean).join(' ');
    setBText(tr(t, 'battle.pvp.hit', "✅ {attacker}'s {move} hit!{notes}", {
      attacker: attacker.name,
      move: move.name,
      notes: allNotes ? ` ${allNotes}` : '',
    }));
    swapPvpTurnToText({
      nextTurn,
      setPvpTurn,
      setPvpActionCount,
      setPhase,
    });
  };

  runPvpAttackAnimation({
    turn: currentTurn,
    safeTo,
    setPhase,
    setPAnim,
    setEAnim,
    onStrike: runStrike,
  });
  return true;
}

export function processPvpTurnStart({
  state,
  sr,
  safeTo,
  getOtherPvpTurn,
  getPvpTurnName,
  setPHp,
  setPvpBurnP1,
  setPAnim,
  addD,
  setPvpWinner,
  setScreen,
  setPvpHp2,
  setEHp,
  setPvpBurnP2,
  setEAnim,
  setBText,
  setPhase,
  setPvpParalyzeP1,
  setPvpParalyzeP2,
  setPvpTurn,
  setPvpFreezeP1,
  setPvpFreezeP2,
  t,
}: ProcessPvpTurnStartArgs): boolean {
  if (state.battleMode !== 'pvp' || state.pvpWinner) return false;
  if (!isBattleActiveState(state)) return false;
  return resolvePvpTurnStartStatus({
    state,
    sr,
    safeTo,
    getOtherPvpTurn,
    getPvpTurnName,
    setPHp,
    setPvpBurnP1,
    setPAnim,
    addD,
    setPvpWinner,
    setScreen,
    setPvpHp2,
    setEHp,
    setPvpBurnP2,
    setEAnim,
    setBText,
    setPhase,
    setPvpParalyzeP1,
    setPvpParalyzeP2,
    setPvpTurn,
    setPvpFreezeP1,
    setPvpFreezeP2,
    t,
  });
}
