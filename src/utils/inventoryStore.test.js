import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDropsToInventory,
  applyDropsToInventory,
  consumeInventory,
  consumeInventoryItem,
  loadInventory,
} from './inventoryStore.ts';

function createStorageMock() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

test('applyDropsToInventory converts supported drops into item grants', () => {
  const result = applyDropsToInventory(
    { potion: 0, candy: 0, shield: 0 },
    ['🧪', '🍬', '👑', '🔥', '🏆'],
  );

  assert.equal(result.changed, true);
  assert.equal(result.inventory.potion, 2);
  assert.equal(result.inventory.candy, 1);
  assert.equal(result.inventory.shield, 2);
  assert.equal(result.grants.length, 5);
});

test('addDropsToInventory persists inventory gains', () => {
  globalThis.localStorage = createStorageMock();

  const first = addDropsToInventory(['🧪', '🍬', '🛡️']);
  assert.equal(first.inventory.potion, 1);
  assert.equal(first.inventory.candy, 1);
  assert.equal(first.inventory.shield, 1);

  const second = addDropsToInventory(['💎', '🍬']);
  assert.equal(second.inventory.potion, 2);
  assert.equal(second.inventory.candy, 2);
  assert.equal(second.inventory.shield, 1);
  assert.deepEqual(loadInventory(), second.inventory);
});

test('consumeInventory and consumeInventoryItem avoid negative counts', () => {
  globalThis.localStorage = createStorageMock();
  addDropsToInventory(['🧪']);

  const fail = consumeInventory({ potion: 0, candy: 0, shield: 0 }, 'potion');
  assert.equal(fail.consumed, false);
  assert.equal(fail.inventory.potion, 0);

  const success = consumeInventoryItem('potion');
  assert.equal(success.consumed, true);
  assert.equal(success.inventory.potion, 0);

  const secondTry = consumeInventoryItem('potion');
  assert.equal(secondTry.consumed, false);
  assert.equal(secondTry.inventory.potion, 0);
});
