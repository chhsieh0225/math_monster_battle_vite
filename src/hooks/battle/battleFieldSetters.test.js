import assert from 'node:assert/strict';
import test from 'node:test';
import { createBattleFieldSetters } from './battleFieldSetters.ts';

test('createBattleFieldSetters maps setter calls to set_field actions', () => {
  const actions = [];
  const dispatchBattle = (action) => { actions.push(action); };
  const {
    setPHp,
    setBossTurn,
    setBattleField,
  } = createBattleFieldSetters(dispatchBattle);

  setPHp(88);
  setBossTurn(3);
  setBattleField('sealedMove', 1);

  assert.deepEqual(actions, [
    { type: 'set_field', key: 'pHp', value: 88 },
    { type: 'set_field', key: 'bossTurn', value: 3 },
    { type: 'set_field', key: 'sealedMove', value: 1 },
  ]);
});

test('createBattleFieldSetters forwards updater functions unchanged', () => {
  const actions = [];
  const dispatchBattle = (action) => { actions.push(action); };
  const { setMHits } = createBattleFieldSetters(dispatchBattle);
  const updater = (prev) => prev.map((value) => value + 1);

  setMHits(updater);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, 'set_field');
  assert.equal(actions[0].key, 'mHits');
  assert.equal(actions[0].value, updater);
});
