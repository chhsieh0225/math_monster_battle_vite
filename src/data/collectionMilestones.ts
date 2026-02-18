export type CollectionDamageType = 'fire' | 'water' | 'electric' | 'light' | 'all';

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

export type CollectionMilestoneDef = {
  id: string;
  emoji: string;
  required: number;
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
    id: 'water_mastery_1',
    emoji: '💧',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'water', bonus: 0.05 }],
  },
  {
    id: 'electric_mastery_1',
    emoji: '⚡',
    required: 10,
    rewards: [{ kind: 'damage_boost', damageType: 'electric', bonus: 0.05 }],
  },
  {
    id: 'light_mastery_1',
    emoji: '⭐',
    required: 8,
    rewards: [{ kind: 'damage_boost', damageType: 'light', bonus: 0.05 }],
  },
  {
    id: 'collector_boost_1',
    emoji: '🍬',
    required: 20,
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
] as const;

