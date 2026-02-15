import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNextEvolvedAlly,
  handleCoopPartyKo,
  isCoopBattleMode,
  runCoopAllySupportTurn,
} from './coopFlow.js';

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
