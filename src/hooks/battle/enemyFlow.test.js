import assert from 'node:assert/strict';
import test from 'node:test';
import { runEnemyTurn } from './enemyFlow.ts';
import { fxt } from './battleFxTargets.ts';

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
  assert.deepEqual(safeToCalls, [600, 1500]);
  assert.equal(calls.endSession.length, 0);
});

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
