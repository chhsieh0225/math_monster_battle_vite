import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAdvancePvpTurnStartDeps,
  buildPendingEvolutionArgs,
} from './advanceDepsBuilder.ts';

function makeFnMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, () => {}]));
}

test('buildAdvancePvpTurnStartDeps maps runtime/ui/pvp/battle deps correctly', () => {
  const runtime = {
    ...makeFnMap(['safeTo', 'getOtherPvpTurn', 'getPvpTurnName', 'setScreen']),
    sr: { current: { marker: 'state' } },
    t: undefined,
  };
  const ui = makeFnMap(['setPAnim', 'addD', 'setEAnim', 'setBText', 'setPhase']);
  const pvp = makeFnMap([
    'setPvpBurnP1', 'setPvpWinner', 'setPvpHp2', 'setPvpBurnP2',
    'setPvpParalyzeP1', 'setPvpParalyzeP2', 'setPvpTurn',
    'setPvpFreezeP1', 'setPvpFreezeP2',
  ]);
  const battleFields = makeFnMap(['setPHp', 'setEHp']);

  const deps = buildAdvancePvpTurnStartDeps({
    runtime,
    ui,
    pvp,
    battleFields,
  });

  assert.equal(deps.sr, runtime.sr);
  assert.equal(deps.safeTo, runtime.safeTo);
  assert.equal(deps.setScreen, runtime.setScreen);
  assert.equal(deps.setPhase, ui.setPhase);
  assert.equal(deps.addD, ui.addD);
  assert.equal(deps.setPHp, battleFields.setPHp);
  assert.equal(deps.setEHp, battleFields.setEHp);
  assert.equal(deps.setPvpTurn, pvp.setPvpTurn);
});

test('buildPendingEvolutionArgs maps pending flag and battle field setters', () => {
  const pendingEvolveRef = { current: true };
  const battleFields = makeFnMap(['setPStg', 'setPHp', 'setAllySub', 'setPHpSub', 'setMLvls']);
  const setScreen = () => {};
  const tryUnlock = () => {};
  const getStageMaxHp = () => 120;
  const getStarterMaxHp = () => 80;

  const args = buildPendingEvolutionArgs({
    pendingEvolveRef,
    battleFields,
    setScreen,
    tryUnlock,
    getStageMaxHp,
    getStarterMaxHp,
    maxMoveLvl: 10,
  });

  assert.equal(args.pendingEvolveRef, pendingEvolveRef);
  assert.equal(args.setPStg, battleFields.setPStg);
  assert.equal(args.setPHp, battleFields.setPHp);
  assert.equal(args.setAllySub, battleFields.setAllySub);
  assert.equal(args.setPHpSub, battleFields.setPHpSub);
  assert.equal(args.setMLvls, battleFields.setMLvls);
  assert.equal(args.setScreen, setScreen);
  assert.equal(args.tryUnlock, tryUnlock);
  assert.equal(args.getStageMaxHp, getStageMaxHp);
  assert.equal(args.getStarterMaxHp, getStarterMaxHp);
  assert.equal(args.maxMoveLvl, 10);
});
