import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BATTLE_ARENA_VIEWPORT,
  resolveBattleFallbackTargets,
  resolveBattleLaneSnapshot,
  resolveBattleLayout,
  resolveBattleSpritePlacement,
  resolveBattleFormation,
  BATTLE_ARENA_HEIGHT_SHARE,
  getBossFrameRequest,
  getEnemyFrameRequest,
} from './battleLayout.ts';
import { BOSS_IDS } from '../data/monsterConfigs.ts';
import { GUARDIAN_ENCOUNTERS } from '../data/guardianEncounters.ts';
import { MONSTER_CONFIGS } from '../data/monsterConfigs.ts';
import { STARTERS } from '../data/starters.ts';
import { MONSTERS } from '../data/monsters.ts';
import { getCompensation } from '../data/spriteProfiles.ts';
import { buildBattleStaticCore } from '../components/screens/battle/buildBattleCore.ts';

const overlaps = (a, b) => a.left < b.right - 0.01 && a.right > b.left + 0.01
  && a.top < b.bottom - 0.01 && a.bottom > b.top + 0.01;

test('wing knights request another 15% gain over the previous 1.15 scale, including reserve frames', () => {
  for (const id of ['limit_knight', 'topology_knight', 'algebra_knight']) {
    for (const frameWidth of [60, 140, 220]) {
      assert.equal(getEnemyFrameRequest(id, frameWidth), frameWidth * 1.32);
      assert.ok(getEnemyFrameRequest(id, frameWidth) / (frameWidth * 1.15) > 1.14);
    }
  }
  for (const id of ['candy_knight', 'slime', ...BOSS_IDS, '', undefined]) {
    assert.equal(getEnemyFrameRequest(id, 140), undefined);
  }
});

const FRONTIER_IDS = ['venom_mantis', 'mire_toad', 'night_bat', 'chain_wraith', 'thunder_raptor', 'crystal_crab', 'dream_weaver'];

test('new monster requests account for body shape without changing older monsters or bosses', () => {
  for (const id of [...FRONTIER_IDS, 'blue_butterfly']) {
    for (const width of [60, 120, 220]) {
      const requested = getEnemyFrameRequest(id, width);
      assert.ok(requested >= width * 1.18 && requested <= width * 1.5);
      assert.equal(getEnemyFrameRequest(`pvp_${id}`, width), requested);
    }
  }
  assert.ok(getEnemyFrameRequest('crystal_crab', 120) > getEnemyFrameRequest('venom_mantis', 120));
});

test('larger wing knights still clear HUDs, companions and screen edges in phone and desktop lanes', () => {
  for (const id of ['limit_knight', 'topology_knight', 'algebra_knight']) {
    for (const [width, rootHeight] of [[320, 568], [390, 844], [720, 844], [1280, 720]]) {
      for (const dual of [false, true]) {
        const arena = { width, rootHeight, height: rootHeight * BATTLE_ARENA_HEIGHT_SHARE,
          enemyHudRight: width * .54, enemyHudBottom: dual ? 158 : 105,
          playerHudLeft: width * .46, playerHudInset: dual ? 110 : 80 };
        const huds = [{ left: 0, top: 0, right: arena.enemyHudRight, bottom: arena.enemyHudBottom },
          { left: arena.playerHudLeft, top: arena.height - arena.playerHudInset, right: width, bottom: arena.height }];
        const occupied = [];
        const frames = [['enemy', Math.min(width * .36, 190), width * .75, arena.height * .4]];
        if (dual) frames.push(['enemy', Math.min(width * .18, 110), width * .77, arena.height * .18]);
        frames.push(['player', Math.min(width * .4, 180), width * .25, arena.height * .72]);
        if (dual) frames.push(['player', Math.min(width * .24, 100), width * .42, arena.height * .6]);
        for (const [side, frameWidth, desiredCenterX, desiredCenterY] of frames) {
          const placement = resolveBattleSpritePlacement({ arena, side, frameWidth, compensation: side === 'enemy' ? 1.2626 : 1,
            minFrameWidth: side === 'enemy' ? getEnemyFrameRequest(id, frameWidth) : undefined,
            desiredCenterX, desiredCenterY, avoid: occupied });
          assert.ok(placement.width > 0 && Number.isFinite(placement.scale));
          assert.ok(placement.bounds.left >= 0 && placement.bounds.right <= width);
          assert.ok(placement.bounds.top >= 0 && placement.bounds.bottom <= arena.height);
          for (const rect of [...huds, ...occupied]) assert.equal(overlaps(placement.bounds, rect), false);
          occupied.push(placement.bounds);
        }
      }
    }
  }
});

test('new guardian envelopes clear both HUDs on narrow phones and desktops', () => {
  for (const id of Object.keys(GUARDIAN_ENCOUNTERS)) {
    const monster = MONSTER_CONFIGS.find(entry => entry.id === id);
    for (const [width, rootHeight] of [[320, 568], [390, 844], [1280, 720]]) {
      const layout = resolveBattleLayout({ battleMode: 'single', hasDualUnits: false, compactUI: width < 500,
        playerStageIdx: 0, playerStarterId: 'fire', enemyId: id, enemySceneType: monster.mType,
        enemyIsEvolved: false, playerSpriteKey: 'playerfire0SVG', enemySpriteKey: monster.spriteKey });
      const arena = { width, rootHeight, height: rootHeight * BATTLE_ARENA_HEIGHT_SHARE,
        enemyHudRight: width * .56, enemyHudBottom: 90, playerHudLeft: width * .46, playerHudInset: 90 };
      const placed = resolveBattleSpritePlacement({ arena, side: 'enemy', frameWidth: layout.enemySize,
        compensation: layout.enemyComp, desiredCenterX: width * .75, desiredCenterY: arena.height * .35 });
      assert.ok(placed.bounds.left >= 0 && placed.bounds.right <= width);
      assert.ok(placed.bounds.top >= 0 && placed.bounds.bottom <= arena.height);
      assert.equal(overlaps(placed.bounds, { left: 0, top: 0, right: arena.enemyHudRight, bottom: 90 }), false);
      assert.equal(overlaps(placed.bounds, { left: arena.playerHudLeft, top: arena.height - 90, right: width, bottom: arena.height }), false);
    }
  }
});

test('boss presence requests exceed the old phone lane budget but remain capped', () => {
  assert.ok(getBossFrameRequest(390) > 260);
  assert.ok(getBossFrameRequest(390, false, true) > 240);
  assert.ok(getBossFrameRequest(390, true) > 140);
  assert.equal(getBossFrameRequest(1280), 380);
  assert.equal(getBossFrameRequest(1280, true), 200);
  for (const [width, height] of [[320, 312], [390, 464], [844, 214]]) {
    const arena = { width, height, rootHeight: height / .55,
      enemyHudRight: width * .52, enemyHudBottom: 110, playerHudLeft: width * .48, playerHudInset: 90 };
    const placed = resolveBattleSpritePlacement({ arena, side: 'enemy', frameWidth: 160,
      minFrameWidth: getBossFrameRequest(width), compensation: 1, desiredCenterX: width * .75, desiredCenterY: height * .35 });
    assert.equal(overlaps(placed.bounds, { left: 0, top: 0, right: arena.enemyHudRight, bottom: 110 }), false);
    assert.equal(overlaps(placed.bounds, { left: arena.playerHudLeft, top: height - 90, right: width, bottom: height }), false);
  }
});

test('reserve readability enlarges a tiny lane frame while preserving CSS scale and clearance', () => {
  const arena = { width: 390, height: 464, rootHeight: 844,
    enemyHudRight: 203, enemyHudBottom: 109, playerHudLeft: 187, playerHudInset: 96 };
  const avoid = [{ left: 178, top: 114, right: 376, bottom: 280 },
    { left: 14, top: 307, right: 173, bottom: 448 }];
  const placed = resolveBattleSpritePlacement({ arena, side: 'player', frameWidth: 50, minFrameWidth: 76,
    compensation: 1, desiredCenterX: 122, desiredCenterY: 286, avoid });
  assert.equal(placed.width, 76);
  assert.equal(placed.scale, 76 / 50, 'render scale includes the readability request exactly once');
  assert.equal(placed.height, placed.width * 100 / 120);
  for (const other of [...avoid, { left: 0, top: 0, right: 203, bottom: 109 },
    { left: 187, top: 368, right: 390, bottom: 464 }]) assert.equal(overlaps(placed.bounds, other), false);
});

test('reserve minimum is a request, not permission to cover HUDs on short phones', () => {
  const arena = { width: 320, height: 312, rootHeight: 568,
    enemyHudRight: 190, enemyHudBottom: 130, playerHudLeft: 145, playerHudInset: 110 };
  const placed = resolveBattleSpritePlacement({ arena, side: 'player', frameWidth: 50, minFrameWidth: 240,
    compensation: 1, desiredCenterX: 80, desiredCenterY: 260 });
  assert.ok(placed.width < 240);
  assert.equal(placed.width, 50 * placed.scale);
  assert.equal(overlaps(placed.bounds, { left: 0, top: 0, right: 190, bottom: 130 }), false);
  assert.equal(overlaps(placed.bounds, { left: 145, top: 202, right: 320, bottom: 312 }), false);
});

test('short landscape uses the full-height corridor between narrow HUDs', () => {
  const arena = { width: 844, height: 214.5, rootHeight: 390,
    enemyHudRight: 270, enemyHudBottom: 105, playerHudLeft: 574, playerHudInset: 90 };
  const placed = resolveBattleSpritePlacement({ arena, side: 'enemy', frameWidth: 170,
    compensation: 1, desiredCenterX: 635, desiredCenterY: 95 });
  assert.equal(placed.width, 170, 'do not shrink into the thin band above the player HUD');
  assert.ok(placed.bounds.left >= 284 && placed.bounds.right <= 560);
  assert.equal(overlaps(placed.bounds, { left: 0, top: 0, right: 270, bottom: 105 }), false);
  assert.equal(overlaps(placed.bounds, { left: 574, top: 124.5, right: 844, bottom: 214.5 }), false);
});

test('568x320 compact landscape keeps all four actors clear of HUDs and one another', () => {
  const arena = { width: 568, height: 176, rootHeight: 320,
    enemyHudRight: 182, enemyHudBottom: 100, playerHudLeft: 386, playerHudInset: 76 };
  const occupied = [];
  const huds = [{ left: 0, top: 0, right: 182, bottom: 100 },
    { left: 386, top: 100, right: 568, bottom: 176 }];
  for (const [side, frameWidth, compensation, desiredCenterX, desiredCenterY] of [
    ['enemy', 240, 1.66, 430, 65], ['enemy', 100, 1.66, 430, 30],
    ['player', 130, 1, 80, 145], ['player', 126, 1.66, 125, 145],
  ]) {
    const placed = resolveBattleSpritePlacement({ arena, side, frameWidth, compensation,
      desiredCenterX, desiredCenterY, avoid: occupied });
    assert.ok(placed.width >= 40, `${side} must not collapse into a few pixels`);
    assert.ok(placed.bounds.left >= 0 && placed.bounds.right <= arena.width);
    assert.ok(placed.bounds.top >= 0 && placed.bounds.bottom <= arena.height);
    for (const other of [...huds, ...occupied]) assert.equal(overlaps(placed.bounds, other), false);
    occupied.push(placed.bounds);
  }
});

for (const [width, rootHeight] of [[320, 568], [390, 844], [768, 1024], [1280, 720]]) {
  for (const dual of [false, true]) {
    test(`${width}x${rootHeight} ${dual ? 'dual' : 'solo'} sprites and lunges clear both HUDs and the panel`, () => {
      const arena = {
        width, rootHeight, height: rootHeight * BATTLE_ARENA_HEIGHT_SHARE,
        enemyHudRight: width * 0.56, enemyHudBottom: dual ? 110 : 70,
        playerHudLeft: width * 0.46, playerHudInset: dual ? 110 : 65,
      };
      const enemyHud = { left: 0, top: 0, right: arena.enemyHudRight, bottom: arena.enemyHudBottom };
      const playerHud = { left: arena.playerHudLeft, top: arena.height - arena.playerHudInset, right: width, bottom: arena.height };
      for (const side of ['enemy', 'player']) {
        for (const frameWidth of [88, 156, 350, 650]) {
          for (const compensation of [1, 1.66]) {
            const input = { arena, side, frameWidth, compensation,
              desiredCenterX: width * (side === 'enemy' ? 0.75 : 0.25),
              desiredCenterY: arena.height * (side === 'enemy' ? 0.35 : 0.75) };
            const placed = resolveBattleSpritePlacement(input);
            assert.ok(placed.scale > 0 && placed.scale <= 1);
            assert.deepEqual(resolveBattleSpritePlacement(input), placed, 'rendering another phase cannot change placement');
            for (const [dx, dy] of [[0, 0], [placed.lungeX * 0.46, placed.lungeY * 0.46],
              [placed.lungeX, placed.lungeY], [placed.dodgeX, placed.dodgeY]]) {
              const bounds = { left: placed.bounds.left + dx, right: placed.bounds.right + dx,
                top: placed.bounds.top + dy, bottom: placed.bounds.bottom + dy };
              assert.ok(bounds.left >= 0 && bounds.right <= width + 0.01);
              assert.ok(bounds.top >= 0 && bounds.bottom <= arena.height + 0.01);
              assert.equal(overlaps(bounds, enemyHud), false, `enemy HUD: ${side} ${frameWidth}`);
              assert.equal(overlaps(bounds, playerHud), false, `player HUD: ${side} ${frameWidth}`);
            }
          }
        }
      }
    });
    test(`${width}x${rootHeight} ${dual ? 'dual' : 'solo'} large units do not hide one another`, () => {
      const arena = {
        width, rootHeight, height: rootHeight * BATTLE_ARENA_HEIGHT_SHARE,
        enemyHudRight: width * 0.56, enemyHudBottom: dual ? 160 : 84,
        playerHudLeft: width * 0.46, playerHudInset: dual ? 96 : 68,
      };
      const occupied = [];
      for (const side of dual ? ['enemy', 'enemy', 'player', 'player'] : ['enemy', 'player']) {
        const placed = resolveBattleSpritePlacement({ arena, side, frameWidth: 500, compensation: 1.66,
          desiredCenterX: width * (side === 'enemy' ? 0.75 : 0.25),
          desiredCenterY: arena.height * (side === 'enemy' ? 0.35 : 0.75), avoid: occupied });
        assert.ok(placed.scale > 0 && placed.scale <= 1);
        for (const previous of occupied) {
          assert.equal(overlaps(placed.bounds, previous), false, `${side} must have its own visible space`);
        }
        assert.equal(overlaps(placed.bounds, { left: 0, top: 0, right: arena.enemyHudRight, bottom: arena.enemyHudBottom }), false);
        assert.equal(overlaps(placed.bounds, { left: arena.playerHudLeft, top: arena.height - arena.playerHudInset, right: width, bottom: arena.height }), false);
        occupied.push(placed.bounds);
      }
    });
  }
}

test('safe placement retains size when it fits and never enlarges a smaller sprite', () => {
  const arena = { width: 1280, height: 550, rootHeight: 1000, enemyHudRight: 600, enemyHudBottom: 80, playerHudLeft: 680, playerHudInset: 80 };
  const placed = resolveBattleSpritePlacement({ arena, side: 'enemy', frameWidth: 160, compensation: 1,
    desiredCenterX: 900, desiredCenterY: 240 });
  assert.equal(placed.scale, 1);
  assert.equal(placed.width, 160);
  assert.equal(placed.cx, 900);
  assert.equal(placed.cy, 240);
});

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
  isBossEnemy = false,
  starterSubRoleSize = layout.mainPlayerSize,
  allyMainRoleSize = layout.subPlayerSize,
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
    starterSubRoleSize,
    allyMainRoleSize,
    enemyMainRightPct: layout.enemyMainRightPct,
    enemySubRightPct: layout.enemySubRightPct,
    enemyTopPct: layout.enemyTopPct,
    enemySubTopPct: layout.enemySubTopPct,
    enemySize: layout.enemySize,
    enemySubId: resolvedEnemySubId,
    enemySubIsBossVisual: BOSS_IDS.has(resolvedEnemySubId),
    enemySubIsEvolved,
    isBossEnemy,
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
  // 285 × 1.13 × 1.087 ≈ 350
  assert.equal(pvpBoss.enemySize, 350);
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
  assert.equal(compactSwordGod.enemySize, 323);
  assert.equal(desktopSwordGod.enemySize, 350);
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
    phone: { pm: [-5.85, 169.93], ps: [97.5, 177.49], em: [230.72, 378.3], es: [265.39, 327.6], pMainPct: -1.5, pSubPct: 25, eMainPct: 3, eSubPct: 16 },
    tablet: { pm: [0, 193.03], ps: [203.52, 294.51], em: [528.08, 706.56], es: [541.44, 614.4], pMainPct: 0, pSubPct: 26.5, eMainPct: 8, eSubPct: 20 },
    laptop: { pm: [0, 199], ps: [361.99, 458.79], em: [1072.72, 1256.72], es: [1016, 1092.8], pMainPct: 0, pSubPct: 26.5, eMainPct: 8, eSubPct: 20 },
  },
  coopSub: {
    phone: { pm: [10.53, 112.48], ps: [-5.85, 97.78], em: [230.72, 378.3], es: [265.39, 327.6], pMainPct: 2.7, pSubPct: -1.5, eMainPct: 3, eSubPct: 16 },
    tablet: { pm: [41.47, 172.73], ps: [0, 111.67], em: [528.08, 706.56], es: [541.44, 614.4], pMainPct: 5.4, pSubPct: 0, eMainPct: 8, eSubPct: 20 },
    laptop: { pm: [73.76, 209.08], ps: [0, 118.8], em: [1072.72, 1256.72], es: [1016, 1092.8], pMainPct: 5.4, pSubPct: 0, eMainPct: 8, eSubPct: 20 },
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

test('beast starter stages render progressively larger on phone single mode', () => {
  const phoneArenaWidth = 390;
  const starters = [
    { id: 'wolf', spritePrefix: 'playerwolf' },
    { id: 'tiger', spritePrefix: 'playertiger' },
    { id: 'lion', spritePrefix: 'playerlion' },
  ];
  for (const starter of starters) {
    const sizes = [];
    for (let stage = 0; stage <= 2; stage++) {
      const layout = resolveBattleLayout({
        battleMode: 'single',
        hasDualUnits: false,
        compactUI: true,
        playerStageIdx: stage,
        playerStarterId: starter.id,
        enemyId: 'slime',
        enemySceneType: 'grass',
        enemyIsEvolved: false,
        playerSpriteKey: `${starter.spritePrefix}${stage}SVG`,
        enemySpriteKey: 'slimeSVG',
      });
      const snap = buildLaneSnapshot({
        layout,
        arenaWidth: phoneArenaWidth,
        showAllySub: false,
        showEnemySub: false,
        coopUsingSub: false,
        isCoopBattle: false,
        enemySubId: '',
        enemySubIsEvolved: false,
      });
      sizes.push(snap.playerMainWidthPx);
    }
    assert.ok(
      sizes[0] < sizes[1],
      `${starter.id} stage0 (${sizes[0].toFixed(1)}) should be smaller than stage1 (${sizes[1].toFixed(1)})`,
    );
    assert.ok(
      sizes[1] < sizes[2],
      `${starter.id} stage1 (${sizes[1].toFixed(1)}) should be smaller than stage2 (${sizes[2].toFixed(1)})`,
    );
  }
});

test('phone ally lane sizes no longer depend on whether the opponent is a boss', () => {
  for (const width of [320, 390, 430]) for (const starter of STARTERS) for (const stage of [0, 1, 2]) {
    for (const coop of [false, true]) for (const swap of [false, true]) {
      const layout = resolveBattleLayout({ battleMode: coop ? 'coop' : 'single', hasDualUnits: coop,
        compactUI: true, playerStageIdx: stage, playerStarterId: starter.id,
        playerSpriteKey: `player${starter.id}${stage}SVG`, subStarterId: 'fire', subSpriteKey: 'playerfire2SVG',
        enemyId: 'boss', enemySpriteKey: 'darkLordSVG' });
      const options = { layout, arenaWidth: width, showAllySub: coop, showEnemySub: coop,
        coopUsingSub: swap, isCoopBattle: coop, enemySubId: coop ? 'limit_knight' : '' };
      const normal = buildLaneSnapshot({ ...options, isBossEnemy: false });
      const boss = buildLaneSnapshot({ ...options, isBossEnemy: true });
      assert.equal(boss.playerMainWidthPx, normal.playerMainWidthPx);
      assert.equal(boss.playerSubWidthPx, normal.playerSubWidthPx);
    }
  }
});

test('formation negotiation restores player readability instead of letting a tall boss take the entire stage', () => {
  const arena = { width: 390, height: 464, rootHeight: 844, enemyHudRight: 211,
    enemyHudBottom: 65, playerHudLeft: 179, playerHudInset: 53 };
  const enemyInput = { arena, side: 'enemy', frameWidth: 164, minFrameWidth: getBossFrameRequest(390),
    compensation: 1.1, desiredCenterX: 280, desiredCenterY: 135 };
  const playerInput = { arena, side: 'player', frameWidth: 260,
    compensation: 1.7, desiredCenterX: 140, desiredCenterY: 322 };
  const greedyEnemy = resolveBattleSpritePlacement(enemyInput);
  const greedyPlayer = resolveBattleSpritePlacement({ ...playerInput, avoid: [greedyEnemy.bounds] });
  const placed = resolveBattleFormation(enemyInput, playerInput);
  assert.ok(placed.player.width > greedyPlayer.width * 1.2);
  assert.ok(placed.enemy.width >= greedyEnemy.width * .7 - .01);
  assert.equal(overlaps(placed.player.bounds, placed.enemy.bounds), false);
  assert.ok(Math.abs(placed.enemy.width - enemyInput.frameWidth * placed.enemy.scale) < 1e-8, 'CSS does not apply enlargement twice');
  assert.deepEqual(resolveBattleFormation(enemyInput, playerInput), placed, 'attack/hit rerenders do not alter placement');
});

function formationFixture({ width, rootHeight, starter, stage, enemyId, dual, swap, phase2, readability = true }) {
  const monster = MONSTERS.find(m => m.id === enemyId);
  const enemy = { ...monster, lvl: 13, maxHp: 200 };
  const reserve = { ...MONSTERS.find(m => m.id === 'limit_knight'), lvl: 13, maxHp: 100 };
  const core = buildBattleStaticCore({ compactUI: width <= 520, scenes: { grass: {} }, state: {
    starter, enemy, pLvl: 13, pStg: stage, battleMode: dual ? 'coop' : 'single',
    enemySub: dual ? reserve : null, eHp: phase2 ? 60 : 200, eHpSub: 100,
    bossPhase: phase2 ? 2 : 1, allySub: dual ? { ...STARTERS[1], selectedStageIdx: 2 } : null,
    pHpSub: 100, coopActiveSlot: swap ? 'sub' : 'main', pvpTurn: 'p1', pvpStarter2: null,
  } });
  const { layout } = core;
  const snapshot = buildLaneSnapshot({ layout, arenaWidth: width, showAllySub: dual, showEnemySub: dual,
    coopUsingSub: dual && swap, isCoopBattle: dual, enemySubId: dual ? reserve.id : '',
    enemySubIsEvolved: false, isBossEnemy: BOSS_IDS.has(enemyId),
    starterSubRoleSize: core.starterSubRoleSize, allyMainRoleSize: core.allyMainRoleSize });
  const landscape = width > rootHeight;
  const arena = { width, rootHeight, height: rootHeight * .55,
    enemyHudRight: width * (landscape ? .32 : .54), enemyHudBottom: dual ? (landscape ? 100 : 126) : 65,
    playerHudLeft: width * (landscape ? .68 : .46), playerHudInset: dual ? (landscape ? 76 : 88) : 53 };
  const deviceScale = Math.round(Math.max(.9, Math.min(1.16, width / 430)) / .02) * .02;
  const input = (side, frameWidth, compensation, x, y, minFrameWidth) => ({ arena, side, frameWidth, compensation, minFrameWidth,
    desiredCenterX: side === 'enemy' ? width * (1 - x / 100) - frameWidth / 2 : width * x / 100 + frameWidth / 2,
    desiredCenterY: side === 'enemy' ? arena.height * y / 100 + frameWidth * 100 / 240 : arena.height * (1 - y / 100) - frameWidth * 100 / 240 });
  const enemyWidth = snapshot.enemyMainWidthPx * deviceScale;
  const enemyInput = input('enemy', enemyWidth, layout.enemyComp, snapshot.enemyMainRightPct, snapshot.enemyTopPct,
    BOSS_IDS.has(enemyId) ? getBossFrameRequest(width, false, dual) : readability ? getEnemyFrameRequest(enemyId, enemyWidth) : undefined);
  const reserveWidth = comp => Math.min(width * .34, 76 * Math.max(1, comp));
  const mainDim = dual && swap ? (layout.playerComp > 1.3 ? (layout.compactDual ? .58 : .68) : .84) : 1;
  const subDim = dual && !swap ? (layout.subComp > 1.3 ? (layout.compactDual ? .82 : .88) : .88) : 1;
  const main = input('player', snapshot.playerMainWidthPx * deviceScale * mainDim, layout.playerComp,
    snapshot.playerMainLeftPct, snapshot.playerMainBottomPct, dual && swap ? reserveWidth(layout.playerComp) : undefined);
  const sub = input('player', snapshot.playerSubWidthPx * deviceScale * subDim, layout.subComp,
    snapshot.playerSubLeftPct, snapshot.playerSubBottomPct, dual && !swap ? reserveWidth(layout.subComp) : undefined);
  const enemySubWidth = snapshot.enemySubWidthPx * deviceScale;
  const formation = resolveBattleFormation(enemyInput, dual && swap ? sub : main, {
    enemy: dual ? input('enemy', enemySubWidth, getCompensation(reserve.spriteKey), snapshot.enemySubRightPct,
      snapshot.enemySubTopPct, getEnemyFrameRequest(reserve.id, enemySubWidth)) : undefined,
    player: dual ? (swap ? main : sub) : undefined,
  });
  return { formation, arena };
}

test('new monster enlargement survives the complete phone and desktop formation solver', () => {
  for (const [width, rootHeight] of [[390, 844], [1280, 720]]) {
    for (const enemyId of FRONTIER_IDS) for (const id of ['wolf', 'fire']) {
      const args = { width, rootHeight, starter: STARTERS.find(s => s.id === id), stage: 2, enemyId,
        dual: false, swap: false, phase2: false };
      const before = formationFixture({ ...args, readability: false }).formation;
      const after = formationFixture(args).formation;
      assert.ok(after.enemy.width > before.enemy.width * 1.12, `${width}/${enemyId}/${id}: enlargement cancelled by lane caps`);
      assert.ok(after.player.width >= before.player.width * .7, `${width}/${enemyId}/${id}: player readability lost`);
    }
  }
});

for (const [width, rootHeight] of [[320, 568], [390, 844], [430, 932], [768, 1024], [1280, 720], [667, 375]]) {
  test(`${width}x${rootHeight} boss/knight/frontier formations preserve actor and HUD clearance through phases and co-op swaps`, () => {
    for (const enemyId of [...BOSS_IDS, 'limit_knight', 'topology_knight', 'algebra_knight', 'blue_butterfly', ...FRONTIER_IDS]) {
      for (const starter of STARTERS) for (const stage of [0, 1, 2]) {
        for (const [dual, swap] of [[false, false], [true, false], [true, true]]) for (const phase2 of [false, true]) {
          const { formation, arena } = formationFixture({ width, rootHeight, starter, stage, enemyId, dual, swap, phase2 });
          const occupied = [
            { left: 0, top: 0, right: arena.enemyHudRight, bottom: arena.enemyHudBottom },
            { left: arena.playerHudLeft, top: arena.height - arena.playerHudInset, right: width, bottom: arena.height },
          ];
          for (const [role, placed] of Object.entries(formation)) {
            if (!placed) continue;
            const label = `${enemyId} ${starter.id}:${stage} ${dual}/${swap}/${phase2} ${role}`;
            assert.ok(Number.isFinite(placed.scale) && placed.width >= 24, `${label}: collapsed`);
            assert.ok(placed.bounds.left >= -.01 && placed.bounds.right <= width + .01, `${label}: horizontal clipping`);
            assert.ok(placed.bounds.top >= -.01 && placed.bounds.bottom <= arena.height + .01, `${label}: vertical clipping`);
            for (const other of occupied) assert.equal(overlaps(placed.bounds, other), false, `${label}: overlap`);
            occupied.push(placed.bounds);
          }
        }
      }
    }
  });
}
