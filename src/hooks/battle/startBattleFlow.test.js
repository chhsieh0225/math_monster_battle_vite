import assert from 'node:assert/strict';
import test from 'node:test';
import { runStartBattleFlow } from './startBattleFlow.ts';
import { battleReducer, createInitialBattleState } from './battleReducer.ts';
import { continueFromVictoryFlow } from './advanceFlow.ts';
import { getScreenMusic } from '../../utils/battleMusic.ts';

for (const battleMode of ['single', 'coop']) {
  test(`${battleMode} successive boss encounters advance the roster, scene, intro and music together`, () => {
    const roster = ['boss', 'boss_hydra', 'boss_crazy_dragon', 'boss_sword_god'].map((id, i) => ({
      id, name: id, mType: 'dark', sceneMType: ['dark', 'poison', 'burnt_warplace', 'heaven'][i], maxHp: 100,
    }));
    let state = { ...createInitialBattleState(), screen: 'battle', battleMode };
    let phase, finished = false;
    const dispatchBattle = (action) => { state = battleReducer(state, action); };
    const setPhase = (value) => { phase = value; };
    const startBattle = (idx) => runStartBattleFlow({
      idx, roster, enemies: roster, locale: 'zh-TW', battleMode, allySub: null, starter: { name: 'Hero', moves: [] },
      sceneNames: {}, localizeEnemy: (e) => e, localizeSceneName: (scene) => scene, dispatchBattle,
      updateEnc: () => {}, setPhase, setBText: () => {}, setScreen: () => {}, finishGame: () => { finished = true; },
      resetFrozen: () => {}, playBattleIntro: () => {}, pickIndex: () => 0,
    });
    startBattle(0);
    for (let round = 0; round < roster.length; round++) {
      assert.equal(state.round, round);
      assert.equal(state.enemy.id, roster[round].id);
      assert.equal(state.enemy.sceneMType, roster[round].sceneMType);
      assert.equal(phase, 'bossIntro');
      assert.equal(getScreenMusic(state), round === 0 ? 'boss_dark_king' : roster[round].id);
      continueFromVictoryFlow({ state, enemiesLength: roster.length, dispatchBattle,
        setScreen: () => {}, localizeEnemy: (e) => e, setBText: () => {}, setPhase,
        finishGame: () => { finished = true; }, setPHp: () => {}, setPHpSub: () => {},
        getStageMaxHp: () => 100, getStarterMaxHp: () => 100, startBattle,
      });
    }
    assert.equal(finished, true);
  });
}

function createEnemy(name, extra = {}) {
  return {
    name,
    typeIcon: '🔥',
    typeName: 'Fire',
    lvl: 7,
    mType: 'fire',
    sceneMType: 'fire',
    ...extra,
  };
}

test('runStartBattleFlow finishes game when target enemy is missing', () => {
  let finished = false;
  runStartBattleFlow({
    idx: 0,
    roster: [],
    enemies: [],
    locale: 'zh-TW',
    battleMode: 'single',
    allySub: null,
    starter: { name: '火狐' },
    sceneNames: {},
    localizeEnemy: () => null,
    localizeSceneName: () => '火焰谷',
    dispatchBattle: () => { throw new Error('dispatch should not be called'); },
    updateEnc: () => { throw new Error('updateEnc should not be called'); },
    setPhase: () => { throw new Error('setPhase should not be called'); },
    setBText: () => { throw new Error('setBText should not be called'); },
    setScreen: () => { throw new Error('setScreen should not be called'); },
    finishGame: () => { finished = true; },
    resetFrozen: () => { throw new Error('resetFrozen should not be called'); },
    playBattleIntro: () => { throw new Error('playBattleIntro should not be called'); },
  });

  assert.equal(finished, true);
});

test('runStartBattleFlow starts double battle with ally intro text', () => {
  const roster = [createEnemy('史萊姆王'), createEnemy('毒液花', { mType: 'grass', sceneMType: 'grass' })];
  let action = null;
  const encUpdated = [];
  let phase = '';
  let text = '';
  let screen = '';
  let introPlayed = false;
  let frozenReset = false;

  runStartBattleFlow({
    idx: 0,
    roster,
    enemies: roster,
    locale: 'zh-TW',
    battleMode: 'coop',
    allySub: { name: '雷喵' },
    starter: { name: '火狐' },
    sceneNames: { fire: '火焰谷', grass: '草原' },
    localizeEnemy: (enemy) => enemy,
    localizeSceneName: (_sceneType, defaultName) => defaultName,
    dispatchBattle: (next) => { action = next; },
    updateEnc: (enemy) => { encUpdated.push(enemy?.name || ''); },
    setPhase: (next) => { phase = next; },
    setBText: (next) => { text = next; },
    setScreen: (next) => { screen = next; },
    finishGame: () => { throw new Error('finishGame should not be called'); },
    resetFrozen: () => { frozenReset = true; },
    playBattleIntro: () => { introPlayed = true; },
  });

  assert.equal(action?.type, 'start_battle');
  assert.equal(action?.round, 0);
  assert.equal(action?.enemy?.name, '史萊姆王');
  assert.equal(action?.enemySub?.name, '毒液花');
  assert.deepEqual(encUpdated, ['史萊姆王', '毒液花']);
  assert.equal(phase, 'text');
  assert.equal(text.includes('vs'), true);
  assert.equal(text.includes('火狐'), true);
  assert.equal(text.includes('雷喵'), true);
  assert.equal(screen, 'battle');
  assert.equal(introPlayed, true);
  assert.equal(frozenReset, true);
});

test('runStartBattleFlow starts single battle intro text', () => {
  const enemy = createEnemy('哥布林');
  let text = '';

  runStartBattleFlow({
    idx: 0,
    roster: [enemy],
    enemies: [enemy],
    locale: 'en-US',
    battleMode: 'single',
    allySub: null,
    starter: { name: 'Aqua' },
    sceneNames: { fire: 'Magma Field' },
    localizeEnemy: (next) => next,
    localizeSceneName: (_sceneType, defaultName) => defaultName,
    dispatchBattle: () => {},
    updateEnc: () => {},
    setPhase: () => {},
    setBText: (next) => { text = next; },
    setScreen: () => {},
    finishGame: () => { throw new Error('finishGame should not be called'); },
    resetFrozen: () => {},
    playBattleIntro: () => {},
  });

  assert.equal(text.includes('Lv.'), true);
  assert.equal(text.includes('哥布林'), true);
});

test('runStartBattleFlow keeps intro concise even when campaign node meta is provided', () => {
  const enemy = createEnemy('伏擊狼');
  let text = '';

  runStartBattleFlow({
    idx: 0,
    roster: [enemy],
    enemies: [enemy],
    locale: 'en-US',
    battleMode: 'single',
    allySub: null,
    starter: { name: 'Aqua' },
    sceneNames: { fire: 'Magma Field' },
    localizeEnemy: (next) => next,
    localizeSceneName: (_sceneType, defaultName) => defaultName,
    dispatchBattle: () => {},
    updateEnc: () => {},
    setPhase: () => {},
    setBText: (next) => { text = next; },
    setScreen: () => {},
    finishGame: () => { throw new Error('finishGame should not be called'); },
    resetFrozen: () => {},
    playBattleIntro: () => {},
    getCampaignNodeMeta: () => ({
      roundIndex: 2,
      totalNodes: 10,
      branch: 'right',
      tier: 'elite',
      eventTag: 'hazard_ambush',
    }),
  });

  assert.equal(text.includes('Route node 3/10'), false);
  assert.equal(text.includes('Right Path'), false);
  assert.equal(text.includes('Elite node'), false);
  assert.equal(text.includes('Ambush Trap'), false);
  assert.equal(text.includes('伏擊狼'), true);
  assert.equal(text.includes('Lv.'), true);
});

test('runStartBattleFlow enters boss intro when coop sub enemy is a boss', () => {
  const roster = [
    createEnemy('前衛史萊姆', { id: 'slime' }),
    createEnemy('暗黑龍王', { id: 'boss' }),
  ];
  let phase = '';

  runStartBattleFlow({
    idx: 0,
    roster,
    enemies: roster,
    locale: 'zh-TW',
    battleMode: 'coop',
    allySub: { name: '雷喵' },
    starter: { name: '火狐', moves: [] },
    sceneNames: { fire: '火焰谷' },
    localizeEnemy: (enemy) => enemy,
    localizeSceneName: (_sceneType, defaultName) => defaultName,
    dispatchBattle: () => {},
    updateEnc: () => {},
    setPhase: (next) => { phase = next; },
    setBText: () => {},
    setScreen: () => {},
    finishGame: () => { throw new Error('finishGame should not be called'); },
    resetFrozen: () => {},
    playBattleIntro: () => {},
  });

  assert.equal(phase, 'bossIntro');
});
