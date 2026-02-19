import assert from 'node:assert/strict';
import test from 'node:test';
import { runVictoryFlow } from './victoryFlow.ts';

function createSetterRecorder(initialValue = 0) {
  let value = initialValue;
  const calls = [];
  const setter = (next) => {
    value = typeof next === 'function' ? next(value) : next;
    calls.push(value);
  };
  return { setter, calls, getValue: () => value };
}

test('runVictoryFlow no-ops when enemy is missing', () => {
  let touched = false;
  runVictoryFlow({
    sr: { current: { enemy: null } },
    verb: 'was defeated',
    randInt: () => 0,
    resolveLevelProgress: () => ({ nextExp: 0, nextLevel: 1, hpBonus: 0, evolveCount: 0 }),
    getStageMaxHp: () => 100,
    tryUnlock: () => {},
    applyVictoryAchievements: () => { touched = true; },
    updateEncDefeated: () => { touched = true; },
    setBurnStack: () => { touched = true; },
    setStaticStack: () => { touched = true; },
    setFrozen: () => { touched = true; },
    setShattered: () => { touched = true; },
    frozenRef: { current: false },
    setCursed: () => { touched = true; },
    setBossPhase: () => { touched = true; },
    setBossTurn: () => { touched = true; },
    setBossCharging: () => { touched = true; },
    setSealedMove: () => { touched = true; },
    setSealedTurns: () => { touched = true; },
    setPExp: () => { touched = true; },
    setPLvl: () => { touched = true; },
    setPHp: () => { touched = true; },
    setDefeated: () => { touched = true; },
    setBText: () => { touched = true; },
    setPhase: () => { touched = true; },
    sfx: { play: () => { touched = true; } },
    setPendingEvolve: () => { touched = true; },
  });

  assert.equal(touched, false);
});

test('runVictoryFlow settles exp, evolve state, drops, and victory text', () => {
  const pHp = createSetterRecorder(40);
  const defeated = createSetterRecorder(2);
  const calls = {
    burned: [],
    static: [],
    frozen: [],
    cursed: [],
    bossPhase: [],
    bossTurn: [],
    bossCharging: [],
    sealedMove: [],
    sealedTurns: [],
    pExp: [],
    pLvl: [],
    text: [],
    phase: [],
    sfx: [],
    pending: [],
    drops: [],
    achievements: [],
    encDefeated: [],
  };

  const state = {
    enemy: {
      lvl: 3,
      name: '史萊姆王',
      drops: ['🍖', ''],
    },
    pExp: 10,
    pLvl: 1,
    pStg: 1,
  };

  runVictoryFlow({
    sr: { current: state },
    verb: 'was defeated',
    randInt: () => 0,
    resolveLevelProgress: () => ({
      nextExp: 7,
      nextLevel: 2,
      hpBonus: 12,
      evolveCount: 1,
    }),
    getStageMaxHp: () => 45,
    tryUnlock: () => {},
    applyVictoryAchievements: ({ state: s }) => { calls.achievements.push(s.enemy?.name || ''); },
    updateEncDefeated: (enemy) => { calls.encDefeated.push(enemy.name); },
    setBurnStack: (value) => { calls.burned.push(value); },
    setStaticStack: (value) => { calls.static.push(value); },
    setFrozen: (value) => { calls.frozen.push(value); },
    setShattered: () => {},
    frozenRef: { current: true },
    setCursed: (value) => { calls.cursed.push(value); },
    setBossPhase: (value) => { calls.bossPhase.push(value); },
    setBossTurn: (value) => { calls.bossTurn.push(value); },
    setBossCharging: (value) => { calls.bossCharging.push(value); },
    setSealedMove: (value) => { calls.sealedMove.push(value); },
    setSealedTurns: (value) => { calls.sealedTurns.push(value); },
    setPExp: (value) => { calls.pExp.push(value); },
    setPLvl: (value) => { calls.pLvl.push(value); },
    setPHp: pHp.setter,
    setDefeated: defeated.setter,
    setBText: (value) => { calls.text.push(value); },
    setPhase: (value) => { calls.phase.push(value); },
    sfx: { play: (name) => { calls.sfx.push(name); } },
    setPendingEvolve: (value) => { calls.pending.push(value); },
    onDropResolved: (drop) => { calls.drops.push(drop); },
  });

  assert.deepEqual(calls.burned, [0]);
  assert.deepEqual(calls.static, [0]);
  assert.deepEqual(calls.frozen, [false]);
  assert.deepEqual(calls.cursed, [false]);
  assert.deepEqual(calls.bossPhase, [0]);
  assert.deepEqual(calls.bossTurn, [0]);
  assert.deepEqual(calls.bossCharging, [false]);
  assert.deepEqual(calls.sealedMove, [-1]);
  assert.deepEqual(calls.sealedTurns, [0]);
  assert.deepEqual(calls.pExp, [7]);
  assert.deepEqual(calls.pLvl, [2]);
  assert.equal(pHp.getValue(), 45);
  assert.equal(defeated.getValue(), 3);
  assert.deepEqual(calls.pending, [true]);
  assert.deepEqual(calls.drops, ['🍖']);
  assert.deepEqual(calls.sfx, ['evolve', 'victory']);
  assert.deepEqual(calls.achievements, ['史萊姆王']);
  assert.deepEqual(calls.encDefeated, ['史萊姆王']);
  assert.equal(calls.text[0].includes('史萊姆王 was defeated'), true);
  assert.equal(calls.text[0].includes('45 EXP'), true);
  assert.equal(calls.text[0].includes('🍖'), true);
  assert.deepEqual(calls.phase, ['victory']);
});
