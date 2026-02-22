export type CollectionDamageType =
  | 'fire'
  | 'water'
  | 'electric'
  | 'light'
  | 'grass'
  | 'steel'
  | 'ice'
  | 'dark'
  | 'poison'
  | 'rock'
  | 'ghost'
  | 'dream'
  | 'all';

export type CollectionTitleReward = {
  kind: 'title';
  id: string;
  nameKey: string;
  nameFallback: string;
};

export type CollectionDamageReward = {
  kind: 'damage_boost';
  damageType: CollectionDamageType;
  bonus: number;
};

export type CollectionMilestoneReward = CollectionTitleReward | CollectionDamageReward;

export type CollectionMilestoneRequirement = {
  emoji: string;
  required: number;
};

export type CollectionMilestoneDef = {
  id: string;
  emoji: string;
  required?: number;
  requirements?: readonly CollectionMilestoneRequirement[];
  rewards: CollectionMilestoneReward[];
};

export const COLLECTION_MILESTONES: readonly CollectionMilestoneDef[] = [
  {
    id: 'fire_mastery_1',
    emoji: '🔥',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'fire', bonus: 0.05 }],
  },
  {
    id: 'fire_mastery_2',
    emoji: '🔥',
    required: 25,
    rewards: [{ kind: 'damage_boost', damageType: 'fire', bonus: 0.03 }],
  },
  {
    id: 'fire_mastery_3',
    emoji: '🔥',
    required: 50,
    rewards: [{ kind: 'damage_boost', damageType: 'fire', bonus: 0.04 }],
  },
  {
    id: 'water_mastery_1',
    emoji: '💧',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'water', bonus: 0.05 }],
  },
  {
    id: 'water_mastery_2',
    emoji: '💧',
    required: 25,
    rewards: [{ kind: 'damage_boost', damageType: 'water', bonus: 0.03 }],
  },
  {
    id: 'water_mastery_3',
    emoji: '💧',
    required: 50,
    rewards: [{ kind: 'damage_boost', damageType: 'water', bonus: 0.04 }],
  },
  {
    id: 'electric_mastery_1',
    emoji: '⚡',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'electric', bonus: 0.05 }],
  },
  {
    id: 'electric_mastery_2',
    emoji: '⚡',
    required: 25,
    rewards: [{ kind: 'damage_boost', damageType: 'electric', bonus: 0.03 }],
  },
  {
    id: 'electric_mastery_3',
    emoji: '⚡',
    required: 50,
    rewards: [{ kind: 'damage_boost', damageType: 'electric', bonus: 0.04 }],
  },
  {
    id: 'light_mastery_1',
    emoji: '⭐',
    required: 8,
    rewards: [{ kind: 'damage_boost', damageType: 'light', bonus: 0.05 }],
  },
  {
    id: 'light_mastery_2',
    emoji: '⭐',
    required: 20,
    rewards: [{ kind: 'damage_boost', damageType: 'light', bonus: 0.03 }],
  },
  {
    id: 'light_mastery_3',
    emoji: '⭐',
    required: 40,
    rewards: [{ kind: 'damage_boost', damageType: 'light', bonus: 0.04 }],
  },
  {
    id: 'grass_mastery_1',
    emoji: '🌿',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'grass', bonus: 0.05 }],
  },
  {
    id: 'grass_mastery_2',
    emoji: '🌿',
    required: 25,
    rewards: [{ kind: 'damage_boost', damageType: 'grass', bonus: 0.03 }],
  },
  {
    id: 'grass_mastery_3',
    emoji: '🌿',
    required: 50,
    rewards: [{ kind: 'damage_boost', damageType: 'grass', bonus: 0.04 }],
  },
  {
    id: 'steel_mastery_1',
    emoji: '🛡️',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'steel', bonus: 0.05 }],
  },
  {
    id: 'steel_mastery_2',
    emoji: '🛡️',
    required: 25,
    rewards: [{ kind: 'damage_boost', damageType: 'steel', bonus: 0.03 }],
  },
  {
    id: 'steel_mastery_3',
    emoji: '🛡️',
    required: 50,
    rewards: [{ kind: 'damage_boost', damageType: 'steel', bonus: 0.04 }],
  },
  {
    id: 'ice_mastery_1',
    emoji: '💎',
    required: 6,
    rewards: [{ kind: 'damage_boost', damageType: 'ice', bonus: 0.04 }],
  },
  {
    id: 'ice_mastery_2',
    emoji: '💎',
    required: 16,
    rewards: [{ kind: 'damage_boost', damageType: 'ice', bonus: 0.03 }],
  },
  {
    id: 'ice_mastery_3',
    emoji: '💎',
    required: 32,
    rewards: [{ kind: 'damage_boost', damageType: 'ice', bonus: 0.03 }],
  },
  {
    id: 'rock_mastery_1',
    emoji: '🪨',
    required: 8,
    rewards: [{ kind: 'damage_boost', damageType: 'rock', bonus: 0.04 }],
  },
  {
    id: 'rock_mastery_2',
    emoji: '🪨',
    required: 20,
    rewards: [{ kind: 'damage_boost', damageType: 'rock', bonus: 0.03 }],
  },
  {
    id: 'rock_mastery_3',
    emoji: '🪨',
    required: 40,
    rewards: [{ kind: 'damage_boost', damageType: 'rock', bonus: 0.03 }],
  },
  {
    id: 'dark_mastery_1',
    emoji: '💀',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'dark', bonus: 0.04 }],
  },
  {
    id: 'dark_mastery_2',
    emoji: '💀',
    required: 25,
    rewards: [{ kind: 'damage_boost', damageType: 'dark', bonus: 0.03 }],
  },
  {
    id: 'dark_mastery_3',
    emoji: '💀',
    required: 50,
    rewards: [{ kind: 'damage_boost', damageType: 'dark', bonus: 0.03 }],
  },
  {
    id: 'ghost_mastery_1',
    emoji: '👻',
    required: 4,
    rewards: [{ kind: 'damage_boost', damageType: 'ghost', bonus: 0.03 }],
  },
  {
    id: 'ghost_mastery_2',
    emoji: '👻',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'ghost', bonus: 0.03 }],
  },
  {
    id: 'ghost_mastery_3',
    emoji: '👻',
    required: 20,
    rewards: [{ kind: 'damage_boost', damageType: 'ghost', bonus: 0.04 }],
  },
  {
    id: 'poison_mastery_1',
    emoji: '☠️',
    required: 2,
    rewards: [{ kind: 'damage_boost', damageType: 'poison', bonus: 0.03 }],
  },
  {
    id: 'poison_mastery_2',
    emoji: '☠️',
    required: 5,
    rewards: [{ kind: 'damage_boost', damageType: 'poison', bonus: 0.03 }],
  },
  {
    id: 'poison_mastery_3',
    emoji: '☠️',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'poison', bonus: 0.04 }],
  },
  {
    id: 'dream_mastery_1',
    emoji: '🍬',
    required: 100,
    rewards: [{ kind: 'damage_boost', damageType: 'dream', bonus: 0.02 }],
  },
  {
    id: 'dream_mastery_2',
    emoji: '🍬',
    required: 300,
    rewards: [{ kind: 'damage_boost', damageType: 'dream', bonus: 0.02 }],
  },
  {
    id: 'dream_mastery_3',
    emoji: '🍬',
    required: 600,
    rewards: [{ kind: 'damage_boost', damageType: 'dream', bonus: 0.03 }],
  },
  {
    id: 'collector_boost_1',
    emoji: '🍬',
    required: 50,
    rewards: [{ kind: 'damage_boost', damageType: 'all', bonus: 0.03 }],
  },
  {
    id: 'title_crown_apprentice',
    emoji: '👑',
    required: 5,
    rewards: [
      {
        kind: 'title',
        id: 'crown_apprentice',
        nameKey: 'title.reward.crownApprentice',
        nameFallback: 'Crown Apprentice',
      },
    ],
  },
  {
    id: 'title_arena_rising',
    emoji: '🏆',
    required: 3,
    rewards: [
      {
        kind: 'title',
        id: 'arena_rising',
        nameKey: 'title.reward.arenaRising',
        nameFallback: 'Arena Rising',
      },
    ],
  },
  {
    id: 'title_dragon_bane',
    emoji: '🐉',
    required: 5,
    rewards: [
      {
        kind: 'title',
        id: 'dragon_bane',
        nameKey: 'title.reward.dragonBane',
        nameFallback: 'Dragon Bane',
      },
      { kind: 'damage_boost', damageType: 'all', bonus: 0.02 },
    ],
  },
  {
    id: 'elemental_harmony_1',
    emoji: '🌈',
    requirements: [
      { emoji: '🔥', required: 5 },
      { emoji: '💧', required: 5 },
      { emoji: '⚡', required: 5 },
      { emoji: '🌿', required: 5 },
      { emoji: '🛡️', required: 5 },
    ],
    rewards: [
      { kind: 'damage_boost', damageType: 'all', bonus: 0.01 },
      {
        kind: 'title',
        id: 'elemental_harmony',
        nameKey: 'title.reward.elementalHarmony',
        nameFallback: 'Elemental Harmony',
      },
    ],
  },
  {
    id: 'night_prism_sage_1',
    emoji: '🌌',
    requirements: [
      { emoji: '⭐', required: 8 },
      { emoji: '👻', required: 5 },
      { emoji: '💀', required: 5 },
      { emoji: '☠️', required: 3 },
      { emoji: '💎', required: 8 },
    ],
    rewards: [
      { kind: 'damage_boost', damageType: 'all', bonus: 0.01 },
      {
        kind: 'title',
        id: 'night_prism_sage',
        nameKey: 'title.reward.nightPrismSage',
        nameFallback: 'Night Prism Sage',
      },
    ],
  },
  {
    id: 'apex_relic_hunter_1',
    emoji: '🏅',
    requirements: [
      { emoji: '🐉', required: 5 },
      { emoji: '👑', required: 5 },
      { emoji: '🏆', required: 2 },
      { emoji: '⚔️', required: 2 },
    ],
    rewards: [
      { kind: 'damage_boost', damageType: 'all', bonus: 0.02 },
      {
        kind: 'title',
        id: 'apex_relic_hunter',
        nameKey: 'title.reward.apexRelicHunter',
        nameFallback: 'Apex Relic Hunter',
      },
    ],
  },
] as const;
