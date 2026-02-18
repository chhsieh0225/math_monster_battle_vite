import { PLAYER_MAX_HP } from '../../data/constants.ts';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import { BALANCE_CONFIG } from '../../data/balanceConfig.ts';
import { PVP_BALANCE } from '../../data/pvpBalance.ts';
import { getEff, getDualEff } from '../../data/typeEffectiveness.ts';
import {
  bestEffectiveness,
  calcAttackDamage,
  calcEnemyDamage,
  movePower,
} from '../../utils/damageCalc.ts';
import { computeBossPhase, decideBossTurnEvent } from '../../utils/turnFlow.ts';
import { random as prngRandom } from '../../utils/prng.ts';

type ChanceFn = (probability: number) => boolean;
type RandomFn = () => number;

type EntityLike = {
  id?: string;
  maxHp?: number;
  atk?: number;
  mType?: string;
  mType2?: string;
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

type CritTuningConfig = {
  chance?: number;
  riskyBonus?: number;
  minChance?: number;
  maxChance?: number;
  multiplier?: number;
  maxAntiCritDamage?: number;
  byType?: Readonly<Record<string, CritProfile>>;
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
  critChance: number;
  critMultiplier: number;
  antiCritRate: number;
  antiCritDamage: number;
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
  chance?: ChanceFn | null;
};

type PlayerStrikeResult = {
  pow: number;
  eff: number;
  dmg: number;
  isFortress: boolean;
  wasCursed: boolean;
  braveActive: boolean;
  isCrit: boolean;
  critChance: number;
  critMultiplier: number;
  antiCritRate: number;
  antiCritDamage: number;
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

type ResolveCritOutcomeParams = {
  attackerType?: string | null;
  defenderType?: string | null;
  isRisky?: boolean;
  baseConfig?: CritTuningConfig | null;
  byType?: Readonly<Record<string, CritProfile>> | null;
  random?: RandomFn | null;
  chanceFn?: ChanceFn | null;
  chanceFloor?: number;
  multiplierFloor?: number;
  chanceBonus?: number;
  damageBonus?: number;
};

type CritOutcome = {
  isCrit: boolean;
  critChance: number;
  critMultiplier: number;
  antiCritRate: number;
  antiCritDamage: number;
  critScale: number;
};

const PVP = PVP_BALANCE;
const TRAIT_BALANCE = BALANCE_CONFIG.traits;
const GLOBAL_CRIT = BALANCE_CONFIG.crit;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hasOwnKey<T extends object>(obj: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function getBestMoveType(move: MoveLike, defenderType?: string, defenderType2?: string): string {
  if (!move.type2 || !defenderType) return move.type;
  const eff1 = getDualEff(move.type, defenderType, defenderType2);
  const eff2 = getDualEff(move.type2, defenderType, defenderType2);
  return eff2 > eff1 ? move.type2 : move.type;
}

function getPvpTypeScale(typeKey: string): number {
  return hasOwnKey(PVP.typeScale, typeKey) ? PVP.typeScale[typeKey] : 1;
}

function getPvpSkillScale(typeKey: string, moveSlot: number): number {
  if (!hasOwnKey(PVP.skillScaleByType, typeKey)) return 1;
  return PVP.skillScaleByType[typeKey][moveSlot] ?? 1;
}

function getPvpPassiveScale(typeKey: string): number {
  return hasOwnKey(PVP.passiveScaleByType, typeKey) ? PVP.passiveScaleByType[typeKey] : 1;
}

function resolveCritOutcome({
  attackerType,
  defenderType,
  isRisky = false,
  baseConfig,
  byType,
  random = prngRandom,
  chanceFn = null,
  chanceFloor = 0,
  multiplierFloor = 1,
  chanceBonus = 0,
  damageBonus = 0,
}: ResolveCritOutcomeParams): CritOutcome {
  const attackerTypeKey = attackerType ?? '';
  const defenderTypeKey = defenderType ?? '';
  const attackerCritProfile = byType?.[attackerTypeKey] || {};
  const defenderCritProfile = byType?.[defenderTypeKey] || {};

  const baseCritChance = baseConfig?.chance ?? 0;
  const riskyCritBonus = isRisky ? (baseConfig?.riskyBonus ?? 0) : 0;
  const typeCritChanceBonus = attackerCritProfile.critChanceBonus ?? 0;
  const antiCritRate = defenderCritProfile.antiCritRate ?? 0;
  const minCritChance = baseConfig?.minChance ?? 0;
  const maxCritChance = baseConfig?.maxChance ?? 1;
  const cappedCritChance = Math.min(
    maxCritChance,
    Math.max(minCritChance, baseCritChance + riskyCritBonus + typeCritChanceBonus + chanceBonus - antiCritRate),
  );
  const critChance = clamp(Math.max(cappedCritChance, chanceFloor), 0, 1);
  const isCrit = typeof chanceFn === 'function'
    ? chanceFn(critChance)
    : clamp(random?.() ?? prngRandom(), 0, 1) < critChance;

  const maxAntiCritDamage = clamp(baseConfig?.maxAntiCritDamage ?? 0.95, 0, 0.95);
  const antiCritDamage = clamp(defenderCritProfile.antiCritDamage ?? 0, 0, maxAntiCritDamage);
  const typeCritDamageBonus = attackerCritProfile.critDamageBonus ?? 0;
  const rawCritMultiplier = (baseConfig?.multiplier ?? 1) + typeCritDamageBonus + damageBonus;
  const critMultiplier = Math.max(multiplierFloor, rawCritMultiplier * (1 - antiCritDamage));

  return {
    isCrit,
    critChance,
    critMultiplier,
    antiCritRate,
    antiCritDamage,
    critScale: isCrit ? critMultiplier : 1,
  };
}

export function resolveBossTurnState({
  enemy,
  eHp,
  bossTurn,
  bossCharging,
  sealedMove,
}: BossTurnParams): BossTurnState {
  const isBoss = enemy != null && BOSS_IDS.has(enemy.id ?? '');
  if (!isBoss || !enemy) {
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
    enemyId: enemy.id,
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
  const atkMult = bossPhase >= 3
    ? TRAIT_BALANCE.boss.phase3AttackMultiplier
    : bossPhase >= 2
      ? TRAIT_BALANCE.boss.phase2AttackMultiplier
      : 1.0;
  let scaledAtk = Math.round((enemy?.atk || 0) * atkMult);

  const isBlaze = trait === 'blaze'
    && enemyHp <= (enemy?.maxHp || 0) * TRAIT_BALANCE.enemy.blazeHpThreshold;
  if (isBlaze) scaledAtk = Math.round(scaledAtk * TRAIT_BALANCE.enemy.blazeAttackMultiplier);

  const berserkChanceFloor = trait === 'berserk'
    ? TRAIT_BALANCE.enemy.berserkCritChanceFloor
    : 0;
  const berserkMultiplierFloor = trait === 'berserk'
    ? TRAIT_BALANCE.enemy.berserkCritMultiplierFloor
    : 1;
  const crit = resolveCritOutcome({
    attackerType: enemy?.mType,
    defenderType: starterType,
    baseConfig: GLOBAL_CRIT.pve?.enemy,
    byType: GLOBAL_CRIT.byType,
    chanceFn: chance,
    chanceFloor: berserkChanceFloor,
    multiplierFloor: berserkMultiplierFloor,
  });
  // For dual-type attackers, use the type with better effectiveness
  const eff1 = getEff(enemy?.mType, starterType);
  const eff2 = enemy?.mType2 ? getEff(enemy.mType2, starterType) : 0;
  const defEff = Math.max(eff1, eff2 || eff1);
  const base = calcEnemyDamage(scaledAtk, defEff);
  const dmg = Math.max(0, Math.round(base * crit.critScale));

  return {
    trait,
    scaledAtk,
    isBlaze,
    isCrit: crit.isCrit,
    critChance: crit.critChance,
    critMultiplier: crit.critMultiplier,
    antiCritRate: crit.antiCritRate,
    antiCritDamage: crit.antiCritDamage,
    defEff,
    dmg,
  };
}

export function resolveEnemyAssistStrike({
  enemySub,
  starterType,
  atkScale = TRAIT_BALANCE.enemy.assistAttackScale,
  damageCap = TRAIT_BALANCE.enemy.assistAttackCap,
}: EnemyAssistStrikeParams): EnemyAssistStrikeResult {
  const scaledAtk = Math.max(1, Math.round((enemySub?.atk || 0) * atkScale));
  const defEff = getEff(enemySub?.mType, starterType);
  let dmg = calcEnemyDamage(scaledAtk, defEff);
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
  chance = null,
}: PlayerStrikeParams): PlayerStrikeResult {
  const leveledPower = move.basePower + moveLvl * move.growth;
  const cap = typeof maxPower === 'number' && Number.isFinite(maxPower) ? maxPower : null;
  const pow = didLevel
    ? (cap == null ? leveledPower : Math.min(leveledPower, cap))
    : movePower(move, moveLvl, moveIdx);
  const eff = bestEffectiveness(move, enemy ?? null);

  let dmg = calcAttackDamage({
    basePow: pow,
    streak,
    stageBonus,
    effMult: eff,
  });

  const isFortress = enemy?.trait === 'fortress';
  if (isFortress) dmg = Math.round(dmg * TRAIT_BALANCE.player.fortressDamageScale);

  const isFortify = enemy?.trait === 'fortify';
  if (isFortify) dmg = Math.round(dmg * TRAIT_BALANCE.player.fortifyDamageScale);

  const wasCursed = !!cursed;
  if (wasCursed) dmg = Math.round(dmg * TRAIT_BALANCE.player.cursedDamageScale);

  const maxHpForBrave = Math.max(1, attackerMaxHp);
  const braveActive = starterType === 'light' && playerHp < maxHpForBrave;
  if (braveActive) {
    const braveMult = 1 + ((maxHpForBrave - playerHp) / maxHpForBrave) * TRAIT_BALANCE.player.braveMaxBonus;
    dmg = Math.round(dmg * braveMult);
  }

  if (bossPhase >= 3) dmg = Math.round(dmg * TRAIT_BALANCE.player.bossPhase3DamageScale);
  const attackerCritType = getBestMoveType(move, enemy?.mType, enemy?.mType2);
  const crit = resolveCritOutcome({
    attackerType: attackerCritType,
    defenderType: enemy?.mType,
    isRisky: !!move.risky,
    baseConfig: GLOBAL_CRIT.pve?.player,
    byType: GLOBAL_CRIT.byType,
    chanceFn: chance,
  });
  dmg = Math.max(0, Math.round(dmg * crit.critScale));

  return {
    pow,
    eff,
    dmg,
    isFortress,
    wasCursed,
    braveActive,
    isCrit: crit.isCrit,
    critChance: crit.critChance,
    critMultiplier: crit.critMultiplier,
    antiCritRate: crit.antiCritRate,
    antiCritDamage: crit.antiCritDamage,
  };
}

export function resolveRiskySelfDamage({ move, moveLvl, moveIdx }: RiskySelfDamageParams): number {
  return Math.round(movePower(move, moveLvl, moveIdx) * TRAIT_BALANCE.player.riskySelfDamageScale);
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

  const basePow = movePower(move, 1, moveSlot);
  const eff = bestEffectiveness(move, defenderType ? { mType: defenderType } : null);
  const effectScale = eff > 1
    ? PVP.effectScale.strong
    : eff < 1
      ? PVP.effectScale.weak
      : PVP.effectScale.neutral;

  const rand01 = Math.max(0, Math.min(1, random()));
  const variance = PVP.varianceMin
    + rand01 * (PVP.varianceMax - PVP.varianceMin);
  const slotScale = PVP.moveSlotScale[moveSlot] ?? 1;
  const typeScale = getPvpTypeScale(attackerTypeKey);
  const skillScale = getPvpSkillScale(attackerTypeKey, moveSlot);
  const passiveScale = getPvpPassiveScale(attackerTypeKey);
  const riskyScale = move.risky ? PVP.riskyScale : 1;
  const hpRatio = attackerMaxHp > 0
    ? Math.max(0, Math.min(1, attackerHp / attackerMaxHp))
    : 1;
  const lightComebackBonus = attackerTypeKey === 'light'
    ? (1 - hpRatio) * (PVP.lightComeback?.maxBonus ?? 0)
    : 0;
  const comebackScale = 1 + lightComebackBonus;
  const firstStrikeScale = firstStrike ? (PVP.firstStrikeScale ?? 1) : 1;
  const critRoller = typeof critRandom === 'function' ? critRandom : random;
  const crit = resolveCritOutcome({
    attackerType: attackerTypeKey,
    defenderType: defenderTypeKey,
    isRisky: !!move.risky,
    baseConfig: PVP.crit,
    byType: PVP.crit?.byType || GLOBAL_CRIT.byType,
    random: critRoller,
  });

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
    * crit.critScale;
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
    isCrit: crit.isCrit,
    critChance: crit.critChance,
    critMultiplier: crit.critMultiplier,
    antiCritRate: crit.antiCritRate,
    antiCritDamage: crit.antiCritDamage,
    passiveLabel: passiveLabelFallback,
    passiveLabelKey,
    passiveLabelFallback,
  };
}
