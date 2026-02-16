import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNextEvolvedAlly,
  canSwitchCoopActiveSlot,
  handleCoopPartyKo,
  isCoopBattleMode,
  runCoopAllySupportTurn,
} from './coopFlow.ts';

test('isCoopBattleMode identifies coop and double modes', () => {
  assert.equal(isCoopBattleMode("coop"), true);
  assert.equal(isCoopBattleMode("double"), true);
  assert.equal(isCoopBattleMode("single"), false);
});

test('buildNextEvolvedAlly advances selected stage and display name', () => {
  const ally = {
    name: "水靈",
    selectedStageIdx: 0,
    stages: [{ name: "水靈" }, { name: "水靈王" }, { name: "海皇水靈" }],
  };
  const next = buildNextEvolvedAlly(ally);
  assert.equal(next.selectedStageIdx, 1);
  assert.equal(next.name, "水靈王");
});

test('canSwitchCoopActiveSlot only allows valid alive coop sub', () => {
  assert.equal(canSwitchCoopActiveSlot(null), false);
  assert.equal(canSwitchCoopActiveSlot({ battleMode: "single", allySub: { name: "雷喵" }, pHpSub: 20 }), false);
  assert.equal(canSwitchCoopActiveSlot({ battleMode: "coop", allySub: null, pHpSub: 20 }), false);
  assert.equal(canSwitchCoopActiveSlot({ battleMode: "coop", allySub: { name: "雷喵" }, pHpSub: 0 }), false);
  assert.equal(canSwitchCoopActiveSlot({ battleMode: "coop", allySub: { name: "雷喵" }, pHpSub: 20 }), true);
});

test('handleCoopPartyKo promotes sub ally when main is down', () => {
  const allySub = { name: "雷喵", selectedStageIdx: 1 };
  let starter = null;
  let stage = -1;
  let hp = 0;
  let ally = allySub;
  let allyHp = 35;
  const phaseCalls = [];

  const out = handleCoopPartyKo({
    state: {
      pHp: 0,
      pHpSub: 35,
      allySub,
    },
    target: "main",
    setStarter: (v) => { starter = v; },
    setPStg: (v) => { stage = v; },
    setPHp: (v) => { hp = v; },
    setAllySub: (v) => { ally = v; },
    setPHpSub: (v) => { allyHp = v; },
    setCoopActiveSlot: () => {},
    setPhase: (v) => { phaseCalls.push(v); },
    setBText: () => {},
    safeTo: (fn) => fn(),
    endSession: () => { throw new Error('should not end session'); },
    setScreen: () => {},
  });

  assert.equal(out, "promoted");
  assert.equal(starter, allySub);
  assert.equal(stage, 1);
  assert.equal(hp, 35);
  assert.equal(ally, null);
  assert.equal(allyHp, 0);
  assert.deepEqual(phaseCalls, ["text", "menu"]);
});

test('handleCoopPartyKo handles sub ally down without ending game if main alive', () => {
  let ally = { name: "雷喵", selectedStageIdx: 0 };
  let allyHp = 12;
  let slot = "sub";
  let phase = "";
  let text = "";
  let ended = false;
  let screen = "";

  const out = handleCoopPartyKo({
    state: {
      pHp: 30,
      pHpSub: 12,
      allySub: ally,
    },
    target: "sub",
    setStarter: () => {},
    setPStg: () => {},
    setPHp: () => {},
    setAllySub: (value) => { ally = value; },
    setPHpSub: (value) => { allyHp = value; },
    setCoopActiveSlot: (value) => { slot = value; },
    setPhase: (value) => { phase = value; },
    setBText: (value) => { text = value; },
    safeTo: (fn) => fn(),
    endSession: () => { ended = true; },
    setScreen: (value) => { screen = value; },
  });

  assert.equal(out, "sub_down");
  assert.equal(ally, null);
  assert.equal(allyHp, 0);
  assert.equal(slot, "main");
  assert.equal(phase, "menu");
  assert.equal(text, "");
  assert.equal(ended, false);
  assert.equal(screen, "");
});

test('runCoopAllySupportTurn can finish the enemy and trigger victory callback', () => {
  const sr = {
    current: {
      battleMode: "coop",
      allySub: { name: "火狐" },
      pHpSub: 20,
      enemy: { name: "史萊姆" },
      pLvl: 1,
      eHp: 10,
    },
  };
  let victoryReason = null;
  const out = runCoopAllySupportTurn({
    sr,
    safeTo: (fn) => fn(),
    chance: () => true,
    rand: () => 0,
    setBText: () => {},
    setPhase: () => {},
    setEAnim: () => {},
    setEHp: (nextHp) => { sr.current.eHp = nextHp; },
    addD: () => {},
    addP: () => {},
    sfx: { play: () => {} },
    handleVictory: (reason) => { victoryReason = reason; },
  });

  assert.equal(out, true);
  assert.equal(sr.current.eHp, 0);
  assert.equal(victoryReason, "was defeated by co-op combo");
});

test('handleCoopPartyKo skips stale delayed menu reset after battle ended', () => {
  const queue = [];
  const stateRef = {
    current: {
      pHp: 30,
      pHpSub: 12,
      allySub: { name: "雷喵", selectedStageIdx: 0 },
      phase: "text",
      screen: "battle",
    },
  };
  const phaseCalls = [];
  const textCalls = [];

  const out = handleCoopPartyKo({
    state: stateRef.current,
    stateRef,
    target: "sub",
    setStarter: () => {},
    setPStg: () => {},
    setPHp: () => {},
    setAllySub: (value) => { stateRef.current.allySub = value; },
    setPHpSub: (value) => { stateRef.current.pHpSub = value; },
    setCoopActiveSlot: () => {},
    setPhase: (value) => {
      phaseCalls.push(value);
      stateRef.current.phase = value;
    },
    setBText: (value) => { textCalls.push(value); },
    safeTo: (fn) => { queue.push(fn); },
    endSession: () => {},
    setScreen: (value) => { stateRef.current.screen = value; },
  });

  assert.equal(out, "sub_down");
  assert.equal(queue.length, 1);

  stateRef.current.phase = "ko";
  stateRef.current.screen = "gameover";
  queue[0]();

  assert.equal(phaseCalls.includes("menu"), false);
  assert.equal(textCalls.includes(""), false);
});

test('runCoopAllySupportTurn ignores stale callback after battle ended', () => {
  const queue = [];
  const sr = {
    current: {
      battleMode: "coop",
      allySub: { name: "火狐" },
      pHpSub: 20,
      enemy: { name: "史萊姆" },
      pLvl: 1,
      eHp: 18,
      phase: "menu",
      screen: "battle",
    },
  };
  let victoryCalls = 0;
  let onDoneCalls = 0;

  const out = runCoopAllySupportTurn({
    sr,
    safeTo: (fn) => { queue.push(fn); },
    chance: () => true,
    rand: () => 0,
    setBText: () => {},
    setPhase: () => {},
    setEAnim: () => {},
    setEHp: (nextHp) => { sr.current.eHp = nextHp; },
    addD: () => {},
    addP: () => {},
    sfx: { play: () => {} },
    handleVictory: () => { victoryCalls += 1; },
    onDone: () => { onDoneCalls += 1; },
  });

  assert.equal(out, true);
  assert.equal(queue.length > 0, true);

  sr.current.phase = "ko";
  sr.current.screen = "gameover";
  while (queue.length > 0) {
    const fn = queue.shift();
    fn();
  }

  assert.equal(victoryCalls, 0);
  assert.equal(onDoneCalls, 0);
  assert.equal(sr.current.eHp, 18);
});
