import type { ItemDef, ItemId } from '../types/game';

export const ITEM_CATALOG: Record<ItemId, ItemDef> = {
  potion: {
    id: 'potion',
    icon: '🧪',
    nameKey: 'battle.item.potion.name',
    nameFallback: 'Potion',
    descKey: 'battle.item.potion.desc',
    descFallback: 'Restore HP for active ally',
    sourceDrops: ['🧪', '💎', '🏆'],
  },
  shield: {
    id: 'shield',
    icon: '🛡️',
    nameKey: 'battle.item.shield.name',
    nameFallback: 'Shield Charm',
    descKey: 'battle.item.shield.desc',
    descFallback: 'Block next incoming hit',
    sourceDrops: ['🛡️', '👑', '🏆'],
  },
};

export const BATTLE_ITEM_ORDER: readonly ItemId[] = ['potion', 'shield'];

export const DROP_TO_ITEM_GRANTS: Partial<Record<string, Partial<Record<ItemId, number>>>> = {
  '🧪': { potion: 1 },
  '💎': { potion: 1 },
  '🛡️': { shield: 1 },
  '👑': { shield: 1 },
  '🏆': { potion: 1, shield: 1 },
};
