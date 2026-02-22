import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useSpriteTargets } from '../../hooks/useSpriteTargets';
import { useBattleParallax } from '../../hooks/useBattleParallax';
import { useBattleArenaScale } from '../../hooks/useBattleArenaScale.ts';
import { SCENES } from '../../data/scenes';
import { BG_IMGS_LOW } from '../../data/sprites.ts';
import { PVP_BALANCE } from '../../data/pvpBalance';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import TextBox from '../ui/TextBox';
import type {
  ScreenName,
  UseBattleActions,
  UseBattleState,
  UseBattleView,
  UseMobileExperienceApi,
} from '../../types/battle';
import { buildBattleRuntimeCore, buildBattleStaticCore } from './battle/buildBattleCore.ts';
import { useAttackImpactPhase } from './battle/useAttackImpactPhase.ts';
import { BattleMoveMenu } from './battle/BattleMoveMenu.tsx';
import { BattleQuestionPanel } from './battle/BattleQuestionPanel.tsx';
import { BattleEnemyInfoPanel, BattlePlayerInfoPanel } from './battle/BattleInfoPanels.tsx';
import { BattleStatusOverlay } from './battle/BattleStatusOverlay.tsx';
import { BattleFxLayer } from './battle/BattleFxLayer.tsx';
import { BattleArenaSprites } from './battle/BattleArenaSprites.tsx';
import { BattleSceneLayers } from './battle/BattleSceneLayers.tsx';
import { BattleWeatherLayer } from './battle/BattleWeatherLayer.tsx';
import { BossIntroOverlay } from './battle/BossIntroOverlay.tsx';
import { BossVictoryOverlay } from './battle/BossVictoryOverlay.tsx';
import { updateBattleFxTargets, resetBattleFxTargets } from '../../hooks/battle/battleFxTargets';
import type { BattleFxTargets } from '../../types/battleFx';
import { DEFAULT_FX_TARGETS } from '../../types/battleFx';
import {
  resolveBattleDeviceTier,
  resolveBattleLaneTuning,
} from '../../utils/battleLayout.ts';
import './BattleScreen.css';
type BattleCssVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

function normalizeBossVisualId(id?: string | null): string {
  if (!id) return '';
  return id.startsWith('pvp_') ? id.slice(4) : id;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type SceneEnemyRef = {
  sceneMType?: string;
  mType?: string;
} | null | undefined;

function resolveSceneKeyFromEnemy(enemy: SceneEnemyRef): string {
  const requestedSceneKey = enemy?.sceneMType || enemy?.mType || 'grass';
  if (Object.prototype.hasOwnProperty.call(SCENES, requestedSceneKey)) return requestedSceneKey;
  if (Object.prototype.hasOwnProperty.call(SCENES, 'grass')) return 'grass';
  const fallbackSceneKey = Object.keys(SCENES)[0];
  return fallbackSceneKey || 'grass';
}

function resolveBattleSceneBg(sceneKey: string, lowPerfMode: boolean): string | null {
  const scene = (SCENES as Record<string, { bgImg?: string } | undefined>)[sceneKey];
  if (!scene?.bgImg) return null;
  const lowBg = Object.prototype.hasOwnProperty.call(BG_IMGS_LOW, sceneKey)
    ? BG_IMGS_LOW[sceneKey as keyof typeof BG_IMGS_LOW]
    : null;
  return lowPerfMode && lowBg ? lowBg : scene.bgImg;
}

type BattleScreenProps = {
  state: UseBattleState;
  actions: UseBattleActions;
  view: UseBattleView;
  mobile: UseMobileExperienceApi;
  onOpenSettings: (fromScreen: ScreenName) => void;
  t: Translator;
};

function BattleScreenComponent({
  state,
  actions,
  view,
  mobile: UX,
  onOpenSettings,
  t,
}: BattleScreenProps) {
  const S = state;
  const A = actions;
  const V = view;

  const showHeavyFx = !UX.lowPerfMode;
  const impactPhase = useAttackImpactPhase({
    atkEffect: S.atkEffect,
    enabled: showHeavyFx,
  });
  const battleRootRef = useRef<HTMLDivElement | null>(null);
  const battleArenaRef = useRef<HTMLDivElement | null>(null);
  const enemySpriteRef = useRef<HTMLDivElement | null>(null);
  const playerSpriteRef = useRef<HTMLDivElement | null>(null);
  const playerSubSpriteRef = useRef<HTMLDivElement | null>(null);
  const [arenaWidth, setArenaWidth] = useState(390);
  const arenaScale = useBattleArenaScale({
    arenaRef: battleArenaRef,
    enabled: S.screen === 'battle',
  });
  const arenaScaleStyle = useMemo(() => ({
    '--battle-device-scale': arenaScale.toFixed(3),
  }) as BattleCssVars, [arenaScale]);
  useBattleParallax({
    hostRef: battleArenaRef,
    // Disable on compact/mobile layout to reduce input/render jitter on lower-end devices.
    enabled: showHeavyFx && !S.gamePaused && !UX.compactUI,
  });
  useLayoutEffect(() => {
    if (S.screen !== 'battle') return;
    const arena = battleArenaRef.current;
    if (!arena) return;

    const sync = () => {
      const width = arena.getBoundingClientRect().width;
      if (!Number.isFinite(width) || width <= 0) return;
      setArenaWidth((prev) => (Math.abs(prev - width) > 1 ? width : prev));
    };
    sync();

    let rafId = 0;
    const scheduleSync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(sync);
    };

    window.addEventListener('resize', scheduleSync);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleSync);
      observer.observe(arena);
    }
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleSync);
      if (observer) observer.disconnect();
    };
  }, [S.screen]);
  const { measuredEnemyTarget, measuredPlayerTarget, measuredPlayerSubTarget } = useSpriteTargets({
    screen: S.screen,
    phase: S.phase,
    enemyId: S.enemy?.id,
    enemyIsEvolved: S.enemy?.isEvolved,
    enemySceneMType: S.enemy?.sceneMType,
    enemyMType: S.enemy?.mType,
    playerStageIdx: S.pStg,
    battleMode: S.battleMode,
    pvpTurn: S.pvpTurn,
    battleRootRef,
    enemySpriteRef,
    playerSpriteRef,
    playerSubSpriteRef,
  });

  const {
    starter: stateStarter,
    enemy: stateEnemy,
    pLvl,
    pStg,
    battleMode,
    enemySub,
    eHp,
    eHpSub,
    bossPhase,
    allySub,
    pHpSub,
    coopActiveSlot,
    pvpTurn,
    pvpStarter2,
  } = S;
  const { getPow, dualEff } = V;

  const coreStatic = useMemo(() => buildBattleStaticCore({
    state: {
      starter: stateStarter,
      enemy: stateEnemy,
      pLvl,
      pStg,
      battleMode,
      enemySub,
      eHp,
      eHpSub,
      bossPhase,
      allySub,
      pHpSub,
      coopActiveSlot,
      pvpTurn,
      pvpStarter2,
    },
    compactUI: UX.compactUI,
    scenes: SCENES,
  }), [
    stateStarter,
    stateEnemy,
    pLvl,
    pStg,
    battleMode,
    enemySub,
    eHp,
    eHpSub,
    bossPhase,
    allySub,
    pHpSub,
    coopActiveSlot,
    pvpTurn,
    pvpStarter2,
    UX.compactUI,
  ]);

  const memoSceneStyles = useMemo(() => {
    if (!coreStatic) return null;
    const { scene, sceneKey, layout } = coreStatic;
    const resolvedBg = resolveBattleSceneBg(sceneKey, UX.lowPerfMode) ?? scene.bgImg;
    const bgStyle: CSSProperties | undefined = resolvedBg
      ? { backgroundImage: `url(${resolvedBg})` }
      : undefined;
    return {
      sceneBgStyle: bgStyle,
      sceneSkyStyle: { "--scene-sky": scene.sky } as BattleCssVars,
      sceneGroundStyle: { "--scene-ground": scene.ground } as BattleCssVars,
      enemyInfoStyle: { "--battle-enemy-info-right": layout.enemyInfoRight } as BattleCssVars,
      playerInfoStyle: { "--battle-player-info-left": layout.playerInfoLeft } as BattleCssVars,
    };
  }, [coreStatic, UX.lowPerfMode]);

  useEffect(() => {
    if (S.screen !== 'battle') return;

    const preloadUrls = new Set<string>();
    const preloadForEnemy = (enemy: SceneEnemyRef) => {
      const sceneKey = resolveSceneKeyFromEnemy(enemy);
      const bg = resolveBattleSceneBg(sceneKey, UX.lowPerfMode);
      if (bg) preloadUrls.add(bg);
    };

    preloadForEnemy({
      sceneMType: S.enemy?.sceneMType,
      mType: S.enemy?.mType,
    });

    if (Array.isArray(S.enemies) && S.enemies.length > 0) {
      const roundStep = S.battleMode === 'coop' || S.battleMode === 'double' ? 2 : 1;
      const nextEnemy = S.enemies[S.round + roundStep];
      if (nextEnemy) preloadForEnemy(nextEnemy);
    }

    preloadUrls.forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  }, [
    S.screen,
    S.battleMode,
    S.round,
    S.enemy?.sceneMType,
    S.enemy?.mType,
    S.enemies,
    UX.lowPerfMode,
  ]);

  const memoEffectTarget = useMemo(() => {
    if (!coreStatic) return null;
    const {
      layout: {
        enemyMainRightPct,
        enemyTopPct,
        playerMainLeftPct: rawMainLeftPct,
        playerMainBottomPct: rawMainBottomPct,
        mainPlayerSize: rawMainSize,
        enemySize,
      },
    } = coreStatic;

    // Keep player-main target anchored to main slot to avoid large jump drift
    // when co-op active slot switches on smaller/mobile viewports.
    const playerMainLeftPct = rawMainLeftPct;
    const playerMainBottomPct = rawMainBottomPct;
    const mainPlayerSize = rawMainSize;

    const enemyHeight = enemySize * 100 / 120;
    const enemyFallbackTarget = {
      top: `calc(${enemyTopPct}% + ${enemyHeight / 2}px)`,
      right: `calc(${enemyMainRightPct}% + ${enemySize / 2}px)`,
      flyRight: enemyMainRightPct + enemySize / 2 * 100 / 390,
      flyTop: enemyTopPct + enemyHeight / 2 * 100 / 550,
      cx: 390 - (enemyMainRightPct / 100 * 390 + enemySize / 2),
      cy: enemyTopPct / 100 * 550 + enemyHeight / 2,
    };

    const playerMainHeight = mainPlayerSize * 100 / 120;
    const playerCenterTopPct = Math.max(8, 100 - playerMainBottomPct - (playerMainHeight * 100 / 550) / 2);
    const playerCenterRightPct = Math.max(8, 100 - playerMainLeftPct - (mainPlayerSize * 100 / 390) / 2);
    const playerFallbackTarget = {
      top: `calc(${playerCenterTopPct}% + 0px)`,
      right: `calc(${playerCenterRightPct}% + 0px)`,
      flyRight: playerCenterRightPct,
      flyTop: playerCenterTopPct,
      cx: 390 - (playerCenterRightPct / 100 * 390),
      cy: playerCenterTopPct / 100 * 550,
    };

    const enemyTarget = measuredEnemyTarget || enemyFallbackTarget;
    const playerTarget = measuredPlayerTarget || playerFallbackTarget;
    return S.atkEffect?.targetSide === "player" ? playerTarget : enemyTarget;
  }, [coreStatic, measuredEnemyTarget, measuredPlayerTarget, S.atkEffect?.targetSide]);

  // ── Compute BattleFxTargets for particle/damage popup positioning ──
  const memoFxTargets = useMemo<BattleFxTargets>(() => {
    if (!coreStatic) return DEFAULT_FX_TARGETS;
    const {
      layout: {
        playerSubLeftPct: rawSubLeftPct,
        playerSubBottomPct: rawSubBottomPct,
        subPlayerSize: rawSubSize,
      },
    } = coreStatic;

    // Player-main: from measured target or fallback
    const pTarget = measuredPlayerTarget;
    const pCx = pTarget?.cx ?? DEFAULT_FX_TARGETS.playerMain.x;
    const pCy = pTarget?.cy ?? DEFAULT_FX_TARGETS.playerMain.y;

    // Player-sub: from measured sub target, or compute from layout percentages
    const subTarget = measuredPlayerSubTarget;
    let subCx: number;
    let subCy: number;
    if (subTarget) {
      subCx = subTarget.cx;
      subCy = subTarget.cy;
    } else {
      // Fallback: estimate sub position from layout percentages using 390×550 virtual arena
      const subLeftPct = rawSubLeftPct;
      const subBottomPct = rawSubBottomPct;
      const subSize = rawSubSize;
      const subHeight = subSize * 100 / 120;
      const subCenterRightPct = Math.max(8, 100 - subLeftPct - (subSize * 100 / 390) / 2);
      const subCenterTopPct = Math.max(8, 100 - subBottomPct - (subHeight * 100 / 550) / 2);
      subCx = 390 - (subCenterRightPct / 100 * 390);
      subCy = subCenterTopPct / 100 * 550;
    }

    // Enemy-main: from measured target or fallback
    const eTarget = measuredEnemyTarget;
    const eCx = eTarget?.cx ?? DEFAULT_FX_TARGETS.enemyMain.x;
    const eCy = eTarget?.cy ?? DEFAULT_FX_TARGETS.enemyMain.y;

    return {
      playerMain: { x: Math.round(pCx), y: Math.round(pCy) },
      playerSub: { x: Math.round(subCx), y: Math.round(subCy) },
      enemyMain: { x: Math.round(eCx), y: Math.round(eCy) },
      enemyAbove: { x: Math.round(eCx), y: Math.round(eCy - 25) },
      playerAbove: { x: Math.round(pCx), y: Math.round(pCy - 30) },
    };
  }, [coreStatic, measuredEnemyTarget, measuredPlayerTarget, measuredPlayerSubTarget]);

  // Push FX targets to the module-level singleton for flow functions.
  useEffect(() => {
    updateBattleFxTargets(memoFxTargets);
    return () => resetBattleFxTargets();
  }, [memoFxTargets]);

  // ── Sprite animation styles (isolated memo to prevent animation restarts) ──
  // Animation CSS variables are separated from layout styles so that frequent
  // state changes (eHp, phase) don't cause the browser to re-assign identical
  // animation strings, which would restart running CSS animations mid-cycle.
  const enemyDefeatedFlag = S.eHp === 0 && (S.phase === "ko" || S.phase === "victory");
  const enemyLowHpFlag = Boolean(
    coreStatic && coreStatic.enemy.maxHp > 0 && S.eHp > 0 && S.eHp / coreStatic.enemy.maxHp < 0.25,
  );
  const memoSpriteAnims = useMemo(() => {
    if (!coreStatic) return null;
    const { enemy } = coreStatic;
    const enemyIsBossVisual = BOSS_IDS.has(normalizeBossVisualId(enemy.id));
    const enemyIdleAnim = enemyIsBossVisual
      ? "bossFloat 2.5s ease-in-out infinite, bossPulse 4s ease infinite"
      : enemyLowHpFlag
        ? "float 1.4s ease-in-out infinite, struggle .8s ease-in-out infinite"
        : "float 3s ease-in-out infinite";
    return {
      enemyMain: (enemyDefeatedFlag
        ? "enemyDissolve .9s ease-out forwards"
        : S.eAnim || (UX.lowPerfMode ? "none" : enemyIdleAnim)),
      enemySub: UX.lowPerfMode ? "none" : "float 3.8s ease-in-out infinite",
      enemyShadow: enemyIsBossVisual ? "bossShadowPulse 2.5s ease-in-out infinite" : "shadowPulse 3s ease-in-out infinite",
      playerMain: S.pAnim || (UX.lowPerfMode ? "none" : "floatFlip 3s ease-in-out infinite"),
      playerSub: UX.lowPerfMode ? "none" : "floatFlip 3.8s ease-in-out infinite",
    };
  }, [coreStatic, S.eAnim, S.pAnim, enemyDefeatedFlag, UX.lowPerfMode, enemyLowHpFlag]);

  // ── Sprite layout styles (position, size, filter — no animation strings) ──
  const memoSpriteStyles = useMemo(() => {
    if (!coreStatic || !memoSpriteAnims) return null;
    const {
      isCoopBattle,
      hasDualUnits,
      coopUsingSub,
      showAllySub,
      showEnemySub,
      allyMainRoleSize,
      starterSubRoleSize,
      layout: {
        compactDual,
        enemyMainRightPct,
        enemySubRightPct,
        enemySubTopPct,
        playerMainLeftPct: rawMainLeftPct,
        playerMainBottomPct: rawMainBottomPct,
        playerSubLeftPct: rawSubLeftPct,
        playerSubBottomPct: rawSubBottomPct,
        mainPlayerSize: rawMainSize,
        subPlayerSize: rawSubSize,
        enemySize,
        enemyTopPct,
        playerComp,
        enemyComp,
        subComp,
      },
    } = coreStatic;

    const enemySubId = S.enemySub?.id ?? '';
    const enemySubIsEvolved = Boolean(S.enemySub?.isEvolved);
    const enemySubIsBossVisual = BOSS_IDS.has(normalizeBossVisualId(enemySubId));

    // In co-op, swap only horizontal slots when sub is active.
    // Keep each unit's vertical baseline stable to avoid jumpy/overlap-prone
    // y-axis motion on compact/mobile layouts.
    const shouldSwapPlayerSlots = isCoopBattle && coopUsingSub;
    // If a wide main starter (wolf/tiger/lion class) is moved into the forward
    // sub slot, pull it back from enemy lane — but also keep a minimum gap from
    // the active sub sprite so both allies do not overlap on mobile.
    const swappedMainIsWideBeast = shouldSwapPlayerSlots && (playerComp || 1) > 1.3;
    const swappedMainWidePullback = swappedMainIsWideBeast
      ? (compactDual ? 24 : 22)
      : 0;
    const swappedMainTargetPct = rawSubLeftPct - swappedMainWidePullback;
    const swappedMainSafeMinPct = rawMainLeftPct + (swappedMainIsWideBeast ? (compactDual ? 4.2 : 5.4) : (compactDual ? 10 : 9));
    const swappedMainSafeMaxPct = rawSubLeftPct - (swappedMainIsWideBeast ? (compactDual ? 2.2 : 1.3) : (compactDual ? 1.5 : 1));
    const swappedMainWideCompactCapPct = swappedMainIsWideBeast && compactDual ? 5.8 : Number.POSITIVE_INFINITY;
    const clampedSwappedMainPct = Math.max(
      1,
      Math.min(
        swappedMainWideCompactCapPct,
        Math.min(swappedMainSafeMaxPct, Math.max(swappedMainSafeMinPct, swappedMainTargetPct)),
      ),
    );
    const playerMainLeftPct = shouldSwapPlayerSlots
      ? clampedSwappedMainPct
      : rawMainLeftPct;
    const playerMainBottomPct = rawMainBottomPct;
    const playerSubLeftPct = shouldSwapPlayerSlots ? rawMainLeftPct : rawSubLeftPct;
    const playerSubBottomPct = rawSubBottomPct;
    const mainPlayerSize = coopUsingSub ? starterSubRoleSize : rawMainSize;
    const subPlayerSize = coopUsingSub ? allyMainRoleSize : rawSubSize;
    const hasSelectableCoopPair = isCoopBattle && showAllySub;
    const mainIsActive = !hasSelectableCoopPair || !coopUsingSub;
    const subIsActive = hasSelectableCoopPair && coopUsingSub;
    const mainFilter = !hasSelectableCoopPair
      ? "none"
      : mainIsActive
        ? "saturate(1) brightness(1) drop-shadow(0 0 12px rgba(99,102,241,0.7))"
        : "saturate(0.62) brightness(0.78)";
    const subFilter = !hasSelectableCoopPair
      ? "none"
      : subIsActive
        ? "saturate(1) brightness(1) drop-shadow(0 0 12px rgba(34,197,94,0.75))"
        : "saturate(0.62) brightness(0.78)";

    const isLargeEnemySub = enemySubId === "golumn" || enemySubId === "golumn_mud" || enemySubId === "mushroom";
    const enemySubScale = isLargeEnemySub
      ? (compactDual ? "0.86" : "0.94")
      : (compactDual ? "0.72" : "0.8");
    const enemySubSize = !enemySubId
      ? 96
      : enemySubIsBossVisual
        ? 160
        : isLargeEnemySub
          ? 150
          : enemySubIsEvolved
            ? 120
            : 96;
    const enemySubScaleNum = Number(enemySubScale) || 1;
    const isWidePlayerMainSprite = (playerComp || 1) >= 1.55;
    const isWidePlayerSubSprite = (subComp || 1) >= 1.55;
    const isWideEnemyMainSprite = (enemyComp || 1) >= 1.55;
    const isWideEnemySubSprite = Boolean(enemySubId)
      && !enemySubIsBossVisual
      && (enemySubIsEvolved || isLargeEnemySub);

    // Dynamic lane safety clamp:
    // Keep allies inside player zone (left side) and enemies inside enemy zone (right side)
    // across phone/tablet/laptop without hardcoded per-device offsets.
    const arenaWidthPx = Math.max(280, arenaWidth || 390);
    const deviceTier = resolveBattleDeviceTier(arenaWidthPx);
    const laneTuning = resolveBattleLaneTuning({
      arenaWidthPx,
      deviceTier,
      hasDualUnits,
      isCoopBattle,
      showAllySub,
      showEnemySub,
      isWidePlayerMainSprite,
      isWidePlayerSubSprite,
      isWideEnemyMainSprite,
      isWideEnemySubSprite,
    });
    const sepPct = laneTuning.sepPct;
    const safeGapPct = laneTuning.safeGapPct;
    const sepPx = arenaWidthPx * sepPct / 100;
    const safeGapPx = arenaWidthPx * safeGapPct / 100;
    const minPlayerLeftPct = laneTuning.minPlayerLeftPct;
    const minEnemyRightPct = laneTuning.minEnemyRightPct;
    const minPlayerLeftPx = arenaWidthPx * minPlayerLeftPct / 100;
    const minEnemyRightPx = arenaWidthPx * minEnemyRightPct / 100;
    const playerLaneRightPx = sepPx - safeGapPx;
    const enemyLaneLeftPx = sepPx + safeGapPx;
    const playerLaneWidthPx = Math.max(24, playerLaneRightPx - minPlayerLeftPx);
    const enemyLaneWidthPx = Math.max(24, arenaWidthPx - minEnemyRightPx - enemyLaneLeftPx);
    const allyGapPx = laneTuning.allyGapPx;

    // When two allies share one lane on small phones, shrink both together
    // so they fit in-lane before applying positional clamps.
    const playerTotalWidthPx = showAllySub
      ? mainPlayerSize + subPlayerSize + allyGapPx
      : mainPlayerSize;
    const playerLaneScale = Math.min(1, playerLaneWidthPx / Math.max(1, playerTotalWidthPx));
    const widePlayerMainScaleCap = laneTuning.widePlayerMainScaleCap;
    const widePlayerSubScaleCap = laneTuning.widePlayerSubScaleCap;
    const wideEnemyMainScaleCap = laneTuning.wideEnemyMainScaleCap;
    const wideEnemySubScaleCap = laneTuning.wideEnemySubScaleCap;
    // Co-op readability scaling by device:
    // phone: slightly smaller, tablet: tiny reduction, laptop: unchanged.
    const coopGlobalScale = laneTuning.coopGlobalScale;
    const basePlayerMainScale = Math.min(playerLaneScale, widePlayerMainScaleCap);
    const basePlayerSubScale = showAllySub
      ? Math.min(playerLaneScale, widePlayerSubScaleCap)
      : 1;
    const baseEnemyMainScale = Math.min(
      1,
      enemyLaneWidthPx / Math.max(1, enemySize),
      wideEnemyMainScaleCap,
    );
    const baseEnemySubScale = Math.min(
      1,
      enemyLaneWidthPx / Math.max(1, enemySubSize * enemySubScaleNum),
      wideEnemySubScaleCap,
    );
    const resolvedPlayerMainScale = Math.min(1, basePlayerMainScale * coopGlobalScale);
    const resolvedPlayerSubScale = Math.min(1, basePlayerSubScale * coopGlobalScale);
    const resolvedEnemyMainScale = Math.min(1, baseEnemyMainScale * coopGlobalScale);
    const resolvedEnemySubScale = Math.min(1, baseEnemySubScale * coopGlobalScale);

    const playerMainWidthPx = mainPlayerSize * resolvedPlayerMainScale;
    const playerSubWidthPx = subPlayerSize * resolvedPlayerSubScale;
    const enemyMainWidthPx = enemySize * resolvedEnemyMainScale;
    const enemySubWidthPx = enemySubSize * enemySubScaleNum * resolvedEnemySubScale;

    const clampPlayerLeftPx = (leftPx: number, spriteWidthPx: number): number => {
      const maxLeftPx = playerLaneRightPx - spriteWidthPx;
      return clampNumber(leftPx, minPlayerLeftPx, Math.max(minPlayerLeftPx, maxLeftPx));
    };
    const clampEnemyRightPx = (rightPx: number, spriteWidthPx: number): number => {
      const maxRightPx = arenaWidthPx - spriteWidthPx - enemyLaneLeftPx;
      return clampNumber(rightPx, minEnemyRightPx, Math.max(minEnemyRightPx, maxRightPx));
    };

    const wideMainBackShiftPct = laneTuning.wideMainBackShiftPct;
    const wideSubBackShiftPct = laneTuning.wideSubBackShiftPct;
    const wideEnemyMainRetreatPct = laneTuning.wideEnemyMainRetreatPct;
    const wideEnemySubRetreatPct = laneTuning.wideEnemySubRetreatPct;

    let resolvedPlayerMainLeftPx = clampPlayerLeftPx(
      (playerMainLeftPct - wideMainBackShiftPct) * arenaWidthPx / 100,
      playerMainWidthPx,
    );
    let resolvedPlayerSubLeftPx = clampPlayerLeftPx(
      (playerSubLeftPct - wideSubBackShiftPct) * arenaWidthPx / 100,
      playerSubWidthPx,
    );
    if (showAllySub) {
      // On narrow phones, permit a small ally overlap so wide sprites can stay
      // farther from the enemy lane after main/sub swap without hard clipping.
      const allowAllyOverlapPx = Math.min(playerMainWidthPx, playerSubWidthPx) * laneTuning.allyOverlapRatio;
      const requiredSeparationPx = Math.max(0, playerMainWidthPx + allyGapPx - allowAllyOverlapPx);
      const maxSubLeftPx = Math.max(minPlayerLeftPx, playerLaneRightPx - playerSubWidthPx);
      const minSubLeftPxFromMain = resolvedPlayerMainLeftPx + requiredSeparationPx;
      if (minSubLeftPxFromMain > maxSubLeftPx) {
        resolvedPlayerMainLeftPx = clampPlayerLeftPx(
          maxSubLeftPx - requiredSeparationPx,
          playerMainWidthPx,
        );
      }
      const minSubLeftPx = Math.min(
        maxSubLeftPx,
        resolvedPlayerMainLeftPx + requiredSeparationPx,
      );
      resolvedPlayerSubLeftPx = clampNumber(resolvedPlayerSubLeftPx, minSubLeftPx, maxSubLeftPx);
    }
    const resolvedEnemyMainRightPx = clampEnemyRightPx(
      (enemyMainRightPct + wideEnemyMainRetreatPct) * arenaWidthPx / 100,
      enemyMainWidthPx,
    );
    const resolvedEnemySubRightPx = showEnemySub
      ? clampEnemyRightPx(
        (enemySubRightPct + wideEnemySubRetreatPct) * arenaWidthPx / 100,
        enemySubWidthPx,
      )
      : enemySubRightPct * arenaWidthPx / 100;

    const resolvedPlayerMainLeftPct = resolvedPlayerMainLeftPx / arenaWidthPx * 100;
    const resolvedPlayerSubLeftPct = resolvedPlayerSubLeftPx / arenaWidthPx * 100;
    const resolvedEnemyMainRightPct = resolvedEnemyMainRightPx / arenaWidthPx * 100;
    const resolvedEnemySubRightPct = resolvedEnemySubRightPx / arenaWidthPx * 100;

    // Shadow offset & width should reflect the *visual* creature footprint,
    // not the inflated SVG element size. Dividing by compensation recovers
    // the base size that matches the visible body area.
    const pVisual = playerMainWidthPx / (playerComp || 1);
    const eVisual = enemyMainWidthPx / (enemyComp || 1);
    const enemyHeight = enemyMainWidthPx * 100 / 120;
    return {
      enemySubSize,
      lanePlayerMainScale: resolvedPlayerMainScale,
      laneEnemyMainScale: resolvedEnemyMainScale,
      enemyMainSpriteStyle: {
        "--enemy-main-right": `${resolvedEnemyMainRightPct}%`,
        "--enemy-main-top": `${enemyTopPct}%`,
        "--battle-enemy-main-scale": resolvedEnemyMainScale.toFixed(3),
        "--enemy-main-anim": memoSpriteAnims.enemyMain,
      } as BattleCssVars,
      enemySubSpriteStyle: {
        "--enemy-sub-right": `${resolvedEnemySubRightPct}%`,
        "--enemy-sub-top": `${enemySubTopPct}%`,
        "--enemy-sub-scale": enemySubScale,
        "--battle-enemy-sub-scale": resolvedEnemySubScale.toFixed(3),
        "--enemy-sub-anim": memoSpriteAnims.enemySub,
      } as BattleCssVars,
      enemyMainShadowStyle: {
        "--enemy-shadow-right": `calc(${resolvedEnemyMainRightPct}% + ${Math.round(eVisual * 0.18)}px)`,
        "--enemy-shadow-top": `calc(${enemyTopPct}% + ${Math.round(enemyHeight * 0.72)}px)`,
        "--enemy-shadow-width": `${Math.round(eVisual * 0.56)}px`,
        "--enemy-shadow-anim": memoSpriteAnims.enemyShadow,
      } as BattleCssVars,
      playerMainSpriteStyle: {
        "--player-main-left": `${resolvedPlayerMainLeftPct}%`,
        "--player-main-bottom": `${playerMainBottomPct}%`,
        "--player-main-filter": mainFilter,
        "--battle-player-main-scale": resolvedPlayerMainScale.toFixed(3),
        "--player-main-z": coopUsingSub ? "4" : "6",
        "--player-main-opacity": mainIsActive ? "1" : ".52",
        "--battle-player-main-dim-scale": mainIsActive
          ? "1"
          : ((playerComp || 1) > 1.3 ? (compactDual ? ".58" : ".68") : ".84"),
        "--player-main-anim": memoSpriteAnims.playerMain,
      } as BattleCssVars,
      playerSubSpriteStyle: {
        "--player-sub-left": `${resolvedPlayerSubLeftPct}%`,
        "--player-sub-bottom": `${playerSubBottomPct}%`,
        "--player-sub-filter": subFilter,
        "--battle-player-sub-scale": resolvedPlayerSubScale.toFixed(3),
        "--player-sub-z": coopUsingSub ? "6" : "4",
        "--player-sub-opacity": subIsActive ? "1" : ".52",
        "--battle-player-sub-dim-scale": subIsActive
          ? "1"
          : ((subComp || 1) > 1.3 ? (compactDual ? ".82" : ".88") : ".88"),
        "--player-sub-anim": memoSpriteAnims.playerSub,
      } as BattleCssVars,
      playerMainShadowStyle: {
        "--player-shadow-left": `calc(${resolvedPlayerMainLeftPct}% + ${Math.round(pVisual * 0.48)}px)`,
        "--player-shadow-bottom": `${Math.max(8, playerMainBottomPct - 1)}%`,
        "--player-shadow-width": `${Math.round(pVisual * 0.5)}px`,
      } as BattleCssVars,
    };
  }, [coreStatic, memoSpriteAnims, S.enemySub?.id, S.enemySub?.isEvolved, arenaWidth]);

  // ─── Battle screen locals ───
  const coreRuntime = useMemo(() => buildBattleRuntimeCore({
    state: {
      battleMode,
      pvpState: S.pvpState,
      charge: S.charge,
      chargeReady: S.chargeReady,
      sealedMove: S.sealedMove,
      mLvls: S.mLvls,
      mHits: S.mHits,
    },
    activeStarter: coreStatic?.activeStarter || null,
    getPow,
    dualEff,
  }), [
    battleMode,
    S.pvpState,
    S.charge,
    S.chargeReady,
    S.sealedMove,
    S.mLvls,
    S.mHits,
    coreStatic?.activeStarter,
    getPow,
    dualEff,
  ]);

  const canTapAdvance = S.phase === "text" || S.phase === "victory" || S.phase === "bossVictory";
  const handleAdvance = A.advance;
  const handleAdvanceKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (!canTapAdvance) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAdvance();
    }
  }, [canTapAdvance, handleAdvance]);
  const handleOpenBattleSettings = useCallback(() => {
    onOpenSettings('battle');
  }, [onOpenSettings]);
  const handlePauseOverlayKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      A.togglePause();
    }
  }, [A]);
  const question = S.q;
  const feedback = S.fb;
  const questionTypeLabel = useMemo(() => (!question
    ? ""
    : question.op === "×" ? t("battle.qtype.mul", "Multiplication")
    : question.op === "÷" ? t("battle.qtype.div", "Division")
    : question.op === "+" ? t("battle.qtype.add", "Addition")
    : question.op === "-" ? t("battle.qtype.sub", "Subtraction")
    : question.op === "mixed2" ? t("battle.qtype.mixed2", "Add/Sub Mix")
    : question.op === "mixed3" ? t("battle.qtype.mixed3", "Mul/Add Mix")
    : question.op === "mixed4" ? t("battle.qtype.mixed4", "Four Ops")
    : question.op === "unknown1" ? t("battle.qtype.unknown1", "Unknown Add/Sub")
    : question.op === "unknown2" ? t("battle.qtype.unknown2", "Unknown Mul/Div")
    : question.op === "unknown3" ? t("battle.qtype.unknown3", "Unknown Large Number")
    : question.op === "unknown4" ? t("battle.qtype.unknown4", "Unknown Mixed")
    : question.op === "frac_cmp" ? t("battle.qtype.fracCmp", "Fraction Compare")
    : question.op === "frac_same" ? t("battle.qtype.fracSame", "Same Denominator")
    : question.op === "frac_diff" ? t("battle.qtype.fracDiff", "Different Denominator")
    : question.op === "frac_muldiv" ? t("battle.qtype.fracMulDiv", "Fraction Mul/Div")
    : question.op === "dec_add" ? t("battle.qtype.decAdd", "Decimal Add/Sub")
    : question.op === "dec_frac" ? t("battle.qtype.decFrac", "Decimal/Fraction Convert")
    : question.op === "dec_mul" ? t("battle.qtype.decMul", "Decimal Multiplication")
    : question.op === "dec_div" ? t("battle.qtype.decDiv", "Decimal Division")
    : t("battle.qtype.mixed", "Mixed")), [question, t]);
  const impactPhaseClass = showHeavyFx ? `battle-impact-${impactPhase}` : "battle-impact-idle";
  const battleRootClassName = useMemo(() => (
    `battle-root ${UX.compactUI ? "compact-ui" : ""} ${UX.lowPerfMode ? "low-perf" : ""} ${canTapAdvance ? "battle-root-advance" : ""} ${S.phase === "bossIntro" ? "boss-intro-active" : ""} ${S.phase === "bossVictory" ? "boss-victory-active" : ""} ${impactPhaseClass}`
  ), [UX.compactUI, UX.lowPerfMode, canTapAdvance, impactPhaseClass, S.phase]);
  const battlePanelClassName = useMemo(
    () => `battle-panel ${S.phase === "question" ? "is-question" : "is-normal"}`,
    [S.phase],
  );

  if (!coreStatic) return (
    <div className="battle-loading-wrap">
      <div className="battle-loading-icon">⚔️</div>
      <div className="battle-loading-text">{t("app.loading.battle", "Preparing battle...")}</div>
    </div>
  );

  const {
    starter,
    enemy,
    st,
    isCoopBattle,
    showEnemySub,
    showAllySub,
    coopCanSwitch,
    coopUsingSub,
    activeStarter,
    eSvg,
    eSubSvg,
    pSubSvg,
    pSvg,
    mainMaxHp,
    subMaxHp,
    sceneKey,
    scene,
    layout,
    allyMainRoleSize,
    starterSubRoleSize,
    pvpEnemyBarActive,
    mainBarActive,
    subBarActive,
  } = coreStatic;

  const {
    pvpActiveCharge,
    pvpActiveCombo,
    pvpActiveSpecDefReady,
    chargeDisplay,
    chargeReadyDisplay,
    moveRuntime,
    pvpEnemyBurn,
    pvpEnemyFreeze,
    pvpEnemyParalyze,
    pvpEnemyStatic,
    pvpEnemyCombo,
    pvpEnemySpecDef,
    pvpPlayerBurn,
    pvpPlayerFreeze,
    pvpPlayerParalyze,
    pvpPlayerStatic,
    pvpPlayerCombo,
    pvpPlayerSpecDef,
  } = coreRuntime;

  const pvpComboTrigger = PVP_BALANCE.passive.specDefComboTrigger || 4;
  const {
    mainPlayerSize: rawMainSize,
    subPlayerSize: rawSubSize,
    enemySize: eSize,
    playerComp,
    enemyComp,
  } = layout;
  // Co-op role swap: when sub is active, render it at its own "main-role" size,
  // and render main starter at its own "sub-role" size for clearer turn ownership.
  const mainPlayerSize = coopUsingSub ? starterSubRoleSize : rawMainSize;
  const subPlayerSize = coopUsingSub ? allyMainRoleSize : rawSubSize;
  const playerMainVisualScale = Math.max(0.45, Math.min(1.1, 1 / (playerComp || 1)));
  const enemyMainVisualScale = Math.max(0.45, Math.min(1.1, 1 / (enemyComp || 1)));

  const effectTarget = memoEffectTarget!;
  const selectedMove = activeStarter && S.selIdx != null
    ? activeStarter.moves[S.selIdx]
    : null;
  const specDefReadyLabel = starter.type === "fire"
    ? t("battle.specDef.fire", "🛡️ Shield")
    : starter.type === "water"
      ? t("battle.specDef.water", "💨 Perfect Dodge")
      : starter.type === "ice"
        ? t("battle.specDef.ice", "🧊 Ice Shift")
      : starter.type === "electric"
        ? t("battle.specDef.electric", "⚡ Paralysis")
        : starter.type === "steel"
          ? t("battle.specDef.steel", "🛡️ Iron Guard")
        : starter.type === "light"
          ? t("battle.specDef.light", "✨ Lion Roar")
          : t("battle.specDef.grass", "🌿 Reflect");
  const specDefToneClass = starter.type === "fire"
    ? "battle-pill-specdef-fire"
    : starter.type === "water"
      ? "battle-pill-specdef-water"
      : starter.type === "ice"
        ? "battle-pill-specdef-water"
      : starter.type === "electric"
        ? "battle-pill-specdef-electric"
        : starter.type === "light"
          ? "battle-pill-specdef-light"
          : "battle-pill-specdef-grass";
  const {
    sceneBgStyle,
    sceneSkyStyle,
    sceneGroundStyle,
    enemyInfoStyle,
    playerInfoStyle,
  } = memoSceneStyles!;
  const enemyId = enemy.id;
  const weatherSeed = `${sceneKey}-${enemyId}-${S.round}-${S.battleMode}`;
  const {
    enemyMainSpriteStyle,
    enemySubSpriteStyle,
    enemyMainShadowStyle,
    playerMainSpriteStyle,
    playerSubSpriteStyle,
    playerMainShadowStyle,
    enemySubSize,
    lanePlayerMainScale,
    laneEnemyMainScale,
  } = memoSpriteStyles!;
  const coOpBossSubIntro = isCoopBattle
    && showEnemySub
    && Boolean(S.enemySub?.name)
    && Boolean(eSubSvg);

  return (
    <div
      id="main-content"
      ref={battleRootRef}
      className={battleRootClassName}
      role={canTapAdvance ? "button" : undefined}
      tabIndex={canTapAdvance ? 0 : -1}
      aria-label={canTapAdvance ? t("a11y.battle.advance", "Advance to next step") : undefined}
      onKeyDown={handleAdvanceKeyDown}
      onClick={canTapAdvance ? handleAdvance : undefined}
    >
      {/* Boss intro cinematic overlay */}
      {S.phase === 'bossIntro' && (
        <BossIntroOverlay
          enemyName={enemy.name}
          enemySvg={eSvg}
          enemySize={eSize}
          enemySubName={coOpBossSubIntro ? S.enemySub?.name : undefined}
          enemySubSvg={coOpBossSubIntro ? (eSubSvg ?? undefined) : undefined}
          enemySubSize={coOpBossSubIntro ? enemySubSize : undefined}
          onComplete={handleAdvance}
        />
      )}

      {/* Boss victory cinematic overlay */}
      {S.phase === 'bossVictory' && (
        <BossVictoryOverlay
          enemyName={enemy.name}
          onComplete={handleAdvance}
        />
      )}

      {/* Pause overlay */}
      {S.gamePaused && <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-pause-title"
        tabIndex={0}
        className={`battle-pause-overlay ${UX.lowPerfMode ? "low-perf" : ""}`}
        onKeyDown={handlePauseOverlayKeyDown}
        onClick={A.togglePause}
      >
        <div className="battle-pause-icon">⏸️</div>
        <div id="battle-pause-title" className="battle-pause-title">{t("app.pause.title", "Game Paused")}</div>
        <div className="battle-pause-hint">{t("app.pause.hint", "Tap anywhere to resume")}</div>
      </div>}

      <BattleFxLayer
        t={t}
        showHeavyFx={showHeavyFx}
        lowPerfMode={UX.lowPerfMode}
        impactPhase={impactPhase}
        sceneType={sceneKey}
        atkEffect={S.atkEffect}
        effectTarget={effectTarget}
        dmgs={S.dmgs}
        parts={S.parts}
        battleMode={S.battleMode}
        moveLevelUpIdx={S.mLvlUp}
        starter={starter}
        moveLvls={S.mLvls}
        getPow={V.getPow}
        achPopup={S.achPopup}
        collectionPopup={S.collectionPopup}
        phase={S.phase}
        enemyDrops={enemy.drops}
        defAnim={S.defAnim}
        effMsg={S.effMsg}
        onRemoveDamage={A.rmD}
        onRemoveParticle={A.rmP}
        onDismissAchievement={A.dismissAch}
        onDismissCollectionPopup={A.dismissCollectionPopup}
      />

      {/* ═══ Battle arena ═══ */}
      <div className="battle-arena" ref={battleArenaRef} style={arenaScaleStyle}>
        <BattleSceneLayers
          showHeavyFx={showHeavyFx}
          bgStyle={sceneBgStyle}
          skyStyle={sceneSkyStyle}
          groundStyle={sceneGroundStyle}
          Deco={scene.Deco}
        />
        <BattleWeatherLayer
          sceneType={sceneKey}
          seed={weatherSeed}
          enabled={showHeavyFx && !S.gamePaused}
          reduced={UX.compactUI || UX.autoLowEnd}
        />

        {/* Enemy info */}
        <BattleEnemyInfoPanel
          t={t}
          style={enemyInfoStyle}
          enemy={enemy}
          enemyHp={S.eHp}
          showEnemySub={showEnemySub}
          enemySub={S.enemySub}
          enemySubHp={S.eHpSub}
          battleMode={S.battleMode}
          pvpEnemyBarActive={pvpEnemyBarActive}
          pvpComboTrigger={pvpComboTrigger}
          pvpEnemyBurn={pvpEnemyBurn}
          pvpEnemyFreeze={pvpEnemyFreeze}
          pvpEnemyParalyze={pvpEnemyParalyze}
          pvpEnemyStatic={pvpEnemyStatic}
          pvpEnemyCombo={pvpEnemyCombo}
          pvpEnemySpecDef={pvpEnemySpecDef}
          burnStack={S.burnStack}
          frozen={S.frozen}
          staticStack={S.staticStack}
          bossPhase={S.bossPhase}
          bossCharging={S.bossCharging}
        />

        <BattleArenaSprites
          showHeavyFx={showHeavyFx}
          enemy={enemy}
          starterType={starter.type}
          showEnemySub={showEnemySub}
          showAllySub={showAllySub}
          eSvg={eSvg}
          pSvg={pSvg}
          eSubSvg={eSubSvg}
          pSubSvg={pSubSvg}
          eSize={eSize}
          enemySubSize={enemySubSize}
          mainPlayerSize={mainPlayerSize}
          subPlayerSize={subPlayerSize}
          playerMainVisualScale={playerMainVisualScale * lanePlayerMainScale}
          enemyMainVisualScale={enemyMainVisualScale * laneEnemyMainScale}
          enemySpriteRef={enemySpriteRef}
          playerSpriteRef={playerSpriteRef}
          playerSubSpriteRef={playerSubSpriteRef}
          enemyMainSpriteStyle={enemyMainSpriteStyle}
          enemySubSpriteStyle={enemySubSpriteStyle}
          enemyMainShadowStyle={enemyMainShadowStyle}
          playerMainSpriteStyle={playerMainSpriteStyle}
          playerSubSpriteStyle={playerSubSpriteStyle}
          playerMainShadowStyle={playerMainShadowStyle}
          showEnemyShadow={!S.eAnim && !UX.lowPerfMode}
          showPlayerShadow={!S.pAnim && !UX.lowPerfMode}
        />

        {/* Player info */}
        <BattlePlayerInfoPanel
          t={t}
          style={playerInfoStyle}
          battleMode={S.battleMode}
          pLvl={S.pLvl}
          pHp={S.pHp}
          pHpSub={S.pHpSub}
          pExp={S.pExp}
          expNext={S.expNext}
          mainMaxHp={mainMaxHp}
          subMaxHp={subMaxHp}
          stName={st.name}
          isCoopBattle={isCoopBattle}
          coopUsingSub={coopUsingSub}
          showAllySub={showAllySub}
          allySub={S.allySub}
          mainBarActive={mainBarActive}
          subBarActive={subBarActive}
          pvpComboTrigger={pvpComboTrigger}
          pvpPlayerBurn={pvpPlayerBurn}
          pvpPlayerFreeze={pvpPlayerFreeze}
          pvpPlayerParalyze={pvpPlayerParalyze}
          pvpPlayerStatic={pvpPlayerStatic}
          pvpPlayerCombo={pvpPlayerCombo}
          pvpPlayerSpecDef={pvpPlayerSpecDef}
          cursed={S.cursed}
          poisoned={S.effMsg?.color === '#7c3aed'}
        />

        <BattleStatusOverlay
          t={t}
          lowPerfMode={UX.lowPerfMode}
          streak={S.streak}
          passiveCount={S.passiveCount}
          specDef={S.specDef}
          timedMode={S.timedMode}
          diffLevel={S.diffLevel}
          chargeDisplay={chargeDisplay}
          chargeReadyDisplay={chargeReadyDisplay}
          bossPhase={S.bossPhase}
          specDefToneClass={specDefToneClass}
          specDefReadyLabel={specDefReadyLabel}
          bossCharging={S.bossCharging}
        />
      </div>

      {/* ═══ Bottom panel ═══ */}
      <div className={battlePanelClassName}>
        {/* Move menu */}
        {S.phase === 'menu' && activeStarter && (
          <BattleMoveMenu
            t={t}
            activeStarter={activeStarter}
            isCoopBattle={isCoopBattle}
            coopUsingSub={coopUsingSub}
            coopCanSwitch={coopCanSwitch}
            battleMode={S.battleMode}
            pvpTurn={S.pvpTurn}
            pvpActiveCharge={pvpActiveCharge}
            pvpActiveCombo={pvpActiveCombo}
            pvpActiveSpecDefReady={pvpActiveSpecDefReady}
            pvpComboTrigger={pvpComboTrigger}
            chargeReadyDisplay={chargeReadyDisplay}
            chargeReady={S.chargeReady}
            sealedTurns={S.sealedTurns}
            moveRuntime={moveRuntime}
            inventory={S.inventory}
            onSelectMove={A.selectMove}
            onUseItem={A.useItem}
            onToggleCoopActive={A.toggleCoopActive}
            onTogglePause={A.togglePause}
            onOpenSettings={handleOpenBattleSettings}
            onQuitGame={A.quitGame}
          />
        )}

        {/* Question panel */}
        {S.phase === 'question' && question && activeStarter && selectedMove && (
          <BattleQuestionPanel
            t={t}
            question={question}
            feedback={feedback}
            activeStarter={activeStarter}
            selectedMove={selectedMove}
            questionTypeLabel={questionTypeLabel}
            timedMode={S.timedMode}
            answered={S.answered}
            questionTimerSec={S.questionTimerSec}
            timerSubscribe={V.timerSubscribe}
            getTimerSnapshot={V.getTimerLeft}
            onAnswer={A.onAns}
          />
        )}

        {/* Text box */}
        {(S.phase === "text" || S.phase === "playerAtk" || S.phase === "enemyAtk" || S.phase === "victory" || S.phase === "ko")
          && <TextBox text={S.bText} onClick={canTapAdvance ? handleAdvance : undefined} />}
      </div>
    </div>
  );
}

export default memo(BattleScreenComponent);
