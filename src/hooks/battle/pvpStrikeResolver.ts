import { PVP_BALANCE } from '../../data/pvpBalance.ts';
import { getLevelMaxHp, getStarterLevelMaxHp } from '../../utils/playerHp.ts';
import { declarePvpWinner, swapPvpTurnToText } from './pvpTurnPrimitives.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type PvpTurn = 'p1' | 'p2';
type PvpWinner = PvpTurn | null;
type ChanceFn = (probability: number) => boolean;
type ScheduleFn = (fn: () => void, ms: number) => void;

type NumberSetter = (value: number | ((prev: number) => number)) => void;
type BoolSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
type TextSetter = (value: string) => void;
type PhaseSetter = (value: string) => void;

type AttackEffect = {
  type: string;
  idx: number;
  lvl: number;
  targetSide?: 'enemy' | 'player';
};

type StarterMove = {
  name: string;
  type: string;
  type2?: string;
  risky?: boolean;
};

type StarterLike = {
  name: string;
  type: string;
};

type PvpStateRef = {
  current: {
    selIdx: number | null;
    pHp: number;
    pvpHp2: number;
    pStg: number;
    pLvl?: number;
    pvpStarter2: StarterLike | null;
    pvpSpecDefP1: boolean;
    pvpSpecDefP2: boolean;
    pvpStaticP1: number;
    pvpStaticP2: number;
  };
};

type StrikeSummary = {
  dmg: number;
  heal: number;
  eff: number;
  isCrit: boolean;
  passiveLabel?: string;
  passiveLabelKey?: string;
  passiveLabelFallback?: string;
};

type SfxApi = {
  play: (name: string) => void;
  playMove?: (type: string, idx?: number) => void;
};

type PvpBalanceConfig = {
  passive: {
    fireBurnCap: number;
    waterFreezeChance: number;
    electricDischargeAt: number;
    electricDischargeDamage: number;
    lightCounterDamage: number;
    grassReflectRatio: number;
    grassReflectMin: number;
    grassReflectCap: number;
  };
};

type ExecutePvpStrikeTurnArgs = {
  sr: PvpStateRef;
  currentTurn: PvpTurn;
  nextTurn: PvpTurn;
  attacker: StarterLike;
  defender: StarterLike;
  move: StarterMove;
  strike: StrikeSummary;
  unlockedSpecDef: boolean;
  vfxType: string;
  chance: ChanceFn;
  sfx: SfxApi;
  t?: Translator;
  isBattleActive: () => boolean;
  safeToIfBattleActive: ScheduleFn;
  setBText: TextSetter;
  setPvpTurn: (turn: PvpTurn) => void;
  setPvpActionCount: NumberSetter;
  setPhase: PhaseSetter;
  setPvpSpecDefP1: BoolSetter;
  setPvpSpecDefP2: BoolSetter;
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
};

const PVP = PVP_BALANCE as unknown as PvpBalanceConfig;
const getLevelMaxHpTyped = getLevelMaxHp as (pLvl: number, pStg: number) => number;
const getStarterLevelMaxHpTyped = getStarterLevelMaxHp as (
  starter: StarterLike | null,
  pLvl: number,
  fallbackStageIdx?: number,
) => number;

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
  return template.replace(/\{(\w+)\}/g, (_match: string, token: string) => String(params[token] ?? ''));
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

export function executePvpStrikeTurn({
  sr,
  currentTurn,
  nextTurn,
  attacker,
  defender,
  move,
  strike,
  unlockedSpecDef,
  vfxType,
  chance,
  sfx,
  t,
  isBattleActive,
  safeToIfBattleActive,
  setBText,
  setPvpTurn,
  setPvpActionCount,
  setPhase,
  setPvpSpecDefP1,
  setPvpSpecDefP2,
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
}: ExecutePvpStrikeTurnArgs): void {
  if (!isBattleActive()) return;
  const s2 = sr.current;
  const moveIdx = s2.selIdx ?? 0;
  const sfxKey = move.risky && move.type2 ? move.type2 : move.type;
  if (typeof sfx.playMove === 'function') sfx.playMove(sfxKey, moveIdx);
  else sfx.play(sfxKey);
  if (strike.isCrit) sfx.play('crit');
  else if (strike.eff > 1) sfx.play('effective');
  else if (strike.eff < 1) sfx.play('resist');

  if (currentTurn === 'p1') {
    setAtkEffect({ type: vfxType, idx: moveIdx, lvl: 1, targetSide: 'enemy' });
  } else {
    setAtkEffect({ type: vfxType, idx: moveIdx, lvl: 1, targetSide: 'player' });
    addP('enemy', 84, 186, 3);
  }

  const hitAnim = PVP_HIT_ANIMS[vfxType] || 'enemyHit 0.45s ease';
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
        const nextHp = Math.max(0, s2.pHp - dmg);
        setPHp(nextHp);
        setPAnim('playerHit 0.45s ease');
        addD(`-${dmg}`, attackerMainX, attackerMainY, color);
        safeToIfBattleActive(() => setPAnim(''), 520);
        return nextHp <= 0;
      }
      const nextHp = Math.max(0, s2.pvpHp2 - dmg);
      setPvpHp2(nextHp);
      setEHp(nextHp);
      setEAnim(anim);
      addD(`-${dmg}`, attackerMainX, attackerMainY, color);
      safeToIfBattleActive(() => setEAnim(''), 520);
      return nextHp <= 0;
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
    if (currentTurn === 'p1') setPvpBurnP2((burn) => Math.min(PVP.passive.fireBurnCap, burn + 1));
    else setPvpBurnP1((burn) => Math.min(PVP.passive.fireBurnCap, burn + 1));
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
    const nextHp = Math.max(0, s2.pvpHp2 - totalDmg);
    setPvpHp2(nextHp);
    setEHp(nextHp);
    setEAnim(hitAnim);
    addD(strike.isCrit ? `💥-${totalDmg}` : `-${totalDmg}`, 140, 55, '#ef4444');

    if (strike.heal > 0) {
      setPHp((hp) => Math.min(getLevelMaxHpTyped(s2.pLvl || 1, s2.pStg), hp + strike.heal));
      addD(`+${strike.heal}`, 52, 164, '#22c55e');
      passiveNotes.push(tr(t, 'battle.pvp.note.heal', '🌿Heal'));
    }

    safeToIfBattleActive(() => {
      setEAnim('');
      setAtkEffect(null);
    }, 520);
    if (nextHp <= 0) {
      declarePvpWinner({
        winner: 'p1',
        setPvpWinner,
        setScreen,
      });
      return;
    }
  } else {
    const nextHp = Math.max(0, s2.pHp - totalDmg);
    setPHp(nextHp);
    setPAnim('playerHit 0.45s ease');
    addD(strike.isCrit ? `💥-${totalDmg}` : `-${totalDmg}`, 60, 170, '#ef4444');

    if (strike.heal > 0) {
      const healed = Math.min(
        getStarterLevelMaxHpTyped(s2.pvpStarter2, s2.pLvl || 1, s2.pStg),
        s2.pvpHp2 + strike.heal,
      );
      setPvpHp2(healed);
      setEHp(healed);
      addD(`+${strike.heal}`, 146, 54, '#22c55e');
      passiveNotes.push(tr(t, 'battle.pvp.note.heal', '🌿Heal'));
    }

    safeToIfBattleActive(() => {
      setPAnim('');
      setAtkEffect(null);
    }, 520);
    if (nextHp <= 0) {
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
}
