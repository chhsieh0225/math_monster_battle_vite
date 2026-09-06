import assert from 'node:assert/strict';
import test from 'node:test';
import { runEnemyTurn } from './enemyFlow.ts';
import { fxt } from './battleFxTargets.ts';
import { runAdvanceController } from './advanceController.ts';
import { runSelectMoveFlow } from './selectMoveFlow.ts';

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
    setPHp: (value) => { calls.pHp.push(value); },
    setPHpSub: (value) => { calls.pHpSub.push(value); },
    setSpecDef: () => {},
    setDefAnim: (value) => { calls.defAnim.push(value); },
    setEHp: () => {},
    setEffMsg: (value) => { calls.effects.push(value); },
    setCursed: () => {},
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
    && event.slot === 'sub' && event.value === 'enemyAttackLunge 0.6s ease'));
  assert.deepEqual(calls.particles.at(-1), {
    emoji: 'enemy', x: fxt().playerSub.x + 24, y: fxt().playerSub.y + 16, count: 3,
  });
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
    assert.equal(calls.eAnim.filter(a => a.startsWith('enemyAttackLunge')).length, 1);
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
    assert.equal(calls.eAnim.filter(a => a.startsWith('enemyAttackLunge')).length, scenario === 'charge' ? 0 : 1);
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
    assert.equal(calls.eAnim.filter(a => a.startsWith('enemyAttackLunge')).length, 0);
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
