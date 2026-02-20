import assert from 'node:assert/strict';
import test from 'node:test';
import { battleReducer, createInitialBattleState } from './battleReducer.ts';

test('battleReducer set_field supports value and updater function', () => {
  let state = createInitialBattleState();
  state = battleReducer(state, { type: "set_field", key: "pHp", value: 88 });
  assert.equal(state.pHp, 88);

  state = battleReducer(state, { type: "set_field", key: "pHp", value: (prev) => prev - 13 });
  assert.equal(state.pHp, 75);
});

test('battleReducer reset_run restores run defaults', () => {
  let state = createInitialBattleState();
  state = battleReducer(state, { type: "set_field", key: "pLvl", value: 5 });
  state = battleReducer(state, { type: "set_field", key: "defeated", value: 4 });
  state = battleReducer(state, { type: "set_field", key: "bossCharging", value: true });

  state = battleReducer(state, { type: "reset_run", patch: { diffLevel: 3 } });
  assert.equal(state.pLvl, 1);
  assert.equal(state.defeated, 0);
  assert.equal(state.bossCharging, false);
  assert.equal(state.diffLevel, 3);
});

test('battleReducer start_battle initializes per-battle status and boss phase', () => {
  const boss = { id: "boss", maxHp: 180 };
  const normal = { id: "slime", maxHp: 40 };
  const partner = { id: "ghost", maxHp: 66 };
  let state = createInitialBattleState();

  state = battleReducer(state, { type: "start_battle", enemy: normal, enemySub: partner, round: 2 });
  assert.equal(state.enemy, normal);
  assert.equal(state.eHp, 40);
  assert.equal(state.enemySub, partner);
  assert.equal(state.eHpSub, 66);
  assert.equal(state.round, 2);
  assert.equal(state.bossPhase, 0);

  state = battleReducer(state, { type: "start_battle", enemy: boss, round: 9 });
  assert.equal(state.enemy, boss);
  assert.equal(state.eHp, 180);
  assert.equal(state.round, 9);
  assert.equal(state.bossPhase, 1);
});

test('battleReducer promote_enemy_sub moves sub enemy to active slot', () => {
  const main = { id: "slime", maxHp: 50 };
  const sub = { id: "boss", maxHp: 200 };
  let state = createInitialBattleState();

  state = battleReducer(state, {
    type: "start_battle",
    enemy: main,
    enemySub: sub,
    round: 4,
  });
  state = battleReducer(state, { type: "promote_enemy_sub" });

  assert.equal(state.enemy, sub);
  assert.equal(state.eHp, 200);
  assert.equal(state.enemySub, null);
  assert.equal(state.eHpSub, 0);
  assert.equal(state.round, 5);
  assert.equal(state.bossPhase, 1);
});

test('battleReducer patch applies partial state updates', () => {
  let state = createInitialBattleState();
  state = battleReducer(state, { type: "patch", patch: { pHp: 42, streak: 5 } });
  assert.equal(state.pHp, 42);
  assert.equal(state.streak, 5);
});

test('battleReducer patch returns same ref when no changes', () => {
  const state = createInitialBattleState();
  const next = battleReducer(state, { type: "patch", patch: null });
  assert.equal(next, state);
});

test('battleReducer promote_enemy_sub is no-op without sub', () => {
  let state = createInitialBattleState();
  state = battleReducer(state, { type: "start_battle", enemy: { id: "slime", maxHp: 40 }, round: 1 });
  const before = state;
  state = battleReducer(state, { type: "promote_enemy_sub" });
  assert.equal(state, before);
});
