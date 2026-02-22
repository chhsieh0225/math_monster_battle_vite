import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPvpStartDeps,
  buildStandardStartDeps,
  buildStartBattleSharedArgs,
} from './startDepsBuilder.ts';

function makeFnMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, () => {}]));
}

test('buildStartBattleSharedArgs prefers state battle mode and ally when present', () => {
  const sr = {
    current: {
      battleMode: 'coop',
      allySub: { id: 'ally_1' },
    },
  };
  const shared = buildStartBattleSharedArgs({
    sr,
    fallbackBattleMode: 'single',
    enemies: [],
    locale: 'zh-TW',
    starter: { id: 'fire' },
    t: undefined,
    sceneNames: {},
    localizeEnemy: (enemy) => enemy,
    localizeSceneName: (sceneName) => sceneName,
    dispatchBattle: () => {},
    updateEnc: () => {},
    setPhase: () => {},
    setBText: () => {},
    setScreen: () => {},
    finishGame: () => {},
    resetFrozen: () => {},
    playBattleIntro: () => {},
    setCoopActiveSlot: () => {},
    pickIndex: () => 0,
    getCampaignNodeMeta: () => null,
  });

  assert.equal(shared.battleMode, 'coop');
  assert.deepEqual(shared.allySub, { id: 'ally_1' });
});

test('buildStartBattleSharedArgs uses fallback battle mode when state mode is empty', () => {
  const shared = buildStartBattleSharedArgs({
    sr: { current: { battleMode: null, allySub: null } },
    fallbackBattleMode: 'single',
    enemies: [],
    locale: 'zh-TW',
    starter: { id: 'fire' },
    t: undefined,
    sceneNames: {},
    localizeEnemy: (enemy) => enemy,
    localizeSceneName: (sceneName) => sceneName,
    dispatchBattle: () => {},
    updateEnc: () => {},
    setPhase: () => {},
    setBText: () => {},
    setScreen: () => {},
    finishGame: () => {},
    resetFrozen: () => {},
    playBattleIntro: () => {},
    setCoopActiveSlot: () => {},
    pickIndex: () => 0,
    getCampaignNodeMeta: () => null,
  });

  assert.equal(shared.battleMode, 'single');
  assert.equal(shared.allySub, null);
});

test('buildPvpStartDeps maps runtime, pvp, and ui deps', () => {
  const runtime = {
    ...makeFnMap([
      'chance', 'getStarterMaxHp', 'setEnemies', 'setTimedMode',
      'setCoopActiveSlot', 'dispatchBattle', 'appendSessionEvent',
      'initSession', 'createPvpEnemyFromStarter', 'setScreen', 'playBattleIntro',
    ]),
    t: undefined,
  };
  const pvp = makeFnMap(['setPvpStarter2', 'setPvpHp2', 'setPvpTurn', 'resetPvpRuntime']);
  const ui = makeFnMap(['setPhase', 'setBText']);
  const resetRunRuntimeState = () => {};

  const deps = buildPvpStartDeps({
    runtime,
    pvp,
    ui,
    resetRunRuntimeState,
  });

  assert.equal(deps.chance, runtime.chance);
  assert.equal(deps.setPvpStarter2, pvp.setPvpStarter2);
  assert.equal(deps.setPvpTurn, pvp.setPvpTurn);
  assert.equal(deps.setPhase, ui.setPhase);
  assert.equal(deps.setBText, ui.setBText);
  assert.equal(deps.resetRunRuntimeState, resetRunRuntimeState);
});

test('buildStandardStartDeps maps runtime and pvp deps', () => {
  const runtime = makeFnMap([
    'buildNewRoster', 'getStarterMaxHp', 'setEnemies', 'setCoopActiveSlot',
    'dispatchBattle', 'appendSessionEvent', 'initSession', 'setScreen', 'startBattle',
  ]);
  const pvp = makeFnMap(['resetPvpRuntime']);
  const resetRunRuntimeState = () => {};

  const deps = buildStandardStartDeps({
    runtime,
    pvp,
    resetRunRuntimeState,
  });

  assert.equal(deps.buildNewRoster, runtime.buildNewRoster);
  assert.equal(deps.setScreen, runtime.setScreen);
  assert.equal(deps.startBattle, runtime.startBattle);
  assert.equal(deps.resetPvpRuntime, pvp.resetPvpRuntime);
  assert.equal(deps.resetRunRuntimeState, resetRunRuntimeState);
});
