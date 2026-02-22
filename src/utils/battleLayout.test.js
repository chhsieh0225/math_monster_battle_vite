import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BATTLE_ARENA_VIEWPORT,
  resolveBattleFallbackTargets,
  resolveBattleLaneSnapshot,
  resolveBattleLayout,
} from './battleLayout.ts';
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
  return playerComp > 1.3 ? (compactDual ? 0.58 : 0.68) : 0.84;
}

function resolveSubDimScale({ showAllySub, coopUsingSub, subComp, compactDual }) {
  const hasSelectableCoopPair = showAllySub;
  const subIsActive = hasSelectableCoopPair && coopUsingSub;
  if (!hasSelectableCoopPair) return 1;
  if (subIsActive) return subComp > 1.3 ? (compactDual ? 0.95 : 1) : (compactDual ? 1.14 : 1.08);
  return subComp > 1.3 ? (compactDual ? 0.82 : 0.88) : 0.88;
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
  const swappedMainIsWideBeast = shouldSwapPlayerSlots && layout.playerComp > 1.3;
  const swappedMainWidePullback = swappedMainIsWideBeast
    ? (layout.compactDual ? 24 : 22)
    : 0;
  const swappedMainTargetPct = layout.playerSubLeftPct - swappedMainWidePullback;
  const swappedMainSafeMinPct = layout.playerMainLeftPct + (swappedMainIsWideBeast ? (layout.compactDual ? 4.2 : 5.4) : (layout.compactDual ? 10 : 9));
  const swappedMainSafeMaxPct = layout.playerSubLeftPct - (swappedMainIsWideBeast ? (layout.compactDual ? 2.2 : 1.3) : (layout.compactDual ? 1.5 : 1));
  const swappedMainWideCompactCapPct = swappedMainIsWideBeast && layout.compactDual ? 5.8 : Number.POSITIVE_INFINITY;
  const clampedSwappedMainPct = Math.max(
    1,
    Math.min(
      swappedMainWideCompactCapPct,
      Math.min(swappedMainSafeMaxPct, Math.max(swappedMainSafeMinPct, swappedMainTargetPct)),
    ),
  );
  const playerMainLeftPct = shouldSwapPlayerSlots
    ? clampedSwappedMainPct
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

function buildLaneSnapshot({
  layout,
  arenaWidth,
  showAllySub,
  showEnemySub,
  coopUsingSub,
  isCoopBattle,
  enemySubId,
  enemySubIsEvolved,
}) {
  const resolvedEnemySubId = enemySubId || '';
  return resolveBattleLaneSnapshot({
    arenaWidthPx: arenaWidth,
    compactDual: layout.compactDual,
    hasDualUnits: showAllySub || showEnemySub,
    isCoopBattle,
    showAllySub,
    showEnemySub,
    coopUsingSub,
    playerComp: layout.playerComp,
    subComp: layout.subComp,
    enemyComp: layout.enemyComp,
    rawMainLeftPct: layout.playerMainLeftPct,
    rawMainBottomPct: layout.playerMainBottomPct,
    rawSubLeftPct: layout.playerSubLeftPct,
    rawSubBottomPct: layout.playerSubBottomPct,
    rawMainSize: layout.mainPlayerSize,
    rawSubSize: layout.subPlayerSize,
    starterSubRoleSize: layout.mainPlayerSize,
    allyMainRoleSize: layout.subPlayerSize,
    enemyMainRightPct: layout.enemyMainRightPct,
    enemySubRightPct: layout.enemySubRightPct,
    enemyTopPct: layout.enemyTopPct,
    enemySubTopPct: layout.enemySubTopPct,
    enemySize: layout.enemySize,
    enemySubId: resolvedEnemySubId,
    enemySubIsBossVisual: BOSS_IDS.has(resolvedEnemySubId),
    enemySubIsEvolved,
  });
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

test('coop wolf final evolution is slightly smaller than lion for readability', () => {
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

  assert.ok(wolfLayout.mainPlayerSize < lionLayout.mainPlayerSize);
  // 188 × 0.96 × 0.92 × 1.699 ≈ 282
  assert.equal(wolfLayout.mainPlayerSize, 282);
});

test('wolf final form is nudged left/down compared with lion in battle lane', () => {
  const wolfLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
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

  assert.ok(wolfLayout.playerMainLeftPct < lionLayout.playerMainLeftPct);
  assert.ok(wolfLayout.playerMainBottomPct < lionLayout.playerMainBottomPct);
});

test('lion final form is nudged left/down versus default final-starter lane', () => {
  const lionLayout = resolveBattleLayout({
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
  const fireLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 2,
    playerStarterId: 'fire',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerfire2SVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.ok(Math.abs(lionLayout.playerMainLeftPct - 0.3) < 1e-9);
  assert.equal(lionLayout.playerMainBottomPct, 11.4);
  assert.ok(lionLayout.playerMainLeftPct < fireLayout.playerMainLeftPct);
  assert.ok(lionLayout.playerMainBottomPct < fireLayout.playerMainBottomPct);
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
  // wolf final keeps a dedicated extra reduction in addition to compact scaling.
  assert.equal(wolfCompact.mainPlayerSize, 303);
});

test('hydra keeps coop bonus on top of baseline size boost', () => {
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
  // 260 × 0.98 × 1.04 × 1.1 × 1.662 ≈ 484
  assert.equal(coopHydra.enemySize, 484);
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
  // 270 × 1.13 × 1.087 ≈ 332
  assert.equal(pvpBoss.enemySize, 332);
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

test('tiger king enemy gets an extra size boost for opponent readability', () => {
  const tigerKingLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'wild_starter_tiger',
    enemySceneType: 'water',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'playertiger2SVG',
  });
  const fireEvolvedLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'wild_starter_fire',
    enemySceneType: 'fire',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'playerfire2SVG',
  });

  assert.ok(tigerKingLayout.enemySize > fireEvolvedLayout.enemySize);
  // 172 × 1.15 × 1.699 ≈ 336
  assert.equal(tigerKingLayout.enemySize, 336);
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

test('candy monster renders slightly larger than default same-sprite baseline', () => {
  const baseLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'slime',
    enemySceneType: 'candy',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'candyMonsterSVG',
  });
  const candyMonsterLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'candy_monster',
    enemySceneType: 'candy',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'candyMonsterSVG',
  });

  assert.ok(candyMonsterLayout.enemySize > baseLayout.enemySize);
});

test('candy knight renders slightly larger than default same-sprite baseline', () => {
  const baseLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'slime',
    enemySceneType: 'candy',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'candyKnightSVG',
  });
  const candyKnightLayout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'water',
    enemyId: 'candy_knight',
    enemySceneType: 'candy',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwater1SVG',
    enemySpriteKey: 'candyKnightSVG',
  });

  assert.ok(candyKnightLayout.enemySize > baseLayout.enemySize);
});

test('dark dragon phase-2 sprite never renders smaller than phase-1', () => {
  const phase1Desktop = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss',
    enemySceneType: 'dark',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'darkLordSVG',
  });
  const phase2Desktop = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss',
    enemySceneType: 'dark',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'bossDarkPhase2SVG',
  });
  const phase1Mobile = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss',
    enemySceneType: 'dark',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'darkLordSVG',
  });
  const phase2Mobile = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss',
    enemySceneType: 'dark',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'bossDarkPhase2SVG',
  });

  assert.ok(phase2Desktop.enemySize >= phase1Desktop.enemySize);
  assert.ok(phase2Mobile.enemySize >= phase1Mobile.enemySize);
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
  assert.equal(compactCrazyDragon.enemyMainRightPct, 4);
});

test('sword god shifts right and renders larger in battle', () => {
  const compactSwordGod = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss_sword_god',
    enemySceneType: 'heaven',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'bossSwordGodSVG',
  });
  const desktopSwordGod = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 1,
    playerStarterId: 'fire',
    enemyId: 'boss_sword_god',
    enemySceneType: 'heaven',
    enemyIsEvolved: true,
    playerSpriteKey: 'playerfire1SVG',
    enemySpriteKey: 'bossSwordGodSVG',
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

  assert.equal(compactSwordGod.enemyMainRightPct, 5);
  assert.equal(desktopSwordGod.enemyMainRightPct, 8);
  assert.ok(compactSwordGod.enemyMainRightPct < compactHydra.enemyMainRightPct);
  assert.equal(compactSwordGod.enemySize, 286);
  assert.equal(desktopSwordGod.enemySize, 332);
});

test('crazy dragon gets dedicated size boost on mobile and desktop', () => {
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
  const desktopCrazyDragon = resolveBattleLayout({
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

  assert.ok(compactCrazyDragon.enemySize > compactHydra.enemySize);
  assert.ok(desktopCrazyDragon.enemySize > desktopHydra.enemySize);
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
  // base is 6%, beast shift −4%, tiger lane nudge −0.8% → 1.2%
  assert.equal(tigerSingle.playerMainLeftPct, 1.2);
});

test('tiger player is nudged lower-left in single battle lane', () => {
  const tigerSingle = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 2,
    playerStarterId: 'tiger',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playertiger2SVG',
    enemySpriteKey: 'slimeSVG',
  });
  const fireSingle = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: false,
    playerStageIdx: 2,
    playerStarterId: 'fire',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerfire2SVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.ok(Math.abs(tigerSingle.playerMainLeftPct - 0.2) < 1e-9);
  assert.equal(tigerSingle.playerMainBottomPct, 11.8);
  assert.ok(tigerSingle.playerMainLeftPct < fireSingle.playerMainLeftPct);
  assert.ok(tigerSingle.playerMainBottomPct < fireSingle.playerMainBottomPct);
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

test('compact single ghost lantern is pulled farther right on mobile', () => {
  const compactGhostSingle = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 0,
    playerStarterId: 'fire',
    enemyId: 'ghost_lantern',
    enemySceneType: 'ghost',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerfire0SVG',
    enemySpriteKey: 'ghostLanternSVG',
  });
  const compactSlimeSingle = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 0,
    playerStarterId: 'fire',
    enemyId: 'slime',
    enemySceneType: 'grass',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerfire0SVG',
    enemySpriteKey: 'slimeSVG',
  });

  assert.ok(compactGhostSingle.enemyMainRightPct < compactSlimeSingle.enemyMainRightPct);
  assert.equal(compactGhostSingle.enemyMainRightPct, 5);
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
    phone: { pm: [-5.85, 169.93], ps: [97.5, 171.95], em: [230.72, 378.3], es: [265.39, 327.6], pMainPct: -1.5, pSubPct: 25, eMainPct: 3, eSubPct: 16 },
    tablet: { pm: [0, 193.03], ps: [203.52, 291.2], em: [528.08, 706.56], es: [541.44, 614.4], pMainPct: 0, pSubPct: 26.5, eMainPct: 8, eSubPct: 20 },
    laptop: { pm: [0, 199], ps: [361.99, 455.27], em: [1072.72, 1256.72], es: [1016, 1092.8], pMainPct: 0, pSubPct: 26.5, eMainPct: 8, eSubPct: 20 },
  },
  coopSub: {
    phone: { pm: [10.53, 112.48], ps: [-5.85, 90.59], em: [230.72, 378.3], es: [265.39, 327.6], pMainPct: 2.7, pSubPct: -1.5, eMainPct: 3, eSubPct: 16 },
    tablet: { pm: [41.47, 172.73], ps: [0, 107.61], em: [528.08, 706.56], es: [541.44, 614.4], pMainPct: 5.4, pSubPct: 0, eMainPct: 8, eSubPct: 20 },
    laptop: { pm: [73.76, 209.08], ps: [0, 114.48], em: [1072.72, 1256.72], es: [1016, 1092.8], pMainPct: 5.4, pSubPct: 0, eMainPct: 8, eSubPct: 20 },
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
    if (device.name === 'phone') {
      assert.ok(
        swappedRects.playerMainLeftPct <= 10,
        `phone swapped inactive main drifted too far forward: left=${swappedRects.playerMainLeftPct}%`,
      );
    }
  }
});

test('wide beast starters keep separated swap lanes in compact co-op', () => {
  for (const starterId of ['wolf', 'tiger', 'lion']) {
    const layout = resolveBattleLayout({
      battleMode: 'coop',
      hasDualUnits: true,
      compactUI: true,
      playerStageIdx: 0,
      playerStarterId: starterId,
      subStarterId: 'electric',
      enemyId: 'colorful_butterfly',
      enemySceneType: 'grass',
      enemyIsEvolved: false,
      playerSpriteKey: `player${starterId}0SVG`,
      subSpriteKey: 'playerelectric0SVG',
      enemySpriteKey: 'colorfulButterflySVG',
    });

    const swappedRects = resolveBattleRects({
      layout,
      arenaWidth: 390,
      showAllySub: true,
      coopUsingSub: true,
      enemySubId: 'slime',
      enemySubIsEvolved: false,
    });

    assert.ok(
      swappedRects.playerMainLeftPct >= 2.2 && swappedRects.playerMainLeftPct <= 5.8,
      `${starterId} swapped inactive main left lane out of safe range: ${swappedRects.playerMainLeftPct}%`,
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

test('fallback targets stay inside battle viewport bounds', () => {
  const layout = resolveBattleLayout({
    battleMode: 'single',
    hasDualUnits: false,
    compactUI: true,
    playerStageIdx: 2,
    playerStarterId: 'wolf',
    enemyId: 'ghost_lantern',
    enemySceneType: 'ghost',
    enemyIsEvolved: false,
    playerSpriteKey: 'playerwolf2SVG',
    enemySpriteKey: 'ghostLanternSVG',
  });
  const laneSnapshot = buildLaneSnapshot({
    layout,
    arenaWidth: BATTLE_ARENA_VIEWPORT.width,
    showAllySub: false,
    showEnemySub: false,
    coopUsingSub: false,
    isCoopBattle: false,
    enemySubId: '',
    enemySubIsEvolved: false,
  });
  const targets = resolveBattleFallbackTargets(laneSnapshot);
  const allTargets = [targets.enemyMain, targets.playerMain, targets.playerSub];
  for (const target of allTargets) {
    assert.ok(
      target.cx >= 0 && target.cx <= BATTLE_ARENA_VIEWPORT.width,
      `target cx out of bounds: ${target.cx}`,
    );
    assert.ok(
      target.cy >= 0 && target.cy <= BATTLE_ARENA_VIEWPORT.height,
      `target cy out of bounds: ${target.cy}`,
    );
  }
});

test('fallback targets follow coop slot swap geometry', () => {
  const layout = resolveBattleLayout({
    battleMode: 'coop',
    hasDualUnits: true,
    compactUI: true,
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
  const beforeSwap = resolveBattleFallbackTargets(buildLaneSnapshot({
    layout,
    arenaWidth: BATTLE_ARENA_VIEWPORT.width,
    showAllySub: true,
    showEnemySub: true,
    coopUsingSub: false,
    isCoopBattle: true,
    enemySubId: 'slime',
    enemySubIsEvolved: false,
  }));
  const afterSwap = resolveBattleFallbackTargets(buildLaneSnapshot({
    layout,
    arenaWidth: BATTLE_ARENA_VIEWPORT.width,
    showAllySub: true,
    showEnemySub: true,
    coopUsingSub: true,
    isCoopBattle: true,
    enemySubId: 'slime',
    enemySubIsEvolved: false,
  }));

  assert.ok(
    Math.abs(afterSwap.playerMain.cx - beforeSwap.playerMain.cx) < 0.001,
    `main slot target should stay stable across swap: ${beforeSwap.playerMain.cx} -> ${afterSwap.playerMain.cx}`,
  );
  assert.ok(
    afterSwap.playerSub.cx < beforeSwap.playerSub.cx,
    `sub slot target should move left after swap: ${beforeSwap.playerSub.cx} -> ${afterSwap.playerSub.cx}`,
  );
  assert.ok(
    afterSwap.playerSub.cx < afterSwap.playerMain.cx,
    `after swap, active sub target should be left of main target: sub=${afterSwap.playerSub.cx}, main=${afterSwap.playerMain.cx}`,
  );
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
