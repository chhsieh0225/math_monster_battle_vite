import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPostHitResolutionPlan, runPlayerAnswer } from './playerFlow.ts';
import { getAttackEffectHitDelay } from '../../utils/effectTiming.ts';
import { resolvePlayerStrike } from './turnResolver.ts';
import { applyBossDamageReduction } from '../../utils/bossDamage.ts';
import { BALANCE_CONFIG } from '../../data/balanceConfig.ts';
import { POWER_CAPS } from '../../data/constants.ts';
import { withRandomSource } from '../../utils/prng.ts';

function createClock() {
  let now = 0;
  const queue = [];
  return {
    schedule: (fn, ms) => queue.push({ fn, at: now + ms }),
    advance: (target) => {
      queue.sort((a, b) => a.at - b.at);
      while (queue[0]?.at <= target) {
        const task = queue.shift();
        now = task.at;
        task.fn();
        queue.sort((a, b) => a.at - b.at);
      }
      now = target;
    },
  };
}

function prepareBossStrike({ tactic, slot = 'main', state: overrides = {}, chance = () => false, correct = true } = {}) {
  const sourceClock = createClock();
  const clock = {
    schedule: sourceClock.schedule,
    advance: (target) => withRandomSource(() => 0.5, () => sourceClock.advance(target)),
  };
  const ctx = createTestContext({
    battleMode: slot === 'sub' ? 'coop' : 'single',
    starter: { name: 'Turtle', type: 'water' },
    allySub: { name: 'Partner', type: 'water', selectedStageIdx: 0 },
    enemy: { id: 'boss', maxHp: 500, mType: 'water' },
    bossCharging: true,
    q: { answer: 10, bossTactic: tactic },
    ...overrides,
  });
  const move = { name: 'Strike', basePower: 24, growth: 0, type: 'water' };
  const rawDamage = withRandomSource(() => 0.5, () => resolvePlayerStrike({
    move, enemy: ctx.state.enemy, moveIdx: 0, moveLvl: 1, didLevel: false,
    maxPower: POWER_CAPS[0], streak: 1, stageBonus: 0, cursed: false,
    starterType: 'water', playerHp: slot === 'sub' ? 30 : 100, bossPhase: 0,
    chance: () => false,
  }).dmg);
  runPlayerAnswer({ ...ctx.deps, safeTo: clock.schedule, correct, chance,
    attackerSlot: slot, move, starter: ctx.state.starter });
  return { ...ctx, clock, rawDamage };
}

for (const slot of ['main', 'sub']) {
  for (const tactic of ['guarded', 'force', undefined]) {
    test(`${slot} ${tactic ?? 'legacy'} charge break applies configured damage and retaliation to the correct actor`, () => {
      const { state, clock, rawDamage, calls, counters } = prepareBossStrike({ tactic, slot });
      const guarded = tactic === 'guarded';
      const raw = guarded ? Math.round(rawDamage * BALANCE_CONFIG.traits.boss.guardedBreakDamageScale) : rawDamage;
      const damage = applyBossDamageReduction(raw, 'boss');
      const retaliation = guarded ? 0 : Math.max(1, Math.round(damage * BALANCE_CONFIG.traits.boss.chargeCounterRatio));
      clock.advance(579);
      assert.equal(state.bossCharging, true);
      clock.advance(5000);
      assert.equal(state.bossCharging, false);
      assert.equal(counters.eHp.getValue(), 500 - damage);
      assert.equal(counters.pHp.getValue(), 100 - (slot === 'main' ? retaliation : 0));
      assert.equal(counters.pHpSub.getValue(), 30 - (slot === 'sub' ? retaliation : 0));
      assert.equal(calls.doEnemyTurn, 1, 'a guarded break does not skip the enemy turn');
    });
  }
}

for (const tactic of ['guarded', 'force']) {
  test(`${tactic} still interrupts a fully shielded hit, without bypassing the shield`, () => {
    let chanceCalls = 0;
    const { clock, state, counters, calls } = prepareBossStrike({ tactic, chance: () => ++chanceCalls === 2 });
    clock.advance(5000);
    assert.equal(state.bossCharging, false);
    assert.equal(counters.eHp.getValue(), 500);
    assert.ok(calls.atkEffect.some((fx) => fx?.impact?.outcome === 'blocked'));
    assert.equal(counters.pHp.getValue() === 100, tactic === 'guarded');
    assert.equal(calls.doEnemyTurn, 1);
  });
}

for (const [enemyId, blockCall, scale] of [
  ['boss', 3, BALANCE_CONFIG.traits.boss.shadowShieldPartialDamageScale],
  ['boss_sword_god', 2, BALANCE_CONFIG.traits.boss.swordParryScale],
]) {
  test(`guarded damage stacks with ${enemyId} shield/parry reduction`, () => {
    let chanceCalls = 0;
    const { clock, counters, rawDamage } = prepareBossStrike({ tactic: 'guarded',
      state: { enemy: { id: enemyId, maxHp: 500, mType: 'water' } },
      chance: () => ++chanceCalls === blockCall });
    clock.advance(5000);
    const guarded = Math.round(rawDamage * BALANCE_CONFIG.traits.boss.guardedBreakDamageScale);
    assert.equal(counters.eHp.getValue(), 500 - applyBossDamageReduction(Math.round(guarded * scale), enemyId));
    assert.equal(counters.pHp.getValue(), 100);
  });
}

test('a captured tactic is not replaced by a later question during attack travel', () => {
  const { clock, state, counters } = prepareBossStrike({ tactic: 'guarded' });
  clock.advance(580);
  state.q = { answer: 20, bossTactic: 'force' };
  clock.advance(5000);
  assert.equal(counters.pHp.getValue(), 100);
});

for (const stateOverride of [{ bossCharging: false }, { enemy: { id: 'slime', maxHp: 500, mType: 'water' } }]) {
  test(`guarded metadata does not penalize an ineligible target: ${JSON.stringify(stateOverride)}`, () => {
    const guarded = prepareBossStrike({ tactic: 'guarded' });
    const force = prepareBossStrike({ tactic: 'force' });
    for (const ctx of [guarded, force]) {
      ctx.clock.advance(580);
      Object.assign(ctx.state, stateOverride);
      ctx.clock.advance(5000);
      assert.equal(ctx.counters.pHp.getValue(), 100);
    }
    assert.equal(guarded.counters.eHp.getValue(), force.counters.eHp.getValue());
  });
}

test('a wrong guarded answer cannot interrupt or skip the enemy turn', () => {
  const { clock, state, calls, counters, runPendingTextAdvanceAction } = prepareBossStrike({ tactic: 'guarded', correct: false });
  clock.advance(5000);
  assert.equal(state.bossCharging, true);
  assert.equal(counters.eHp.getValue(), 500);
  assert.equal(runPendingTextAdvanceAction(), true);
  assert.equal(calls.doEnemyTurn, 1);
});

test('leaving battle during guarded attack travel does not cancel the boss charge', () => {
  const { clock, state, counters } = prepareBossStrike({ tactic: 'guarded' });
  clock.advance(580);
  state.screen = 'title';
  clock.advance(5000);
  assert.equal(state.bossCharging, true);
  assert.equal(counters.eHp.getValue(), 500);
});

for (const slot of ['main', 'sub']) {
  test(`${slot} guarded choice can avoid lethal charge retaliation without granting a free enemy turn skip`, () => {
    const hp = slot === 'main' ? { pHp: 1 } : { pHpSub: 1 };
    const guarded = prepareBossStrike({ tactic: 'guarded', slot, state: hp });
    const force = prepareBossStrike({ tactic: 'force', slot, state: hp });
    guarded.clock.advance(5000);
    force.clock.advance(5000);
    assert.equal(guarded.calls.ko.length, 0);
    assert.equal(guarded.calls.doEnemyTurn, 1);
    assert.equal(force.calls.ko.length, 1);
    assert.equal(force.calls.ko[0].target, slot);
    assert.equal(force.calls.doEnemyTurn, 0);
  });
}

for (const slot of ['main', 'sub']) {
  test(`solo/coop ${slot} impact, recoil and HP settle together, never during travel`, () => {
    const clock = createClock();
    const { state, deps, calls, counters } = createTestContext({
      battleMode: slot === 'sub' ? 'coop' : 'single',
      allySub: slot === 'sub' ? { name: 'Partner', type: 'fire' } : null,
    });
    runPlayerAnswer({ ...deps, safeTo: clock.schedule, attackerSlot: slot, correct: true,
      move: { name: 'Strike', basePower: 12, growth: 2, type: 'fire' }, starter: state.starter });
    clock.advance(579);
    assert.equal(calls.atkEffect.length, 0);
    clock.advance(580);
    const launched = calls.atkEffect.at(-1);
    assert.equal(launched.type, 'fire');
    assert.equal(launched.impact, undefined);
    clock.advance(580 + getAttackEffectHitDelay('fire') - 1);
    assert.equal(counters.eHp.getValue(), 500);
    assert.equal(calls.eAnim.length, 0);
    clock.advance(580 + getAttackEffectHitDelay('fire'));
    assert.ok(counters.eHp.getValue() < 500);
    assert.ok(['hit', 'critical'].includes(calls.atkEffect.at(-1).impact.outcome));
    assert.ok(calls.eAnim.at(-1).includes('Hit'));
    assert.ok(calls.sfx.includes('hit') || calls.sfx.includes('crit'));
  });
}

for (const [enemy, outcome] of [[{ trait: 'phantom' }, 'miss'], [{ id: 'boss' }, 'blocked']]) {
  test(`${outcome} signals no damaging contact, preserves HP and suppresses hit audio`, () => {
    const clock = createClock();
    const { state, deps, calls, counters } = createTestContext({ enemy: { maxHp: 500, mType: 'grass', ...enemy } });
    runPlayerAnswer({ ...deps, safeTo: clock.schedule, chance: () => true, correct: true,
      move: { name: 'Strike', basePower: 12, growth: 2, type: 'fire' }, starter: state.starter });
    clock.advance(880);
    assert.equal(calls.atkEffect.at(-1).impact.outcome, outcome);
    assert.equal(counters.eHp.getValue(), 500);
    assert.ok(!calls.sfx.includes('hit') && !calls.sfx.includes('crit'));
  });
}

test('leaving battle during projectile travel cancels HP and impact feedback', () => {
  const clock = createClock();
  const { state, deps, calls, counters } = createTestContext();
  runPlayerAnswer({ ...deps, safeTo: clock.schedule, correct: true,
    move: { name: 'Strike', basePower: 12, growth: 2, type: 'fire' }, starter: state.starter });
  clock.advance(580);
  state.screen = 'title';
  clock.advance(5000);
  assert.equal(counters.eHp.getValue(), 500);
  assert.ok(calls.atkEffect.every((fx) => !fx?.impact));
});

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
    setBossCharging: (value) => { state.bossCharging = value; },
    setShadowShieldCD: () => {},
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
    setConsecutiveWrong: () => {},
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

for (const attackerSlot of ['main', 'sub']) {
  test(`player lunge stays on ${attackerSlot} after a co-op slot change`, () => {
    const queue = [];
    const animations = [];
    const { deps, state } = createTestContext({
      battleMode: 'coop', coopActiveSlot: attackerSlot,
      allySub: { name: 'Partner', type: 'water' },
    });
    runPlayerAnswer({
      ...deps, attackerSlot, correct: true,
      move: { name: 'Strike', basePower: 12, growth: 2, type: 'fire' },
      starter: state.starter,
      safeTo: (fn) => queue.push(fn),
      setPAnim: (value, slot = 'main') => animations.push({ value, slot }),
    });
    state.coopActiveSlot = attackerSlot === 'sub' ? 'main' : 'sub';
    queue.shift()();
    assert.deepEqual(animations, [{ value: 'attackLunge 0.4s ease', slot: attackerSlot }]);
    queue.shift()();
    assert.deepEqual(animations.at(-1), { value: '', slot: attackerSlot });
  });
}

test('named player strike captures the acting partner, slot and skill before a UI selection change', () => {
  const clock = createClock();
  const partner = { id: 'wolf', name: 'Translated wolf', type: 'steel' };
  const { deps, calls, state } = createTestContext({
    battleMode: 'coop', allySub: partner, selIdx: 2, coopActiveSlot: 'sub',
  });
  runPlayerAnswer({ ...deps, correct: true, starter: partner, attackerSlot: 'sub', safeTo: clock.schedule,
    move: { name: 'Localized cross cut', type: 'steel', basePower: 12, growth: 2 } });
  state.coopActiveSlot = 'main';
  state.selIdx = 0;
  state.allySub = { id: 'water', name: 'Other', type: 'water' };
  clock.advance(2000);
  const effects = calls.atkEffect.filter(Boolean);
  assert.ok(effects.length >= 2);
  for (const effect of effects) {
    assert.equal(effect.skillId, 'wolf:2');
    assert.equal(effect.sourceSlot, 'sub');
  }
});

test('sub attacker risky self-damage animates the same partner that loses HP', () => {
  const animations = [];
  const { deps, state, counters } = createTestContext({
    battleMode: 'coop', allySub: { name: 'Partner', type: 'water' },
  });
  runPlayerAnswer({
    ...deps, attackerSlot: 'sub', correct: false,
    move: { name: 'Risky', basePower: 50, growth: 2, type: 'fire', risky: true },
    starter: state.starter,
    setPAnim: (value, slot = 'main') => animations.push({ value, slot }),
  });
  assert.equal(counters.pHp.calls.length, 0);
  assert.ok(counters.pHpSub.calls.length > 0);
  assert.ok(animations.some((event) => event.slot === 'sub' && event.value.startsWith('playerHit')));
});

test('buildPostHitResolutionPlan returns victory plan and one-hit unlock on lethal full damage', () => {
  const plan = buildPostHitResolutionPlan({
    enemyHpAfterHit: 0,
    enemyMaxHp: 120,
    appliedHitDmg: 120,
    nextDelayMs: 1100,
    willFreeze: false,
    hasAllySupportRunner: true,
    streak: 0,
    isCoopMode: false,
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
    streak: 0,
    isCoopMode: false,
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
    streak: 0,
    isCoopMode: false,
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

test('runPlayerAnswer wrong path increments consecutiveWrong', () => {
  let cwValue = 0;
  const { deps } = createTestContext({
    streak: 1,
    passiveCount: 0,
    burnStack: 0,
    consecutiveWrong: 2,
  });
  deps.setConsecutiveWrong = (fn) => { cwValue = typeof fn === 'function' ? fn(2) : fn; };

  runPlayerAnswer({
    correct: false,
    move: { name: '炎牙', basePower: 12, growth: 2, type: 'fire', risky: false },
    starter: { name: '火狐', type: 'fire' },
    ...deps,
  });

  assert.equal(cwValue, 3);
});

test('runPlayerAnswer correct path resets consecutiveWrong to 0', () => {
  let cwValue = 5;
  const { deps } = createTestContext({
    streak: 0,
    consecutiveWrong: 5,
  });
  deps.setConsecutiveWrong = (fn) => { cwValue = typeof fn === 'function' ? fn(5) : fn; };

  runPlayerAnswer({
    correct: true,
    move: { name: '炎牙', basePower: 12, growth: 2, type: 'fire' },
    starter: { name: '火狐', type: 'fire' },
    ...deps,
  });

  assert.equal(cwValue, 0);
});

test('runPlayerAnswer wrong non-risky path shows encouragement when consecutiveWrong >= 3', () => {
  const { calls, deps } = createTestContext({
    streak: 0,
    burnStack: 0,
    consecutiveWrong: 3,
  });

  runPlayerAnswer({
    correct: false,
    move: { name: '炎牙', basePower: 12, growth: 2, type: 'fire', risky: false },
    starter: { name: '火狐', type: 'fire' },
    ...deps,
  });

  const hasEncourageText = calls.bText.some((text) => text.includes('Keep going'));
  assert.equal(hasEncourageText, true);
});

test('runPlayerAnswer wrong non-risky path omits encouragement when consecutiveWrong < 3', () => {
  const { calls, deps } = createTestContext({
    streak: 0,
    burnStack: 0,
    consecutiveWrong: 1,
  });

  runPlayerAnswer({
    correct: false,
    move: { name: '炎牙', basePower: 12, growth: 2, type: 'fire', risky: false },
    starter: { name: '火狐', type: 'fire' },
    ...deps,
  });

  const hasEncourageText = calls.bText.some((text) => text.includes('Keep going'));
  assert.equal(hasEncourageText, false);
});
