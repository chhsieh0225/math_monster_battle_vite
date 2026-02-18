import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUseBattleActions } from './publicActionsBuilder.ts';

function createFn(name, calls) {
  return (...args) => {
    calls.push({ name, args });
  };
}

test('buildUseBattleActions maps localized starter setters into public action names', () => {
  const calls = [];
  const deps = {
    dismissAch: createFn('dismissAch', calls),
    setTimedMode: createFn('setTimedMode', calls),
    setBattleMode: createFn('setBattleMode', calls),
    setScreen: createFn('setScreen', calls),
    queueDailyChallenge: createFn('queueDailyChallenge', calls),
    queueTowerChallenge: createFn('queueTowerChallenge', calls),
    clearChallengeRun: createFn('clearChallengeRun', calls),
    setStarterLocalized: createFn('setStarterLocalized', calls),
    setPvpStarter2Localized: createFn('setPvpStarter2Localized', calls),
    startGame: createFn('startGame', calls),
    selectMove: createFn('selectMove', calls),
    useItem: createFn('useItem', calls),
    onAns: createFn('onAns', calls),
    advance: createFn('advance', calls),
    continueAfterEvolve: createFn('continueAfterEvolve', calls),
    quitGame: createFn('quitGame', calls),
    togglePause: createFn('togglePause', calls),
    toggleCoopActive: createFn('toggleCoopActive', calls),
    rmD: createFn('rmD', calls),
    rmP: createFn('rmP', calls),
  };

  const actions = buildUseBattleActions(deps);
  actions.setStarter({ id: 'fire' });
  actions.setPvpStarter2({ id: 'water' });

  assert.deepEqual(calls.slice(-2), [
    { name: 'setStarterLocalized', args: [{ id: 'fire' }] },
    { name: 'setPvpStarter2Localized', args: [{ id: 'water' }] },
  ]);
});

test('buildUseBattleActions exposes full expected public action surface', () => {
  const noop = () => {};
  const actions = buildUseBattleActions({
    dismissAch: noop,
    setTimedMode: noop,
    setBattleMode: noop,
    setScreen: noop,
    queueDailyChallenge: noop,
    queueTowerChallenge: noop,
    clearChallengeRun: noop,
    setStarterLocalized: noop,
    setPvpStarter2Localized: noop,
    startGame: noop,
    selectMove: noop,
    useItem: noop,
    onAns: noop,
    advance: noop,
    continueAfterEvolve: noop,
    quitGame: noop,
    togglePause: noop,
    toggleCoopActive: noop,
    rmD: noop,
    rmP: noop,
  });

  const keys = Object.keys(actions).sort();
  assert.deepEqual(keys, [
    'advance',
    'clearChallengeRun',
    'continueAfterEvolve',
    'dismissAch',
    'onAns',
    'queueDailyChallenge',
    'queueTowerChallenge',
    'quitGame',
    'rmD',
    'rmP',
    'selectMove',
    'setBattleMode',
    'setPvpStarter2',
    'setScreen',
    'setStarter',
    'setTimedMode',
    'startGame',
    'toggleCoopActive',
    'togglePause',
    'useItem',
  ]);
});
