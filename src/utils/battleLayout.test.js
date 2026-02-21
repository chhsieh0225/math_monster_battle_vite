import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBattleLayout } from './battleLayout.ts';

// ── Compensation-aware tests ────────────────────────────────────────
// After the spriteProfile refactor, battleLayout no longer hard-codes
// wide-sprite multipliers.  Callers pass `playerSpriteKey` /
// `enemySpriteKey` and the layout reads compensation from spriteProfiles.
//
// Key compensation values (677×369, safePad=0.05): ~1.699
//                          (677×369, safePad=0.04): ~1.662 (bosses)
//                          (409×610, safePad=0.04): ~1.087 (sword_god)
//                          (120×100, safePad=0):     1.000 (standard)

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
    playerSpriteKey: 'playerlion2SVG',
    enemySpriteKey: 'slimeSVG',
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
    playerSpriteKey: 'playerfire2SVG',
    enemySpriteKey: 'slimeSVG',
  });

  // lion uses wide sprite (comp ≈ 1.699), fire uses standard — lion SVG
  // element is physically larger to compensate for lower visible height.
  assert.ok(lionLayout.mainPlayerSize > fireLayout.mainPlayerSize);
  // 188 × 0.96 × 1.699 ≈ 307
  assert.equal(lionLayout.mainPlayerSize, 307);
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
    playerSpriteKey: 'playerwolf2SVG',
    enemySpriteKey: 'slimeSVG',
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
    playerSpriteKey: 'playerlion2SVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.equal(wolfLayout.mainPlayerSize, lionLayout.mainPlayerSize);
  assert.equal(wolfLayout.mainPlayerSize, 307);
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
    playerSpriteKey: 'playerlion2SVG',
    enemySpriteKey: 'slimeSVG',
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
    playerSpriteKey: 'playerlion2SVG',
    enemySpriteKey: 'slimeSVG',
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
    playerSpriteKey: 'playerwolf2SVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.ok(lionCompact.mainPlayerSize < lionDesktop.mainPlayerSize);
  // 200 × 1.699 ≈ 340   (desktop, no compact scale)
  assert.equal(lionDesktop.mainPlayerSize, 340);
  // 200 × 0.97 × 1.699 ≈ 330   (compact ×0.97 reduction)
  assert.equal(lionCompact.mainPlayerSize, 330);
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
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'bossHydraSVG',
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
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'bossHydraSVG',
  });

  assert.ok(coopHydra.enemySize > soloHydra.enemySize);
  // 260 × 0.98 × 1.1 × 1.662 ≈ 466
  assert.equal(coopHydra.enemySize, 466);
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
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'bossSwordGodSVG',
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
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'bossSwordGodSVG',
  });

  assert.equal(pvpBoss.enemySize, normalBoss.enemySize);
  assert.equal(pvpBoss.enemyTopPct, normalBoss.enemyTopPct);
  // 270 × 1.087 ≈ 293
  assert.equal(pvpBoss.enemySize, 293);
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
    playerSpriteKey: 'playerfire0SVG',
    enemySpriteKey: 'slimeSVG',
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
    playerSpriteKey: 'bossSwordGodSVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.ok(bossStarterLayout.mainPlayerSize > normalStarterLayout.mainPlayerSize);
  // 230 × 1.087 ≈ 250
  assert.equal(bossStarterLayout.mainPlayerSize, 250);
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
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'playerwolf0SVG',
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
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'playerwolf2SVG',
  });

  assert.ok(evolvedWildStarterLayout.enemySize > baseWildStarterLayout.enemySize);
  // base: 120 × 1.699 ≈ 204;  evolved: 172 × 1.699 ≈ 292
  assert.equal(baseWildStarterLayout.enemySize, 204);
  assert.equal(evolvedWildStarterLayout.enemySize, 292);
});

test('ghost lantern variant gets larger in-battle render size for readability', () => {
  const baseGhostLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'ghost',
    enemySceneType: 'ghost',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'ghostSVG',
  });
  const lanternLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'ghost_lantern',
    enemySceneType: 'ghost',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'ghostLanternSVG',
  });

  assert.ok(lanternLayout.enemySize > baseGhostLayout.enemySize);
  // 182 × 1.699 ≈ 309
  assert.equal(lanternLayout.enemySize, 309);
});

test('mushroom variant uses enlarged in-battle render size', () => {
  const baseGhostLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'ghost',
    enemySceneType: 'ghost',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'ghostSVG',
  });
  const mushroomLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'mushroom',
    enemySceneType: 'poison',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'mushroomSVG',
  });

  assert.ok(mushroomLayout.enemySize > baseGhostLayout.enemySize);
  // 176 × 1.699 ≈ 299
  assert.equal(mushroomLayout.enemySize, 299);
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
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'bossCrazyDragonSVG',
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
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'bossHydraSVG',
  });

  assert.ok(compactCrazyDragon.enemyMainRightPct < compactHydra.enemyMainRightPct);
  assert.equal(compactCrazyDragon.enemyMainRightPct, 7);
});

test('pvp one-wing dragon gets dedicated size boost for readability', () => {
  const singleEnemy = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss_crazy_dragon',
    enemySceneType: 'burnt_warplace',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'bossCrazyDragonSVG',
  });
  const pvpEnemy = resolveBattleLayout({
    battleMode: 'pvp',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'pvp_boss_crazy_dragon',
    enemySceneType: 'burnt_warplace',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'bossCrazyDragonSVG',
  });
  const singlePlayer = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 0,
    playerStarterId: 'boss_crazy_dragon',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'bossCrazyDragonSVG',
    enemySpriteKey: 'slimeSVG',
  });
  const pvpPlayer = resolveBattleLayout({
    battleMode: 'pvp',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 0,
    playerStarterId: 'boss_crazy_dragon',
    enemyId: 'pvp_slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'bossCrazyDragonSVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.ok(pvpEnemy.enemySize > singleEnemy.enemySize);
  assert.ok(pvpPlayer.mainPlayerSize > singlePlayer.mainPlayerSize);
});

// ── Beast starters shift leftward to avoid overlapping co-op ally ───

test('beast starters shift main sprite left and sub ally right in coop', () => {
  const wolfCoop = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: false,
    playerStageIdx: 0,
    playerStarterId: 'wolf',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwolf0SVG',
    enemySpriteKey: 'slimeSVG',
  });
  const fireCoop = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: false,
    playerStageIdx: 0,
    playerStarterId: 'fire',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerfire0SVG',
    enemySpriteKey: 'slimeSVG',
  });

  // beast main sprite is shifted 4% further left than standard
  assert.equal(wolfCoop.playerMainLeftPct, fireCoop.playerMainLeftPct - 4);
  // beast sub ally is pushed 6% further right to avoid overlap
  assert.equal(wolfCoop.playerSubLeftPct, fireCoop.playerSubLeftPct + 6);
});

test('beast starter left shift also applies in single mode', () => {
  const tigerSingle = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 0,
    playerStarterId: 'tiger',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playertiger0SVG',
    enemySpriteKey: 'slimeSVG',
  });
  // base is 6%, beast shift −4% → 2%
  assert.equal(tigerSingle.playerMainLeftPct, 2);
});

test('compact coop pulls wide beast sub ally backward from enemy lane', () => {
  const fireWithWolfSub = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: true,
    playerStageIdx: 0,
    playerStarterId: 'fire',
    subStarterId: 'wolf',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerfire0SVG',
    subSpriteKey: 'playerwolf0SVG',
    enemySpriteKey: 'slimeSVG',
  });
  const fireWithFireSub = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: true,
    playerStageIdx: 0,
    playerStarterId: 'fire',
    subStarterId: 'fire',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerfire0SVG',
    subSpriteKey: 'playerfire0SVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.ok(fireWithWolfSub.playerSubLeftPct < fireWithFireSub.playerSubLeftPct);
  assert.equal(fireWithWolfSub.playerSubLeftPct, fireWithFireSub.playerSubLeftPct - 4);
});

// ── Fallback: no spriteKey → compensation = 1 ──────────────────────

test('without spriteKey, compensation defaults to 1 (backward compatible)', () => {
  const layout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 0,
    playerStarterId: 'fire',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    // no spriteKeys → comp = 1
  });
  // fire stage0 isDragonKinBase → 108, slime → 120
  assert.equal(layout.mainPlayerSize, 108);
  assert.equal(layout.enemySize, 120);
});
