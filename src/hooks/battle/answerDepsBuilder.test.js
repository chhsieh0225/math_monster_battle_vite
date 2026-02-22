import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPvpAnswerHandlerDeps,
  buildPlayerAnswerHandlerDeps,
} from './answerDepsBuilder.ts';

function makeFnMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, () => {}]));
}

test('buildPvpAnswerHandlerDeps maps runtime/ui/pvp/battle setters correctly', () => {
  const runtime = {
    ...makeFnMap(['rand', 'chance', 'safeTo', 'getOtherPvpTurn', 'setScreen']),
    sr: { current: { marker: 'state' } },
    sfx: { play: () => {} },
    t: undefined,
  };
  const ui = makeFnMap([
    'setFb', 'setBText', 'setPhase', 'setEffMsg', 'setAtkEffect',
    'addP', 'setPAnim', 'setEAnim', 'addD',
  ]);
  const pvp = makeFnMap([
    'setPvpChargeP1', 'setPvpChargeP2',
    'setPvpComboP1', 'setPvpComboP2',
    'setPvpTurn', 'setPvpActionCount',
    'setPvpSpecDefP1', 'setPvpSpecDefP2',
    'setPvpParalyzeP1', 'setPvpParalyzeP2',
    'setPvpHp2', 'setPvpWinner',
    'setPvpBurnP1', 'setPvpBurnP2',
    'setPvpFreezeP1', 'setPvpFreezeP2',
    'setPvpStaticP1', 'setPvpStaticP2',
  ]);
  const battleFields = makeFnMap(['setTC', 'setTW', 'setPHp', 'setEHp']);

  const deps = buildPvpAnswerHandlerDeps({
    runtime,
    ui,
    pvp,
    battleFields,
  });

  assert.equal(deps.sr, runtime.sr);
  assert.equal(deps.safeTo, runtime.safeTo);
  assert.equal(deps.setScreen, runtime.setScreen);
  assert.equal(deps.setFb, ui.setFb);
  assert.equal(deps.addD, ui.addD);
  assert.equal(deps.setTC, battleFields.setTC);
  assert.equal(deps.setPHp, battleFields.setPHp);
  assert.equal(deps.setPvpTurn, pvp.setPvpTurn);
  assert.equal(deps.setPvpHp2, pvp.setPvpHp2);
});

test('buildPlayerAnswerHandlerDeps maps battle/ui/runtime/callback sources correctly', () => {
  const runtime = {
    ...makeFnMap(['safeTo', 'chance', 'getCollectionDamageScale']),
    sr: { current: { marker: 'state' } },
    sfx: { play: () => {} },
    challengeDamageMult: 1.1,
    challengeComboMult: 1.2,
    t: undefined,
  };
  const ui = makeFnMap([
    'setFb', 'setPhase', 'setPAnim', 'setAtkEffect', 'setEAnim',
    'setEffMsg', 'addD', 'setBText',
  ]);
  const battleFields = makeFnMap([
    'setTC', 'setTW', 'setStreak', 'setPassiveCount', 'setCharge', 'setMaxStreak',
    'setSpecDef', 'setMLvls', 'setMLvlUp', 'setMHits', 'setBossCharging',
    'setBurnStack', 'setPHp', 'setPHpSub', 'setFrozen', 'setShattered',
    'setStaticStack', 'setEHp', 'setCursed', 'setShadowShieldCD', 'setFuryRegenUsed',
  ]);
  const callbacks = {
    ...makeFnMap([
      'tryUnlock', 'doEnemyTurn', 'handleVictory', 'handleFreeze', '_endSession',
      'setScreen', 'handlePlayerPartyKo', 'runAllySupportTurn', 'setPendingTextAdvanceAction',
    ]),
    frozenR: { current: false },
  };

  const deps = buildPlayerAnswerHandlerDeps({
    runtime,
    ui,
    battleFields,
    callbacks,
  });

  assert.equal(deps.sr, runtime.sr);
  assert.equal(deps.challengeDamageMult, runtime.challengeDamageMult);
  assert.equal(deps.setTW, battleFields.setTW);
  assert.equal(deps.setShattered, battleFields.setShattered);
  assert.equal(deps.setBText, ui.setBText);
  assert.equal(deps.tryUnlock, callbacks.tryUnlock);
  assert.equal(deps.runAllySupportTurn, callbacks.runAllySupportTurn);
  assert.equal(deps.setPendingTextAdvanceAction, callbacks.setPendingTextAdvanceAction);
  assert.equal(deps.frozenR, callbacks.frozenR);
});
