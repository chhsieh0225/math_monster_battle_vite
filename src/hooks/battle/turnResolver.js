import { PLAYER_MAX_HP } from '../../data/constants.js';
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
