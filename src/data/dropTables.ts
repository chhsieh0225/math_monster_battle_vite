/**
 * Drop tables are content-only data so balancing can be done without touching
 * battle flow logic.
 */
export const DROP_TABLES: Record<string, string[]> = {
  slime: ['🍬', '🧪'],
  slime_red: ['🔥', '🍬'],
  slime_blue: ['💧', '🍬'],
  slime_yellow: ['⚡', '🍬'],
  slime_dark: ['💀', '🍬'],
  slime_steel: ['🛡️', '🍬'],

  slimeEvolved: ['🍬', '🧪'],
  slimeElectricEvolved: ['⚡', '🧪'],
  slimeFireEvolved: ['🔥', '🧪'],
  slimeWaterEvolved: ['💧', '🧪'],
  slimeSteelEvolved: ['🛡️', '🧪'],
  slimeDarkEvolved: ['💀', '🧪'],

  golumn: ['🪨', '💎'],
  fire: ['🔥', '💎'],
  ghost: ['👻', '⭐'],
  dragon: ['🐉', '👑'],
  boss: ['👑', '🏆'],
  boss_hydra: ['☠️', '💎'],
  boss_crazy_dragon: ['🔥', '👑'],
  boss_sword_god: ['⚔️', '👑'],
};

export type DropRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type WeightedDropEntry = {
  emoji: string;
  weight: number;
  rarity: DropRarity;
};

export type DropPityRule = {
  /** Counter bucket key shared across related tables. */
  group: string;
  /** Rarity tier guaranteed when threshold is reached. */
  rarity: DropRarity;
  /** Number of misses before guaranteed reward. */
  threshold: number;
};

export type WeightedDropTable = {
  entries: readonly WeightedDropEntry[];
  pity?: DropPityRule;
};

export const WEIGHTED_DROP_TABLES: Record<string, WeightedDropTable> = {
  slime: {
    entries: [
      { emoji: '🍬', weight: 84, rarity: 'common' },
      { emoji: '🧪', weight: 16, rarity: 'rare' },
    ],
  },
  slime_red: {
    entries: [
      { emoji: '🔥', weight: 74, rarity: 'rare' },
      { emoji: '🍬', weight: 26, rarity: 'common' },
    ],
  },
  slime_blue: {
    entries: [
      { emoji: '💧', weight: 74, rarity: 'rare' },
      { emoji: '🍬', weight: 26, rarity: 'common' },
    ],
  },
  slime_yellow: {
    entries: [
      { emoji: '⚡', weight: 74, rarity: 'rare' },
      { emoji: '🍬', weight: 26, rarity: 'common' },
    ],
  },
  slime_dark: {
    entries: [
      { emoji: '💀', weight: 74, rarity: 'rare' },
      { emoji: '🍬', weight: 26, rarity: 'common' },
    ],
  },
  slime_steel: {
    entries: [
      { emoji: '🛡️', weight: 74, rarity: 'rare' },
      { emoji: '🍬', weight: 26, rarity: 'common' },
    ],
  },
  slimeEvolved: {
    entries: [
      { emoji: '🍬', weight: 72, rarity: 'common' },
      { emoji: '🧪', weight: 28, rarity: 'rare' },
    ],
  },
  slimeElectricEvolved: {
    entries: [
      { emoji: '⚡', weight: 68, rarity: 'rare' },
      { emoji: '🧪', weight: 32, rarity: 'rare' },
    ],
  },
  slimeFireEvolved: {
    entries: [
      { emoji: '🔥', weight: 68, rarity: 'rare' },
      { emoji: '🧪', weight: 32, rarity: 'rare' },
    ],
  },
  slimeWaterEvolved: {
    entries: [
      { emoji: '💧', weight: 68, rarity: 'rare' },
      { emoji: '🧪', weight: 32, rarity: 'rare' },
    ],
  },
  slimeSteelEvolved: {
    entries: [
      { emoji: '🛡️', weight: 68, rarity: 'rare' },
      { emoji: '🧪', weight: 32, rarity: 'rare' },
    ],
  },
  slimeDarkEvolved: {
    entries: [
      { emoji: '💀', weight: 68, rarity: 'rare' },
      { emoji: '🧪', weight: 32, rarity: 'rare' },
    ],
  },
  golumn: {
    entries: [
      { emoji: '🪨', weight: 70, rarity: 'rare' },
      { emoji: '💎', weight: 30, rarity: 'epic' },
    ],
  },
  fire: {
    entries: [
      { emoji: '🔥', weight: 70, rarity: 'rare' },
      { emoji: '💎', weight: 30, rarity: 'epic' },
    ],
  },
  ghost: {
    entries: [
      { emoji: '👻', weight: 72, rarity: 'epic' },
      { emoji: '⭐', weight: 28, rarity: 'epic' },
    ],
  },
  dragon: {
    entries: [
      { emoji: '🐉', weight: 92, rarity: 'epic' },
      { emoji: '👑', weight: 8, rarity: 'legendary' },
    ],
    pity: {
      group: 'dragon_legendary',
      rarity: 'legendary',
      threshold: 7,
    },
  },
  boss: {
    entries: [
      { emoji: '👑', weight: 92, rarity: 'epic' },
      { emoji: '🏆', weight: 8, rarity: 'legendary' },
    ],
    pity: {
      group: 'boss_legendary',
      rarity: 'legendary',
      threshold: 6,
    },
  },
  boss_hydra: {
    entries: [
      { emoji: '☠️', weight: 90, rarity: 'epic' },
      { emoji: '💎', weight: 10, rarity: 'legendary' },
    ],
    pity: {
      group: 'boss_legendary',
      rarity: 'legendary',
      threshold: 6,
    },
  },
  boss_crazy_dragon: {
    entries: [
      { emoji: '🔥', weight: 90, rarity: 'epic' },
      { emoji: '👑', weight: 10, rarity: 'legendary' },
    ],
    pity: {
      group: 'boss_legendary',
      rarity: 'legendary',
      threshold: 6,
    },
  },
  boss_sword_god: {
    entries: [
      { emoji: '⚔️', weight: 90, rarity: 'epic' },
      { emoji: '👑', weight: 10, rarity: 'legendary' },
    ],
    pity: {
      group: 'boss_legendary',
      rarity: 'legendary',
      threshold: 6,
    },
  },
};
