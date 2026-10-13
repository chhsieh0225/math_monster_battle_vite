import { createEnemySkillState } from '../../data/enemySkills.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { runEnemyTurn } from './enemyFlow.ts';
import { fxt } from './battleFxTargets.ts';
import { runAdvanceController } from './advanceController.ts';
import { runSelectMoveFlow } from './selectMoveFlow.ts';
import { createEnemyBehaviorState } from '../../data/enemyPersonalities.ts';
import { withRandomSource } from '../../utils/prng.ts';

function createBaseArgs(overrides = {}) {
  const calls = {
    phase: [],
    text: [],
    screen: [],
    endSession: [],
    pHp: [],
    pHpSub: [],
    bossPhase: [],
    bossTurn: [],
    sealedTurns: [],
    sealedMove: [],
    eAnim: [],
    pAnim: [],
    defAnim: [],
    effects: [],
    damage: [],
    particles: [],
    animations: [],
    attackEffects: [],
  };
  const args = {
    pendingTextAdvanceActionRef: { current: null },
    isGamePaused: () => false,
    sr: {
      current: {
        pHp: 100,
        pHpSub: 0,
        allySub: null,
        starter: { name: '火狐', type: 'fire', moves: [{ name: '炎牙' }, { name: '火球' }, { name: '爆裂' }] },
        enemy: { id: 'slime', name: '史萊姆', atk: 20, maxHp: 100, mType: 'water', trait: '' },
        enemySub: null,
        eHp: 100,
        specDef: false,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: -1,
        sealedTurns: 0,
        bossPhase: 0,
        cursed: false,
      },
    },
    safeTo: (fn) => fn(),
    rand: () => 0.5,
    randInt: () => 0,
    chance: () => false,
    sfx: { play: () => {} },
    setSealedTurns: (value) => { calls.sealedTurns.push(value); },
    setSealedMove: (value) => { calls.sealedMove.push(value); },
    setBossPhase: (value) => { calls.bossPhase.push(value); },
    setBossTurn: (value) => { calls.bossTurn.push(value); },
    setBossCharging: () => {},
    setBText: (value) => { calls.text.push(value); },
    setPhase: (value) => { calls.phase.push(value); },
    setEAnim: (value, slot = 'main') => { calls.eAnim.push(value); calls.animations.push({ side: 'enemy', slot, value }); },
    setPAnim: (value, slot = 'main') => { calls.pAnim.push(value); calls.animations.push({ side: 'player', slot, value }); },
    setAtkEffect: (value) => { calls.attackEffects.push(typeof value === 'function' ? value(calls.attackEffects.at(-1) ?? null) : value); },
    setPHp: (value) => { calls.pHp.push(value); },
    setPHpSub: (value) => { calls.pHpSub.push(value); },
    setSpecDef: () => {},
    setDefAnim: (value) => { calls.defAnim.push(value); },
    setEHp: () => {},
    setEffMsg: (value) => { calls.effects.push(value); },
    setCursed: () => {},
    setEnemyBehavior: () => {},
    setEnemySkillState: () => {},
    setEHpSub: () => {},
    addD: (value, x, y, color) => { calls.damage.push({ value, x, y, color }); },
    addP: (emoji, x, y, count) => { calls.particles.push({ emoji, x, y, count }); },
    _endSession: (completed, reason) => { calls.endSession.push({ completed, reason }); },
    setScreen: (value) => { calls.screen.push(value); },
    handleVictory: () => {},
    t: undefined,
    ...overrides,
  };
  return { calls, args };
}

test('rage boosts exactly one strike at contact, not windup, and blocking still exposes an opening', () => {
  const baseline = createBaseArgs();
  withRandomSource(() => 0.5, () => runEnemyTurn(baseline.args));
  const baseDamage = 100 - baseline.calls.pHp[0];
  for (const blocked of [false, true]) {
    const queue = [];
    const { args, calls } = createBaseArgs({ safeTo: (fn, ms) => queue.push({ fn, ms }) });
    const behavior = createEnemyBehaviorState();
    behavior.main.anger = 2;
    Object.assign(args.sr.current, { enemyBehavior: behavior, specDef: blocked });
    args.sr.current.enemy.personality = { id: 'irritable' };
    const changes = [];
    args.setEnemyBehavior = next => changes.push(next);
    runEnemyTurn(args);
    assert.equal(changes.length, 0, 'windup cannot spend rage');
    withRandomSource(() => 0.5, queue.find(task => task.ms === 500).fn);
    assert.equal(changes.length, 1);
    assert.equal(args.sr.current.enemyBehavior.main.opening, true);
    assert.equal(args.sr.current.enemyBehavior.main.anger, 0);
    assert.equal(behavior.main.anger, 2, 'previous state remains immutable');
    assert.deepEqual(calls.pHp, blocked ? [] : [100 - Math.round(baseDamage * 1.25)]);
    args.sr.current.specDef = false;
    queue.length = 0;
    args.sr.current.enemySkillState = createEnemySkillState();
    args.sr.current.pHp = 100;
    runEnemyTurn(args);
    withRandomSource(() => 0.5, queue.find(task => task.ms === 500).fn);
    assert.equal(changes.length, 1, 'subsequent attack is not boosted again');
    assert.equal(calls.pHp.at(-1), 100 - baseDamage);
  }
});

test('cancelled enemy attacks cannot consume rage or show a false opening', () => {
  const queue = [];
  const { args, calls } = createBaseArgs({ safeTo: (fn, ms) => queue.push({ fn, ms }) });
  const behavior = createEnemyBehaviorState();
  behavior.main.anger = 2;
  Object.assign(args.sr.current, { screen: 'battle', enemyBehavior: behavior });
  args.sr.current.enemy.personality = { id: 'irritable' };
  args.setEnemyBehavior = () => assert.fail('inactive battle cannot spend rage');
  runEnemyTurn(args);
  args.sr.current.screen = 'title';
  queue.find(task => task.ms === 500).fn();
  assert.equal(calls.pHp.length, 0);
  assert.equal(args.sr.current.enemyBehavior.main.opening, false);
});

test('a reserve rage strike changes only its own state and does not put feedback over the primary enemy', () => {
  const { args, calls } = createBaseArgs();
  const behavior = createEnemyBehaviorState();
  behavior.main.anger = 1;
  behavior.sub.anger = 2;
  Object.assign(args.sr.current, { enemyBehavior: behavior, eHpSub: 100,
    enemySub: { id: 'wolf', name: 'Reserve', atk: 10, maxHp: 100, mType: 'water', personality: { id: 'irritable' } } });
  args.chance = () => true;
  runEnemyTurn(args);
  assert.equal(args.sr.current.enemyBehavior.main, behavior.main);
  assert.equal(args.sr.current.enemyBehavior.sub.opening, true);
  assert.ok(calls.text.some(text => text.startsWith('Reserve:')));
  assert.ok(!calls.damage.some(item => String(item.value).includes('Rage strike')));
});

test('guardian launch and hit keep the same skill and physical co-op target across a turn update', () => {
  const queue = [];
  const { args, calls } = createBaseArgs({ safeTo: (fn, ms) => queue.push({ fn, ms }) });
  Object.assign(args.sr.current, { battleMode: 'coop', coopActiveSlot: 'main', pHpSub: 100,
    allySub: { name: 'Partner', type: 'water' }, bossTurn: 2,
    enemySkillState: { ...createEnemySkillState(), main: { turn: 2, disrupted: false } },
    enemy: { id: 'limit_knight', name: 'Limit', lvl: 7, atk: 12, maxHp: 100, mType: 'light' } });
  args.randInt = () => 1;
  args.setBossTurn = value => { args.sr.current.bossTurn = value; calls.bossTurn.push(value); };
  runEnemyTurn(args);
  const launch = calls.attackEffects.find(Boolean);
  assert.equal(launch.skillId, 'limit_knight:2');
  assert.equal(launch.targetSlot, 'sub');
  assert.equal(launch.impact, undefined);
  assert.deepEqual(calls.bossTurn, [], 'guardian turns are independent of boss turns');
  assert.equal(calls.pHpSub.length, 0, 'launch must not apply damage');
  args.randInt = () => 0;
  const strike = queue.find(item => item.ms === 500);
  assert.ok(strike);
  strike.fn();
  const hit = calls.attackEffects.filter(Boolean).at(-1);
  assert.equal(hit.skillId, launch.skillId);
  assert.equal(hit.targetSlot, 'sub', 'do not reroll the target after windup');
  assert.equal(hit.impact.outcome, 'hit');
  assert.equal(calls.pHpSub.length, 1);
  assert.equal(calls.pHp.length, 0);
});

test('guardian launch clears when a special defense blocks the attack', () => {
  const { args, calls } = createBaseArgs();
  Object.assign(args.sr.current, { specDef: true,
    enemy: { id: 'algebra_knight', name: 'Algebra', lvl: 7, atk: 12, maxHp: 100, mType: 'light' } });
  runEnemyTurn(args);
  assert.equal(calls.attackEffects[0].skillId, 'algebra_knight:0');
  assert.equal(calls.attackEffects.at(-1), null);
  assert.equal(calls.pHp.length, 0);
  assert.ok(!calls.attackEffects.some(fx => fx?.impact?.outcome === 'hit'));
});

test('a guardian in the enemy reserve rotates its repertoire and launches from the sub slot', () => {
  const { args, calls } = createBaseArgs();
  Object.assign(args.sr.current, { enemySkillState: { ...createEnemySkillState(), sub: { turn: 1, disrupted: false } }, bossTurn: 1, pHpSub: 100, allySub: { name: 'Partner', type: 'water' },
    enemySub: { id: 'topology_knight', name: 'Knot', lvl: 7, atk: 8, maxHp: 100, mType: 'steel' } });
  args.chance = () => true;
  args.randInt = () => 1;
  runEnemyTurn(args);
  assert.deepEqual(calls.bossTurn, []);
  const effects = calls.attackEffects.filter(fx => fx?.sourceSlot === 'sub');
  assert.equal(effects.length, 2);
  assert.equal(effects[0].impact, undefined);
  assert.equal(effects[1].impact.outcome, 'hit');
  assert.ok(effects.every(fx => fx.skillId === 'topology_knight:1' && fx.targetSlot === 'sub'));
});

for (const active of ['main', 'sub']) {
  for (const target of ['main', 'sub']) {
    test(`co-op enemy hit animates ${target}, not the active ${active} slot`, () => {
      const { args, calls } = createBaseArgs();
      Object.assign(args.sr.current, {
        battleMode: 'coop', coopActiveSlot: active, pHpSub: 100,
        allySub: { name: 'Partner', type: 'water' },
      });
      args.randInt = () => target === 'sub' ? 1 : 0;
      runEnemyTurn(args);
      assert.equal(calls[target === 'sub' ? 'pHpSub' : 'pHp'].length, 1);
      assert.equal(calls[target === 'sub' ? 'pHp' : 'pHpSub'].length, 0);
      assert.deepEqual(calls.animations.filter((event) => event.side === 'player'), [
        { side: 'player', slot: target, value: 'playerHit 0.5s ease' },
        { side: 'player', slot: target, value: '' },
      ]);
      const position = target === 'sub' ? fxt().playerSub : fxt().playerMain;
      const effect = calls.attackEffects.find(fx => fx?.impact);
      assert.equal(effect.sourceSlot, 'main');
      assert.equal(effect.targetSlot, target);
      assert.equal(effect.targetSide, 'player');
      assert.equal(effect.impact.outcome, 'hit');
      assert.equal(calls.particles[0].x, position.x + 20);
      assert.equal(calls.particles[0].y, position.y + 20);
    });
  }
}

test('enemy assist lunges with the sub enemy and places impact on the damaged ally', () => {
  const { args, calls } = createBaseArgs();
  Object.assign(args.sr.current, {
    pHpSub: 100, allySub: { name: 'Partner', type: 'water' },
    enemySub: { name: 'Assist', atk: 10, mType: 'water' },
  });
  args.randInt = () => 1;
  args.chance = () => true;
  runEnemyTurn(args);
  assert.ok(calls.animations.some((event) => event.side === 'enemy'
    && event.slot === 'sub' && event.value === 'signatureSweepFinish 0.38s ease'));
  assert.deepEqual(calls.particles.at(-1), {
    emoji: 'enemy', x: fxt().playerSub.x + 24, y: fxt().playerSub.y + 16, count: 3,
  });
  assert.equal(calls.attackEffects.filter(Boolean).at(-1).sourceSlot, 'sub');
  assert.equal(calls.attackEffects.filter(Boolean).at(-1).targetSlot, 'sub');
});

test('enemy FX launches before damage and an old clear cannot erase a newer skill', () => {
  const queue = [];
  let effect = null;
  const { args, calls } = createBaseArgs({
    safeTo: (fn, ms) => queue.push({ fn, ms }),
    setAtkEffect: (value) => { effect = typeof value === 'function' ? value(effect) : value; },
  });
  runEnemyTurn(args);
  assert.equal(effect.impact, undefined);
  assert.equal(calls.pHp.length, 0);
  queue.find((task) => task.ms === 500).fn();
  assert.equal(effect.impact.outcome, 'hit');
  assert.equal(calls.pHp.length, 1);
  const newer = { type: 'ice', idx: 0, lvl: 3 };
  effect = newer;
  queue.find((task) => task.ms === 540).fn();
  assert.equal(effect, newer);
});

test('blocked and dodged enemy strikes do not produce a false skill hit', () => {
  for (const type of ['water', 'ice', 'fire', 'steel', 'light', 'grass', 'electric']) {
    const { args, calls } = createBaseArgs();
    args.sr.current.specDef = true;
    args.sr.current.starter.type = type;
    runEnemyTurn(args);
    assert.ok(!calls.attackEffects.some(fx => fx?.impact));
    assert.equal(calls.attackEffects.at(-1), null);
  }
});

test('boss release reacts and emits particles on the sub target', () => {
  const { args, calls } = createBaseArgs();
  Object.assign(args.sr.current, {
    pHpSub: 100, allySub: { name: 'Partner', type: 'water' },
    enemy: { id: 'boss', atk: 10, maxHp: 100, mType: 'dark' },
    bossCharging: true, bossPhase: 1,
  });
  args.randInt = () => 1;
  runEnemyTurn(args);
  assert.ok(calls.animations.some((event) => event.side === 'player'
    && event.slot === 'sub' && event.value.startsWith('playerHit')));
  assert.equal(calls.particles[0].x, fxt().playerSub.x + 20);
});

test('runEnemyTurn returns immediately when enemy or starter is missing', () => {
  const { calls, args } = createBaseArgs({
    sr: {
      current: {
        pHp: 100,
        pHpSub: 0,
        allySub: null,
        starter: null,
        enemy: null,
        enemySub: null,
        eHp: 100,
        specDef: false,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: -1,
        sealedTurns: 0,
        bossPhase: 0,
        cursed: false,
      },
    },
  });

  runEnemyTurn(args);
  assert.equal(calls.phase.length, 0);
  assert.equal(calls.text.length, 0);
  assert.equal(calls.endSession.length, 0);
});

test('runEnemyTurn without party-ko handler sends gameover on lethal hit', () => {
  const { calls, args } = createBaseArgs({
    sr: {
      current: {
        pHp: 1,
        pHpSub: 0,
        allySub: null,
        starter: { name: '火狐', type: 'fire', moves: [{ name: '炎牙' }, { name: '火球' }, { name: '爆裂' }] },
        enemy: { id: 'slime', name: '史萊姆', atk: 20, maxHp: 100, mType: 'water', trait: '' },
        enemySub: null,
        eHp: 100,
        specDef: false,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: -1,
        sealedTurns: 0,
        bossPhase: 0,
        cursed: false,
      },
    },
  });

  runEnemyTurn(args);

  assert.equal(calls.endSession.length, 1);
  assert.equal(calls.endSession[0].completed, false);
  assert.equal(calls.screen[calls.screen.length - 1], 'gameover');
  assert.equal(calls.phase.includes('enemyAtk'), true);
  assert.equal(calls.phase[calls.phase.length - 1], 'ko');
  assert.equal(calls.text[calls.text.length - 1], 'Your partner has fallen...');
});

test('runEnemyTurn shows boss phase transition text before next action', () => {
  const safeToCalls = [];
  const { calls, args } = createBaseArgs({
    sr: {
      current: {
        pHp: 100,
        pHpSub: 0,
        allySub: null,
        starter: { name: '火狐', type: 'fire', moves: [{ name: '炎牙' }, { name: '火球' }, { name: '爆裂' }] },
        enemy: { id: 'boss', name: '暗龍王', atk: 35, maxHp: 100, mType: 'dark', trait: '' },
        enemySub: null,
        eHp: 50,
        specDef: false,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: -1,
        sealedTurns: 0,
        bossPhase: 1,
        cursed: false,
      },
    },
    safeTo: (_fn, ms) => { safeToCalls.push(ms); },
  });

  runEnemyTurn(args);

  assert.deepEqual(calls.bossPhase, [2]);
  assert.equal(calls.phase[0], 'text');
  assert.equal(calls.text[0].includes('rage state'), true);
  assert.equal(calls.eAnim[0], 'bossShake 0.5s ease');
  assert.deepEqual(safeToCalls, [1500]);
  assert.equal(calls.endSession.length, 0);
});

function createTimedEnemyTurn(scenario = 'charge') {
  const { args, calls } = createBaseArgs();
  let now = 0;
  const queue = [];
  Object.assign(args.sr.current, {
    phase: 'enemyAtk', screen: 'battle', battleMode: 'single',
    enemy: { id: 'boss', name: 'Boss', atk: 10, maxHp: 100, mType: 'dark', trait: '' },
    eHp: scenario === 'phase' || scenario === 'seal' ? 50 : 100,
    bossPhase: scenario === 'seal' ? 2 : 1,
    bossTurn: scenario === 'charge' ? 3 : scenario === 'seal' ? 2 : 0,
  });
  if (scenario === 'venom') {
    args.sr.current.enemy = { ...args.sr.current.enemy, id: 'slime', trait: 'venom' };
    args.sr.current.bossPhase = 0;
  }
  args.safeTo = (fn, ms) => queue.push({ fn, at: now + ms });
  args.isGamePaused = () => Boolean(args.sr.current.gamePaused);
  for (const [setter, field] of [
    ['setPhase', 'phase'], ['setPHp', 'pHp'], ['setBossTurn', 'bossTurn'],
    ['setBossPhase', 'bossPhase'], ['setBossCharging', 'bossCharging'],
    ['setSealedTurns', 'sealedTurns'], ['setSealedMove', 'sealedMove'],
  ]) {
    const record = args[setter];
    args[setter] = (value) => {
      record(value);
      args.sr.current[field] = typeof value === 'function' ? value(args.sr.current[field]) : value;
    };
  }
  const advance = (phase = args.sr.current.phase) => runAdvanceController({
    phase, sr: args.sr, setPhase: args.setPhase, setBText: args.setBText,
    isGamePaused: args.isGamePaused,
    pvpTurnStartHandlerDeps: {}, pendingEvolutionArgs: {}, continueFromVictory: () => {},
    consumePendingTextAdvanceAction: () => {
      const action = args.pendingTextAdvanceActionRef.current;
      args.pendingTextAdvanceActionRef.current = null;
      return action;
    },
  });
  const select = () => runSelectMoveFlow({
    index: 0, state: args.sr.current, timedMode: false, diffMods: [1, 1, 1],
    getActingStarter: () => args.sr.current.starter, getMoveDiffLevel: () => 2,
    genQuestion: () => ({ answer: 2 }), startTimer: () => {}, markQStart: () => {}, sfx: args.sfx,
    ...Object.fromEntries(['setSelIdx', 'setDiffLevel', 'setQ', 'setFb', 'setAnswered', 'setHintsRevealed'].map(k => [k, () => {}])),
    setPhase: args.setPhase,
  });
  const tick = (ms) => {
    const until = now + ms;
    while (true) {
      queue.sort((a, b) => a.at - b.at);
      if (!queue.length || queue[0].at > until) break;
      const entry = queue.shift();
      now = entry.at;
      entry.fn();
    }
    now = until;
  };
  return { args, calls, advance, select, tick };
}

test('Dark Dragon repeat seals leave the lowest-difficulty move available', () => {
  const { args, tick } = createTimedEnemyTurn('seal');
  runEnemyTurn(args);
  tick(5000);
  assert.ok([1, 2].includes(args.sr.current.sealedMove));
});

test('fast-forwarding boss charge cannot reset the next question or its animation', () => {
  const { args, calls, advance, select, tick } = createTimedEnemyTurn();
  runEnemyTurn(args);
  advance();
  assert.equal(args.sr.current.phase, 'menu');
  assert.equal(select(), true);
  const animations = calls.eAnim.length;
  tick(2500);
  assert.equal(args.sr.current.phase, 'question');
  assert.equal(calls.eAnim.length, animations);
  assert.equal(calls.bossTurn.length, 1);
});

for (const scenario of ['phase', 'seal', 'venom']) {
  test(`fast-forwarding ${scenario} continues the enemy turn once, never opens the move menu`, () => {
    const { args, calls, advance, select, tick } = createTimedEnemyTurn(scenario);
    runEnemyTurn(args);
    advance();
    assert.equal(args.sr.current.phase, 'enemyAtk');
    assert.equal(select(), false);
    advance('text'); // A repeated event carrying the previous render's phase.
    assert.equal(args.sr.current.phase, 'enemyAtk');
    tick(4000);
    assert.equal(calls.eAnim.filter(a => /^(?:enemy(?:AttackLunge|SkillCast)|signature\w+Finish)/.test(a)).length, 1);
    assert.equal(args.sr.current.phase, 'menu');
    assert.equal(args.pendingTextAdvanceActionRef.current, null);
  });
}

for (const scenario of ['charge', 'phase', 'seal', 'venom']) {
  test(`${scenario} automatically continues without input and does not leave a stale action`, () => {
    const { args, calls, tick } = createTimedEnemyTurn(scenario);
    runEnemyTurn(args);
    tick(5000);
    assert.equal(args.sr.current.phase, 'menu');
    assert.equal(args.pendingTextAdvanceActionRef.current, null);
    assert.equal(calls.eAnim.filter(a => /^(?:enemy(?:AttackLunge|SkillCast)|signature\w+Finish)/.test(a)).length, scenario === 'charge' ? 0 : 1);
  });
}

test('an old phase timer cannot consume the following charge prompt', () => {
  const { args, advance, tick } = createTimedEnemyTurn('phase');
  args.sr.current.bossTurn = 3;
  runEnemyTurn(args);
  advance();
  const chargeAction = args.pendingTextAdvanceActionRef.current;
  assert.equal(typeof chargeAction, 'function');
  tick(1500);
  assert.equal(args.pendingTextAdvanceActionRef.current, chargeAction);
  assert.equal(args.sr.current.phase, 'text');
  tick(500);
  assert.equal(args.sr.current.phase, 'menu');
});

test('resetting a battle invalidates its pending prompt even when a new battle is active', () => {
  const { args, calls, tick } = createTimedEnemyTurn();
  runEnemyTurn(args);
  args.pendingTextAdvanceActionRef.current = null;
  args.sr.current = { ...args.sr.current, phase: 'text', enemy: { ...args.sr.current.enemy } };
  const count = calls.phase.length;
  tick(3000);
  assert.equal(calls.phase.length, count);
});

for (const ended of ['title', 'ko', 'victory', 'bossVictory']) {
  test(`a pending enemy prompt cannot advance after ${ended}`, () => {
    const { args, calls, tick } = createTimedEnemyTurn();
    runEnemyTurn(args);
    if (ended === 'title') args.sr.current.screen = 'title';
    else args.sr.current.phase = ended;
    const count = calls.phase.length;
    tick(3000);
    assert.equal(calls.phase.length, count);
  });
}

test('paused prompt retains its continuation until resumed and clicked', () => {
  const { args, advance, tick } = createTimedEnemyTurn();
  runEnemyTurn(args);
  args.sr.current.gamePaused = true;
  advance();
  tick(3000);
  assert.equal(args.sr.current.phase, 'text');
  assert.equal(typeof args.pendingTextAdvanceActionRef.current, 'function');
  args.sr.current.gamePaused = false;
  advance();
  assert.equal(args.sr.current.phase, 'menu');
});

for (const target of ['main', 'sub']) {
  test(`lethal venom on ${target} waits for KO resolution, even before HP state commits`, () => {
    const { args, calls, advance, tick } = createTimedEnemyTurn('venom');
    let koCalls = 0;
    args.sr.current.pHp = target === 'main' ? 1 : 100;
    if (target === 'sub') {
      args.sr.current.allySub = { name: 'Partner', type: 'grass' };
      args.sr.current.pHpSub = 1;
      args.randInt = () => 1;
    }
    args.setPHp = () => {};
    args.setPHpSub = () => {};
    args.handlePlayerPartyKo = (event) => { assert.equal(event.target, target); koCalls++; };
    runEnemyTurn(args);
    advance('text');
    assert.equal(args.sr.current.phase, 'enemyAtk');
    assert.equal(args.pendingTextAdvanceActionRef.current, null);
    tick(3000);
    assert.equal(koCalls, 1);
    assert.equal(calls.eAnim.filter(a => /^enemy(?:AttackLunge|SkillCast)/.test(a)).length, 0);
    assert.equal(calls.phase.includes('menu'), false);
  });
}

test('runEnemyTurn ignores stale delayed menu reset after battle state changed', () => {
  const queue = [];
  const { calls, args } = createBaseArgs({
    sr: {
      current: {
        pHp: 100,
        pHpSub: 0,
        allySub: null,
        starter: { name: '火狐', type: 'fire', moves: [{ name: '炎牙' }, { name: '火球' }, { name: '爆裂' }] },
        enemy: { id: 'slime', name: '史萊姆', atk: 20, maxHp: 100, mType: 'water', trait: '' },
        enemySub: null,
        eHp: 100,
        specDef: true,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: -1,
        sealedTurns: 0,
        bossPhase: 0,
        cursed: false,
        phase: 'enemyAtk',
        screen: 'battle',
      },
    },
    safeTo: (fn) => { queue.push(fn); },
  });

  args.setPhase = (value) => {
    calls.phase.push(value);
    args.sr.current.phase = value;
  };

  runEnemyTurn(args);
  assert.equal(queue.length > 0, true);

  const first = queue.shift();
  first();
  assert.equal(queue.length > 0, true);

  args.sr.current.phase = 'ko';
  args.sr.current.screen = 'gameover';
  while (queue.length > 0) {
    const fn = queue.shift();
    fn();
  }

  assert.equal(calls.phase.includes('enemyAtk'), true);
  assert.equal(calls.phase.includes('menu'), false);
  assert.equal(calls.defAnim.includes(null), false);
});

test('runEnemyTurn ignores stale strike callback after battle ended', () => {
  const queue = [];
  const { calls, args } = createBaseArgs({
    sr: {
      current: {
        pHp: 100,
        pHpSub: 0,
        allySub: null,
        starter: { name: '火狐', type: 'fire', moves: [{ name: '炎牙' }, { name: '火球' }, { name: '爆裂' }] },
        enemy: { id: 'slime', name: '史萊姆', atk: 20, maxHp: 100, mType: 'water', trait: '' },
        enemySub: null,
        eHp: 100,
        specDef: false,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: -1,
        sealedTurns: 0,
        bossPhase: 0,
        cursed: false,
        phase: 'menu',
        screen: 'battle',
      },
    },
    safeTo: (fn) => { queue.push(fn); },
  });

  args.setPhase = (value) => {
    calls.phase.push(value);
    args.sr.current.phase = value;
  };
  args.setScreen = (value) => {
    calls.screen.push(value);
    args.sr.current.screen = value;
  };

  runEnemyTurn(args);
  assert.equal(queue.length > 0, true);

  args.sr.current.phase = 'ko';
  args.sr.current.screen = 'gameover';
  queue[0]();

  assert.equal(calls.pHp.length, 0);
  assert.equal(calls.damage.length, 0);
  assert.equal(calls.phase.includes('menu'), false);
});

for (const disrupted of [false, true]) test(`signature launch/contact/recovery are one owned action (disrupted=${disrupted})`, () => {
  const queue = [], healing = [];
  const { args, calls } = createBaseArgs({ safeTo: (fn, ms) => queue.push({ fn, ms }), setEHp: hp => healing.push(hp) });
  Object.assign(args.sr.current, { eHp: 50, enemy: { id: 'ghost', name: 'Ghost', atk: 40, maxHp: 100, mType: 'dark' },
    enemySkillState: { ...createEnemySkillState(), main: { turn: 1, disrupted } } });
  runEnemyTurn(args);
  const launch = calls.attackEffects.find(Boolean);
  assert.equal(launch.skillId, 'monster:ghost');
  assert.equal(launch.impact, undefined);
  assert.equal(args.sr.current.enemySkillState.main.turn, 1);
  assert.equal(calls.pHp.length, 0);
  assert.equal(healing.length, 0);
  withRandomSource(() => .5, queue.find(task => task.ms === 500).fn);
  const hit = calls.attackEffects.filter(Boolean).at(-1);
  assert.equal(hit.skillId, launch.skillId);
  assert.equal(hit.impact.outcome, 'hit');
  assert.deepEqual(args.sr.current.enemySkillState.main, { turn: 2, disrupted: false });
  assert.equal(calls.pHp[0], disrupted ? 78 : 66);
  assert.deepEqual(healing, disrupted ? [] : [54]);
});

test('blocking and exiting do not allow skill healing or a false damage event', () => {
  for (const exit of [true, false]) {
    const queue = [];
    const { args, calls } = createBaseArgs({ safeTo: (fn, ms) => queue.push({ fn, ms }), setEHp: () => assert.fail('no healing') });
    Object.assign(args.sr.current, { specDef: !exit, eHp: 20, screen: 'battle',
      enemy: { id: 'candy_monster', name: 'Candy', atk: 20, maxHp: 100, mType: 'light' },
      enemySkillState: { ...createEnemySkillState(), main: { turn: 1, disrupted: false } } });
    runEnemyTurn(args);
    if (exit) args.sr.current.screen = 'title';
    queue.find(task => task.ms === 500).fn();
    assert.equal(calls.pHp.length, 0);
    assert.ok(!calls.attackEffects.some(fx => fx?.impact));
    assert.equal(args.sr.current.enemySkillState.main.turn, exit ? 1 : 2);
  }
});

test('reserve skill healing changes reserve HP only and its turn advances only on assist contact', () => {
  const healing = [];
  const { args, calls } = createBaseArgs({ setEHpSub: hp => healing.push(hp), setEHp: () => assert.fail('not main') });
  Object.assign(args.sr.current, { eHpSub: 40,
    enemySub: { id: 'candy_monster', name: 'Reserve', atk: 25, maxHp: 100, mType: 'light' },
    enemySkillState: { ...createEnemySkillState(), sub: { turn: 1, disrupted: false } } });
  args.chance = () => true;
  runEnemyTurn(args);
  assert.deepEqual(healing, [44]);
  assert.equal(args.sr.current.enemySkillState.sub.turn, 2);
  const effects = calls.attackEffects.filter(fx => fx?.sourceSlot === 'sub');
  assert.equal(effects[0].skillId, 'monster:candy_monster');
  assert.equal(effects[1].skillId, effects[0].skillId);
});

test('each boss announces its own ultimate and keeps launch, hit, and KO names consistent', () => {
  const names = { boss: '滅界天罰', boss_hydra: '冥沼終焉', boss_crazy_dragon: '殞翼審判', boss_sword_god: '叢雲終式' };
  for (const [id, name] of Object.entries(names)) {
    const { args, calls } = createBaseArgs();
    Object.assign(args.sr.current, { bossCharging: true, bossPhase: 1,
      enemy: { id, name: 'Boss', atk: 1000, maxHp: 100, mType: 'dark' } });
    runEnemyTurn(args);
    assert.ok(calls.text.some(text => text.includes(name)), id);
    assert.ok(!calls.text.some(text => /dark breath|暗黑吐息/.test(text)));
    const effects = calls.attackEffects.filter(Boolean);
    assert.equal(effects[0].skillId, `${id}:3`);
    assert.equal(effects[1].skillId, `${id}:3`);
    assert.equal(effects[0].lvl, effects[1].lvl);
    if (id === 'boss_sword_god') assert.ok(calls.eAnim.includes('signatureHeavenfallFinish 0.5s ease'));
    assert.ok(calls.text.at(-1).includes(name));
  }
});

test('steel retaliation subtracts from the just-recovered enemy HP, not the pre-siphon snapshot', () => {
  const hpWrites = [];
  const { args, calls } = createBaseArgs({ setEHp: value => hpWrites.push(value) });
  Object.assign(args.sr.current, { eHp: 50, starter: { name: 'Wolf', type: 'steel' },
    enemy: { id: 'ghost', name: 'Ghost', atk: 50, maxHp: 100, mType: 'dark' },
    enemySkillState: { ...createEnemySkillState(), main: { turn: 1, disrupted: false } } });
  args.chance = () => true;
  withRandomSource(() => .5, () => runEnemyTurn(args));
  const counter = calls.damage.find(event => event.value.startsWith('⚙️-'));
  assert.ok(counter);
  assert.equal(hpWrites[0], 54);
  assert.equal(hpWrites[1], 54 - Number(counter.value.slice('⚙️-'.length)));
});
