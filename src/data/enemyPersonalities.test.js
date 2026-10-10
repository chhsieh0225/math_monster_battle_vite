import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnemyBehaviorState, getPersonalityCue, planPersonalityHit, planPersonalityAttack,
  personalityMoveKey, canVaryPersonalityMoves, PERSONALITY_TACTICS, ENEMY_PERSONALITIES } from './enemyPersonalities.ts';

const context = (id, state = createEnemyBehaviorState().main, hp = 100) => ({
  enemy: { id: 'slime', maxHp: 100, personality: { id } }, hp, state, battleMode: 'single',
});
const hit = (ctx, moveKey = 'fire:0', canVary = true) => planPersonalityHit({ ...ctx, moveKey, moveName: moveKey, canVary });

test('rage is a visible two-hit cycle with one strong strike and one exploitable opening', () => {
  let ctx = context('irritable');
  Object.freeze(ctx.state);
  assert.equal(getPersonalityCue(ctx), 'anger');
  ctx = { ...ctx, state: hit(ctx).next };
  assert.equal(ctx.state.anger, 1);
  assert.equal(planPersonalityAttack(ctx), null);
  ctx = { ...ctx, state: hit(ctx).next };
  assert.equal(getPersonalityCue(ctx), 'rage');
  assert.equal(hit(ctx).next.anger, 2, 'freeze cannot overcharge rage');
  const attack = planPersonalityAttack(ctx);
  assert.equal(attack.damageScale, PERSONALITY_TACTICS.rageScale);
  ctx = { ...ctx, state: attack.next };
  assert.equal(getPersonalityCue(ctx), 'opening');
  assert.equal(planPersonalityAttack(ctx), null, 'not boosted again while exposed');
  const exploit = hit(ctx);
  assert.equal(exploit.feedback, 'exploit');
  assert.equal(exploit.damageScale, PERSONALITY_TACTICS.openingScale);
  assert.deepEqual(exploit.next, createEnemyBehaviorState().main);
});

test('timid guard only protects a hit starting at low HP and cannot reform', () => {
  assert.equal(hit(context('timid', undefined, 41)).damageScale, 1);
  const ctx = context('timid', undefined, 40);
  assert.equal(getPersonalityCue(ctx), 'guard');
  const plan = hit(ctx);
  assert.equal(plan.feedback, 'guardBreak');
  assert.equal(plan.damageScale, PERSONALITY_TACTICS.guardScale);
  for (const hp of [100, 40, 1]) {
    const spent = context('timid', plan.next, hp);
    assert.equal(getPersonalityCue(spent), 'spent');
    assert.equal(hit(spent).damageScale, 1);
  }
});

test('crafty learns landed moves, rewards switching and distinguishes co-op characters', () => {
  const initial = context('crafty');
  const first = hit(initial);
  assert.equal(first.damageScale, 1);
  const watched = { ...initial, state: first.next };
  assert.equal(getPersonalityCue(watched), 'watch');
  assert.equal(hit(watched).damageScale, PERSONALITY_TACTICS.parryScale);
  assert.equal(hit(watched, 'fire:1').feedback, 'outwit');
  const other = personalityMoveKey({ id: 'water' }, 0);
  assert.notEqual(other, personalityMoveKey({ id: 'fire' }, 0));
  assert.equal(hit(watched, other).damageScale, PERSONALITY_TACTICS.outwitScale);
  assert.equal(hit(watched, 'fire:0', false).damageScale, 1);
  assert.equal(hit(watched, 'fire:0', false).next.watchedMoveKey, null);
});

test('move availability excludes sealed and uncharged moves; tactics exclude bosses, PvP and dead enemies', () => {
  assert.equal(canVaryPersonalityMoves([{ risky: false }, { risky: true }], -1, false), false);
  assert.equal(canVaryPersonalityMoves([{ risky: false }, { risky: true }], -1, true), true);
  assert.equal(canVaryPersonalityMoves([{}, {}], 1, true), false);
  for (const patch of [{ hp: 0 }, { battleMode: 'pvp' }, { enemy: { id: 'boss', personality: { id: 'irritable' } } }]) {
    const ctx = { ...context('irritable'), ...patch };
    assert.equal(getPersonalityCue(ctx), null);
    assert.equal(hit(ctx), null);
    assert.equal(planPersonalityAttack(ctx), null);
  }
  for (const id of ['composed', 'resilient', 'impatient', 'missing']) assert.equal(hit(context(id)), null);
});

test('behavioral personalities no longer stack passive offensive bonuses', () => {
  for (const id of ['irritable', 'timid', 'crafty']) {
    const def = ENEMY_PERSONALITIES.find(p => p.id === id);
    assert.ok(def.atkScale <= 1);
    assert.ok(def.critChanceBonus <= 0);
    assert.ok(def.critDamageBonus <= 0);
    assert.equal(def.incomingDamageScale, 1);
  }
});
