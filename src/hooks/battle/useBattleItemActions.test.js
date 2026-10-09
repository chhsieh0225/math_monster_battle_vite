import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { runUseItem } from './useBattleItemActions.ts';

let previousStorage;
beforeEach(() => {
  previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
});
afterEach(() => { globalThis.localStorage = previousStorage; });

function harness(overrides = {}) {
  const calls = { endTurn: 0, hp: 50, specDef: false, text: '', inventory: null, effMsg: null };
  const deps = {
    phase: 'menu', battleMode: 'single', coopActiveSlot: 'main', allySub: null, pHpSub: 0,
    pHp: 50, pLvl: 3, pStg: 0, inventory: { potion: 2, candy: 1, shield: 1 }, specDef: false,
    starter: { type: 'fire' }, sr: { current: {} }, getActingStarter: () => ({ type: 'fire' }),
    getPlayerMaxHp: () => 100,
    setPHpSub: () => {},
    setPHp: (next) => { calls.hp = typeof next === 'function' ? next(calls.hp) : next; },
    setBText: (text) => { calls.text = text; },
    setEffMsg: (msg) => { calls.effMsg = msg; },
    setSpecDef: (value) => { calls.specDef = value; },
    setDefAnim: () => {}, safeTo: () => {},
    setInventory: (inventory) => { calls.inventory = inventory; },
    endTurn: () => { calls.endTurn += 1; },
    t: (_key, fallback, params) => String(fallback ?? '').replace(/\{(\w+)\}/g, (_m, k) => String(params?.[k] ?? '')),
    sfx: { play: () => {} },
    ...overrides,
  };
  return { deps, calls };
}

test('every successful item use spends the turn exactly once', () => {
  for (const itemId of ['potion', 'candy', 'shield']) {
    const { deps, calls } = harness();
    runUseItem(deps, itemId);
    assert.equal(calls.endTurn, 1, itemId);
    assert.equal(calls.inventory[itemId], deps.inventory[itemId] - 1, itemId);
    assert.match(calls.text, /used your turn/, itemId);
  }
  const { deps, calls } = harness();
  runUseItem(deps, 'potion');
  assert.equal(calls.hp, 82, 'potion still heals 32% of max HP');
});

test('a failed item use keeps the turn and the item', () => {
  const cases = [
    ['full HP', { pHp: 100 }, 'potion'],
    ['none left', { inventory: { potion: 0, candy: 0, shield: 0 } }, 'candy'],
    ['shield already up', { specDef: true }, 'shield'],
    ['PvP', { battleMode: 'pvp' }, 'potion'],
    ['not the player\'s move', { phase: 'enemyAtk' }, 'potion'],
  ];
  for (const [label, overrides, itemId] of cases) {
    const { deps, calls } = harness(overrides);
    runUseItem(deps, itemId);
    assert.equal(calls.endTurn, 0, label);
    assert.equal(calls.inventory, null, label);
  }
});
