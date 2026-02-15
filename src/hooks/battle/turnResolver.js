import { PLAYER_MAX_HP } from '../../data/constants.js';
import { PVP_BALANCE } from '../../data/pvpBalance.js';
import { getEff } from '../../data/typeEffectiveness.js';
import {
  bestEffectiveness,
  calcAttackDamage,
  calcEnemyDamage,
  movePower,
} from '../../utils/damageCalc.js';
import { computeBossPhase, decideBossTurnEvent } from '../../utils/turnFlow.js';

export function resolveBossTurnState({
  enemy,
  eHp,
  bossTurn,
  bossCharging,
  sealedMove,
}) {
  const isBoss = enemy?.id === "boss";
  if (!isBoss) {
    return {
      isBoss: false,
      phase: 0,
      nextBossTurn: bossTurn,
      bossEvent: "attack",
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
}) {
  const trait = enemy?.trait || null;
  const atkMult = bossPhase >= 3 ? 2.0 : bossPhase >= 2 ? 1.5 : 1.0;
  let scaledAtk = Math.round((enemy?.atk || 0) * atkMult);

  const isBlaze = trait === "blaze" && enemyHp <= (enemy?.maxHp || 0) * 0.5;
  if (isBlaze) scaledAtk = Math.round(scaledAtk * 1.5);

  const isCrit = trait === "berserk" && chance(0.3);
  const defEff = getEff(enemy?.mType, starterType);
  const base = calcEnemyDamage(scaledAtk, defEff);
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
}) {
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
  bossPhase,
}) {
  const pow = didLevel
    ? (Number.isFinite(maxPower)
      ? Math.min(move.basePower + moveLvl * move.growth, maxPower)
      : move.basePower + moveLvl * move.growth)
    : movePower(move, moveLvl, moveIdx);
  const eff = bestEffectiveness(move, enemy);

  let dmg = calcAttackDamage({
    basePow: pow,
    streak,
    stageBonus,
    effMult: eff,
  });

  const isFortress = enemy?.trait === "fortress";
  if (isFortress) dmg = Math.round(dmg * 0.7);

  const wasCursed = !!cursed;
  if (wasCursed) dmg = Math.round(dmg * 0.6);

  const braveActive = starterType === "light" && playerHp < PLAYER_MAX_HP;
  if (braveActive) {
    const braveMult = 1 + ((PLAYER_MAX_HP - playerHp) / PLAYER_MAX_HP) * 0.5;
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

export function resolveRiskySelfDamage({ move, moveLvl, moveIdx }) {
  return Math.round(movePower(move, moveLvl, moveIdx) * 0.4);
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
}) {
  if (!move || moveIdx == null) {
    return {
      basePow: 0,
      eff: 1,
      dmg: 0,
      variance: 1,
      heal: 0,
      passiveLabel: "",
    };
  }

  const basePow = movePower(move, 1, moveIdx);
  const eff = bestEffectiveness(move, defenderType ? { mType: defenderType } : null);
  const effectScale = eff > 1
    ? PVP_BALANCE.effectScale.strong
    : eff < 1
      ? PVP_BALANCE.effectScale.weak
      : PVP_BALANCE.effectScale.neutral;

  const rand01 = Math.max(0, Math.min(1, random()));
  const variance = PVP_BALANCE.varianceMin
    + rand01 * (PVP_BALANCE.varianceMax - PVP_BALANCE.varianceMin);
  const slotScale = PVP_BALANCE.moveSlotScale[moveIdx] ?? 1;
  const typeScale = PVP_BALANCE.typeScale[attackerType] ?? 1;
  const skillScale = PVP_BALANCE.skillScaleByType[attackerType]?.[moveIdx] ?? 1;
  const passiveScale = PVP_BALANCE.passiveScaleByType[attackerType] ?? 1;
  const riskyScale = move.risky ? PVP_BALANCE.riskyScale : 1;
  const hpRatio = attackerMaxHp > 0
    ? Math.max(0, Math.min(1, attackerHp / attackerMaxHp))
    : 1;
  const lightComebackBonus = attackerType === "light"
    ? (1 - hpRatio) * (PVP_BALANCE.lightComeback?.maxBonus ?? 0)
    : 0;
  const comebackScale = 1 + lightComebackBonus;
  const firstStrikeScale = firstStrike ? (PVP_BALANCE.firstStrikeScale ?? 1) : 1;

  const rawDamage = basePow
    * PVP_BALANCE.baseScale
    * variance
    * slotScale
    * typeScale
    * skillScale
    * passiveScale
    * comebackScale
    * firstStrikeScale
    * effectScale
    * riskyScale;
  const dmg = Math.max(
    PVP_BALANCE.minDamage,
    Math.min(PVP_BALANCE.maxDamage, Math.round(rawDamage)),
  );

  const heal = attackerType === "grass"
    ? Math.min(
      PVP_BALANCE.grassSustain.healCap,
      Math.max(0, Math.round(dmg * PVP_BALANCE.grassSustain.healRatio)),
    )
    : 0;

  return {
    basePow,
    eff,
    dmg,
    variance,
    heal,
    passiveLabel: attackerType === "light" && lightComebackBonus >= 0.06
      ? "🦁 勇氣之心"
      : attackerType === "grass" && heal > 0
        ? "🌿 生機回復"
        : "",
  };
}
