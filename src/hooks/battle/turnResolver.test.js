import assert from 'node:assert/strict';
import test from 'node:test';
import { SKILL_SETS } from '../../data/skillSets.ts';
import {
  resolveBossTurnState,
  resolveEnemyAssistStrike,
  resolveEnemyPrimaryStrike,
  resolvePvpStrike,
  resolvePlayerStrike,
  resolveRiskySelfDamage,
} from './turnResolver.ts';

function withMockRandom(value, fn) {
  const prev = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = prev;
  }
}

test('resolveBossTurnState returns release event when boss is charging', () => {
  const out = resolveBossTurnState({
    enemy: { id: "boss", maxHp: 200 },
    eHp: 120,
    bossTurn: 3,
    bossCharging: true,
    sealedMove: -1,
  });

  assert.equal(out.isBoss, true);
  assert.equal(out.nextBossTurn, 4);
  assert.equal(out.bossEvent, "release");
});

test('resolveEnemyPrimaryStrike applies blaze and berserk branches', () => {
  withMockRandom(0, () => {
    const blaze = resolveEnemyPrimaryStrike({
      enemy: { atk: 20, maxHp: 100, mType: "fire", trait: "blaze" },
      enemyHp: 40,
      starterType: "grass",
      bossPhase: 2,
      chance: () => false,
    });
    assert.equal(blaze.isBlaze, true);
    assert.equal(blaze.isCrit, false);
    assert.ok(blaze.dmg > 0);
  });

  withMockRandom(0, () => {
    const berserk = resolveEnemyPrimaryStrike({
      enemy: { atk: 20, maxHp: 100, mType: "fire", trait: "berserk" },
      enemyHp: 90,
      starterType: "grass",
      bossPhase: 1,
      chance: () => true,
    });
    assert.equal(berserk.isCrit, true);
    assert.ok(berserk.dmg > 0);
  });
});

test('resolvePlayerStrike reflects fortress and curse modifiers', () => {
  withMockRandom(0, () => {
    const base = resolvePlayerStrike({
      move: { basePower: 40, growth: 5, type: "fire" },
      enemy: { trait: "normal", mType: "grass" },
      moveIdx: 0,
      moveLvl: 2,
      didLevel: false,
      maxPower: 80,
      streak: 1,
      stageBonus: 0,
      cursed: false,
      starterType: "fire",
      playerHp: 100,
      bossPhase: 0,
    });

    const nerfed = resolvePlayerStrike({
      move: { basePower: 40, growth: 5, type: "fire" },
      enemy: { trait: "fortress", mType: "grass" },
      moveIdx: 0,
      moveLvl: 2,
      didLevel: false,
      maxPower: 80,
      streak: 1,
      stageBonus: 0,
      cursed: true,
      starterType: "fire",
      playerHp: 100,
      bossPhase: 0,
    });

    assert.ok(base.dmg > nerfed.dmg);
    assert.equal(nerfed.isFortress, true);
    assert.equal(nerfed.wasCursed, true);
  });
});

test('resolveRiskySelfDamage returns a positive backfire value', () => {
  const sd = resolveRiskySelfDamage({
    move: { basePower: 36, growth: 6 },
    moveLvl: 3,
    moveIdx: 1,
  });
  assert.ok(sd > 0);
});

test('resolveEnemyAssistStrike applies cap and effectiveness', () => {
  withMockRandom(0, () => {
    const out = resolveEnemyAssistStrike({
      enemySub: { atk: 100, mType: "fire" },
      starterType: "grass",
      atkScale: 0.7,
      damageCap: 24,
    });
    assert.equal(out.scaledAtk, 70);
    assert.equal(out.defEff, 1.5);
    assert.equal(out.dmg, 24);
  });
});

test('resolvePvpStrike respects type/effect scaling and clamps by caps', () => {
  const neutral = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "fire", risky: true },
    moveIdx: 3,
    attackerType: "fire",
    defenderType: "dark",
    random: () => 0,
    critRandom: () => 1,
  });
  assert.equal(neutral.dmg, 24);
  assert.equal(neutral.eff, 1);

  const strong = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "fire", risky: true },
    moveIdx: 3,
    attackerType: "fire",
    defenderType: "grass",
    random: () => 0,
    critRandom: () => 1,
  });
  assert.equal(strong.dmg, 29);
  assert.equal(strong.eff, 1.5);

  const weak = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "fire", risky: true },
    moveIdx: 3,
    attackerType: "fire",
    defenderType: "water",
    random: () => 0,
    critRandom: () => 1,
  });
  assert.equal(weak.dmg, 21);
  assert.equal(weak.eff, 0.6);

  const capped = resolvePvpStrike({
    move: { basePower: 120, growth: 3, type: "light", risky: false },
    moveIdx: 0,
    attackerType: "light",
    defenderType: "dark",
    attackerHp: 0,
    attackerMaxHp: 100,
    random: () => 1,
    critRandom: () => 1,
  });
  assert.equal(capped.dmg, 42);

  const floored = resolvePvpStrike({
    move: { basePower: 4, growth: 0, type: "water", risky: false },
    moveIdx: 0,
    attackerType: "water",
    defenderType: "water",
    random: () => 0,
    critRandom: () => 1,
  });
  assert.equal(floored.dmg, 8);
});

test('resolvePvpStrike applies grass sustain and light comeback passive tuning', () => {
  const grass = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "grass", risky: false },
    moveIdx: 2,
    attackerType: "grass",
    defenderType: "dark",
    random: () => 0.5,
    critRandom: () => 1,
  });
  assert.ok(grass.heal > 0);
  assert.ok(grass.heal <= 6);
  assert.equal(grass.passiveLabelKey, "battle.pvp.note.grassSustain");

  const lightFullHp = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "light", risky: false },
    moveIdx: 2,
    attackerType: "light",
    defenderType: "grass",
    attackerHp: 100,
    attackerMaxHp: 100,
    random: () => 0.5,
    critRandom: () => 1,
  });
  const lightLowHp = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "light", risky: false },
    moveIdx: 2,
    attackerType: "light",
    defenderType: "grass",
    attackerHp: 20,
    attackerMaxHp: 100,
    random: () => 0.5,
    critRandom: () => 1,
  });
  assert.ok(lightLowHp.dmg > lightFullHp.dmg);
  assert.equal(lightLowHp.passiveLabelKey, "battle.pvp.note.lightCourage");
});

test('starter average PvP damage profiles stay within tuning band', () => {
  const profiles = [
    { id: "fire", type: "fire", moves: SKILL_SETS.fire },
    { id: "water", type: "water", moves: SKILL_SETS.water },
    { id: "grass", type: "grass", moves: SKILL_SETS.grass },
    { id: "electric", type: "electric", moves: SKILL_SETS.electric },
    { id: "lion", type: "light", moves: SKILL_SETS.lion },
  ];
  const averages = profiles.map((starter) => {
    const damages = starter.moves.map((move, idx) => (
      resolvePvpStrike({
        move,
        moveIdx: idx,
        attackerType: starter.type,
        defenderType: null,
        attackerHp: 100,
        attackerMaxHp: 100,
        random: () => 0.5,
        critRandom: () => 1,
      }).dmg
    ));
    const avg = damages.reduce((a, b) => a + b, 0) / damages.length;
    return { id: starter.id, avg };
  });

  const maxAvg = Math.max(...averages.map((x) => x.avg));
  const minAvg = Math.min(...averages.map((x) => x.avg));
  // Keep overall starter profile spread controlled to reduce "one best character".
  assert.ok(maxAvg / minAvg <= 1.2);
});

test('resolvePvpStrike applies configurable crit chance and multiplier', () => {
  const base = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "fire", risky: false },
    moveIdx: 1,
    attackerType: "fire",
    defenderType: "grass",
    random: () => 0.4,
    critRandom: () => 1,
  });
  const crit = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "fire", risky: false },
    moveIdx: 1,
    attackerType: "fire",
    defenderType: "grass",
    random: () => 0.4,
    critRandom: () => 0,
  });
  assert.equal(base.isCrit, false);
  assert.equal(crit.isCrit, true);
  assert.ok(crit.dmg > base.dmg);
});

test('resolvePvpStrike applies type-based crit and anti-crit profiles', () => {
  const electricVsFire = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "electric", risky: false },
    moveIdx: 1,
    attackerType: "electric",
    defenderType: "fire",
    random: () => 0.5,
    critRandom: () => 1,
  });
  const electricVsWater = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "electric", risky: false },
    moveIdx: 1,
    attackerType: "electric",
    defenderType: "water",
    random: () => 0.5,
    critRandom: () => 1,
  });
  assert.ok(electricVsFire.critChance > electricVsWater.critChance);

  const fireVsFire = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "fire", risky: false },
    moveIdx: 1,
    attackerType: "fire",
    defenderType: "fire",
    random: () => 0.5,
    critRandom: () => 0,
  });
  const fireVsGrass = resolvePvpStrike({
    move: { basePower: 40, growth: 3, type: "fire", risky: false },
    moveIdx: 1,
    attackerType: "fire",
    defenderType: "grass",
    random: () => 0.5,
    critRandom: () => 0,
  });
  assert.ok(fireVsFire.critMultiplier > fireVsGrass.critMultiplier);
});
