/**
 * Single source of truth for gameplay tuning knobs.
 * Keep numeric balance values centralized here to simplify future tuning.
 */
const CRIT_BY_TYPE = {
  fire: { critChanceBonus: 0.01, critDamageBonus: 0.06, antiCritRate: 0.01, antiCritDamage: 0.03 },
  water: { critChanceBonus: 0.0, critDamageBonus: 0.02, antiCritRate: 0.03, antiCritDamage: 0.1 },
  grass: { critChanceBonus: 0.0, critDamageBonus: 0.03, antiCritRate: 0.02, antiCritDamage: 0.14 },
  electric: { critChanceBonus: 0.03, critDamageBonus: 0.04, antiCritRate: 0.0, antiCritDamage: 0.04 },
  light: { critChanceBonus: 0.02, critDamageBonus: 0.05, antiCritRate: 0.01, antiCritDamage: 0.06 },
  dark: { critChanceBonus: 0.03, critDamageBonus: 0.08, antiCritRate: 0.0, antiCritDamage: 0.0 },
} as const;

export const BALANCE_CONFIG = {
  damage: {
    playerAttackVariance: {
      min: 0.85,
      max: 1.0,
    },
    enemyAttackVariance: {
      min: 0.8,
      max: 1.2,
    },
    streak: {
      medium: {
        threshold: 3,
        multiplier: 1.5,
      },
      high: {
        threshold: 5,
        multiplier: 1.8,
      },
    },
    stageBonusPerStage: 0.15,
    freezeChance: {
      base: 0.25,
      perMoveLevel: 0.03,
    },
  },

  stage: {
    scaleBase: 1,
    scaleStep: 0.12,
    waves: {
      single: [
        { monsterId: 'slime' },
        { monsterId: 'fire' },
        { monsterId: 'slime' },
        { monsterId: 'ghost' },
        { monsterId: 'slime' },
        { monsterId: 'fire' },
        { monsterId: 'dragon' },
        { monsterId: 'ghost' },
        { monsterId: 'dragon' },
        { monsterId: 'boss' },
      ],
      double: [
        { monsterId: 'slime', slimeType: 'grass', sceneType: 'grass' },
        { monsterId: 'slime', slimeType: 'water', sceneType: 'grass' },

        { monsterId: 'fire', sceneType: 'fire' },
        { monsterId: 'ghost', sceneType: 'fire' },

        { monsterId: 'slime', slimeType: 'steel', sceneType: 'steel' },
        { monsterId: 'dragon', sceneType: 'steel' },

        { monsterId: 'slime', slimeType: 'dark', sceneType: 'dark' },
        { monsterId: 'fire', sceneType: 'dark' },

        { monsterId: 'ghost', sceneType: 'dark' },
        { monsterId: 'boss', sceneType: 'dark' },
      ],
    },
  },

  monsters: {
    baseStatsById: {
      slime: { hp: 40, atk: 6 },
      fire: { hp: 55, atk: 9 },
      ghost: { hp: 50, atk: 8 },
      dragon: { hp: 80, atk: 12 },
      boss: { hp: 120, atk: 15 },
    },
    evolveLevelById: {
      slime: 5,
      fire: 5,
      ghost: 5,
      dragon: 9,
    },
    slimeVariantMultipliersById: {
      slime: { hpMult: 1.0, atkMult: 1.0 },
      slime_red: { hpMult: 0.8, atkMult: 1.4 },
      slime_blue: { hpMult: 1.3, atkMult: 0.8 },
      slime_yellow: { hpMult: 0.9, atkMult: 1.1 },
      slime_dark: { hpMult: 1.0, atkMult: 1.0 },
      slime_steel: { hpMult: 1.5, atkMult: 0.7 },
    },
    evolvedSlimeVariantMultipliersById: {
      slimeEvolved: { hpMult: 1.0, atkMult: 1.0 },
      slimeElectricEvolved: { hpMult: 0.9, atkMult: 1.1 },
      slimeFireEvolved: { hpMult: 0.8, atkMult: 1.4 },
      slimeWaterEvolved: { hpMult: 1.3, atkMult: 0.8 },
      slimeSteelEvolved: { hpMult: 1.5, atkMult: 0.7 },
      slimeDarkEvolved: { hpMult: 1.0, atkMult: 1.0 },
    },
  },

  crit: {
    byType: CRIT_BY_TYPE,
    pve: {
      player: {
        chance: 0.06,
        riskyBonus: 0.03,
        minChance: 0.02,
        maxChance: 0.2,
        multiplier: 1.35,
        maxAntiCritDamage: 0.4,
      },
      enemy: {
        chance: 0.05,
        riskyBonus: 0.0,
        minChance: 0.02,
        maxChance: 0.2,
        multiplier: 1.3,
        maxAntiCritDamage: 0.4,
      },
    },
  },

  challenges: {
    tower: {
      hpScalePerFloor: 0.08,
      atkScalePerFloor: 0.065,
      levelOffsetPerFloor: 0.55,
      timeTightenEveryFloors: 3,
      minTimeLimitSec: 3,
      enemyCountStepFloor: 4,
      maxEnemyCount: 3,
      expertStartsAtFloor: 6,
      masterStartsAtFloor: 11,
      rewardMultiplierPerFloor: 0.03,
      focusUnlockFloor: {
        mixed4: 5,
        unknown1: 6,
        unknown2: 8,
        unknown3: 10,
        unknown4: 13,
      },
      boss: {
        extraLevelOffset: 2,
        hpBonusScale: 0.16,
        atkBonusScale: 0.14,
        extraTimePressure: 1,
        rewardMultiplierBonus: 0.22,
        enemyCount: 1,
      },
    },
  },

  pvp: {
    baseScale: 0.84,
    varianceMin: 0.92,
    varianceMax: 1.06,
    minDamage: 8,
    maxDamage: 40,
    riskyScale: 0.94,
    moveSlotScale: [0.94, 0.98, 1.02, 0.9],
    typeScale: {
      fire: 1.0,
      water: 1.0,
      grass: 1.0,
      electric: 1.0,
      light: 1.0,
      dark: 0.97,
    },
    skillScaleByType: {
      fire: [1.0, 0.99, 0.98, 0.96],
      water: [1.0, 0.99, 0.98, 0.95],
      grass: [0.99, 0.99, 0.98, 0.95],
      electric: [1.0, 0.99, 0.97, 0.94],
      light: [0.99, 0.99, 0.98, 0.95],
      dark: [1.0, 1.0, 1.0, 1.0],
    },
    passiveScaleByType: {
      fire: 0.99,
      water: 0.98,
      grass: 0.95,
      electric: 0.97,
      light: 0.96,
      dark: 0.97,
    },
    grassSustain: {
      healRatio: 0.12,
      healCap: 6,
    },
    lightComeback: {
      maxBonus: 0.16,
    },
    crit: {
      chance: 0.1,
      riskyBonus: 0.04,
      minChance: 0.02,
      maxChance: 0.24,
      multiplier: 1.4,
      maxAntiCritDamage: 0.95,
      byType: CRIT_BY_TYPE,
    },
    passive: {
      fireBurnCap: 2,
      fireBurnTickBase: 4,
      fireBurnTickPerStack: 2,
      waterFreezeChance: 0.12,
      electricDischargeAt: 3,
      electricDischargeDamage: 10,
      specDefComboTrigger: 4,
      lightCounterDamage: 14,
      grassReflectRatio: 0.32,
      grassReflectMin: 8,
      grassReflectCap: 18,
    },
    firstStrikeScale: 0.88,
    effectScale: {
      strong: 1.18,
      weak: 0.86,
      neutral: 1.0,
    },
  },

  traits: {
    defaultNames: ['普通', 'normal', 'none'],
    enemy: {
      blazeHpThreshold: 0.5,
      blazeAttackMultiplier: 1.5,
      berserkCritChanceFloor: 0.3,
      berserkCritMultiplierFloor: 1.5,
      tenacityHealRatio: 0.15,
      curseApplyChance: 0.35,
      swiftExtraAttackChance: 0.25,
      assistAttackChance: 0.35,
      assistAttackScale: 0.55,
      assistAttackCap: 24,
    },
    player: {
      fortressDamageScale: 0.7,
      cursedDamageScale: 0.6,
      braveMaxBonus: 0.5,
      bossPhase3DamageScale: 1.3,
      riskySelfDamageScale: 0.4,
      phantomDodgeChance: 0.25,
      burnMaxStacks: 5,
      burnPerStackDamage: 2,
      grassHealPerMoveLevel: 2,
      staticMaxStacks: 3,
      staticDischargeDamage: 12,
      counterReflectRatio: 0.2,
      specDefComboTrigger: 8,
    },
    specDef: {
      grassReflectScale: 1.2,
      lightCounterDamage: 15,
    },
    boss: {
      phase2AttackMultiplier: 1.5,
      phase3AttackMultiplier: 2.0,
      releaseAttackScale: 2.2,
      sealDurationTurns: 2,
      sealMovePool: [0, 1, 2],
      chargeEveryTurns: 4,
      sealEveryTurns: 3,
      sealStartsAtPhase: 2,
    },
  },
} as const;
