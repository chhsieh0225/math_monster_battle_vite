import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBattleLayout } from './battleLayout.ts';
import { BOSS_IDS } from '../data/monsterConfigs.ts';

function getResponsiveSpriteScales(arenaWidth) {
  if (arenaWidth <= 480) {
    return {
      enemyMain: 0.94,
      enemySub: 0.9,
      playerMain: 0.94,
      playerSub: 0.9,
    };
  }
  if (arenaWidth <= 768) {
    return {
      enemyMain: 0.97,
      enemySub: 0.95,
      playerMain: 0.97,
      playerSub: 0.94,
    };
  }
  return {
    enemyMain: 1,
    enemySub: 1,
    playerMain: 1,
    playerSub: 1,
  };
}

function rectFromLeftPct(leftPct, widthPx, arenaWidth) {
  const left = arenaWidth * leftPct / 100;
  return { left, right: left + widthPx, width: widthPx };
}

function rectFromRightPct(rightPct, widthPx, arenaWidth) {
  const right = arenaWidth - arenaWidth * rightPct / 100;
  return { left: right - widthPx, right, width: widthPx };
}

function resolveEnemySubVisual({ enemySubId, enemySubIsEvolved, compactDual }) {
  const isBossVisual = BOSS_IDS.has(enemySubId);
  const isLargeEnemySub = enemySubId === 'golumn' || enemySubId === 'golumn_mud' || enemySubId === 'mushroom';
  const enemySubScale = isLargeEnemySub
    ? (compactDual ? 0.86 : 0.94)
    : (compactDual ? 0.72 : 0.8);
  const enemySubSize = !enemySubId
    ? 96
    : isBossVisual
      ? 160
      : isLargeEnemySub
        ? 150
        : enemySubIsEvolved
          ? 120
          : 96;
  return { enemySubScale, enemySubSize };
}

function resolveMainDimScale({ showAllySub, coopUsingSub, playerComp, compactDual }) {
  const hasSelectableCoopPair = showAllySub;
  const mainIsActive = !hasSelectableCoopPair || !coopUsingSub;
  if (mainIsActive) return 1;
  return playerComp > 1.3 ? (compactDual ? 0.74 : 0.82) : 0.84;
}

function resolveSubDimScale({ showAllySub, coopUsingSub, subComp, compactDual }) {
  const hasSelectableCoopPair = showAllySub;
  const subIsActive = hasSelectableCoopPair && coopUsingSub;
  if (!hasSelectableCoopPair) return 1;
  if (subIsActive) return subComp > 1.3 ? (compactDual ? 0.95 : 1) : (compactDual ? 1.14 : 1.08);
  return subComp > 1.3 ? (compactDual ? 0.76 : 0.84) : 0.84;
}

function resolveBattleRects({
  layout,
  arenaWidth,
  showAllySub = false,
  coopUsingSub = false,
  enemySubId = '',
  enemySubIsEvolved = false,
}) {
  const scales = getResponsiveSpriteScales(arenaWidth);
  const shouldSwapPlayerSlots = showAllySub && coopUsingSub;
  const swappedMainWidePullback = shouldSwapPlayerSlots && layout.playerComp > 1.3
    ? (layout.compactDual ? 13 : 10)
    : 0;
  const playerMainLeftPct = shouldSwapPlayerSlots
    ? Math.max(1, layout.playerSubLeftPct - swappedMainWidePullback)
    : layout.playerMainLeftPct;
  const playerSubLeftPct = shouldSwapPlayerSlots ? layout.playerMainLeftPct : layout.playerSubLeftPct;
  const mainDimScale = resolveMainDimScale({
    showAllySub,
    coopUsingSub,
    playerComp: layout.playerComp,
    compactDual: layout.compactDual,
  });
  const subDimScale = resolveSubDimScale({
    showAllySub,
    coopUsingSub,
    subComp: layout.subComp,
    compactDual: layout.compactDual,
  });
  const playerMainWidth = layout.mainPlayerSize * scales.playerMain * mainDimScale;
  const playerSubWidth = layout.subPlayerSize * scales.playerSub * subDimScale;
  const enemyMainWidth = layout.enemySize * scales.enemyMain;
  const { enemySubScale, enemySubSize } = resolveEnemySubVisual({
    enemySubId,
    enemySubIsEvolved,
    compactDual: layout.compactDual,
  });
  const enemySubWidth = enemySubSize * enemySubScale * scales.enemySub;
  return {
    playerMain: rectFromLeftPct(playerMainLeftPct, playerMainWidth, arenaWidth),
    playerSub: rectFromLeftPct(playerSubLeftPct, playerSubWidth, arenaWidth),
    enemyMain: rectFromRightPct(layout.enemyMainRightPct, enemyMainWidth, arenaWidth),
    enemySub: rectFromRightPct(layout.enemySubRightPct, enemySubWidth, arenaWidth),
    playerMainLeftPct,
    playerSubLeftPct,
  };
}

function minFrontlineGap({ rects, showAllySub, showEnemySub }) {
  const playerRects = [rects.playerMain];
  if (showAllySub) playerRects.push(rects.playerSub);
  const enemyRects = [rects.enemyMain];
  if (showEnemySub) enemyRects.push(rects.enemySub);
  let minGap = Number.POSITIVE_INFINITY;
  for (const p of playerRects) {
    for (const e of enemyRects) {
      minGap = Math.min(minGap, e.left - p.right);
    }
  }
  return minGap;
}

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
  assert.equal(compactCrazyDragon.enemyMainRightPct, 6.5);
});

test('compact UI scales boss enemies down and moves them farther right', () => {
  const desktopHydra = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss_hydra',
    enemySceneType: 'poison',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'bossHydraSVG',
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

  assert.ok(compactHydra.enemySize < desktopHydra.enemySize);
  assert.ok(compactHydra.enemyMainRightPct < desktopHydra.enemyMainRightPct);
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

test('compact dual non-boss enemies retreat right to reduce overlap', () => {
  const compactDualSlime = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: true,
    playerStageIdx: 0,
    playerStarterId: 'fire',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerfire0SVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.equal(compactDualSlime.enemyMainRightPct, 3);
  assert.equal(compactDualSlime.enemySubRightPct, 16);
});

test('compact dual ghost lantern is pulled farther right and scaled down', () => {
  const compactGhost = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: true,
    playerStageIdx: 0,
    playerStarterId: 'wolf',
    enemyId: 'ghost_lantern',
    enemySceneType: 'ghost',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwolf0SVG',
    enemySpriteKey: 'ghostLanternSVG',
  });
  const compactSlime = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: true,
    playerStageIdx: 0,
    playerStarterId: 'wolf',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwolf0SVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.ok(compactGhost.enemyMainRightPct < compactSlime.enemyMainRightPct);
  assert.ok(compactGhost.enemySize > compactSlime.enemySize);
});

// ── Device matrix validation (phone / tablet / laptop) ─────────────

const DEVICE_CASES = [
  { name: 'phone', arenaWidth: 390, compactUI: true, minGap: 8 },
  { name: 'tablet', arenaWidth: 768, compactUI: false, minGap: 16 },
  { name: 'laptop', arenaWidth: 1366, compactUI: false, minGap: 24 },
];

function round2(v) {
  return Math.round(v * 100) / 100;
}

function snapshotRect(rect) {
  return [round2(rect.left), round2(rect.right)];
}

function buildLayoutSnapshot() {
  const snapshot = { single: {}, coopMain: {}, coopSub: {}, pvp: {} };
  for (const device of DEVICE_CASES) {
    const singleLayout = resolveBattleLayout({
      battleMode: 'single',
      hasDualUnits: false,
      compactUI: device.compactUI,
      playerStageIdx: 0,
      playerStarterId: 'fire',
      enemyId: 'colorful_butterfly',
      enemySceneType: 'grass',
      enemyIsEvolved: false,
      playerSpriteKey: 'playerfire0SVG',
      enemySpriteKey: 'colorfulButterflySVG',
    });
    const singleRects = resolveBattleRects({
      layout: singleLayout,
      arenaWidth: device.arenaWidth,
    });
    snapshot.single[device.name] = {
      pm: snapshotRect(singleRects.playerMain),
      em: snapshotRect(singleRects.enemyMain),
      pMainPct: round2(singleRects.playerMainLeftPct),
      eMainPct: round2(singleLayout.enemyMainRightPct),
    };

    const coopLayout = resolveBattleLayout({
      battleMode: 'coop',
      hasDualUnits: true,
      compactUI: device.compactUI,
      playerStageIdx: 0,
      playerStarterId: 'wolf',
      subStarterId: 'electric',
      enemyId: 'colorful_butterfly',
      enemySceneType: 'grass',
      enemyIsEvolved: false,
      playerSpriteKey: 'playerwolf0SVG',
      subSpriteKey: 'playerelectric0SVG',
      enemySpriteKey: 'colorfulButterflySVG',
    });
    const coopMainRects = resolveBattleRects({
      layout: coopLayout,
      arenaWidth: device.arenaWidth,
      showAllySub: true,
      coopUsingSub: false,
      enemySubId: 'slime',
      enemySubIsEvolved: false,
    });
    snapshot.coopMain[device.name] = {
      pm: snapshotRect(coopMainRects.playerMain),
      ps: snapshotRect(coopMainRects.playerSub),
      em: snapshotRect(coopMainRects.enemyMain),
      es: snapshotRect(coopMainRects.enemySub),
      pMainPct: round2(coopMainRects.playerMainLeftPct),
      pSubPct: round2(coopMainRects.playerSubLeftPct),
      eMainPct: round2(coopLayout.enemyMainRightPct),
      eSubPct: round2(coopLayout.enemySubRightPct),
    };

    const coopSubRects = resolveBattleRects({
      layout: coopLayout,
      arenaWidth: device.arenaWidth,
      showAllySub: true,
      coopUsingSub: true,
      enemySubId: 'slime',
      enemySubIsEvolved: false,
    });
    snapshot.coopSub[device.name] = {
      pm: snapshotRect(coopSubRects.playerMain),
      ps: snapshotRect(coopSubRects.playerSub),
      em: snapshotRect(coopSubRects.enemyMain),
      es: snapshotRect(coopSubRects.enemySub),
      pMainPct: round2(coopSubRects.playerMainLeftPct),
      pSubPct: round2(coopSubRects.playerSubLeftPct),
      eMainPct: round2(coopLayout.enemyMainRightPct),
      eSubPct: round2(coopLayout.enemySubRightPct),
    };

    const pvpLayout = resolveBattleLayout({
      battleMode: 'pvp',
      hasDualUnits: false,
      compactUI: device.compactUI,
      playerStageIdx: 0,
      playerStarterId: 'wolf',
      enemyId: 'pvp_slime',
      enemySceneType: 'grass',
      enemyIsEvolved: false,
      playerSpriteKey: 'playerwolf0SVG',
      enemySpriteKey: 'slimeSVG',
    });
    const pvpRects = resolveBattleRects({
      layout: pvpLayout,
      arenaWidth: device.arenaWidth,
    });
    snapshot.pvp[device.name] = {
      pm: snapshotRect(pvpRects.playerMain),
      em: snapshotRect(pvpRects.enemyMain),
      pMainPct: round2(pvpRects.playerMainLeftPct),
      eMainPct: round2(pvpLayout.enemyMainRightPct),
    };
  }
  return snapshot;
}

const DEVICE_LAYOUT_SNAPSHOT = {
  single: {
    phone: { pm: [23.4, 124.92], em: [155.48, 351], pMainPct: 6, eMainPct: 10 },
    tablet: { pm: [46.08, 150.84], em: [489.44, 691.2], pMainPct: 6, eMainPct: 10 },
    laptop: { pm: [81.96, 189.96], em: [1021.4, 1229.4], pMainPct: 6, eMainPct: 10 },
  },
  coopMain: {
    phone: { pm: [-5.85, 169.93], ps: [97.5, 168.56], em: [230.72, 378.3], es: [265.39, 327.6], pMainPct: -1.5, pSubPct: 25, eMainPct: 3, eSubPct: 16 },
    tablet: { pm: [0, 193.03], ps: [203.52, 287.22], em: [528.08, 706.56], es: [541.44, 614.4], pMainPct: 0, pSubPct: 26.5, eMainPct: 8, eSubPct: 20 },
    laptop: { pm: [0, 199], ps: [361.99, 451.03], em: [1072.72, 1256.72], es: [1016, 1092.8], pMainPct: 0, pSubPct: 26.5, eMainPct: 8, eSubPct: 20 },
  },
  coopSub: {
    phone: { pm: [46.8, 176.88], ps: [-5.85, 90.59], em: [230.72, 378.3], es: [265.39, 327.6], pMainPct: 12, pSubPct: -1.5, eMainPct: 3, eSubPct: 16 },
    tablet: { pm: [126.72, 285], ps: [0, 107.61], em: [528.08, 706.56], es: [541.44, 614.4], pMainPct: 16.5, pSubPct: 0, eMainPct: 8, eSubPct: 20 },
    laptop: { pm: [225.39, 388.57], ps: [0, 114.48], em: [1072.72, 1256.72], es: [1016, 1092.8], pMainPct: 16.5, pSubPct: 0, eMainPct: 8, eSubPct: 20 },
  },
  pvp: {
    phone: { pm: [7.8, 202.38], em: [238.2, 351], pMainPct: 2, eMainPct: 10 },
    tablet: { pm: [15.36, 216.15], em: [574.8, 691.2], pMainPct: 2, eMainPct: 10 },
    laptop: { pm: [27.32, 234.32], em: [1109.4, 1229.4], pMainPct: 2, eMainPct: 10 },
  },
};

test('device matrix keeps single-mode frontline spacing stable', () => {
  for (const device of DEVICE_CASES) {
    const layout = resolveBattleLayout({
      battleMode: 'single',
      hasDualUnits: false,
      compactUI: device.compactUI,
      playerStageIdx: 0,
      playerStarterId: 'fire',
      enemyId: 'colorful_butterfly',
      enemySceneType: 'grass',
      enemyIsEvolved: false,
      playerSpriteKey: 'playerfire0SVG',
      enemySpriteKey: 'colorfulButterflySVG',
    });
    const rects = resolveBattleRects({
      layout,
      arenaWidth: device.arenaWidth,
      showAllySub: false,
      showEnemySub: false,
      coopUsingSub: false,
    });
    const gap = minFrontlineGap({
      rects,
      showAllySub: false,
      showEnemySub: false,
    });
    assert.ok(
      gap >= device.minGap,
      `${device.name} single-mode gap too small: ${gap.toFixed(2)}px`,
    );
  }
});

test('device matrix keeps co-op swapped slots away from enemy lane', () => {
  for (const device of DEVICE_CASES) {
    const layout = resolveBattleLayout({
      battleMode: 'coop',
      hasDualUnits: true,
      compactUI: device.compactUI,
      playerStageIdx: 0,
      playerStarterId: 'wolf',
      subStarterId: 'electric',
      enemyId: 'colorful_butterfly',
      enemySceneType: 'grass',
      enemyIsEvolved: false,
      playerSpriteKey: 'playerwolf0SVG',
      subSpriteKey: 'playerelectric0SVG',
      enemySpriteKey: 'colorfulButterflySVG',
    });
    const swappedRects = resolveBattleRects({
      layout,
      arenaWidth: device.arenaWidth,
      showAllySub: true,
      showEnemySub: true,
      coopUsingSub: true,
      enemySubId: 'slime',
      enemySubIsEvolved: false,
    });
    const swappedGap = minFrontlineGap({
      rects: swappedRects,
      showAllySub: true,
      showEnemySub: true,
    });
    assert.ok(
      swappedGap >= device.minGap,
      `${device.name} swapped co-op gap too small: ${swappedGap.toFixed(2)}px`,
    );

    // Prevent severe clipping: allow a small off-screen margin only.
    assert.ok(
      swappedRects.playerMain.left > -swappedRects.playerMain.width * 0.35,
      `${device.name} swapped main player is clipped too far on the left`,
    );
    assert.ok(
      swappedRects.enemyMain.right < device.arenaWidth + swappedRects.enemyMain.width * 0.35,
      `${device.name} enemy main is clipped too far on the right`,
    );
  }
});

test('device matrix keeps pvp frontline spacing stable', () => {
  for (const device of DEVICE_CASES) {
    const standardLayout = resolveBattleLayout({
      battleMode: 'pvp',
      hasDualUnits: false,
      compactUI: device.compactUI,
      playerStageIdx: 0,
      playerStarterId: 'wolf',
      enemyId: 'pvp_slime',
      enemySceneType: 'grass',
      enemyIsEvolved: false,
      playerSpriteKey: 'playerwolf0SVG',
      enemySpriteKey: 'slimeSVG',
    });
    const standardRects = resolveBattleRects({
      layout: standardLayout,
      arenaWidth: device.arenaWidth,
      showAllySub: false,
      showEnemySub: false,
      coopUsingSub: false,
    });
    const standardGap = minFrontlineGap({
      rects: standardRects,
      showAllySub: false,
      showEnemySub: false,
    });
    assert.ok(
      standardGap >= device.minGap,
      `${device.name} pvp standard gap too small: ${standardGap.toFixed(2)}px`,
    );

    // Boss-vs-boss can have intentional visual overlap, but should still avoid
    // excessive clipping outside the arena.
    const bossLayout = resolveBattleLayout({
      battleMode: 'pvp',
      hasDualUnits: false,
      compactUI: device.compactUI,
      playerStageIdx: 0,
      playerStarterId: 'boss_crazy_dragon',
      enemyId: 'pvp_boss_hydra',
      enemySceneType: 'burnt_warplace',
      enemyIsEvolved: true,
      playerSpriteKey: 'bossCrazyDragonSVG',
      enemySpriteKey: 'bossHydraSVG',
    });
    const bossRects = resolveBattleRects({
      layout: bossLayout,
      arenaWidth: device.arenaWidth,
      showAllySub: false,
      showEnemySub: false,
      coopUsingSub: false,
    });
    assert.ok(
      bossRects.playerMain.left > -bossRects.playerMain.width * 0.45,
      `${device.name} pvp boss player clipped too far on the left`,
    );
    assert.ok(
      bossRects.enemyMain.right < device.arenaWidth + bossRects.enemyMain.width * 0.45,
      `${device.name} pvp boss enemy clipped too far on the right`,
    );
  }
});

test('device matrix snapshot remains stable across phone/tablet/laptop', () => {
  assert.deepEqual(buildLayoutSnapshot(), DEVICE_LAYOUT_SNAPSHOT);
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
