import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBattleLayout } from './battleLayout.ts';

test('coop lion final evolution is slightly reduced for screen fit', () => {
  const lionLayout = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: false,
    playerStageIdx: 2,
    playerStarterId: 'lion',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
  });
  const fireLayout = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: false,
    playerStageIdx: 2,
    playerStarterId: 'fire',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
  });

  assert.ok(lionLayout.mainPlayerSize < fireLayout.mainPlayerSize);
  assert.equal(lionLayout.mainPlayerSize, 180);
});

test('coop wolf final evolution follows lion sizing profile', () => {
  const wolfLayout = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: false,
    playerStageIdx: 2,
    playerStarterId: 'wolf',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
  });
  const lionLayout = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: false,
    playerStageIdx: 2,
    playerStarterId: 'lion',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
  });

  assert.equal(wolfLayout.mainPlayerSize, lionLayout.mainPlayerSize);
  assert.equal(wolfLayout.mainPlayerSize, 180);
});

test('compact UI slightly reduces lion/wolf final evolution size', () => {
  const lionDesktop = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 2,
    playerStarterId: 'lion',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
  });
  const lionCompact = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 2,
    playerStarterId: 'lion',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
  });
  const wolfCompact = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 2,
    playerStarterId: 'wolf',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
  });

  assert.ok(lionCompact.mainPlayerSize < lionDesktop.mainPlayerSize);
  assert.equal(lionDesktop.mainPlayerSize, 200);
  assert.equal(lionCompact.mainPlayerSize, 194);
  assert.equal(wolfCompact.mainPlayerSize, lionCompact.mainPlayerSize);
});

test('hydra gets coop-only size boost to avoid looking undersized', () => {
  const coopHydra = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'boss_hydra',
    enemySceneType: 'poison',
    enemyIsEvolved: true,
  });
  const soloHydra = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'boss_hydra',
    enemySceneType: 'poison',
    enemyIsEvolved: true,
  });

  assert.ok(coopHydra.enemySize > soloHydra.enemySize);
  assert.equal(coopHydra.enemySize, 280);
});

test('pvp boss id prefix keeps boss visual sizing', () => {
  const normalBoss = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'boss_sword_god',
    enemySceneType: 'light',
    enemyIsEvolved: false,
  });
  const pvpBoss = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'pvp_boss_sword_god',
    enemySceneType: 'light',
    enemyIsEvolved: false,
  });

  assert.equal(pvpBoss.enemySize, normalBoss.enemySize);
  assert.equal(pvpBoss.enemyTopPct, normalBoss.enemyTopPct);
});

test('boss selected as player starter uses boss-class sprite size', () => {
  const normalStarterLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 0,
    playerStarterId: 'fire',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
  });
  const bossStarterLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 0,
    playerStarterId: 'boss_sword_god',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
  });

  assert.ok(bossStarterLayout.mainPlayerSize > normalStarterLayout.mainPlayerSize);
  assert.equal(bossStarterLayout.mainPlayerSize, 230);
});

test('evolved wild starter enemies render larger than base wild starter enemies', () => {
  const baseWildStarterLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'wild_starter_wolf',
    enemySceneType: 'steel',
    enemyIsEvolved: false,
  });
  const evolvedWildStarterLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'wild_starter_wolf',
    enemySceneType: 'steel',
    enemyIsEvolved: true,
  });

  assert.ok(evolvedWildStarterLayout.enemySize > baseWildStarterLayout.enemySize);
  assert.equal(evolvedWildStarterLayout.enemySize, 172);
});

test('compact UI shifts crazy dragon enemy position to the right', () => {
  const compactCrazyDragon = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss_crazy_dragon',
    enemySceneType: 'burnt_warplace',
    enemyIsEvolved: true,
  });
  const compactHydra = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss_hydra',
    enemySceneType: 'poison',
    enemyIsEvolved: true,
  });

  assert.ok(compactCrazyDragon.enemyMainRightPct < compactHydra.enemyMainRightPct);
  assert.equal(compactCrazyDragon.enemyMainRightPct, 7);
});
