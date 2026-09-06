import assert from 'node:assert/strict';
import test from 'node:test';
import { executePvpStrikeTurn } from './pvpStrikeResolver.ts';
import { getAttackEffectHitDelay } from '../../utils/effectTiming.ts';

function fixture({ turn = 'p1', defense = false, defenderType = 'grass', critical = false, hp = 100 } = {}) {
  let now = 0;
  const tasks = [];
  const events = [];
  const state = {
    selIdx: 0, pHp: hp, pvpHp2: hp, eHp: hp, pStg: 0, pLvl: 1, screen: 'battle', phase: 'playerAtk',
    pvpStarter2: { type: 'grass' },
    pvpState: { turn, p1: { specDef: defense && turn === 'p2' }, p2: { specDef: defense && turn === 'p1' } },
  };
  const record = (kind) => (value) => events.push({ kind, value, at: now });
  const setter = (key) => (value) => {
    state[key] = typeof value === 'function' ? value(state[key]) : value;
    events.push({ kind: key, value: state[key], at: now });
  };
  const schedule = (fn, delay) => tasks.push({ fn, at: now + delay });
  const args = {
    sr: { current: state }, currentTurn: turn, nextTurn: turn === 'p1' ? 'p2' : 'p1',
    attacker: { type: 'dark', name: 'Attacker' }, defender: { type: defenderType, name: 'Defender' },
    move: { name: 'Test move', type: 'fire' }, strike: { dmg: 20, heal: 0, eff: 1, isCrit: critical },
    unlockedSpecDef: false, vfxType: 'fire', chance: () => false,
    sfx: { play: record('sound'), playMove: record('launchSound') },
    isBattleActive: () => state.screen === 'battle',
    safeToIfBattleActive: (fn, delay) => schedule(() => { if (state.screen === 'battle') fn(); }, delay),
    setBText: record('text'), setPvpTurn: record('turn'), setPvpActionCount: record('actionCount'),
    setPhase: setter('phase'), setAtkEffect: record('effect'), addP: record('particle'),
    setPAnim: record('playerAnim'), setEAnim: record('enemyAnim'), addD: record('damage'),
    setPHp: setter('pHp'), setPvpHp2: setter('pvpHp2'), setEHp: setter('eHp'),
    setScreen: setter('screen'), setPvpWinner: record('winner'), onHit: record('hitMessage'),
  };
  for (const key of ['SpecDef', 'Paralyze', 'Burn', 'Freeze', 'Static']) {
    for (const player of ['P1', 'P2']) args[`setPvp${key}${player}`] = record(`${key}${player}`);
  }
  const advance = (target) => {
    tasks.sort((a, b) => a.at - b.at);
    while (tasks[0]?.at <= target) {
      const task = tasks.shift();
      now = task.at;
      task.fn();
      tasks.sort((a, b) => a.at - b.at);
    }
    now = target;
  };
  return { args, state, events, advance };
}

for (const turn of ['p1', 'p2']) {
  test(`PvP ${turn}: launch, contact and turn handoff occur on distinct beats`, () => {
    const { args, state, events, advance } = fixture({ turn });
    executePvpStrikeTurn(args);
    const launch = events.find((e) => e.kind === 'effect').value;
    assert.equal(launch.targetSide, turn === 'p1' ? 'enemy' : 'player');
    assert.equal(launch.impact, undefined);
    const hitMs = getAttackEffectHitDelay('fire');
    advance(hitMs - 1);
    assert.equal(state.pHp, 100);
    assert.equal(state.pvpHp2, 100);
    assert.equal(events.some((e) => e.kind === 'hitMessage'), false);
    advance(hitMs);
    assert.equal(state[turn === 'p1' ? 'pvpHp2' : 'pHp'], 80);
    const contact = events.filter((e) => e.kind === 'effect').at(-1);
    assert.equal(contact.value.impact.outcome, 'hit');
    assert.equal(contact.at, hitMs);
    assert.ok(events.some((e) => e.kind === 'sound' && e.value === 'hit' && e.at === hitMs));
    assert.ok(events.some((e) => e.kind === 'hitMessage' && e.at === hitMs));
    assert.equal(state.phase, 'playerAtk');
    advance(hitMs + 519);
    assert.equal(events.some((e) => e.kind === 'turn'), false);
    advance(hitMs + 520);
    assert.equal(state.phase, 'text');
    const cleanupIndex = events.findLastIndex((e) => e.kind === 'effect' && e.value === null);
    assert.ok(events.findIndex((e) => e.kind === 'turn') > cleanupIndex);
  });
}

for (const [defenderType, outcome] of [['water', 'miss'], ['ice', 'miss'], ['fire', 'blocked'],
  ['electric', 'blocked'], ['light', 'blocked'], ['steel', 'blocked'], ['grass', 'blocked']]) {
  test(`PvP ${defenderType} defense suppresses a damaging/critical impact`, () => {
    const { args, state, events, advance } = fixture({ defense: true, defenderType, critical: true });
    executePvpStrikeTurn(args);
    advance(300);
    assert.equal(state.pvpHp2, 100);
    const impact = events.filter((e) => e.kind === 'effect').at(-1).value.impact;
    assert.equal(impact.outcome, outcome);
    assert.equal(events.some((e) => e.kind === 'sound' && ['hit', 'crit'].includes(e.value)), false);
    assert.equal(events.some((e) => e.kind === 'hitMessage'), false);
    assert.equal(state.phase, 'playerAtk');
    advance(1000);
    assert.equal(state.phase, 'text');
  });
}

test('PvP critical feedback and lethal result wait for actual contact and recoil', () => {
  const { args, state, events, advance } = fixture({ critical: true, hp: 10 });
  executePvpStrikeTurn(args);
  assert.equal(events.some((e) => e.value === 'crit'), false);
  advance(300);
  assert.equal(state.pvpHp2, 0);
  assert.equal(state.screen, 'battle');
  assert.ok(events.some((e) => e.kind === 'effect' && e.value?.impact?.outcome === 'critical'));
  advance(820);
  assert.equal(state.screen, 'pvp_result');
  assert.ok(events.some((e) => e.kind === 'winner' && e.value === 'p1'));
});

test('PvP projectile callbacks cannot damage or flash after leaving the battle', () => {
  const { args, state, events, advance } = fixture();
  executePvpStrikeTurn(args);
  state.screen = 'title';
  advance(5000);
  assert.equal(state.pvpHp2, 100);
  assert.equal(events.filter((e) => e.kind === 'effect').length, 1);
  assert.equal(events.some((e) => e.kind === 'turn'), false);
});

test('identical PvP moves produce distinct contact events without losing their target side', () => {
  const { args, events, advance } = fixture();
  executePvpStrikeTurn(args);
  advance(1000);
  executePvpStrikeTurn(args);
  advance(1300);
  const impacts = events.filter((e) => e.kind === 'effect' && e.value?.impact).map((e) => e.value);
  assert.equal(impacts.length, 2);
  assert.notEqual(impacts[0].impact, impacts[1].impact);
  assert.equal(impacts[0].type, impacts[1].type);
  assert.equal(impacts[0].targetSide, impacts[1].targetSide);
});
