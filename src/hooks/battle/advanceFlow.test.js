import assert from 'node:assert/strict';
import test from 'node:test';
import {
  continueFromVictoryFlow,
  handlePendingEvolution,
  tryProcessPvpTextAdvance,
} from './advanceFlow.ts';

test('continueFromVictoryFlow promotes enemy sub in coop battle', () => {
  const actions = [];
  const screens = [];
  const phases = [];
  const texts = [];

  continueFromVictoryFlow({
    state: {
      battleMode: 'coop',
      enemySub: { name: '副將史萊姆' },
      round: 0,
    },
    enemiesLength: 5,
    setScreen: (value) => { screens.push(value); },
    dispatchBattle: (action) => { actions.push(action); },
    localizeEnemy: (enemy) => enemy,
    locale: 'zh-TW',
    setBText: (value) => { texts.push(value); },
    setPhase: (value) => { phases.push(value); },
    finishGame: () => { throw new Error('finishGame should not be called'); },
    setPHp: () => { throw new Error('setPHp should not be called'); },
    setPHpSub: () => { throw new Error('setPHpSub should not be called'); },
    getStageMaxHp: () => 0,
    getStarterMaxHp: () => 0,
    startBattle: () => { throw new Error('startBattle should not be called'); },
  });

  assert.equal(screens[0], 'battle');
  assert.equal(actions[0].type, 'promote_enemy_sub');
  assert.equal(phases[0], 'text');
  assert.equal(texts[0].includes('副將史萊姆'), true);
});

test('continueFromVictoryFlow finishes game when no rounds remain', () => {
  let finished = false;

  continueFromVictoryFlow({
    state: { battleMode: 'single', round: 1 },
    enemiesLength: 2,
    setScreen: () => {},
    dispatchBattle: () => {},
    localizeEnemy: (enemy) => enemy,
    setBText: () => {},
    setPhase: () => {},
    finishGame: () => { finished = true; },
    setPHp: () => { throw new Error('setPHp should not be called'); },
    setPHpSub: () => { throw new Error('setPHpSub should not be called'); },
    getStageMaxHp: () => 0,
    getStarterMaxHp: () => 0,
    startBattle: () => { throw new Error('startBattle should not be called'); },
  });

  assert.equal(finished, true);
});

test('continueFromVictoryFlow heals party and starts next round', () => {
  let mainHp = 30;
  let subHp = 20;
  let nextRound = null;

  continueFromVictoryFlow({
    state: {
      battleMode: 'coop',
      round: 0,
      pStg: 1,
      allySub: { name: '雷喵', selectedStageIdx: 0 },
      pHpSub: 20,
    },
    enemiesLength: 4,
    setScreen: () => {},
    dispatchBattle: () => {},
    localizeEnemy: (enemy) => enemy,
    setBText: () => {},
    setPhase: () => {},
    finishGame: () => { throw new Error('finishGame should not be called'); },
    setPHp: (value) => {
      mainHp = typeof value === 'function' ? value(mainHp) : value;
    },
    setPHpSub: (value) => {
      subHp = typeof value === 'function' ? value(subHp) : value;
    },
    getStageMaxHp: () => 35,
    getStarterMaxHp: () => 24,
    startBattle: (idx) => { nextRound = idx; },
  });

  assert.equal(mainHp, 35);
  assert.equal(subHp, 24);
  assert.equal(nextRound, 1);
});

test('handlePendingEvolution returns false when no pending flag', () => {
  const pendingEvolveRef = { current: false };

  const out = handlePendingEvolution({
    pendingEvolveRef,
    state: { pStg: 0, battleMode: 'single' },
    setPStg: () => { throw new Error('setPStg should not be called'); },
    tryUnlock: () => { throw new Error('tryUnlock should not be called'); },
    getStageMaxHp: () => 0,
    setPHp: () => { throw new Error('setPHp should not be called'); },
    setAllySub: () => { throw new Error('setAllySub should not be called'); },
    setPHpSub: () => { throw new Error('setPHpSub should not be called'); },
    getStarterMaxHp: () => 0,
    setMLvls: () => { throw new Error('setMLvls should not be called'); },
    maxMoveLvl: 5,
    setScreen: () => { throw new Error('setScreen should not be called'); },
  });

  assert.equal(out, false);
  assert.equal(pendingEvolveRef.current, false);
});

test('handlePendingEvolution evolves leader and ally when pending', () => {
  const pendingEvolveRef = { current: true };
  let stage = 1;
  let hp = 0;
  let allyOut = null;
  let allyHp = 0;
  let moveLvls = [1, 2, 5];
  let screen = '';
  const unlocks = [];

  handlePendingEvolution({
    pendingEvolveRef,
    state: {
      pStg: 1,
      battleMode: 'coop',
      allySub: {
        name: '雷喵',
        selectedStageIdx: 0,
        stages: [{ name: '雷喵' }, { name: '雷喵王' }, { name: '雷喵皇' }],
      },
    },
    setPStg: (value) => {
      stage = typeof value === 'function' ? value(stage) : value;
    },
    tryUnlock: (id) => { unlocks.push(id); },
    getStageMaxHp: () => 120,
    setPHp: (value) => { hp = value; },
    setAllySub: (value) => { allyOut = value; },
    setPHpSub: (value) => { allyHp = value; },
    getStarterMaxHp: () => 88,
    setMLvls: (value) => {
      moveLvls = typeof value === 'function' ? value(moveLvls) : value;
    },
    maxMoveLvl: 5,
    setScreen: (value) => { screen = value; },
  });

  assert.equal(pendingEvolveRef.current, false);
  assert.equal(stage, 2);
  assert.equal(hp, 120);
  assert.equal(allyOut?.selectedStageIdx, 1);
  assert.equal(allyOut?.name, '雷喵王');
  assert.equal(allyHp, 88);
  assert.deepEqual(moveLvls, [2, 3, 5]);
  assert.equal(screen, 'evolve');
  assert.deepEqual(unlocks, ['evolve_max']);
});

test('tryProcessPvpTextAdvance returns false for non-pvp state', () => {
  const out = tryProcessPvpTextAdvance({
    state: { battleMode: 'single', pvpWinner: null },
    handlers: {},
  });
  assert.equal(out, false);
});
