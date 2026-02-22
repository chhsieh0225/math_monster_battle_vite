import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPostHitResolutionPlan, runPlayerAnswer } from './playerFlow.ts';

function createNumberSetter(initialValue = 0, onChange = null) {
  let value = initialValue;
  const calls = [];
  const setter = (next) => {
    value = typeof next === 'function' ? next(value) : next;
    calls.push(value);
    if (onChange) onChange(value);
  };
  return { setter, calls, getValue: () => value };
}

function createArraySetter(initialValue = [], onChange = null) {
  let value = initialValue;
  const calls = [];
  const setter = (next) => {
    value = typeof next === 'function' ? next(value) : next;
    calls.push(value);
    if (onChange) onChange(value);
  };
  return { setter, calls, getValue: () => value };
}

function createTestContext(stateOverrides = {}) {
  const state = {
    allySub: null,
    starter: { name: '火狐', type: 'fire' },
    pHpSub: 30,
    pHp: 100,
    streak: 0,
    maxStreak: 0,
    passiveCount: 0,
    specDef: false,
    mHits: [0, 0, 0],
    mLvls: [1, 1, 1],
    selIdx: 0,
    pStg: 0,
    enemy: { trait: '', maxHp: 500, mType: 'grass' },
    cursed: false,
    bossPhase: 0,
    bossCharging: false,
    eHp: 500,
    burnStack: 0,
    staticStack: 0,
    q: { answer: 10, steps: ['5+5'] },
    phase: 'question',
    screen: 'battle',
    ...stateOverrides,
  };

  const calls = {
    fb: [],
    phase: [],
    pAnim: [],
    eAnim: [],
    atkEffect: [],
    effMsg: [],
    bText: [],
    sfx: [],
    damage: [],
    doEnemyTurn: 0,
    handleVictory: [],
    handleFreeze: 0,
    tryUnlock: [],
    ko: [],
    endSession: [],
    screen: [],
    pendingTextActionSet: 0,
  };
  let pendingTextAdvanceAction = null;

  const tc = createNumberSetter(0);
  const tw = createNumberSetter(0);
  const streak = createNumberSetter(state.streak, (value) => { state.streak = value; });
  const passive = createNumberSetter(state.passiveCount, (value) => { state.passiveCount = value; });
  const charge = createNumberSetter(0);
  const maxStreak = createNumberSetter(state.maxStreak, (value) => { state.maxStreak = value; });
  const pHp = createNumberSetter(state.pHp, (value) => { state.pHp = value; });
  const pHpSub = createNumberSetter(state.pHpSub, (value) => { state.pHpSub = value; });
  const eHp = createNumberSetter(state.eHp, (value) => { state.eHp = value; });
  const burn = createNumberSetter(state.burnStack, (value) => { state.burnStack = value; });
  const frozen = createNumberSetter(0);
  const staticStack = createNumberSetter(state.staticStack, (value) => { state.staticStack = value; });
  const mHits = createArraySetter(state.mHits, (value) => { state.mHits = value; });
  const mLvls = createArraySetter(state.mLvls, (value) => { state.mLvls = value; });
  const mlvlUp = createNumberSetter(null);

  const deps = {
    sr: { current: state },
    safeTo: (fn) => fn(),
    chance: () => false,
    sfx: { play: (name) => { calls.sfx.push(name); } },
    setFb: (value) => { calls.fb.push(value); },
    setTC: tc.setter,
    setTW: tw.setter,
    setStreak: streak.setter,
    setPassiveCount: passive.setter,
    setCharge: charge.setter,
    setMaxStreak: maxStreak.setter,
    setSpecDef: () => {},
    tryUnlock: (id) => { calls.tryUnlock.push(id); },
    setMLvls: mLvls.setter,
    setMLvlUp: mlvlUp.setter,
    setMHits: mHits.setter,
    setPhase: (value) => { calls.phase.push(value); },
    setPAnim: (value) => { calls.pAnim.push(value); },
    setAtkEffect: (value) => { calls.atkEffect.push(value); },
    setEAnim: (value) => { calls.eAnim.push(value); },
    setEffMsg: (value) => { calls.effMsg.push(value); },
    setBossCharging: () => {},
    setBurnStack: burn.setter,
    setPHp: pHp.setter,
    setPHpSub: pHpSub.setter,
    setFrozen: frozen.setter,
    setShattered: () => {},
    frozenR: { current: false },
    setStaticStack: staticStack.setter,
    setEHp: eHp.setter,
    addD: (value, x, y, color) => { calls.damage.push({ value, x, y, color }); },
    doEnemyTurn: () => { calls.doEnemyTurn += 1; },
    handleVictory: (reason) => { calls.handleVictory.push(reason || null); },
    handleFreeze: () => { calls.handleFreeze += 1; },
    setCursed: () => {},
    _endSession: (completed, reason) => { calls.endSession.push({ completed, reason }); },
    setScreen: (value) => { calls.screen.push(value); },
    setBText: (value) => { calls.bText.push(value); },
    setPendingTextAdvanceAction: (action) => {
      pendingTextAdvanceAction = action;
      calls.pendingTextActionSet += 1;
    },
    handlePlayerPartyKo: (args) => { calls.ko.push(args); return 'handled'; },
  };

  return {
    state,
    calls,
    deps,
    runPendingTextAdvanceAction: () => {
      if (typeof pendingTextAdvanceAction !== 'function') return false;
      const fn = pendingTextAdvanceAction;
      pendingTextAdvanceAction = null;
      fn();
      return true;
    },
    hasPendingTextAdvanceAction: () => typeof pendingTextAdvanceAction === 'function',
    counters: { tc, tw, streak, passive, charge, maxStreak, pHp, pHpSub, eHp, burn, frozen, staticStack, mHits, mLvls, mlvlUp },
  };
}

test('buildPostHitResolutionPlan returns victory plan and one-hit unlock on lethal full damage', () => {
  const plan = buildPostHitResolutionPlan({
    enemyHpAfterHit: 0,
    enemyMaxHp: 120,
    appliedHitDmg: 120,
    nextDelayMs: 1100,
    willFreeze: false,
    hasAllySupportRunner: true,
  });

  assert.equal(plan.kind, 'victory');
  assert.equal(plan.unlockOneHit, true);
  assert.equal(plan.tryAllySupport, false);
  assert.equal(plan.continueRoute, null);
});

test('buildPostHitResolutionPlan keeps continue route and ally-support intent when enemy survives', () => {
  const plan = buildPostHitResolutionPlan({
    enemyHpAfterHit: 40,
    enemyMaxHp: 120,
    appliedHitDmg: 60,
    nextDelayMs: 900,
    willFreeze: true,
    hasAllySupportRunner: true,
  });

  assert.equal(plan.kind, 'continue');
  assert.equal(plan.unlockOneHit, false);
  assert.equal(plan.tryAllySupport, true);
  assert.equal(plan.continueRoute, 'freeze');
});

test('buildPostHitResolutionPlan does not request ally support when no support runner exists', () => {
  const plan = buildPostHitResolutionPlan({
    enemyHpAfterHit: 50,
    enemyMaxHp: 120,
    appliedHitDmg: 50,
    nextDelayMs: 700,
    willFreeze: false,
    hasAllySupportRunner: false,
  });

  assert.equal(plan.kind, 'continue');
  assert.equal(plan.tryAllySupport, false);
  assert.equal(plan.continueRoute, 'enemy');
});

test('runPlayerAnswer returns early when starter or move is missing', () => {
  const { calls, deps } = createTestContext();
  runPlayerAnswer({
    correct: true,
    move: null,
    starter: null,
    ...deps,
  });
  assert.equal(calls.fb.length, 0);
  assert.equal(calls.phase.length, 0);
  assert.equal(calls.doEnemyTurn, 0);
});

test('runPlayerAnswer correct path performs attack and continues enemy turn', () => {
  const { calls, deps, counters } = createTestContext();
  runPlayerAnswer({
    correct: true,
    move: { name: '炎牙', basePower: 12, growth: 2, type: 'fire' },
    starter: { name: '火狐', type: 'fire' },
    ...deps,
  });

  assert.deepEqual(calls.fb[0], { correct: true });
  assert.equal(counters.tc.getValue(), 1);
  assert.equal(counters.streak.getValue(), 1);
  assert.equal(counters.charge.getValue(), 1);
  assert.equal(calls.phase.includes('playerAtk'), true);
  assert.equal(calls.sfx.includes('hit'), true);
  assert.equal(calls.sfx.includes('fire'), true);
  assert.equal(counters.eHp.getValue() < 500, true);
  assert.equal(counters.burn.getValue(), 1);
  assert.equal(calls.handleVictory.length, 0);
  assert.equal(calls.doEnemyTurn, 1);
});

test('runPlayerAnswer wrong non-risky path resets streak and calls enemy turn', () => {
  const { calls, deps, counters, hasPendingTextAdvanceAction, runPendingTextAdvanceAction } = createTestContext({
    streak: 4,
    passiveCount: 3,
    burnStack: 0,
  });
  runPlayerAnswer({
    correct: false,
    move: { name: '炎牙', basePower: 12, growth: 2, type: 'fire', risky: false },
    starter: { name: '火狐', type: 'fire' },
    ...deps,
  });

  assert.equal(counters.tw.getValue(), 1);
  assert.equal(counters.streak.getValue(), 0);
  assert.equal(counters.passive.getValue(), 0);
  assert.equal(counters.charge.getValue(), 0);
  assert.equal(calls.sfx.includes('wrong'), true);
  assert.equal(calls.bText.includes('Attack missed!'), true);
  assert.equal(calls.phase.includes('text'), true);
  assert.equal(calls.doEnemyTurn, 0);
  assert.equal(hasPendingTextAdvanceAction(), true);
  assert.equal(runPendingTextAdvanceAction(), true);
  assert.equal(calls.doEnemyTurn, 1);
});

test('runPlayerAnswer wrong risky sub attack can trigger sub ko handling', () => {
  const { calls, deps, counters, hasPendingTextAdvanceAction, runPendingTextAdvanceAction } = createTestContext({
    allySub: { name: '雷喵', selectedStageIdx: 0 },
    pHpSub: 5,
    starter: { name: '火狐', type: 'fire' },
  });
  runPlayerAnswer({
    correct: false,
    attackerSlot: 'sub',
    move: { name: '暗影爆裂', basePower: 50, growth: 0, type: 'dark', risky: true },
    starter: { name: '雷喵', type: 'dark' },
    ...deps,
  });

  assert.equal(counters.pHpSub.getValue(), 0);
  assert.equal(calls.bText.some((text) => text.includes('went out of control')), true);
  assert.equal(calls.ko.length, 0);
  assert.equal(hasPendingTextAdvanceAction(), true);
  assert.equal(runPendingTextAdvanceAction(), true);
  assert.equal(calls.ko.length, 1);
  assert.equal(calls.ko[0].target, 'sub');
  assert.equal(calls.doEnemyTurn, 0);
});

test('runPlayerAnswer wrong path tolerates missing question payload', () => {
  const { calls, deps, counters, hasPendingTextAdvanceAction, runPendingTextAdvanceAction } = createTestContext({
    q: null,
    streak: 2,
    passiveCount: 1,
  });

  runPlayerAnswer({
    correct: false,
    move: { name: '炎牙', basePower: 12, growth: 2, type: 'fire', risky: false },
    starter: { name: '火狐', type: 'fire' },
    ...deps,
  });

  assert.deepEqual(calls.fb[0], { correct: false, answer: undefined, steps: [] });
  assert.equal(counters.tw.getValue(), 1);
  assert.equal(calls.phase.includes('text'), true);
  assert.equal(calls.doEnemyTurn, 0);
  assert.equal(hasPendingTextAdvanceAction(), true);
  assert.equal(runPendingTextAdvanceAction(), true);
  assert.equal(calls.doEnemyTurn, 1);
});

test('runPlayerAnswer wrong path ignores stale delayed callback after battle ended', () => {
  const queue = [];
  const { state, calls, deps, counters, hasPendingTextAdvanceAction, runPendingTextAdvanceAction } = createTestContext({
    phase: 'question',
    screen: 'battle',
  });
  deps.safeTo = (fn) => { queue.push(fn); };

  runPlayerAnswer({
    correct: false,
    move: { name: '炎牙', basePower: 12, growth: 2, type: 'fire', risky: false },
    starter: { name: '火狐', type: 'fire' },
    ...deps,
  });

  assert.equal(counters.tw.getValue(), 1);
  assert.equal(queue.length > 0, true);

  state.phase = 'ko';
  state.screen = 'gameover';
  while (queue.length > 0) {
    const fn = queue.shift();
    fn();
  }

  assert.equal(calls.doEnemyTurn, 0);
  assert.equal(calls.phase.includes('text'), false);
  assert.equal(calls.bText.length, 0);
  assert.equal(hasPendingTextAdvanceAction(), false);
  assert.equal(runPendingTextAdvanceAction(), false);
});

test('runPlayerAnswer correct path ignores stale strike callback after battle ended', () => {
  const queue = [];
  const { state, calls, deps, counters } = createTestContext({
    phase: 'question',
    screen: 'battle',
  });
  deps.safeTo = (fn) => { queue.push(fn); };

  runPlayerAnswer({
    correct: true,
    move: { name: '炎牙', basePower: 12, growth: 2, type: 'fire' },
    starter: { name: '火狐', type: 'fire' },
    ...deps,
  });

  assert.equal(queue.length > 0, true);
  state.phase = 'ko';
  state.screen = 'gameover';
  while (queue.length > 0) {
    const fn = queue.shift();
    fn();
  }

  assert.equal(counters.eHp.getValue(), 500);
  assert.equal(calls.doEnemyTurn, 0);
  assert.equal(calls.handleVictory.length, 0);
});
