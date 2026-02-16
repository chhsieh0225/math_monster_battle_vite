import assert from 'node:assert/strict';
import test from 'node:test';
import { handleTimeoutFlow } from './timeoutFlow.ts';

function createSetterRecorder(initialValue = 0) {
  let value = initialValue;
  const calls = [];
  const setter = (next) => {
    value = typeof next === 'function' ? next(value) : next;
    calls.push(value);
  };
  return { setter, calls, getValue: () => value };
}

test('handleTimeoutFlow swaps turn and resets current pvp resources on timeout', () => {
  let answered = false;
  let fb = null;
  const tw = createSetterRecorder(2);
  const p1Charge = createSetterRecorder(3);
  const p2Charge = createSetterRecorder(1);
  const p1Combo = createSetterRecorder(4);
  const p2Combo = createSetterRecorder(2);
  let text = '';
  let turn = 'p1';
  const actionCount = createSetterRecorder(10);
  let phase = 'question';

  handleTimeoutFlow({
    sr: {
      current: {
        battleMode: 'pvp',
        pvpTurn: 'p1',
        q: { answer: 7, steps: ['3+4'] },
      },
    },
    getPvpTurnName: () => 'Player One',
    getOtherPvpTurn: (current) => (current === 'p1' ? 'p2' : 'p1'),
    setAnswered: (value) => { answered = value; },
    setFb: (value) => { fb = value; },
    setTW: tw.setter,
    setPvpChargeP1: p1Charge.setter,
    setPvpChargeP2: p2Charge.setter,
    setPvpComboP1: p1Combo.setter,
    setPvpComboP2: p2Combo.setter,
    setBText: (value) => { text = value; },
    setPvpTurn: (value) => {
      turn = typeof value === 'function' ? value(turn) : value;
    },
    setPvpActionCount: actionCount.setter,
    setPhase: (value) => { phase = value; },
    sfx: { play: () => {} },
    setStreak: () => {},
    setPassiveCount: () => {},
    setCharge: () => {},
    logAns: () => 0,
    updateAbility: () => {},
    getActingStarter: () => null,
    appendSessionEvent: () => {},
    markCoopRotatePending: () => {},
    safeTo: () => {},
    doEnemyTurn: () => {},
  });

  assert.equal(answered, true);
  assert.deepEqual(fb, { correct: false, answer: 7, steps: ['3+4'] });
  assert.equal(tw.getValue(), 3);
  assert.equal(p1Charge.getValue(), 0);
  assert.equal(p1Combo.getValue(), 0);
  assert.equal(p2Charge.getValue(), 1);
  assert.equal(p2Combo.getValue(), 2);
  assert.equal(turn, 'p2');
  assert.equal(actionCount.getValue(), 11);
  assert.equal(phase, 'text');
  assert.equal(text.includes('timed out'), true);
});

test('handleTimeoutFlow logs timeout and triggers enemy turn in coop mode', () => {
  let answered = false;
  let fb = null;
  const tw = createSetterRecorder(0);
  const streak = createSetterRecorder(5);
  const passive = createSetterRecorder(3);
  const charge = createSetterRecorder(2);
  let text = '';
  let phase = '';
  const sfxCalls = [];
  const events = [];
  const ability = [];
  let marked = 0;
  let enemyTurnCalls = 0;
  const safeToCalls = [];

  handleTimeoutFlow({
    sr: {
      current: {
        battleMode: 'coop',
        timedMode: true,
        diffLevel: 2,
        round: 4,
        selIdx: 1,
        q: {
          answer: 9,
          steps: ['4+5'],
          op: '+',
          display: '4 + 5',
        },
      },
    },
    getPvpTurnName: () => '',
    getOtherPvpTurn: () => 'p1',
    setAnswered: (value) => { answered = value; },
    setFb: (value) => { fb = value; },
    setTW: tw.setter,
    setPvpChargeP1: () => {},
    setPvpChargeP2: () => {},
    setPvpComboP1: () => {},
    setPvpComboP2: () => {},
    setBText: (value) => { text = value; },
    setPvpTurn: () => {},
    setPvpActionCount: () => {},
    setPhase: (value) => { phase = value; },
    sfx: { play: (name) => { sfxCalls.push(name); } },
    setStreak: streak.setter,
    setPassiveCount: passive.setter,
    setCharge: charge.setter,
    logAns: () => 1234,
    updateAbility: (op, correct) => { ability.push({ op, correct }); },
    getActingStarter: () => ({
      moves: [{ name: 'A' }, { name: 'Storm Cut', type: 'electric' }],
    }),
    appendSessionEvent: (name, payload) => { events.push({ name, payload }); },
    markCoopRotatePending: () => { marked += 1; },
    safeTo: (fn, ms) => {
      safeToCalls.push(ms);
      fn();
    },
    doEnemyTurn: () => { enemyTurnCalls += 1; },
  });

  assert.equal(answered, true);
  assert.deepEqual(fb, { correct: false, answer: 9, steps: ['4+5'] });
  assert.equal(tw.getValue(), 1);
  assert.equal(streak.getValue(), 0);
  assert.equal(passive.getValue(), 0);
  assert.equal(charge.getValue(), 0);
  assert.deepEqual(sfxCalls, ['timeout']);
  assert.equal(ability.length, 1);
  assert.deepEqual(ability[0], { op: '+', correct: false });
  assert.equal(events.length, 1);
  assert.equal(events[0].name, 'question_answered');
  assert.equal(events[0].payload.outcome, 'timeout');
  assert.equal(events[0].payload.answerTimeMs, 1234);
  assert.equal(events[0].payload.moveName, 'Storm Cut');
  assert.equal(events[0].payload.moveType, 'electric');
  assert.equal(marked, 1);
  assert.equal(text.includes("Time's up"), true);
  assert.equal(phase, 'text');
  assert.deepEqual(safeToCalls, [1500]);
  assert.equal(enemyTurnCalls, 1);
});
