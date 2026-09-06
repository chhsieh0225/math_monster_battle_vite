import { PVP_BALANCE } from '../../data/pvpBalance.ts';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import { getCharacterSkillId } from '../../utils/skillPresentation.ts';
import type { AttackEffectVm } from '../../types/battle';
import { createAttackImpact, getAttackEffectHitDelay } from '../../utils/effectTiming.ts';
import { applyBossDamageReduction } from '../../utils/bossDamage.ts';
import { getLevelMaxHp, getStarterLevelMaxHp } from '../../utils/playerHp.ts';
import { fxt } from './battleFxTargets.ts';
import { declarePvpWinner, swapPvpTurnToText } from './pvpTurnPrimitives.ts';
import { getResolvedPvpCombatant, type PvpStateReadLike } from './pvpStateSelectors.ts';

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

type AttackEffect = AttackEffectVm;

type StarterMove = {
  name: string;
  type: string;
  type2?: string;
  risky?: boolean;
};

type StarterLike = {
  id?: string;
  name: string;
  type: string;
  selectedStageIdx?: number | null;
};

type PvpStateRef = {
  current: PvpStateReadLike & {
    selIdx: number | null;
    pHp: number;
    pvpHp2: number;
    pStg: number;
    pLvl?: number;
    pvpStarter2: StarterLike | null;
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
  onHit?: () => void;
};

const PVP = PVP_BALANCE;

const PVP_HIT_ANIMS: Record<string, string> = {
  fire: 'enemyFireHit 0.55s ease',
  electric: 'enemyElecHit 0.55s ease',
  water: 'enemyWaterHit 0.6s ease',
  ice: 'enemyWaterHit 0.6s ease',
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

export function executePvpStrikeTurn(args: ExecutePvpStrikeTurnArgs): void {
  if (!args.isBattleActive()) return;
  const moveIdx = args.sr.current.selIdx ?? 0;
  const effect: AttackEffect = {
    type: args.vfxType, idx: moveIdx, lvl: 1,
    targetSide: args.currentTurn === 'p1' ? 'enemy' : 'player',
    skillId: getCharacterSkillId(args.attacker.id, moveIdx),
    signature: BOSS_IDS.has(args.attacker.id || '') ? args.attacker.id : undefined,
  };
  const sfxKey = args.move.risky && args.move.type2 ? args.move.type2 : args.move.type;
  if (typeof args.sfx.playMove === 'function') args.sfx.playMove(sfxKey, moveIdx);
  else args.sfx.play(sfxKey);
  args.setAtkEffect(effect);
  if (args.currentTurn === 'p2') args.addP('enemy', fxt().playerMain.x + 24, fxt().playerMain.y + 16, 3);
  args.safeToIfBattleActive(() => resolvePvpStrikeImpact(args, effect), getAttackEffectHitDelay(args.vfxType));
}

function resolvePvpStrikeImpact({
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
  onHit,
}: ExecutePvpStrikeTurnArgs, effect: AttackEffect): void {
  if (!isBattleActive()) return;
  const s2 = sr.current;
  const finishWithWinner = (winner: PvpTurn) => safeToIfBattleActive(() => {
    declarePvpWinner({ winner, setPvpWinner, setScreen });
  }, 520);

  const hitAnim = PVP_HIT_ANIMS[vfxType] || 'enemyHit 0.45s ease';
  const defenderTurn = currentTurn === 'p1' ? 'p2' : 'p1';
  const attackerTurn = currentTurn;
  const defenderSpecDefReady = getResolvedPvpCombatant(s2, defenderTurn).specDef;
  if (defenderSpecDefReady) {
    setAtkEffect({ ...effect, impact: createAttackImpact(
      defender.type === 'water' || defender.type === 'ice' ? 'miss' : 'blocked',
    ) });
    if (currentTurn === 'p1') setPvpSpecDefP2(false);
    else setPvpSpecDefP1(false);

    const defenderMainX = currentTurn === 'p1' ? fxt().enemyMain.x : fxt().playerMain.x;
    const defenderMainY = currentTurn === 'p1' ? fxt().enemyMain.y : fxt().playerMain.y;
    const attackerMainX = currentTurn === 'p1' ? fxt().playerMain.x : fxt().enemyMain.x;
    const attackerMainY = currentTurn === 'p1' ? fxt().playerMain.y : fxt().enemyMain.y;
    const finishWithTurnSwap = (delay = 420) => safeToIfBattleActive(() => {
      swapPvpTurnToText({
        nextTurn,
        setPvpTurn,
        setPvpActionCount,
        setPhase,
      });
    }, delay);

    if (defender.type === 'fire') {
      addD('🛡️BLOCK', defenderMainX, defenderMainY, '#fbbf24');
      sfx.play('specDef');
      setBText(tr(t, 'battle.pvp.specdef.fire', '🛡️ {name} raised a barrier and blocked the hit!', { name: defender.name }));
      safeToIfBattleActive(() => setAtkEffect(null), 380);
      finishWithTurnSwap(380);
      return;
    }

    if (defender.type === 'water' || defender.type === 'ice') {
      if (currentTurn === 'p1') setEAnim('dodgeSlide 0.9s ease');
      else setPAnim('dodgeSlide 0.9s ease');
      addD('MISS!', defenderMainX, defenderMainY, '#38bdf8');
      sfx.play('specDef');
      setBText(
        defender.type === 'ice'
          ? tr(t, 'battle.pvp.specdef.ice', '🧊 {name} shifted with an ice mirage and dodged!', { name: defender.name })
          : tr(t, 'battle.pvp.specdef.water', '💨 {name} dodged perfectly!', { name: defender.name }),
      );
      safeToIfBattleActive(() => {
        setEAnim('');
        setPAnim('');
        setAtkEffect(null);
      }, 680);
      finishWithTurnSwap(680);
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
      finishWithTurnSwap(520);
      return;
    }

    const applyCounterToAttacker = (dmg: number, color: string, anim: string): boolean => {
      const appliedDmg = applyBossDamageReduction(dmg, attacker.id);
      if (currentTurn === 'p1') {
        const nextHp = Math.max(0, s2.pHp - appliedDmg);
        setPHp(nextHp);
        setPAnim('playerHit 0.45s ease');
        addD(`-${appliedDmg}`, attackerMainX, attackerMainY, color);
        safeToIfBattleActive(() => setPAnim(''), 520);
        return nextHp <= 0;
      }
      const nextHp = Math.max(0, s2.pvpHp2 - appliedDmg);
      setPvpHp2(nextHp);
      setEHp(nextHp);
      setEAnim(anim);
      addD(`-${appliedDmg}`, attackerMainX, attackerMainY, color);
      safeToIfBattleActive(() => setEAnim(''), 520);
      return nextHp <= 0;
    };

    if (defender.type === 'light') {
      const counterDmg = PVP.passive.lightCounterDamage;
      addD('🛡️BLOCK', defenderMainX, defenderMainY, '#f59e0b');
      const killed = applyCounterToAttacker(counterDmg, '#f59e0b', 'enemyFireHit 0.55s ease');
      sfx.play('light');
      setBText(tr(t, 'battle.pvp.specdef.light', '✨ {name} roared and countered!', { name: defender.name }));
      safeToIfBattleActive(() => setAtkEffect(null), 420);
      if (killed) {
        finishWithWinner(currentTurn === 'p1' ? 'p2' : 'p1');
        return;
      }
      finishWithTurnSwap();
      return;
    }

    if (defender.type === 'steel') {
      const counterDmg = Math.max(1, Math.round(PVP.passive.steelSpecCounterDamage));
      addD('🛡️BLOCK', defenderMainX, defenderMainY, '#94a3b8');
      const killed = applyCounterToAttacker(counterDmg, '#94a3b8', 'enemyHit 0.45s ease');
      sfx.play('specDef');
      setBText(tr(t, 'battle.pvp.specdef.steel', '⚙️ {name} triggered Iron Guard and countered!', { name: defender.name }));
      safeToIfBattleActive(() => setAtkEffect(null), 420);
      if (killed) {
        finishWithWinner(currentTurn === 'p1' ? 'p2' : 'p1');
        return;
      }
      finishWithTurnSwap();
      return;
    }

    const reflectRaw = Math.round(strike.dmg * PVP.passive.grassReflectRatio);
    const reflectDmg = Math.min(
      PVP.passive.grassReflectCap,
      Math.max(PVP.passive.grassReflectMin, reflectRaw),
    );
    addD('🛡️BLOCK', defenderMainX, defenderMainY, '#22c55e');
    const killed = applyCounterToAttacker(reflectDmg, '#22c55e', 'enemyGrassHit 0.55s ease');
    sfx.play('specDef');
    setBText(tr(t, 'battle.pvp.specdef.grass', '🌿 {name} reflected the attack!', { name: defender.name }));
    safeToIfBattleActive(() => setAtkEffect(null), 420);
    if (killed) {
      finishWithWinner(currentTurn === 'p1' ? 'p2' : 'p1');
      return;
    }
    finishWithTurnSwap();
    return;
  }

  setAtkEffect({ ...effect, impact: createAttackImpact(strike.isCrit ? 'critical' : 'hit') });
  sfx.play(strike.isCrit ? 'crit' : 'hit');
  if (!strike.isCrit && strike.eff > 1) sfx.play('effective');
  else if (!strike.isCrit && strike.eff < 1) sfx.play('resist');
  onHit?.();
  let totalDmg = strike.dmg;
  const passiveNotes: string[] = [];
  let bonusDmg = 0;

  if (attacker.type === 'fire') {
    if (currentTurn === 'p1') setPvpBurnP2((burn) => Math.min(PVP.passive.fireBurnCap, burn + 1));
    else setPvpBurnP1((burn) => Math.min(PVP.passive.fireBurnCap, burn + 1));
    passiveNotes.push(tr(t, 'battle.pvp.note.burn', '🔥Burn'));
  }

  if ((attacker.type === 'water' || attacker.type === 'ice') && chance(PVP.passive.waterFreezeChance)) {
    if (currentTurn === 'p1') setPvpFreezeP2(true);
    else setPvpFreezeP1(true);
    passiveNotes.push(tr(t, 'battle.pvp.note.freeze', '❄️Freeze'));
  }

  if (attacker.type === 'electric') {
    if (currentTurn === 'p1') {
      const stack = getResolvedPvpCombatant(s2, attackerTurn).static + 1;
      if (stack >= PVP.passive.electricDischargeAt) {
        bonusDmg += PVP.passive.electricDischargeDamage;
        setPvpStaticP1(0);
        passiveNotes.push(tr(t, 'battle.pvp.note.discharge', '⚡Discharge'));
        addD(`⚡-${PVP.passive.electricDischargeDamage}`, fxt().enemyMain.x, fxt().enemyMain.y, '#fbbf24');
        sfx.play('staticDischarge');
      } else {
        setPvpStaticP1(stack);
      }
    } else {
      const stack = getResolvedPvpCombatant(s2, attackerTurn).static + 1;
      if (stack >= PVP.passive.electricDischargeAt) {
        bonusDmg += PVP.passive.electricDischargeDamage;
        setPvpStaticP2(0);
        passiveNotes.push(tr(t, 'battle.pvp.note.discharge', '⚡Discharge'));
        addD(`⚡-${PVP.passive.electricDischargeDamage}`, fxt().playerMain.x, fxt().playerMain.y, '#fbbf24');
        sfx.play('staticDischarge');
      } else {
        setPvpStaticP2(stack);
      }
    }
  }

  totalDmg += bonusDmg;

  if (defender.type === 'steel') {
    const steelWallScale = PVP.passive.steelWallDamageScale;
    const reduced = Math.max(1, Math.round(totalDmg * steelWallScale));
    if (reduced < totalDmg) {
      totalDmg = reduced;
      passiveNotes.push(tr(t, 'battle.pvp.note.steelWall', '🛡️Steel Wall'));
    }
  }
  const mitigatedHitDmg = applyBossDamageReduction(totalDmg, defender.id);

  let defenderHpAfterHit = 0;
  if (currentTurn === 'p1') {
    const nextHp = Math.max(0, s2.pvpHp2 - mitigatedHitDmg);
    setPvpHp2(nextHp);
    setEHp(nextHp);
    setEAnim(hitAnim);
    defenderHpAfterHit = nextHp;
    addD(strike.isCrit ? `💥-${mitigatedHitDmg}` : `-${mitigatedHitDmg}`, fxt().enemyMain.x, fxt().enemyMain.y, '#ef4444');

    if (strike.heal > 0) {
      setPHp((hp) => Math.min(getLevelMaxHp(s2.pLvl || 1, s2.pStg), hp + strike.heal));
      addD(`+${strike.heal}`, fxt().playerMain.x - 8, fxt().playerMain.y - 6, '#22c55e');
      passiveNotes.push(tr(t, 'battle.pvp.note.heal', '🌿Heal'));
    }

    safeToIfBattleActive(() => {
      setEAnim('');
      setAtkEffect(null);
    }, 520);
    if (nextHp <= 0) {
      finishWithWinner('p1');
      return;
    }
  } else {
    const nextHp = Math.max(0, s2.pHp - mitigatedHitDmg);
    setPHp(nextHp);
    setPAnim('playerHit 0.45s ease');
    defenderHpAfterHit = nextHp;
    addD(strike.isCrit ? `💥-${mitigatedHitDmg}` : `-${mitigatedHitDmg}`, fxt().playerMain.x, fxt().playerMain.y, '#ef4444');

    if (strike.heal > 0) {
      const healed = Math.min(
        getStarterLevelMaxHp(s2.pvpStarter2, s2.pLvl || 1, s2.pStg),
        s2.pvpHp2 + strike.heal,
      );
      setPvpHp2(healed);
      setEHp(healed);
      addD(`+${strike.heal}`, fxt().enemyMain.x - 2, fxt().enemyMain.y - 1, '#22c55e');
      passiveNotes.push(tr(t, 'battle.pvp.note.heal', '🌿Heal'));
    }

    safeToIfBattleActive(() => {
      setPAnim('');
      setAtkEffect(null);
    }, 520);
    if (nextHp <= 0) {
      finishWithWinner('p2');
      return;
    }
  }

  if (defender.type === 'steel' && defenderHpAfterHit > 0 && chance(PVP.passive.steelCounterChance)) {
    const counterRaw = Math.round(mitigatedHitDmg * PVP.passive.steelCounterScale);
    const counterCap = Math.max(0, Math.round(PVP.passive.steelCounterCap));
    const rawCounterDmg = Math.max(0, Math.min(counterCap || counterRaw, counterRaw));
    const counterDmg = applyBossDamageReduction(rawCounterDmg, attacker.id);
    if (counterDmg > 0) {
      passiveNotes.push(tr(t, 'battle.pvp.note.steelCounter', '⚙️Steel Counter'));
      if (currentTurn === 'p1') {
        const attackerNextHp = Math.max(0, s2.pHp - counterDmg);
        setPHp(attackerNextHp);
        addD(`⚙️-${counterDmg}`, fxt().playerMain.x, fxt().playerMain.y, '#94a3b8');
        setPAnim('playerHit 0.45s ease');
        safeToIfBattleActive(() => setPAnim(''), 520);
        if (attackerNextHp <= 0) {
          finishWithWinner('p2');
          return;
        }
      } else {
        const attackerNextHp = Math.max(0, s2.pvpHp2 - counterDmg);
        setPvpHp2(attackerNextHp);
        setEHp(attackerNextHp);
        addD(`⚙️-${counterDmg}`, fxt().enemyMain.x, fxt().enemyMain.y, '#94a3b8');
        setEAnim('enemyHit 0.45s ease');
        safeToIfBattleActive(() => setEAnim(''), 520);
        if (attackerNextHp <= 0) {
          finishWithWinner('p1');
          return;
        }
      }
      sfx.play('specDef');
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
  // Do not let a fast next answer overlap the previous effect's cleanup timer.
  safeToIfBattleActive(() => swapPvpTurnToText({
    nextTurn,
    setPvpTurn,
    setPvpActionCount,
    setPhase,
  }), 520);
}
