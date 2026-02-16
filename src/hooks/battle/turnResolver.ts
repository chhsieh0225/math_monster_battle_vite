import { PLAYER_MAX_HP } from '../../data/constants.js';
import { PVP_BALANCE } from '../../data/pvpBalance.js';
import { getEff } from '../../data/typeEffectiveness.js';
import {
  bestEffectiveness,
  calcAttackDamage,
  calcEnemyDamage,
  movePower,
} from '../../utils/damageCalc.js';
import { computeBossPhase, decideBossTurnEvent } from '../../utils/turnFlow.ts';

type ChanceFn = (probability: number) => boolean;
type RandomFn = () => number;

type EntityLike = {
  id?: string;
  maxHp?: number;
  atk?: number;
  mType?: string;
  trait?: string;
};

type MoveLike = {
  basePower: number;
  growth: number;
  type: string;
  type2?: string;
  risky?: boolean;
};

type CritProfile = {
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
  grassSustain: { healRatio: number; healCap: number };
  lightComeback?: { maxBonus?: number };
  firstStrikeScale?: number;
  effectScale: { strong: number; weak: number; neutral: number };
  crit?: {
    chance?: number;
    riskyBonus?: number;
    minChance?: number;
    maxChance?: number;
    multiplier?: number;
    byType?: Record<string, CritProfile>;
  };
};

type BossTurnParams = {
  enemy?: EntityLike | null;
  eHp: number;
  bossTurn: number;
  bossCharging: boolean;
  sealedMove: number;
};

type BossTurnState = {
  isBoss: boolean;
  phase: number;
  nextBossTurn: number;
  bossEvent: string;
};

type EnemyPrimaryStrikeParams = {
  enemy?: EntityLike | null;
  enemyHp: number;
  starterType?: string;
  bossPhase: number;
  chance: ChanceFn;
};

type EnemyPrimaryStrikeResult = {
  trait: string | null;
  scaledAtk: number;
  isBlaze: boolean;
  isCrit: boolean;
  defEff: number;
  dmg: number;
};

type EnemyAssistStrikeParams = {
  enemySub?: EntityLike | null;
  starterType?: string;
  atkScale?: number;
  damageCap?: number;
};

type EnemyAssistStrikeResult = {
  scaledAtk: number;
  defEff: number;
  dmg: number;
};

type PlayerStrikeParams = {
  move: MoveLike;
  enemy?: EntityLike | null;
  moveIdx: number;
  moveLvl: number;
  didLevel: boolean;
  maxPower?: number;
  streak: number;
  stageBonus: number;
  cursed: boolean;
  starterType?: string;
  playerHp: number;
  attackerMaxHp?: number;
  bossPhase: number;
};

type PlayerStrikeResult = {
  pow: number;
  eff: number;
  dmg: number;
  isFortress: boolean;
  wasCursed: boolean;
  braveActive: boolean;
};

type RiskySelfDamageParams = {
  move: MoveLike;
  moveLvl: number;
  moveIdx: number;
};

type PvpStrikeParams = {
  move?: MoveLike | null;
  moveIdx?: number | null;
  attackerType?: string;
  defenderType?: string | null;
  attackerHp?: number;
  attackerMaxHp?: number;
  firstStrike?: boolean;
  random?: RandomFn;
  critRandom?: RandomFn | null;
};

type PvpStrikeResult = {
  basePow: number;
  eff: number;
  dmg: number;
  variance: number;
  heal: number;
  isCrit: boolean;
  critChance: number;
  critMultiplier: number;
  antiCritRate: number;
  antiCritDamage: number;
  passiveLabel: string;
  passiveLabelKey: string;
  passiveLabelFallback: string;
};

const PVP = PVP_BALANCE as unknown as PvpBalanceConfig;
const getEffTyped = getEff as (moveType?: string, monType?: string) => number;
const calcEnemyDamageTyped = calcEnemyDamage as (atkStat: number, defEff: number) => number;
const movePowerTyped = movePower as (move: MoveLike, lvl: number, idx: number) => number;
const bestEffectivenessTyped = bestEffectiveness as (
  move: MoveLike,
  enemy: { mType?: string } | null,
) => number;
const calcAttackDamageTyped = calcAttackDamage as (params: {
  basePow: number;
  streak: number;
  stageBonus: number;
  effMult: number;
}) => number;

export function resolveBossTurnState({
  enemy,
  eHp,
  bossTurn,
  bossCharging,
  sealedMove,
}: BossTurnParams): BossTurnState {
  const isBoss = enemy?.id === 'boss';
  if (!isBoss) {
    return {
      isBoss: false,
      phase: 0,
      nextBossTurn: bossTurn,
      bossEvent: 'attack',
    };
  }

  const phase = computeBossPhase(eHp, enemy.maxHp);
  const nextBossTurn = bossTurn + 1;
  const bossEvent = decideBossTurnEvent({
    isBoss: true,
    bossCharging,
    turnCount: nextBossTurn,
    bossPhase: phase,
    sealedMove,
  });

  return {
    isBoss: true,
    phase,
    nextBossTurn,
    bossEvent,
  };
}

export function resolveEnemyPrimaryStrike({
  enemy,
  enemyHp,
  starterType,
  bossPhase,
  chance,
}: EnemyPrimaryStrikeParams): EnemyPrimaryStrikeResult {
  const trait = enemy?.trait || null;
  const atkMult = bossPhase >= 3 ? 2.0 : bossPhase >= 2 ? 1.5 : 1.0;
  let scaledAtk = Math.round((enemy?.atk || 0) * atkMult);

  const isBlaze = trait === 'blaze' && enemyHp <= (enemy?.maxHp || 0) * 0.5;
  if (isBlaze) scaledAtk = Math.round(scaledAtk * 1.5);

  const isCrit = trait === 'berserk' && chance(0.3);
  const defEff = getEffTyped(enemy?.mType, starterType);
  const base = calcEnemyDamageTyped(scaledAtk, defEff);
  const dmg = isCrit ? Math.round(base * 1.5) : base;

  return {
    trait,
    scaledAtk,
    isBlaze,
    isCrit,
    defEff,
    dmg,
  };
}

export function resolveEnemyAssistStrike({
  enemySub,
  starterType,
  atkScale = 0.55,
  damageCap = 24,
}: EnemyAssistStrikeParams): EnemyAssistStrikeResult {
  const scaledAtk = Math.max(1, Math.round((enemySub?.atk || 0) * atkScale));
  const defEff = getEffTyped(enemySub?.mType, starterType);
  let dmg = calcEnemyDamageTyped(scaledAtk, defEff);
  if (Number.isFinite(damageCap)) dmg = Math.min(dmg, damageCap);

  return {
    scaledAtk,
    defEff,
    dmg,
  };
}

export function resolvePlayerStrike({
  move,
  enemy,
  moveIdx,
  moveLvl,
  didLevel,
  maxPower,
  streak,
  stageBonus,
  cursed,
  starterType,
  playerHp,
  attackerMaxHp = PLAYER_MAX_HP,
  bossPhase,
}: PlayerStrikeParams): PlayerStrikeResult {
  const leveledPower = move.basePower + moveLvl * move.growth;
  const cap = Number.isFinite(maxPower) ? (maxPower as number) : null;
  const pow = didLevel
    ? (cap == null ? leveledPower : Math.min(leveledPower, cap))
    : movePowerTyped(move, moveLvl, moveIdx);
  const eff = bestEffectivenessTyped(move, enemy ?? null);

  let dmg = calcAttackDamageTyped({
    basePow: pow,
    streak,
    stageBonus,
    effMult: eff,
  });

  const isFortress = enemy?.trait === 'fortress';
  if (isFortress) dmg = Math.round(dmg * 0.7);

  const wasCursed = !!cursed;
  if (wasCursed) dmg = Math.round(dmg * 0.6);

  const maxHpForBrave = Math.max(1, attackerMaxHp);
  const braveActive = starterType === 'light' && playerHp < maxHpForBrave;
  if (braveActive) {
    const braveMult = 1 + ((maxHpForBrave - playerHp) / maxHpForBrave) * 0.5;
    dmg = Math.round(dmg * braveMult);
  }

  if (bossPhase >= 3) dmg = Math.round(dmg * 1.3);

  return {
    pow,
    eff,
    dmg,
    isFortress,
    wasCursed,
    braveActive,
  };
}

export function resolveRiskySelfDamage({ move, moveLvl, moveIdx }: RiskySelfDamageParams): number {
  return Math.round(movePowerTyped(move, moveLvl, moveIdx) * 0.4);
}

export function resolvePvpStrike({
  move,
  moveIdx,
  attackerType,
  defenderType,
  attackerHp = PLAYER_MAX_HP,
  attackerMaxHp = PLAYER_MAX_HP,
  firstStrike = false,
  random = Math.random,
  critRandom = null,
}: PvpStrikeParams): PvpStrikeResult {
  if (!move || moveIdx == null) {
    return {
      basePow: 0,
      eff: 1,
      dmg: 0,
      variance: 1,
      heal: 0,
      isCrit: false,
      critChance: 0,
      critMultiplier: 1,
      antiCritRate: 0,
      antiCritDamage: 0,
      passiveLabel: '',
      passiveLabelKey: '',
      passiveLabelFallback: '',
    };
  }

  const moveSlot = moveIdx;
  const attackerTypeKey = attackerType ?? '';
  const defenderTypeKey = defenderType ?? '';

  const basePow = movePowerTyped(move, 1, moveSlot);
  const eff = bestEffectivenessTyped(move, defenderType ? { mType: defenderType } : null);
  const effectScale = eff > 1
    ? PVP.effectScale.strong
    : eff < 1
      ? PVP.effectScale.weak
      : PVP.effectScale.neutral;

  const rand01 = Math.max(0, Math.min(1, random()));
  const variance = PVP.varianceMin
    + rand01 * (PVP.varianceMax - PVP.varianceMin);
  const slotScale = PVP.moveSlotScale[moveSlot] ?? 1;
  const typeScale = PVP.typeScale[attackerTypeKey] ?? 1;
  const skillScale = PVP.skillScaleByType[attackerTypeKey]?.[moveSlot] ?? 1;
  const passiveScale = PVP.passiveScaleByType[attackerTypeKey] ?? 1;
  const riskyScale = move.risky ? PVP.riskyScale : 1;
  const hpRatio = attackerMaxHp > 0
    ? Math.max(0, Math.min(1, attackerHp / attackerMaxHp))
    : 1;
  const lightComebackBonus = attackerTypeKey === 'light'
    ? (1 - hpRatio) * (PVP.lightComeback?.maxBonus ?? 0)
    : 0;
  const comebackScale = 1 + lightComebackBonus;
  const firstStrikeScale = firstStrike ? (PVP.firstStrikeScale ?? 1) : 1;
  const attackerCritProfile = PVP.crit?.byType?.[attackerTypeKey] || {};
  const defenderCritProfile = PVP.crit?.byType?.[defenderTypeKey] || {};
  const critRoller = typeof critRandom === 'function' ? critRandom : random;
  const baseCritChance = PVP.crit?.chance ?? 0;
  const riskyCritBonus = move.risky ? (PVP.crit?.riskyBonus ?? 0) : 0;
  const typeCritChanceBonus = attackerCritProfile.critChanceBonus ?? 0;
  const antiCritRate = defenderCritProfile.antiCritRate ?? 0;
  const minCritChance = PVP.crit?.minChance ?? 0;
  const maxCritChance = PVP.crit?.maxChance ?? 1;
  const cappedCritChance = Math.min(
    maxCritChance,
    Math.max(minCritChance, baseCritChance + riskyCritBonus + typeCritChanceBonus - antiCritRate),
  );
  const critChance = Math.max(0, Math.min(1, cappedCritChance));
  const critRoll = Math.max(0, Math.min(1, critRoller()));
  const isCrit = critRoll < critChance;
  const typeCritDamageBonus = attackerCritProfile.critDamageBonus ?? 0;
  const antiCritDamage = Math.max(0, Math.min(0.95, defenderCritProfile.antiCritDamage ?? 0));
  const rawCritMultiplier = (PVP.crit?.multiplier ?? 1) + typeCritDamageBonus;
  const critMultiplier = Math.max(1, rawCritMultiplier * (1 - antiCritDamage));
  const critScale = isCrit ? critMultiplier : 1;

  const rawDamage = basePow
    * PVP.baseScale
    * variance
    * slotScale
    * typeScale
    * skillScale
    * passiveScale
    * comebackScale
    * firstStrikeScale
    * effectScale
    * riskyScale
    * critScale;
  const dmg = Math.max(
    PVP.minDamage,
    Math.min(PVP.maxDamage, Math.round(rawDamage)),
  );

  const heal = attackerTypeKey === 'grass'
    ? Math.min(
      PVP.grassSustain.healCap,
      Math.max(0, Math.round(dmg * PVP.grassSustain.healRatio)),
    )
    : 0;
  const passiveLabelKey = attackerTypeKey === 'light' && lightComebackBonus >= 0.06
    ? 'battle.pvp.note.lightCourage'
    : attackerTypeKey === 'grass' && heal > 0
      ? 'battle.pvp.note.grassSustain'
      : '';
  const passiveLabelFallback = passiveLabelKey === 'battle.pvp.note.lightCourage'
    ? '🦁 Courage Heart'
    : passiveLabelKey === 'battle.pvp.note.grassSustain'
      ? '🌿 Life Sustain'
      : '';

  return {
    basePow,
    eff,
    dmg,
    variance,
    heal,
    isCrit,
    critChance,
    critMultiplier,
    antiCritRate,
    antiCritDamage,
    passiveLabel: passiveLabelFallback,
    passiveLabelKey,
    passiveLabelFallback,
  };
}
