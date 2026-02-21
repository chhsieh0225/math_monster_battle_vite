/**
 * Single source of truth for gameplay tuning knobs.
 * Keep numeric balance values centralized here to simplify future tuning.
 */
import { validateBalanceConfigSchema } from './balanceConfigSchema.ts';

const CRIT_BY_TYPE = {
  fire: { critChanceBonus: 0.01, critDamageBonus: 0.06, antiCritRate: 0.01, antiCritDamage: 0.03 },
  water: { critChanceBonus: 0.0, critDamageBonus: 0.02, antiCritRate: 0.03, antiCritDamage: 0.1 },
  grass: { critChanceBonus: 0.0, critDamageBonus: 0.03, antiCritRate: 0.02, antiCritDamage: 0.14 },
  electric: { critChanceBonus: 0.03, critDamageBonus: 0.04, antiCritRate: 0.0, antiCritDamage: 0.04 },
  light: { critChanceBonus: 0.02, critDamageBonus: 0.05, antiCritRate: 0.01, antiCritDamage: 0.06 },
  dark: { critChanceBonus: 0.03, critDamageBonus: 0.08, antiCritRate: 0.0, antiCritDamage: 0.0 },
  poison: { critChanceBonus: 0.02, critDamageBonus: 0.04, antiCritRate: 0.01, antiCritDamage: 0.02 },
  rock: { critChanceBonus: 0.0, critDamageBonus: 0.02, antiCritRate: 0.03, antiCritDamage: 0.12 },
  steel: { critChanceBonus: 0.0, critDamageBonus: 0.0, antiCritRate: 0.02, antiCritDamage: 0.10 },
  ice: { critChanceBonus: 0.0, critDamageBonus: 0.0, antiCritRate: 0.01, antiCritDamage: 0.06 },
  dream: { critChanceBonus: 0.01, critDamageBonus: 0.03, antiCritRate: 0.02, antiCritDamage: 0.08 },
} as const;

export const BALANCE_CONFIG = {
  /** Cap for dual-type effectiveness multiplier (prevents 1.5×1.5 = 2.25× OHKO) */
  dualTypeEffCap: 1.8,

  /** HP ceiling grows with player level: +hpPerLevel per pLvl */
  hpPerLevel: 5,
  /** Extra HP ceiling bonus per evolution stage (on top of per-level growth) */
  evolutionHpBonus: 15,

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
      riskyBonus: 0.12,
    },
  },

  stage: {
    scaleBase: 1,
    scaleStep: 0.12,
    waves: {
      single: [
        { monsterId: 'slime' },                            // 1: 固定史萊姆（新手教學）
        { sceneType: 'fire' },                              // 2: 火場隨機（火焰蜥 or 紅史萊姆）
        { sceneType: 'ghost' },                             // 3: 靈場隨機（幽靈魔 or 提燈幽魂）
        { sceneType: 'candy' },                             // 4: 糖果場隨機（糖果騎士 or 棉花糖怪）
        { sceneType: 'rock' },                              // 5: 岩場隨機（岩石高崙 or 泥岩高崙）
        { sceneType: 'candy' },                             // 6: 糖果場隨機
        { monsterId: 'dragon' },                            // 7: 固定鋼鐵龍（中後期指標）
        { sceneType: 'ghost' },                             // 8: 靈場隨機
        { monsterId: 'dragon' },                            // 9: 固定鋼鐵龍
        { monsterId: 'boss' },                              // 10: Boss
      ],
      double: [
        { monsterId: 'slime', slimeType: 'grass', sceneType: 'grass' },
        { monsterId: 'slime', slimeType: 'water', sceneType: 'water' },

        { monsterId: 'fire', sceneType: 'fire' },
        { monsterId: 'ghost', sceneType: 'ghost' },

        { monsterId: 'slime', slimeType: 'electric', sceneType: 'electric' },
        { monsterId: 'fire', sceneType: 'fire' },

        { monsterId: 'slime', slimeType: 'steel', sceneType: 'steel' },
        { monsterId: 'dragon', sceneType: 'steel' },

        { monsterId: 'candy_knight', sceneType: 'candy' },
        { monsterId: 'candy_monster', sceneType: 'candy' },

        { monsterId: 'slime', slimeType: 'dark', sceneType: 'dark' },
        { monsterId: 'fire', sceneType: 'fire' },

        { monsterId: 'boss', sceneType: 'dark' },
        { monsterId: 'boss', sceneType: 'dark' },
      ],
    },
    campaign: {
      branchChoices: [
        {   // 1: 新手——固定史萊姆
          left: { monsterId: 'slime', slimeType: 'grass', sceneType: 'grass' },
          right: { monsterId: 'slime', slimeType: 'water', sceneType: 'water' },
        },
        {   // 2: 場景隨機
          left: { sceneType: 'fire' },
          right: { sceneType: 'ghost' },
        },
        {   // 3: 鋼 vs 岩
          left: { sceneType: 'steel' },
          right: { sceneType: 'rock' },
        },
        {   // 4: 固定龍 vs 場景火
          left: { monsterId: 'dragon', sceneType: 'steel' },
          right: { sceneType: 'fire' },
        },
        {   // 5: 草 vs 岩
          left: { sceneType: 'grass' },
          right: { sceneType: 'rock' },
        },
        {   // 6: 鋼 vs 靈
          left: { sceneType: 'steel' },
          right: { sceneType: 'ghost' },
        },
        {   // 7: 火 vs 鋼
          left: { sceneType: 'fire' },
          right: { sceneType: 'steel' },
        },
        {   // 8: 岩 vs 夢幻
          left: { sceneType: 'rock' },
          right: { sceneType: 'candy' },
        },
        {   // 9: 夢幻 vs 火
          left: { sceneType: 'candy' },
          right: { sceneType: 'fire' },
        },
        {   // 10: Boss（固定）
          left: { monsterId: 'boss', sceneType: 'dark' },
          right: { monsterId: 'boss', sceneType: 'dark' },
        },
      ],
      eliteRounds: [3, 6, 8],
      eventRounds: [2, 5, 7],
      eventPool: ['healing_spring', 'focus_surge', 'hazard_ambush'],
      tierScale: {
        elite: { hp: 1.22, atk: 1.18 },
        boss: { hp: 1.08, atk: 1.06 },
      },
      eventScaleByTag: {
        healing_spring: { hp: 0.9, atk: 0.92 },
        focus_surge: { hp: 0.95, atk: 0.95 },
        hazard_ambush: { hp: 1.1, atk: 1.08 },
      },
      enableRandomSwap: false,
      enableStarterEncounters: true,
      /**
       * Timed-mode (計時模式) preset overrides.
       * branchChoices are auto-derived from `waves.single` (left === right, no real branching).
       * Elite / event rounds are disabled for a streamlined experience.
       */
      timed: {
        eliteRounds: [] as number[],
        eventRounds: [] as number[],
        enableRandomSwap: true,
        enableStarterEncounters: false,
      },
    },
    randomSwap: {
      startIndex: 1,
      endIndexExclusiveFromTail: 1,
      candidates: [
        { monsterId: 'golumn', sceneType: 'rock' },
      ],
    },
  },

  monsters: {
    bossIds: ['boss', 'boss_hydra', 'boss_crazy_dragon', 'boss_sword_god'],
    bossSceneById: {
      boss: 'dark',
      boss_hydra: 'poison',
      boss_crazy_dragon: 'burnt_warplace',
      boss_sword_god: 'heaven',
    },
    randomEncounterVariantsByBaseId: {
      ghost: ['ghost', 'ghost_lantern', 'mushroom'],
      golumn: ['golumn', 'golumn_mud'],
      slime: ['slime', 'colorful_butterfly'],
    },
    baseStatsById: {
      slime: { hp: 40, atk: 6 },
      fire: { hp: 55, atk: 9 },
      ghost: { hp: 50, atk: 8 },
      mushroom: { hp: 52, atk: 8 },
      dragon: { hp: 80, atk: 12 },
      golumn: { hp: 65, atk: 10 },
      boss: { hp: 120, atk: 15 },
      boss_hydra: { hp: 140, atk: 13 },
      boss_crazy_dragon: { hp: 110, atk: 17 },
      boss_sword_god: { hp: 120, atk: 15 },
      candy_knight: { hp: 58, atk: 9 },
      candy_monster: { hp: 48, atk: 7 },
      colorful_butterfly: { hp: 35, atk: 5 },
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
      pressureBands: {
        floors: [1, 6, 11, 16],
        hpBonus: [0, 0.08, 0.2, 0.38],
        atkBonus: [0, 0.06, 0.16, 0.3],
        levelOffsetBonus: [0, 1, 3, 5],
        rewardBonus: [0, 0.08, 0.18, 0.34],
        extraTimePressure: [0, 0, 1, 1],
        enemyCountBonus: [0, 0, 1, 1],
      },
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
      dark: [1.0, 0.99, 0.98, 0.97],
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
      steelWallDamageScale: 0.84,
      steelCounterChance: 0.28,
      steelCounterScale: 0.45,
      steelCounterCap: 16,
      steelSpecCounterDamage: 12,
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
      venomDotDamage: 4,
      venomDotPhase2Damage: 6,
      venomDotPhase3Damage: 9,
      assistAttackChance: 0.35,
      assistAttackScale: 0.55,
      assistAttackCap: 24,
    },
    player: {
      fortressDamageScale: 0.7,
      fortifyDamageScale: 0.75,
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
      steelWallDamageScale: 0.82,
      steelCounterChance: 0.3,
      steelCounterScale: 0.45,
      steelCounterCap: 18,
      iceShatterBonusRatio: 0.25,
      iceShatterBonusCap: 16,
      streaks: {
        audioTrigger: 5,
        unlock5: 5,
        unlock10: 10,
      },
      lightCourageHpThreshold: 0.5,
    },
    specDef: {
      grassReflectScale: 1.2,
      lightCounterDamage: 15,
      steelCounterDamage: 14,
    },
    boss: {
      // All bosses take reduced incoming damage (0.7~0.8 => 20~30% DR)
      incomingDamageScale: 0.7,
      phase2AttackMultiplier: 1.5,
      phase3AttackMultiplier: 1.7,
      releaseAttackScale: 1.8,
      sealDurationTurns: 2,
      sealMovePool: [0, 1, 2],
      chargeEveryTurns: 4,
      sealEveryTurns: 3,
      sealStartsAtPhase: 2,
      // Bosses retaliate while charging when hit
      chargeCounterRatio: 0.2,
      /** Crazy Dragon: one-time heal when HP falls below this threshold */
      furyRegenThreshold: 0.3,
      furyRegenHealRatio: 0.5,
      /** Hydra: passive regeneration every enemy turn */
      hydraTurnRegenRatio: 0.1,
      /** Dark Dragon King shadow shield */
      shadowShieldFullBlockChance: 0.2,
      shadowShieldPartialBlockChance: 0.5,
      shadowShieldPartialDamageScale: 0.6,
      /** Sword God: chance to halve incoming damage */
      swordParryChance: 0.5,
      swordParryScale: 0.5,
      /** Sword God: faster charge cycle + weaker release */
      swordGodChargeEveryTurns: 2,
      swordGodReleaseScale: 1.5,
    },
  },
} as const;

validateBalanceConfigSchema(BALANCE_CONFIG);
