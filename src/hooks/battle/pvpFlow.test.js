import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPvpEnemyFromStarter,
  handlePvpAnswer,
  processPvpTurnStart,
} from './pvpFlow.ts';

function createNumberSetter(initialValue = 0) {
  let value = initialValue;
  const calls = [];
  const setter = (next) => {
    value = typeof next === 'function' ? next(value) : next;
    calls.push(value);
  };
  return { setter, calls, getValue: () => value };
}

function createBasePvpState(overrides = {}) {
  return {
    battleMode: 'pvp',
    phase: 'question',
    screen: 'battle',
    pvpWinner: null,
    pvpTurn: 'p1',
    starter: {
      id: 'fire',
      name: '火狐',
      type: 'fire',
      stages: [{ name: '火狐', svgFn: () => '<svg />' }],
      moves: [{ name: '炎牙', type: 'fire', basePower: 20, growth: 5 }],
      selectedStageIdx: 0,
    },
    pvpStarter2: {
      id: 'water',
      name: '水靈',
      type: 'water',
      stages: [{ name: '水靈', svgFn: () => '<svg />' }],
      moves: [{ name: '水刃', type: 'water', basePower: 20, growth: 5 }],
      selectedStageIdx: 0,
    },
    selIdx: 0,
    q: { answer: 8, steps: ['3+5'] },
    pvpSpecDefP1: false,
    pvpSpecDefP2: false,
    pvpComboP1: 1,
    pvpComboP2: 0,
    pvpChargeP1: 2,
    pvpChargeP2: 1,
    pvpActionCount: 4,
    pHp: 100,
    pvpHp2: 100,
    pStg: 0,
    pvpBurnP1: 0,
    pvpBurnP2: 0,
    pvpFreezeP1: false,
    pvpFreezeP2: false,
    pvpStaticP1: 0,
    pvpStaticP2: 0,
    pvpParalyzeP1: false,
    pvpParalyzeP2: false,
    ...overrides,
  };
}

test('createPvpEnemyFromStarter maps starter stage to pvp enemy vm', () => {
  const starter = {
    id: 'fire',
    name: '火狐',
    type: 'fire',
    typeIcon: '🔥',
    typeName: 'Fire',
    c1: '#111',
    c2: '#222',
    selectedStageIdx: 1,
    stages: [
      { name: '火狐', svgFn: () => '<svg>0</svg>' },
      { name: '烈焰狐', svgFn: () => '<svg>1</svg>' },
    ],
    moves: [],
  };

  const vm = createPvpEnemyFromStarter(starter);

  assert.equal(vm?.id, 'pvp_fire');
  assert.equal(vm?.name, '烈焰狐');
  assert.equal(vm?.mType, 'fire');
  assert.equal(vm?.sceneMType, 'fire');
  assert.equal(vm?.maxHp, 120);
  assert.equal(vm?.isEvolved, true);
  assert.equal(vm?.selectedStageIdx, 1);
  assert.equal(vm?.traitName, 'Player');
});

test('createPvpEnemyFromStarter returns null for empty starter', () => {
  assert.equal(createPvpEnemyFromStarter(null), null);
});

test('handlePvpAnswer wrong answer swaps turn and resets current attacker resources', () => {
  const state = createBasePvpState();
  const tw = createNumberSetter(2);
  const actionCount = createNumberSetter(4);
  const chargeP1 = createNumberSetter(2);
  const comboP1 = createNumberSetter(1);
  const chargeP2 = createNumberSetter(1);
  const comboP2 = createNumberSetter(0);
  let fb = null;
  let nextTurn = 'p1';
  let text = '';
  let phase = '';

  const out = handlePvpAnswer({
    choice: 1,
    state,
    sr: { current: state },
    rand: () => 0.5,
    chance: () => false,
    safeTo: () => {},
    sfx: { play: () => {} },
    getOtherPvpTurn: () => 'p2',
    setFb: (value) => { fb = value; },
    setTC: () => {},
    setTW: tw.setter,
    setPvpChargeP1: chargeP1.setter,
    setPvpChargeP2: chargeP2.setter,
    setPvpComboP1: comboP1.setter,
    setPvpComboP2: comboP2.setter,
    setPvpTurn: (value) => { nextTurn = value; },
    setPvpActionCount: actionCount.setter,
    setBText: (value) => { text = value; },
    setPhase: (value) => { phase = value; },
    setPvpSpecDefP1: () => {},
    setPvpSpecDefP2: () => {},
    setEffMsg: () => {},
    setAtkEffect: () => {},
    addP: () => {},
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPAnim: () => {},
    setEAnim: () => {},
    addD: () => {},
    setPHp: () => {},
    setPvpHp2: () => {},
    setEHp: () => {},
    setScreen: () => {},
    setPvpWinner: () => {},
    setPvpBurnP1: () => {},
    setPvpBurnP2: () => {},
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
    setPvpStaticP1: () => {},
    setPvpStaticP2: () => {},
  });

  assert.equal(out, true);
  assert.deepEqual(fb, { correct: false, answer: 8, steps: ['3+5'] });
  assert.equal(tw.getValue(), 3);
  assert.equal(chargeP1.getValue(), 0);
  assert.equal(comboP1.getValue(), 0);
  assert.equal(chargeP2.getValue(), 1);
  assert.equal(comboP2.getValue(), 0);
  assert.equal(nextTurn, 'p2');
  assert.equal(actionCount.getValue(), 5);
  assert.equal(phase, 'text');
  assert.equal(text.includes('answered wrong'), true);
});

test('handlePvpAnswer returns false when pvp participants are missing', () => {
  const state = createBasePvpState({
    starter: null,
  });
  let fbCalls = 0;
  let twCalls = 0;

  const out = handlePvpAnswer({
    choice: 1,
    state,
    sr: { current: state },
    rand: () => 0.5,
    chance: () => false,
    safeTo: () => {},
    sfx: { play: () => {} },
    getOtherPvpTurn: () => 'p2',
    setFb: () => { fbCalls += 1; },
    setTC: () => {},
    setTW: () => { twCalls += 1; },
    setPvpChargeP1: () => {},
    setPvpChargeP2: () => {},
    setPvpComboP1: () => {},
    setPvpComboP2: () => {},
    setPvpTurn: () => {},
    setPvpActionCount: () => {},
    setBText: () => {},
    setPhase: () => {},
    setPvpSpecDefP1: () => {},
    setPvpSpecDefP2: () => {},
    setEffMsg: () => {},
    setAtkEffect: () => {},
    addP: () => {},
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPAnim: () => {},
    setEAnim: () => {},
    addD: () => {},
    setPHp: () => {},
    setPvpHp2: () => {},
    setEHp: () => {},
    setScreen: () => {},
    setPvpWinner: () => {},
    setPvpBurnP1: () => {},
    setPvpBurnP2: () => {},
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
    setPvpStaticP1: () => {},
    setPvpStaticP2: () => {},
  });

  assert.equal(out, false);
  assert.equal(fbCalls, 0);
  assert.equal(twCalls, 0);
});

test('handlePvpAnswer returns false when selected move is missing', () => {
  const state = createBasePvpState({
    selIdx: 9,
  });
  let fbCalls = 0;
  let twCalls = 0;

  const out = handlePvpAnswer({
    choice: 8,
    state,
    sr: { current: state },
    rand: () => 0.5,
    chance: () => false,
    safeTo: () => {},
    sfx: { play: () => {} },
    getOtherPvpTurn: () => 'p2',
    setFb: () => { fbCalls += 1; },
    setTC: () => {},
    setTW: () => { twCalls += 1; },
    setPvpChargeP1: () => {},
    setPvpChargeP2: () => {},
    setPvpComboP1: () => {},
    setPvpComboP2: () => {},
    setPvpTurn: () => {},
    setPvpActionCount: () => {},
    setBText: () => {},
    setPhase: () => {},
    setPvpSpecDefP1: () => {},
    setPvpSpecDefP2: () => {},
    setEffMsg: () => {},
    setAtkEffect: () => {},
    addP: () => {},
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPAnim: () => {},
    setEAnim: () => {},
    addD: () => {},
    setPHp: () => {},
    setPvpHp2: () => {},
    setEHp: () => {},
    setScreen: () => {},
    setPvpWinner: () => {},
    setPvpBurnP1: () => {},
    setPvpBurnP2: () => {},
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
    setPvpStaticP1: () => {},
    setPvpStaticP2: () => {},
  });

  assert.equal(out, false);
  assert.equal(fbCalls, 0);
  assert.equal(twCalls, 0);
});

test('handlePvpAnswer returns false when question payload is missing', () => {
  const state = createBasePvpState({
    q: null,
  });
  let fbCalls = 0;
  let twCalls = 0;

  const out = handlePvpAnswer({
    choice: 8,
    state,
    sr: { current: state },
    rand: () => 0.5,
    chance: () => false,
    safeTo: () => {},
    sfx: { play: () => {} },
    getOtherPvpTurn: () => 'p2',
    setFb: () => { fbCalls += 1; },
    setTC: () => {},
    setTW: () => { twCalls += 1; },
    setPvpChargeP1: () => {},
    setPvpChargeP2: () => {},
    setPvpComboP1: () => {},
    setPvpComboP2: () => {},
    setPvpTurn: () => {},
    setPvpActionCount: () => {},
    setBText: () => {},
    setPhase: () => {},
    setPvpSpecDefP1: () => {},
    setPvpSpecDefP2: () => {},
    setEffMsg: () => {},
    setAtkEffect: () => {},
    addP: () => {},
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPAnim: () => {},
    setEAnim: () => {},
    addD: () => {},
    setPHp: () => {},
    setPvpHp2: () => {},
    setEHp: () => {},
    setScreen: () => {},
    setPvpWinner: () => {},
    setPvpBurnP1: () => {},
    setPvpBurnP2: () => {},
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
    setPvpStaticP1: () => {},
    setPvpStaticP2: () => {},
  });

  assert.equal(out, false);
  assert.equal(fbCalls, 0);
  assert.equal(twCalls, 0);
});

test('processPvpTurnStart resolves lethal burn tick and declares winner', () => {
  const state = createBasePvpState({
    pvpTurn: 'p1',
    pHp: 6,
    pvpBurnP1: 2,
  });
  const pHp = createNumberSetter(6);
  const burnP1 = createNumberSetter(2);
  let winner = null;
  let screen = '';

  const out = processPvpTurnStart({
    state,
    safeTo: (fn) => fn(),
    getOtherPvpTurn: () => 'p2',
    getPvpTurnName: () => '火狐',
    setPHp: pHp.setter,
    setPvpBurnP1: burnP1.setter,
    setPAnim: () => {},
    addD: () => {},
    setPvpWinner: (value) => { winner = value; },
    setScreen: (value) => { screen = value; },
    setPvpHp2: () => {},
    setEHp: () => {},
    setPvpBurnP2: () => {},
    setEAnim: () => {},
    setBText: () => {},
    setPhase: () => {},
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPvpTurn: () => {},
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
  });

  assert.equal(out, true);
  assert.equal(pHp.getValue(), 0);
  assert.equal(burnP1.getValue(), 1);
  assert.equal(winner, 'p2');
  assert.equal(screen, 'pvp_result');
});

test('processPvpTurnStart clears paralyze and skips current turn', () => {
  const state = createBasePvpState({
    pvpTurn: 'p2',
    pvpParalyzeP2: true,
  });
  let turn = 'p2';
  let text = '';
  let phase = '';
  let p2Paralyze = true;

  const out = processPvpTurnStart({
    state,
    safeTo: () => {},
    getOtherPvpTurn: () => 'p1',
    getPvpTurnName: () => '水靈',
    setPHp: () => {},
    setPvpBurnP1: () => {},
    setPAnim: () => {},
    addD: () => {},
    setPvpWinner: () => {},
    setScreen: () => {},
    setPvpHp2: () => {},
    setEHp: () => {},
    setPvpBurnP2: () => {},
    setEAnim: () => {},
    setBText: (value) => { text = value; },
    setPhase: (value) => { phase = value; },
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: (value) => { p2Paralyze = value; },
    setPvpTurn: (value) => { turn = value; },
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
  });

  assert.equal(out, true);
  assert.equal(p2Paralyze, false);
  assert.equal(turn, 'p1');
  assert.equal(phase, 'text');
  assert.equal(text.includes('paralyzed'), true);
});

test('processPvpTurnStart returns false when no status effect blocks turn', () => {
  const state = createBasePvpState({
    pvpBurnP1: 0,
    pvpParalyzeP1: false,
    pvpFreezeP1: false,
  });

  const out = processPvpTurnStart({
    state,
    safeTo: () => {},
    getOtherPvpTurn: () => 'p2',
    getPvpTurnName: () => '火狐',
    setPHp: () => {},
    setPvpBurnP1: () => {},
    setPAnim: () => {},
    addD: () => {},
    setPvpWinner: () => {},
    setScreen: () => {},
    setPvpHp2: () => {},
    setEHp: () => {},
    setPvpBurnP2: () => {},
    setEAnim: () => {},
    setBText: () => {},
    setPhase: () => {},
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPvpTurn: () => {},
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
  });

  assert.equal(out, false);
});

test('handlePvpAnswer ignores stale delayed strike callback after battle ended', () => {
  const queue = [];
  const state = createBasePvpState({
    phase: 'question',
    screen: 'battle',
    pvpTurn: 'p1',
    pvpActionCount: 0,
  });
  const pvpHp2 = createNumberSetter(state.pvpHp2);
  let phase = '';
  let turn = state.pvpTurn;
  let winner = null;
  let screen = state.screen;

  const out = handlePvpAnswer({
    choice: 8,
    state,
    sr: { current: state },
    rand: () => 0.5,
    chance: () => false,
    safeTo: (fn) => { queue.push(fn); },
    sfx: { play: () => {} },
    getOtherPvpTurn: () => 'p2',
    setFb: () => {},
    setTC: () => {},
    setTW: () => {},
    setPvpChargeP1: () => {},
    setPvpChargeP2: () => {},
    setPvpComboP1: () => {},
    setPvpComboP2: () => {},
    setPvpTurn: (value) => {
      turn = value;
      state.pvpTurn = value;
    },
    setPvpActionCount: () => {},
    setBText: () => {},
    setPhase: (value) => {
      phase = value;
      state.phase = value;
    },
    setPvpSpecDefP1: () => {},
    setPvpSpecDefP2: () => {},
    setEffMsg: () => {},
    setAtkEffect: () => {},
    addP: () => {},
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPAnim: () => {},
    setEAnim: () => {},
    addD: () => {},
    setPHp: () => {},
    setPvpHp2: (value) => {
      const nextValue = typeof value === 'function' ? value(pvpHp2.getValue()) : value;
      pvpHp2.setter(nextValue);
      state.pvpHp2 = nextValue;
    },
    setEHp: () => {},
    setScreen: (value) => {
      screen = value;
      state.screen = value;
    },
    setPvpWinner: (value) => {
      winner = value;
      state.pvpWinner = value;
    },
    setPvpBurnP1: () => {},
    setPvpBurnP2: () => {},
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
    setPvpStaticP1: () => {},
    setPvpStaticP2: () => {},
  });

  assert.equal(out, true);
  assert.equal(phase, 'playerAtk');
  assert.equal(queue.length > 0, true);

  state.phase = 'ko';
  state.screen = 'pvp_result';
  while (queue.length > 0) {
    const fn = queue.shift();
    fn();
  }

  assert.equal(pvpHp2.getValue(), 100);
  assert.equal(turn, 'p1');
  assert.equal(winner, null);
  assert.equal(screen, 'battle');
});

test('processPvpTurnStart ignores stale delayed burn animation reset after battle ended', () => {
  const queue = [];
  const state = createBasePvpState({
    phase: 'text',
    screen: 'battle',
    pvpTurn: 'p1',
    pvpBurnP1: 1,
  });
  const animCalls = [];

  const out = processPvpTurnStart({
    state,
    sr: { current: state },
    safeTo: (fn) => { queue.push(fn); },
    getOtherPvpTurn: () => 'p2',
    getPvpTurnName: () => '火狐',
    setPHp: () => {},
    setPvpBurnP1: () => {},
    setPAnim: (value) => { animCalls.push(value); },
    addD: () => {},
    setPvpWinner: () => {},
    setScreen: () => {},
    setPvpHp2: () => {},
    setEHp: () => {},
    setPvpBurnP2: () => {},
    setEAnim: () => {},
    setBText: () => {},
    setPhase: () => {},
    setPvpParalyzeP1: () => {},
    setPvpParalyzeP2: () => {},
    setPvpTurn: () => {},
    setPvpFreezeP1: () => {},
    setPvpFreezeP2: () => {},
  });

  assert.equal(out, true);
  assert.deepEqual(animCalls, ['playerHit 0.45s ease']);
  assert.equal(queue.length, 1);

  state.phase = 'ko';
  state.screen = 'pvp_result';
  queue[0]();

  assert.deepEqual(animCalls, ['playerHit 0.45s ease']);
});
