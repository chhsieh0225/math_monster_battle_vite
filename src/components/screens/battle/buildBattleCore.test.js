import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBattleCore } from './buildBattleCore.ts';

function makeStarter(id = 'fire') {
  return {
    id,
    name: id,
    type: id,
    typeIcon: '🔥',
    c1: '#f00',
    c2: '#800',
    stages: [{ name: 's0', emoji: '🔥', svgFn: () => '<svg />' }],
    moves: [
      { icon: '1', name: 'm1', desc: 'd1', color: '#fff', basePower: 10, growth: 1, type: 'fire', risky: false },
      { icon: '2', name: 'm2', desc: 'd2', color: '#fff', basePower: 12, growth: 1, type: 'fire', risky: true },
      { icon: '3', name: 'm3', desc: 'd3', color: '#fff', basePower: 14, growth: 1, type: 'fire', risky: false },
      { icon: '4', name: 'm4', desc: 'd4', color: '#fff', basePower: 16, growth: 1, type: 'fire', risky: false },
    ],
  };
}

function makeEnemy(id = 'slime') {
  return {
    id,
    name: id,
    lvl: 1,
    maxHp: 40,
    spriteKey: 'slimeSVG',
    activeSpriteKey: 'slimeSVG',
    mType: 'grass',
    typeIcon: '🌿',
    c1: '#0f0',
    c2: '#070',
    svgFn: () => '<svg />',
  };
}

function makeState(overrides = {}) {
  return {
    starter: makeStarter(),
    enemy: makeEnemy(),
    pLvl: 1,
    pStg: 0,
    battleMode: 'single',
    enemySub: null,
    eHp: 40,
    eHpSub: 0,
    bossPhase: 0,
    allySub: null,
    pHpSub: 0,
    coopActiveSlot: 'main',
    pvpTurn: 'p1',
    pvpStarter2: makeStarter('water'),
    pvpState: {
      p1: { charge: 0, burn: 0, freeze: false, static: 0, paralyze: false, combo: 0, specDef: false },
      p2: { charge: 0, burn: 0, freeze: false, static: 0, paralyze: false, combo: 0, specDef: false },
      turn: 'p1',
      winner: null,
      actionCount: 0,
    },
    charge: 0,
    chargeReady: false,
    sealedMove: -1,
    mLvls: [1, 1, 1, 1],
    mHits: [0, 0, 0, 0],
    ...overrides,
  };
}

const TEST_SCENES = {
  grass: {
    sky: 'sky',
    ground: 'ground',
    platform1: 'p1',
    platform2: 'p2',
  },
};

test('buildBattleCore applies sealed/risky lock rules in single battle', () => {
  const core = buildBattleCore({
    state: makeState({ sealedMove: 0, chargeReady: false }),
    compactUI: false,
    getPow: (idx) => 10 + idx,
    dualEff: () => 1,
    scenes: TEST_SCENES,
  });

  assert.ok(core);
  assert.equal(core.moveRuntime[0].sealed, true);
  assert.equal(core.moveRuntime[0].locked, true);
  assert.equal(core.moveRuntime[1].locked, true); // risky + no charge
});

test('buildBattleCore uses pvp charge gate and ignores sealed move in pvp', () => {
  const lowChargeCore = buildBattleCore({
    state: makeState({
      battleMode: 'pvp',
      sealedMove: 1,
      pvpState: {
        p1: { charge: 2, burn: 0, freeze: false, static: 0, paralyze: false, combo: 0, specDef: false },
        p2: { charge: 0, burn: 0, freeze: false, static: 0, paralyze: false, combo: 0, specDef: false },
        turn: 'p1',
        winner: null,
        actionCount: 0,
      },
      chargeReady: false,
    }),
    compactUI: false,
    getPow: (idx) => 10 + idx,
    dualEff: () => 1,
    scenes: TEST_SCENES,
  });
  const readyCore = buildBattleCore({
    state: makeState({
      battleMode: 'pvp',
      sealedMove: 1,
      pvpState: {
        p1: { charge: 3, burn: 0, freeze: false, static: 0, paralyze: false, combo: 0, specDef: false },
        p2: { charge: 0, burn: 0, freeze: false, static: 0, paralyze: false, combo: 0, specDef: false },
        turn: 'p1',
        winner: null,
        actionCount: 0,
      },
      chargeReady: false,
    }),
    compactUI: false,
    getPow: (idx) => 10 + idx,
    dualEff: () => 1,
    scenes: TEST_SCENES,
  });

  assert.ok(lowChargeCore);
  assert.ok(readyCore);
  assert.equal(lowChargeCore.moveRuntime[1].sealed, false); // pvp ignores sealed-move mechanic
  assert.equal(lowChargeCore.moveRuntime[1].locked, true); // risky + pvp charge < 3
  assert.equal(readyCore.moveRuntime[1].locked, false); // risky unlocked at 3
  assert.equal(readyCore.chargeDisplay, 3);
});

test('buildBattleCore returns resolved sceneKey when requested key is missing', () => {
  const core = buildBattleCore({
    state: makeState({
      enemy: {
        ...makeEnemy('volt'),
        sceneMType: 'electric',
      },
    }),
    compactUI: false,
    getPow: (idx) => 10 + idx,
    dualEff: () => 1,
    scenes: TEST_SCENES,
  });

  assert.ok(core);
  assert.equal(core.sceneKey, 'grass');
});

test('buildBattleCore switches dark dragon to phase-2 sprite when hp is low', () => {
  const phase1 = buildBattleCore({
    state: makeState({
      enemy: {
        ...makeEnemy('boss'),
        maxHp: 100,
        spriteKey: 'darkLordSVG',
        activeSpriteKey: 'darkLordSVG',
      },
      eHp: 80,
      bossPhase: 1,
    }),
    compactUI: false,
    getPow: (idx) => 10 + idx,
    dualEff: () => 1,
    scenes: TEST_SCENES,
  });
  const phase2 = buildBattleCore({
    state: makeState({
      enemy: {
        ...makeEnemy('boss'),
        maxHp: 100,
        spriteKey: 'darkLordSVG',
        activeSpriteKey: 'darkLordSVG',
      },
      eHp: 60,
      bossPhase: 2,
    }),
    compactUI: false,
    getPow: (idx) => 10 + idx,
    dualEff: () => 1,
    scenes: TEST_SCENES,
  });

  assert.ok(phase1);
  assert.ok(phase2);
  assert.equal(phase1.eSvg.includes('boss_2nd_phase.png'), false);
  assert.equal(phase2.eSvg.includes('boss_2nd_phase.png'), true);
  assert.ok(phase2.layout.enemyComp > phase1.layout.enemyComp);
});

test('buildBattleCore switches dark dragon sub target in co-op when sub hp is low', () => {
  const core = buildBattleCore({
    state: makeState({
      battleMode: 'coop',
      enemy: makeEnemy('slime'),
      enemySub: {
        ...makeEnemy('boss'),
        maxHp: 100,
        spriteKey: 'darkLordSVG',
        activeSpriteKey: 'darkLordSVG',
      },
      eHpSub: 55,
    }),
    compactUI: true,
    getPow: (idx) => 10 + idx,
    dualEff: () => 1,
    scenes: TEST_SCENES,
  });

  assert.ok(core);
  assert.ok(core.eSubSvg);
  assert.equal(core.eSubSvg.includes('boss_2nd_phase.png'), true);
});
