import { BATTLE_ITEM_ORDER, DROP_TO_ITEM_GRANTS } from '../data/itemCatalog.ts';
import type { InventoryData, ItemId } from '../types/game';
import { readJson, writeJson } from './storage.ts';

const INVENTORY_KEY = 'mathMonsterBattle_inventory';

export type InventoryGrant = {
  id: ItemId;
  amount: number;
  sourceDrop: string;
};

export type InventoryMutationResult = {
  inventory: InventoryData;
  grants: InventoryGrant[];
  changed: boolean;
};

export type InventoryConsumeResult = {
  inventory: InventoryData;
  consumed: boolean;
};

function createEmptyInventory(): InventoryData {
  return {
    potion: 0,
    candy: 0,
    shield: 0,
  };
}

export function normalizeInventory(raw: Partial<Record<ItemId, unknown>> | null | undefined): InventoryData {
  const inventory = createEmptyInventory();
  for (const itemId of BATTLE_ITEM_ORDER) {
    const count = Number(raw?.[itemId] || 0);
    inventory[itemId] = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  }
  return inventory;
}

export function loadInventory(): InventoryData {
  return normalizeInventory(readJson<Partial<Record<ItemId, number>>>(INVENTORY_KEY, {}));
}

export function saveInventory(inventory: InventoryData): boolean {
  return writeJson<InventoryData>(INVENTORY_KEY, normalizeInventory(inventory));
}

export function applyDropsToInventory(
  inventory: InventoryData,
  drops: readonly string[],
): InventoryMutationResult {
  const nextInventory = normalizeInventory(inventory);
  const grants: InventoryGrant[] = [];
  for (const drop of drops) {
    if (!drop) continue;
    const grantMap = DROP_TO_ITEM_GRANTS[drop];
    if (!grantMap) continue;
    for (const itemId of BATTLE_ITEM_ORDER) {
      const amount = Math.max(0, Math.floor(Number(grantMap[itemId] || 0)));
      if (amount <= 0) continue;
      nextInventory[itemId] += amount;
      grants.push({ id: itemId, amount, sourceDrop: drop });
    }
  }
  return {
    inventory: nextInventory,
    grants,
    changed: grants.length > 0,
  };
}

export function addDropsToInventory(drops: readonly string[]): InventoryMutationResult {
  const current = loadInventory();
  const result = applyDropsToInventory(current, drops);
  if (result.changed) {
    saveInventory(result.inventory);
  }
  return result;
}

export function consumeInventory(
  inventory: InventoryData,
  itemId: ItemId,
  amount = 1,
): InventoryConsumeResult {
  const consumeAmount = Number.isFinite(amount) ? Math.max(1, Math.floor(amount)) : 1;
  const currentInventory = normalizeInventory(inventory);
  const current = currentInventory[itemId] || 0;
  if (current < consumeAmount) {
    return {
      inventory: currentInventory,
      consumed: false,
    };
  }
  return {
    inventory: {
      ...currentInventory,
      [itemId]: current - consumeAmount,
    },
    consumed: true,
  };
}

export function consumeInventoryItem(itemId: ItemId, amount = 1): InventoryConsumeResult {
  const current = loadInventory();
  const result = consumeInventory(current, itemId, amount);
  if (result.consumed) {
    saveInventory(result.inventory);
  }
  return result;
}
