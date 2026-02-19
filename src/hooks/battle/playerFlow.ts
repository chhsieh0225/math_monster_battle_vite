import {
  HITS_PER_LVL,
  MAX_MOVE_LVL,
  POWER_CAPS,
} from '../../data/constants.ts';
import { BALANCE_CONFIG } from '../../data/balanceConfig.ts';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import { bestAttackType, freezeChance } from '../../utils/damageCalc.ts';
import { getLevelMaxHp, getStarterLevelMaxHp, getStarterStageIdx } from '../../utils/playerHp.ts';
import {
  getAttackEffectClearDelay,
  getAttackEffectHitDelay,
  getAttackEffectNextStepDelay,
} from '../../utils/effectTiming.ts';
import { applyBossDamageReduction } from '../../utils/bossDamage.ts';
import type { AchievementId } from '../../types/game';
import { effectOrchestrator } from './effectOrchestrator.ts';
import { isBattleActiveState, scheduleIfBattleActive } from './menuResetGuard.ts';
import { resolvePlayerStrike, resolveRiskySelfDamage } from './turnResolver.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type BattleMove = {
  name: string;
  basePower: number;
  growth: number;
  type: string;
  type2?: string;
  risky?: boolean;
};

type BattleStarter = {
  name?: string;
  type: string;
};

type BattleAlly = {
  name?: string;
  selectedStageIdx?: number;
};

type BattleEnemy = {
  id?: string;
  trait?: string;
  maxHp: number;
  mType?: string;
};

type BattleQuestion = {
  answer?: number;
  steps?: string[];
};

type BattleRuntimeState = {
  allySub: BattleAlly | null;
  starter: BattleStarter | null;
  pHpSub: number;
  pHp: number;
  streak: number;
  maxStreak: number;
  passiveCount: number;
  specDef: boolean;
  mHits: number[];
  mLvls: number[];
  selIdx: number | null;
  pStg: number;
  pLvl?: number;
  enemy: BattleEnemy | null;
  cursed: boolean;
  bossPhase: number;
  bossCharging: boolean;
  shadowShieldCD: number;
  furyRegenUsed: boolean;
  eHp: number;
  burnStack: number;
  staticStack: number;
  q: BattleQuestion | null;
  phase?: string;
  screen?: string;
};

type StateRef = {
  current: BattleRuntimeState;
};

type NumberSetter = (value: number | ((prev: number) => number)) => void;
type NumberArraySetter = (value: number[] | ((prev: number[]) => number[])) => void;
type BoolSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
type TextSetter = (value: string) => void;
type NullableNumberSetter = (value: number | null) => void;
type PhaseSetter = (value: string) => void;

type FeedbackValue = {
  correct: boolean;
  answer?: number;
  steps?: string[];
};

type AttackEffectValue = {
  type: string;
  idx: number;
  lvl: number;
};

type EffectMessage = {
  text: string;
  color: string;
};

type SafeTo = (fn: () => void, ms: number) => void;
type ChanceFn = (probability: number) => boolean;
type PendingTextAdvanceSetter = (action: (() => void) | null) => void;

type KoTarget = 'main' | 'sub';

type PlayerPartyKoHandler = (args: { target: KoTarget; reason: string }) => unknown;

type AllySupportTurnRunner = (args: { delayMs: number; onDone: () => void }) => boolean;

type RunPlayerAnswerArgs = {
  correct: boolean;
  move: BattleMove | null;
  starter: BattleStarter | null;
  attackerSlot?: KoTarget;
  sr: StateRef;
  safeTo: SafeTo;
  chance: ChanceFn;
  sfx: {
    play: (name: string) => void;
    playMove?: (type: string, idx?: number) => void;
  };
  setFb: (value: FeedbackValue) => void;
  setTC: NumberSetter;
  setTW: NumberSetter;
  setStreak: NumberSetter;
  setPassiveCount: NumberSetter;
  setCharge: NumberSetter;
  setMaxStreak: NumberSetter;
  setSpecDef: BoolSetter;
  tryUnlock: (id: AchievementId) => void;
  setMLvls: NumberArraySetter;
  setMLvlUp: NullableNumberSetter;
  setMHits: NumberArraySetter;
  setPhase: PhaseSetter;
  setPAnim: TextSetter;
  setAtkEffect: (value: AttackEffectValue | null) => void;
  setEAnim: TextSetter;
  setEffMsg: (value: EffectMessage | null) => void;
  setBossCharging: BoolSetter;
  setBurnStack: NumberSetter;
  setPHp: NumberSetter;
  setPHpSub?: NumberSetter;
  setFrozen: BoolSetter;
  frozenR: { current: boolean };
  setStaticStack: NumberSetter;
  setEHp: NumberSetter;
  addD: (value: string, x: number, y: number, color: string) => void;
  doEnemyTurn: () => void;
  handleVictory: (verb?: string) => void;
  handleFreeze: () => void;
  setCursed: BoolSetter;
  setShadowShieldCD: NumberSetter;
  setFuryRegenUsed: BoolSetter;
  _endSession: (completed: boolean, reasonOverride?: string | null) => void;
  setScreen: (screen: string) => void;
  setBText: TextSetter;
  handlePlayerPartyKo?: PlayerPartyKoHandler;
  runAllySupportTurn?: AllySupportTurnRunner;
  getCollectionDamageScale?: (attackType: string) => number;
  setPendingTextAdvanceAction?: PendingTextAdvanceSetter;
  t?: Translator;
};

type ApplyDamageArgs = {
  state: BattleRuntimeState;
  damage: number;
  popupText?: string | null;
  color?: string;
};

const HITS_PER_LVL_N = HITS_PER_LVL;
const MAX_MOVE_LVL_N = MAX_MOVE_LVL;
const POWER_CAPS_N = POWER_CAPS;
const TRAIT_BALANCE = BALANCE_CONFIG.traits;

const HIT_ANIMS: Record<string, string> = {
  fire: 'enemyFireHit 0.6s ease',
  electric: 'enemyElecHit 0.6s ease',
  water: 'enemyWaterHit 0.7s ease',
  ice: 'enemyWaterHit 0.7s ease',
  grass: 'enemyGrassHit 0.6s ease',
  dark: 'enemyDarkHit 0.8s ease',
  light: 'enemyFireHit 0.6s ease',
};

const HIT_COLORS: Record<string, string> = {
  fire: '#ef4444',
  electric: '#fbbf24',
  water: '#3b82f6',
  ice: '#67e8f9',
  grass: '#22c55e',
  dark: '#a855f7',
  light: '#f59e0b',
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

export function runPlayerAnswer({
  correct,
  move,
  starter,
  attackerSlot = 'main',
  sr,
  safeTo,
  chance,
  sfx,
  setFb,
  setTC,
  setTW,
  setStreak,
  setPassiveCount,
  setCharge,
  setMaxStreak,
  setSpecDef,
  tryUnlock,
  setMLvls,
  setMLvlUp,
  setMHits,
  setPhase,
  setPAnim,
  setAtkEffect,
  setEAnim,
  setEffMsg,
  setBossCharging,
  setBurnStack,
  setPHp,
  setPHpSub,
  setFrozen,
  frozenR,
  setStaticStack,
  setEHp,
  addD,
  doEnemyTurn,
  handleVictory,
  handleFreeze,
  setCursed,
  setShadowShieldCD,
  setFuryRegenUsed,
  _endSession,
  setScreen,
  setBText,
  handlePlayerPartyKo,
  runAllySupportTurn,
  getCollectionDamageScale,
  setPendingTextAdvanceAction,
  t,
}: RunPlayerAnswerArgs): void {
  try {
  const s = sr.current;
  if (!s || !move || !starter) return;
  if (!isBattleActiveState(s)) return;
  if (s.selIdx == null || !s.enemy) return;
  const moveIdx = s.selIdx;

  const isBattleActive = (): boolean => isBattleActiveState(sr.current);
  const safeToIfBattleActive = (fn: () => void, ms: number): void => (
    scheduleIfBattleActive(safeTo, () => sr.current, fn, ms)
  );

  const loseToGameOver = (message = tr(t, 'battle.ally.ko', 'Your partner has fallen...')): void => {
    _endSession(false);
    setPhase('ko');
    setBText(message);
    setScreen('gameover');
  };

  const resolveMainKo = (message = tr(t, 'battle.ally.ko', 'Your partner has fallen...')): unknown => {
    if (handlePlayerPartyKo) {
      return handlePlayerPartyKo({ target: 'main', reason: message });
    }
    loseToGameOver(message);
    return 'gameover';
  };

  const isSubAttacker = attackerSlot === 'sub';
  const attackerName = isSubAttacker
    ? (s.allySub?.name || tr(t, 'battle.role.sub', 'Sub'))
    : (s.starter?.name || tr(t, 'battle.role.main', 'Main'));

  const getAttackerHp = (state: BattleRuntimeState): number => (
    isSubAttacker ? (state.pHpSub || 0) : (state.pHp || 0)
  );

  const getAttackerMaxHp = (state: BattleRuntimeState): number => (
    isSubAttacker
      ? getStarterLevelMaxHp(state.allySub, state.pLvl || 1, state.pStg || 0)
      : getLevelMaxHp(state.pLvl || 1, state.pStg || 0)
  );

  const healAttacker = (heal: number): void => {
    const maxHp = getAttackerMaxHp(sr.current);
    if (isSubAttacker && typeof setPHpSub === 'function') {
      setPHpSub((h) => Math.min(h + heal, maxHp));
      return;
    }
    setPHp((h) => Math.min(h + heal, maxHp));
  };

  const applyDamageToAttacker = ({ state, damage, popupText = null, color = '#ef4444' }: ApplyDamageArgs): number => {
    const baseHp = getAttackerHp(state);
    const nextHp = Math.max(0, baseHp - damage);
    if (isSubAttacker && typeof setPHpSub === 'function') {
      setPHpSub(nextHp);
    } else {
      setPHp(nextHp);
      setPAnim('playerHit 0.5s ease');
      safeToIfBattleActive(() => setPAnim(''), 500);
    }
    addD(
      popupText || `-${damage}`,
      isSubAttacker ? 112 : 60,
      isSubAttacker ? 146 : 170,
      color,
    );
    return nextHp;
  };

  const resolveActiveKo = (message = tr(t, 'battle.ally.ko', 'Your partner has fallen...')): unknown => {
    if (!isSubAttacker) return resolveMainKo(message);
    if (handlePlayerPartyKo) {
      return handlePlayerPartyKo({ target: 'sub', reason: message });
    }
    loseToGameOver(message);
    return 'gameover';
  };
  setPendingTextAdvanceAction?.(null);

  if (correct) {
    setFb({ correct: true });
    setTC((c) => c + 1);
    const ns = s.streak + 1;
    sfx.play(ns >= 5 ? 'crit' : 'hit');
    setStreak(ns);
    setCharge((c) => Math.min(c + 1, 3));
    if (ns > s.maxStreak) setMaxStreak(ns);

    const np = s.passiveCount + 1;
    if (np >= TRAIT_BALANCE.player.specDefComboTrigger) {
      setPassiveCount(0);
      if (!s.specDef) {
        setSpecDef(true);
        tryUnlock('spec_def');
        sfx.play('specDef');
      }
    } else {
      setPassiveCount(np);
    }

    if (ns >= 5) tryUnlock('streak_5');
    if (ns >= 10) tryUnlock('streak_10');

    const nh = [...s.mHits];
    nh[moveIdx] += 1;
    const cl = s.mLvls[moveIdx];
    let didLvl = false;
    if (nh[moveIdx] >= HITS_PER_LVL_N * cl && cl < MAX_MOVE_LVL_N) {
      const np2 = move.basePower + cl * move.growth;
      if (np2 <= POWER_CAPS_N[moveIdx]) {
        const nl = [...s.mLvls];
        nl[moveIdx] += 1;
        setMLvls(nl);
        didLvl = true;
        nh[moveIdx] = 0;
        setMLvlUp(moveIdx);
        safeToIfBattleActive(() => setMLvlUp(null), 2000);
        sfx.play('levelUp');
        if (nl[moveIdx] >= MAX_MOVE_LVL_N) tryUnlock('move_max');
        if (nl.every((v) => v >= MAX_MOVE_LVL_N)) tryUnlock('all_moves_max');
      }
    }
    setMHits(nh);

    setPhase('playerAtk');
    effectOrchestrator.runPlayerLunge({
      safeTo,
      setPAnim,
      onReady: () => {
        if (!isBattleActive()) return;
        const s2 = sr.current;
        const dmgType = bestAttackType(move, s2.enemy);
        const vfxType = move.risky && move.type2 ? move.type2 : dmgType;
        const collectionDamageScale = Math.max(1, getCollectionDamageScale?.(dmgType) ?? 1);

        const effectMeta = {
          idx: moveIdx,
          lvl: s2.mLvls[moveIdx],
        };
        const effectTimeline = {
          hitDelay: getAttackEffectHitDelay(vfxType),
          clearDelay: getAttackEffectClearDelay(effectMeta),
          nextDelay: getAttackEffectNextStepDelay(effectMeta),
        };
        setAtkEffect({ type: vfxType, idx: effectMeta.idx, lvl: effectMeta.lvl });
        if (typeof sfx.playMove === 'function') sfx.playMove(vfxType, effectMeta.idx);
        else sfx.play(vfxType);

        safeToIfBattleActive(() => {
          const s3 = sr.current;
          if (!s3.enemy) {
            setAtkEffect(null);
            return;
          }
          const strike = resolvePlayerStrike({
            move,
            enemy: s3.enemy,
            moveIdx,
            moveLvl: s3.mLvls[moveIdx],
            didLevel: didLvl,
            maxPower: POWER_CAPS_N[moveIdx],
            streak: ns,
            stageBonus: isSubAttacker ? getStarterStageIdx(s3.allySub) : s3.pStg,
            cursed: s3.cursed,
            starterType: starter.type,
            playerHp: getAttackerHp(s3),
            attackerMaxHp: getAttackerMaxHp(s3),
            bossPhase: s3.bossPhase,
            collectionDamageScale,
            chance,
          });
          const {
            eff,
            isFortress,
            wasCursed,
            isCrit,
            dmg,
          } = strike;

          const isPhantom = s3.enemy.trait === 'phantom' && chance(TRAIT_BALANCE.player.phantomDodgeChance);
          if (isPhantom) {
            setEAnim('dodgeSlide 0.9s ease');
            setEffMsg({ text: tr(t, 'battle.effect.phantomDodge', '👻 Phantom Dodge!'), color: '#c084fc' });
            safeToIfBattleActive(() => setEffMsg(null), 1500);
            addD('MISS!', 155, 50, '#c084fc');
            safeToIfBattleActive(() => {
              setEAnim('');
              setAtkEffect(null);
            }, effectTimeline.clearDelay);
            safeToIfBattleActive(() => doEnemyTurn(), effectTimeline.nextDelay);
            return;
          }

          if (wasCursed) setCursed(false);

          if (isCrit) {
            sfx.play('crit');
            setEffMsg({ text: tr(t, 'battle.effect.crit', '💥 Critical!'), color: '#ff6b00' });
            safeToIfBattleActive(() => setEffMsg(null), 1500);
          } else if (wasCursed) {
            setEffMsg({ text: tr(t, 'battle.effect.curseWeak', '💀 Curse weakened the attack...'), color: '#a855f7' });
            safeToIfBattleActive(() => setEffMsg(null), 1500);
          } else if (isFortress) {
            setEffMsg({ text: tr(t, 'battle.effect.fortressGuard', '🛡️ Fortress reduced damage!'), color: '#94a3b8' });
            safeToIfBattleActive(() => setEffMsg(null), 1500);
          } else if (starter.type === 'light' && getAttackerHp(s3) < getAttackerMaxHp(s3) * 0.5) {
            setEffMsg({ text: tr(t, 'battle.effect.lightCourage', '🦁 Courage Heart! ATK↑'), color: '#f59e0b' });
            safeToIfBattleActive(() => setEffMsg(null), 1500);
          } else if (eff > 1) {
            sfx.play('effective');
            setEffMsg({ text: tr(t, 'battle.effect.super', 'Super effective!'), color: '#22c55e' });
            safeToIfBattleActive(() => setEffMsg(null), 1500);
          } else if (eff < 1) {
            sfx.play('resist');
            setEffMsg({ text: tr(t, 'battle.effect.notVery', 'Not very effective...'), color: '#94a3b8' });
            safeToIfBattleActive(() => setEffMsg(null), 1500);
          }

          const wasBossCharging = Boolean(s3.bossCharging && BOSS_IDS.has(s3.enemy.id ?? ''));
          if (wasBossCharging) {
            setBossCharging(false);
            safeToIfBattleActive(() => addD(tr(t, 'battle.tag.chargeInterrupted', '💥Charge Interrupted!'), 155, 30, '#fbbf24'), 400);
          }

          const runChargeCounter = (baseDamage: number): boolean => {
            if (!wasBossCharging) return false;
            const counterRatio = Math.max(0, TRAIT_BALANCE.boss.chargeCounterRatio || 0);
            if (counterRatio <= 0 || baseDamage <= 0) return false;
            const counterDmg = Math.max(1, Math.round(baseDamage * counterRatio));
            const nextAttackerHp = applyDamageToAttacker({
              state: s3,
              damage: counterDmg,
              popupText: `⚠️-${counterDmg}`,
              color: '#fb923c',
            });
            sfx.play('specDef');
            setEffMsg({ text: tr(t, 'battle.effect.chargeCounter', '⚠️ Charge Counter!'), color: '#fb923c' });
            safeToIfBattleActive(() => setEffMsg(null), 1500);
            if (nextAttackerHp <= 0) {
              safeToIfBattleActive(() => {
                sfx.play('ko');
                resolveActiveKo(tr(t, 'battle.ko.chargeCounter', '{name} was knocked out by charge retaliation...', { name: attackerName }));
              }, 800);
              return true;
            }
            return false;
          };

          // Dark Dragon King shadow shield: 20% full block, 50% reduce by 40%
          let finalDmg = dmg;
          if (s3.enemy.id === 'boss') {
            const fullBlock = chance(TRAIT_BALANCE.boss.shadowShieldFullBlockChance || 0);
            const partialBlock = !fullBlock && chance(TRAIT_BALANCE.boss.shadowShieldPartialBlockChance || 0);
            if (fullBlock) {
              setShadowShieldCD(0);
              sfx.play('specDef');
              setEAnim('shieldPulse 0.8s ease');
              setEffMsg({ text: tr(t, 'battle.effect.shadowShield', '🛡️ Shadow Shield absorbed the attack!'), color: '#7c3aed' });
              safeToIfBattleActive(() => setEffMsg(null), 1500);
              addD(tr(t, 'battle.tag.shielded', '🛡️BLOCKED'), 155, 50, '#7c3aed');
              const chargeCounterKo = runChargeCounter(dmg);
              safeToIfBattleActive(() => {
                setEAnim('');
                setAtkEffect(null);
              }, effectTimeline.clearDelay);
              if (!chargeCounterKo) safeToIfBattleActive(() => doEnemyTurn(), effectTimeline.nextDelay);
              return;
            }
            if (partialBlock) {
              setShadowShieldCD(1);
              finalDmg = Math.max(1, Math.round(dmg * (TRAIT_BALANCE.boss.shadowShieldPartialDamageScale || 1)));
              sfx.play('specDef');
              setEffMsg({ text: tr(t, 'battle.effect.shadowShieldPartial', '🛡️ Shadow Shield reduced damage!'), color: '#a78bfa' });
              safeToIfBattleActive(() => setEffMsg(null), 1500);
              addD(tr(t, 'battle.tag.parry', '⚔️PARRY'), 155, 30, '#a78bfa');
            } else {
              setShadowShieldCD(-1);
            }
          }

          // Sword God parry: 50% chance to halve incoming damage
          if (s3.enemy.id === 'boss_sword_god' && chance(TRAIT_BALANCE.boss.swordParryChance)) {
            finalDmg = Math.max(1, Math.round(dmg * TRAIT_BALANCE.boss.swordParryScale));
            sfx.play('specDef');
            setEffMsg({ text: tr(t, 'battle.effect.swordParry', '⚔️ Sword Parry! Damage halved!'), color: '#94a3b8' });
            safeToIfBattleActive(() => setEffMsg(null), 1500);
            addD(tr(t, 'battle.tag.parry', '⚔️PARRY'), 155, 30, '#94a3b8');
          }

          const appliedHitDmg = applyBossDamageReduction(finalDmg, s3.enemy.id);
          let afterHp = Math.max(0, s3.eHp - appliedHitDmg);

          let newBurn = s3.burnStack;
          if (starter.type === 'fire' && afterHp > 0) {
            newBurn = Math.min(s3.burnStack + 1, TRAIT_BALANCE.player.burnMaxStacks);
            setBurnStack(newBurn);
            const burnRawDmg = newBurn * TRAIT_BALANCE.player.burnPerStackDamage;
            const burnDmg = applyBossDamageReduction(burnRawDmg, s3.enemy.id);
            afterHp = Math.max(0, afterHp - burnDmg);
            safeToIfBattleActive(() => addD(`🔥-${burnDmg}`, 155, 50, '#f97316'), 500);
          }

          if (starter.type === 'grass') {
            const heal = TRAIT_BALANCE.player.grassHealPerMoveLevel * s3.mLvls[moveIdx];
            healAttacker(heal);
            sfx.play('heal');
            safeToIfBattleActive(() => addD(`+${heal}`, isSubAttacker ? 112 : 50, isSubAttacker ? 146 : 165, '#22c55e'), 500);
          }

          let willFreeze = false;
          if ((starter.type === 'water' || starter.type === 'ice') && afterHp > 0) {
            if (chance(freezeChance(s3.mLvls[moveIdx], move.risky))) {
              willFreeze = true;
              setFrozen(true);
              frozenR.current = true;
              sfx.play('freeze');
              safeToIfBattleActive(() => addD(tr(t, 'battle.tag.freeze', '❄️Frozen'), 155, 50, '#38bdf8'), 600);
            }
          }

          if (starter.type === 'electric' && afterHp > 0) {
            const newStatic = Math.min(s3.staticStack + 1, TRAIT_BALANCE.player.staticMaxStacks);
            setStaticStack(newStatic);
            if (newStatic >= TRAIT_BALANCE.player.staticMaxStacks) {
              const staticRawDmg = TRAIT_BALANCE.player.staticDischargeDamage;
              const staticDmg = applyBossDamageReduction(staticRawDmg, s3.enemy.id);
              afterHp = Math.max(0, afterHp - staticDmg);
              setStaticStack(0);
              sfx.play('staticDischarge');
              safeToIfBattleActive(() => addD(`⚡-${staticDmg}`, 155, 50, '#fbbf24'), 500);
            }
          }

          // Crazy Dragon fury regen: one-time 15% HP heal when HP drops below 30%
          if (
            s3.enemy.id === 'boss_crazy_dragon'
            && !s3.furyRegenUsed
            && afterHp > 0
            && afterHp < s3.enemy.maxHp * TRAIT_BALANCE.boss.furyRegenThreshold
          ) {
            const healAmt = Math.round(s3.enemy.maxHp * TRAIT_BALANCE.boss.furyRegenHealRatio);
            afterHp = Math.min(afterHp + healAmt, s3.enemy.maxHp);
            setFuryRegenUsed(true);
            sfx.play('heal');
            safeToIfBattleActive(() => {
              addD(`+${healAmt}`, 155, 30, '#ef4444');
              setEffMsg({ text: tr(t, 'battle.effect.furyRegen', '🐉 Fury Regen! The dragon recovers!'), color: '#dc2626' });
              safeToIfBattleActive(() => setEffMsg(null), 1500);
            }, 600);
          }

          setEHp(afterHp);
          setEAnim(HIT_ANIMS[vfxType] || 'enemyHit 0.5s ease');
          const dmgColor = HIT_COLORS[vfxType] || '#ef4444';
          addD(isCrit ? `💥-${appliedHitDmg}` : `-${appliedHitDmg}`, 140, 55, isCrit ? '#ff6b00' : dmgColor);
          safeToIfBattleActive(() => {
            setEAnim('');
            setAtkEffect(null);
          }, effectTimeline.clearDelay);

          const chargeCounterKo = runChargeCounter(appliedHitDmg);
          if (chargeCounterKo) return;

          if (s3.enemy.trait === 'counter' && afterHp > 0) {
            const refDmg = Math.round(dmg * TRAIT_BALANCE.player.counterReflectRatio);
            if (refDmg > 0) {
              safeToIfBattleActive(() => {
                const s4 = sr.current;
                const nh4 = applyDamageToAttacker({
                  state: s4,
                  damage: refDmg,
                  popupText: `🛡️-${refDmg}`,
                  color: '#60a5fa',
                });
                setEffMsg({ text: tr(t, 'battle.effect.counterArmor', '🛡️ Counter Armor!'), color: '#60a5fa' });
                safeToIfBattleActive(() => setEffMsg(null), 1500);
                if (nh4 <= 0) {
                  safeToIfBattleActive(() => {
                    sfx.play('ko');
                    resolveActiveKo(tr(t, 'battle.ko.counter', '{name} was knocked out by counter damage...', { name: attackerName }));
                  }, 800);
                }
              }, 600);
            }
          }

          if (afterHp <= 0 && appliedHitDmg >= s3.enemy.maxHp) tryUnlock('one_hit');
          if (afterHp <= 0) {
            safeToIfBattleActive(() => handleVictory(), effectTimeline.nextDelay);
          } else {
            const continueAfterTurn = () => {
              if (willFreeze) handleFreeze();
              else doEnemyTurn();
            };
            if (runAllySupportTurn && runAllySupportTurn({
              delayMs: effectTimeline.nextDelay,
              onDone: continueAfterTurn,
            })) {
              return;
            }
            safeToIfBattleActive(continueAfterTurn, effectTimeline.nextDelay);
          }
        }, effectTimeline.hitDelay);
      },
    });
    return;
  }

  setFb({ correct: false, answer: s.q?.answer, steps: s.q?.steps || [] });
  sfx.play('wrong');
  setTW((w) => w + 1);
  setStreak(0);
  setPassiveCount(0);
  setCharge(0);

  safeToIfBattleActive(() => {
    const s2 = sr.current;
    if (move.risky) {
      const sd = resolveRiskySelfDamage({
        move,
        moveLvl: s2.mLvls[moveIdx],
        moveIdx,
      });
      const nh2 = applyDamageToAttacker({
        state: s2,
        damage: sd,
      });
      setBText(tr(t, 'battle.risky.backfire', '{move} went out of control! {name} took {damage} damage!', {
        move: move.name,
        name: attackerName,
        damage: sd,
      }));
      setPhase('text');
      setPendingTextAdvanceAction?.(() => {
        if (!isBattleActive()) return;
        if (nh2 <= 0) resolveActiveKo(tr(t, 'battle.ko.fallen', '{name} has fallen...', { name: attackerName }));
        else if (frozenR.current) handleFreeze();
        else doEnemyTurn();
      });
    } else {
      let mt = tr(t, 'battle.attack.miss', 'Attack missed!');
      if (s2.burnStack > 0) {
        const bd = s2.burnStack * TRAIT_BALANCE.player.burnPerStackDamage;
        const nh3 = Math.max(0, s2.eHp - bd);
        setEHp(nh3);
        addD(`🔥-${bd}`, 155, 50, '#f97316');
        mt += tr(t, 'battle.burn.tickShort', ' Burn -{damage}!', { damage: bd });
        if (nh3 <= 0) {
          setBText(mt);
          setPhase('text');
          setPendingTextAdvanceAction?.(() => {
            if (!isBattleActive()) return;
            handleVictory(tr(t, 'battle.victory.verb.burned', 'was burned down'));
          });
          return;
        }
      }
      setBText(mt);
      setPhase('text');
      setPendingTextAdvanceAction?.(() => {
        if (!isBattleActive()) return;
        if (frozenR.current) handleFreeze();
        else doEnemyTurn();
      });
    }
  }, 2500);
  } catch (err) {
    console.error('[playerFlow] runPlayerAnswer crashed:', err);
    try { setScreen('menu'); setPhase('menu'); setBText('⚠️ Battle error — returning to menu'); } catch { /* last resort */ }
  }
}
