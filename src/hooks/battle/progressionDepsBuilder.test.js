import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildContinueFromVictoryFlowArgs,
  buildVictoryFlowArgs,
} from './progressionDepsBuilder.ts';

function makeFnMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, () => {}]));
}

test('buildVictoryFlowArgs maps runtime/ui/battle deps and writes pending evolve ref', () => {
  const runtime = {
    ...makeFnMap([
      'randInt', 'resolveLevelProgress', 'getStageMaxHp', 'tryUnlock',
      'applyVictoryAchievements', 'updateEncDefeated', 'onCollectionUpdated', 'onDropResolved',
    ]),
    sfx: { play: () => {} },
    t: undefined,
  };
  const battleFields = makeFnMap([
    'setBurnStack', 'setStaticStack', 'setFrozen', 'setShattered', 'setCursed',
    'setBossPhase', 'setBossTurn', 'setBossCharging', 'setSealedMove', 'setSealedTurns',
    'setPExp', 'setPLvl', 'setPHp', 'setDefeated',
  ]);
  const ui = makeFnMap(['setBText', 'setPhase']);
  const frozenRef = { current: false };
  const pendingEvolveRef = { current: false };

  const args = buildVictoryFlowArgs({
    verb: 'defeated',
    sr: { current: {} },
    runtime,
    battleFields,
    ui,
    frozenRef,
    pendingEvolveRef,
  });

  assert.equal(args.randInt, runtime.randInt);
  assert.equal(args.setPHp, battleFields.setPHp);
  assert.equal(args.setBText, ui.setBText);
  assert.equal(args.frozenRef, frozenRef);
  assert.equal(typeof args.setPendingEvolve, 'function');

  args.setPendingEvolve(true);
  assert.equal(pendingEvolveRef.current, true);
});

test('buildContinueFromVictoryFlowArgs maps state/runtime/ui/callback deps', () => {
  const stateRef = { current: { battleMode: 'single', round: 1 } };
  const runtime = {
    ...makeFnMap([
      'setScreen', 'dispatchBattle', 'localizeEnemy', 'getStageMaxHp', 'getStarterMaxHp',
    ]),
    locale: 'zh-TW',
    t: undefined,
  };
  const battleFields = makeFnMap(['setPHp', 'setPHpSub']);
  const ui = makeFnMap(['setBText', 'setPhase']);
  const callbacks = makeFnMap(['finishGame', 'startBattle']);

  const args = buildContinueFromVictoryFlowArgs({
    sr: stateRef,
    enemiesLength: 5,
    runtime,
    battleFields,
    ui,
    callbacks,
  });

  assert.equal(args.state, stateRef.current);
  assert.equal(args.enemiesLength, 5);
  assert.equal(args.setScreen, runtime.setScreen);
  assert.equal(args.setPHp, battleFields.setPHp);
  assert.equal(args.setBText, ui.setBText);
  assert.equal(args.finishGame, callbacks.finishGame);
  assert.equal(args.startBattle, callbacks.startBattle);
});
