import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useSpriteTargets } from '../../hooks/useSpriteTargets';
import { useBattleParallax } from '../../hooks/useBattleParallax';
import { useBattleArenaScale } from '../../hooks/useBattleArenaScale.ts';
import { SCENES } from '../../data/scenes';
import { BG_IMGS_LOW } from '../../data/sprites.ts';
import { PVP_BALANCE } from '../../data/pvpBalance';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import { BALANCE_CONFIG } from '../../data/balanceConfig.ts';
import { getCompensation } from '../../data/spriteProfiles.ts';
import { getLearningHintSteps, getLearningHintCost } from '../../utils/learningProgress.ts';
import { getAttackImpactProfile } from '../../utils/effectTiming.ts';
import { getSkillActorKeys } from '../../utils/skillPresentation.ts';
import { getBossIntent } from '../../utils/turnFlow.ts';
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
import { resolveBattleSpriteAnimations } from '../../utils/battleAnimations.ts';
import {
  BATTLE_ARENA_HEIGHT_SHARE,
  getBossFrameRequest,
  resolveBattleSpritePlacement,
  resolveBattleLaneSnapshot,
} from '../../utils/battleLayout.ts';
import type { BattleArenaGeometry, BattleSpriteTarget } from '../../utils/battleLayout.ts';
import './BattleScreen.css';
import '../effects/SkillStrikeEffect.css';
type BattleCssVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

function normalizeBossVisualId(id?: string | null): string {
  if (!id) return '';
  return id.startsWith('pvp_') ? id.slice(4) : id;
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

const BATTLE_STATE_RENDER_KEYS = [
  'screen',
  'phase',
  'starter',
  'enemy',
  'enemySub',
  'battleMode',
  'round',
  'pLvl',
  'pStg',
  'pHp',
  'pHpSub',
  'pExp',
  'expNext',
  'eHp',
  'eHpSub',
  'streak',
  'passiveCount',
  'charge',
  'chargeReady',
  'selIdx',
  'q',
  'fb',
  'answered',
  'bText',
  'dmgs',
  'parts',
  'eAnim',
  'pAnim',
  'eSubAnim',
  'pSubAnim',
  'atkEffect',
  'effMsg',
  'burnStack',
  'frozen',
  'staticStack',
  'specDef',
  'cursed',
  'bossPhase',
  'bossTurn',
  'bossCharging',
  'sealedMove',
  'sealedTurns',
  'diffLevel',
  'gamePaused',
  'questionTimerSec',
  'timedMode',
  'mHits',
  'mLvls',
  'mLvlUp',
  'inventory',
  'achPopup',
  'collectionPopup',
  'allySub',
  'coopActiveSlot',
  'pvpStarter2',
  'pvpState',
  'defAnim',
] as const satisfies ReadonlyArray<keyof UseBattleState>;

const BATTLE_ACTION_RENDER_KEYS = [
  'advance',
  'dismissAch',
  'dismissCollectionPopup',
  'onAns',
  'quitGame',
  'rmD',
  'rmP',
  'selectMove',
  'toggleCoopActive',
  'togglePause',
  'useItem',
] as const satisfies ReadonlyArray<keyof UseBattleActions>;

const BATTLE_VIEW_RENDER_KEYS = [
  'getPow',
  'dualEff',
  'timerSubscribe',
  'getTimerLeft',
] as const satisfies ReadonlyArray<keyof UseBattleView>;

function arePickedKeysEqual<T extends object, K extends readonly (keyof T)[]>(
  prevObj: T,
  nextObj: T,
  keys: K,
): boolean {
  for (const key of keys) {
    if (prevObj[key] !== nextObj[key]) return false;
  }
  return true;
}

function areBattleScreenPropsEqual(
  prev: BattleScreenProps,
  next: BattleScreenProps,
): boolean {
  if (prev.t !== next.t) return false;
  if (prev.onOpenSettings !== next.onOpenSettings) return false;

  if (
    prev.mobile.compactUI !== next.mobile.compactUI
    || prev.mobile.lowPerfMode !== next.mobile.lowPerfMode
    || prev.mobile.autoLowEnd !== next.mobile.autoLowEnd
  ) {
    return false;
  }

  if (!arePickedKeysEqual(prev.actions, next.actions, BATTLE_ACTION_RENDER_KEYS)) return false;
  if (!arePickedKeysEqual(prev.view, next.view, BATTLE_VIEW_RENDER_KEYS)) return false;
  if (!arePickedKeysEqual(prev.state, next.state, BATTLE_STATE_RENDER_KEYS)) return false;

  return true;
}

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
    enabled: showHeavyFx && !S.gamePaused,
  });
  const impactStyle = useMemo(() => {
    const profile = getAttackImpactProfile(S.atkEffect?.idx, S.atkEffect?.impact?.outcome);
    return {
      '--battle-arena-height': `${BATTLE_ARENA_HEIGHT_SHARE * 100}%`,
      '--battle-impact-x': `${profile.shakePx}px`,
      '--battle-impact-y': `${profile.shakePx * 0.4}px`,
      '--battle-impact-scale': profile.scale,
      '--battle-impact-shake-ms': `${profile.shakeMs}ms`,
      '--battle-impact-settle-ms': `${profile.settleMs}ms`,
    } as BattleCssVars;
  }, [S.atkEffect?.idx, S.atkEffect?.impact?.outcome]);
  const battleRootRef = useRef<HTMLDivElement | null>(null);
  const battleArenaRef = useRef<HTMLDivElement | null>(null);
  const battlePanelRef = useRef<HTMLDivElement | null>(null);
  const enemySpriteRef = useRef<HTMLDivElement | null>(null);
  const playerSpriteRef = useRef<HTMLDivElement | null>(null);
  const playerSubSpriteRef = useRef<HTMLDivElement | null>(null);
  const enemyInfoRef = useRef<HTMLDivElement | null>(null);
  const playerInfoRef = useRef<HTMLDivElement | null>(null);
  const [arenaGeometry, setArenaGeometry] = useState<BattleArenaGeometry>({
    width: 390, height: 464, rootHeight: 844,
    enemyHudRight: 220, enemyHudBottom: 70, playerHudLeft: 164, playerHudInset: 70,
  });
  const arenaWidth = arenaGeometry.width;
  useLayoutEffect(() => {
    if (battlePanelRef.current) battlePanelRef.current.scrollTop = 0;
  }, [S.screen, S.phase]);
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
    let enemyHudBottom = 0;
    let playerHudInset = 0;
    let measuredWidth = 0;
    let measuredHeight = 0;

    const sync = () => {
      const enemyHud = enemyInfoRef.current;
      const playerHud = playerInfoRef.current;
      const root = battleRootRef.current;
      if (!enemyHud || !playerHud || !root || arena.clientWidth <= 0 || arena.clientHeight <= 0) return;
      if (measuredWidth !== arena.clientWidth || measuredHeight !== arena.clientHeight) {
        enemyHudBottom = 0;
        playerHudInset = 0;
        measuredWidth = arena.clientWidth;
        measuredHeight = arena.clientHeight;
      }
      // Hold the largest HUD insets for this encounter: badges disappearing
      // must not make a boss grow back immediately after a hit.
      enemyHudBottom = Math.max(enemyHudBottom, enemyHud.offsetTop + enemyHud.offsetHeight);
      playerHudInset = Math.max(playerHudInset, arena.clientHeight - playerHud.offsetTop);
      const next = {
        width: arena.clientWidth, height: arena.clientHeight, rootHeight: root.clientHeight,
        enemyHudRight: enemyHud.offsetLeft + enemyHud.offsetWidth,
        enemyHudBottom, playerHudLeft: playerHud.offsetLeft, playerHudInset,
      };
      setArenaGeometry((prev) => Object.keys(next).some((key) => Math.abs(prev[key as keyof BattleArenaGeometry] - next[key as keyof BattleArenaGeometry]) > 1) ? next : prev);
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
      if (enemyInfoRef.current) observer.observe(enemyInfoRef.current);
      if (playerInfoRef.current) observer.observe(playerInfoRef.current);
    }
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleSync);
      if (observer) observer.disconnect();
    };
  }, [S.screen, S.enemy?.id, S.enemySub?.id, S.starter?.id, S.allySub?.id]);
  const pvpTurn = S.pvpState.turn;

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

  const memoLaneSnapshot = useMemo(() => {
    if (!coreStatic) return null;
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
    const isBossEnemy = BOSS_IDS.has(normalizeBossVisualId(coreStatic.enemy?.id));
    const snapshot = resolveBattleLaneSnapshot({
      arenaWidthPx: arenaWidth,
      compactDual,
      hasDualUnits,
      isCoopBattle,
      showAllySub,
      showEnemySub,
      coopUsingSub,
      playerComp,
      subComp,
      enemyComp,
      rawMainLeftPct,
      rawMainBottomPct,
      rawSubLeftPct,
      rawSubBottomPct,
      rawMainSize,
      rawSubSize,
      starterSubRoleSize,
      allyMainRoleSize,
      enemyMainRightPct,
      enemySubRightPct,
      enemyTopPct,
      enemySubTopPct,
      enemySize,
      enemySubId,
      enemySubIsBossVisual,
      enemySubIsEvolved,
      isBossEnemy,
    });
    const mainDim = showAllySub && coopUsingSub ? (playerComp > 1.3 ? (compactDual ? 0.58 : 0.68) : 0.84) : 1;
    const subDim = showAllySub && !coopUsingSub ? (subComp > 1.3 ? (compactDual ? 0.82 : 0.88) : 0.88) : 1;
    type OccupiedBounds = Array<ReturnType<typeof resolveBattleSpritePlacement>['bounds']>;
    const fit = (side: 'player' | 'enemy', frameWidth: number, compensation: number, xPct: number, yPct: number, avoid?: OccupiedBounds, minFrameWidth?: number) => resolveBattleSpritePlacement({
      arena: arenaGeometry, side, frameWidth, minFrameWidth, compensation,
      desiredCenterX: side === 'enemy' ? arenaWidth * (1 - xPct / 100) - frameWidth / 2 : arenaWidth * xPct / 100 + frameWidth / 2,
      desiredCenterY: side === 'enemy' ? arenaGeometry.height * yPct / 100 + frameWidth * 100 / 120 / 2 : arenaGeometry.height * (1 - yPct / 100) - frameWidth * 100 / 120 / 2,
      avoid,
    });
    const enemyMain = fit('enemy', snapshot.enemyMainWidthPx * arenaScale, enemyComp, snapshot.enemyMainRightPct, snapshot.enemyTopPct, undefined,
      isBossEnemy ? getBossFrameRequest(arenaWidth, false, hasDualUnits) : undefined);
    const enemySub = fit('enemy', snapshot.enemySubWidthPx * arenaScale, getCompensation(coreStatic.spriteProfiles.enemySub ?? ''), snapshot.enemySubRightPct, snapshot.enemySubTopPct, showEnemySub ? [enemyMain.bounds] : undefined,
      enemySubIsBossVisual ? getBossFrameRequest(arenaWidth, true, hasDualUnits) : undefined);
    const enemies = showEnemySub ? [enemyMain.bounds, enemySub.bounds] : [enemyMain.bounds];
    // The old horizontal lane budget can make the reserve tiny even when vertical room remains.
    const reserveWidth = (comp: number) => Math.min(arenaWidth * 0.34, 76 * Math.max(1, comp));
    const placeMain = (avoid: OccupiedBounds) => fit('player', snapshot.playerMainWidthPx * arenaScale * mainDim, playerComp, snapshot.playerMainLeftPct, snapshot.playerMainBottomPct, avoid,
      showAllySub && coopUsingSub ? reserveWidth(playerComp) : undefined);
    const placeSub = (avoid: OccupiedBounds) => fit('player', snapshot.playerSubWidthPx * arenaScale * subDim, subComp, snapshot.playerSubLeftPct, snapshot.playerSubBottomPct, avoid,
      showAllySub && !coopUsingSub ? reserveWidth(subComp) : undefined);
    const subIsActive = coopUsingSub && showAllySub;
    const activePlayer = subIsActive ? placeSub(enemies) : placeMain(enemies);
    const playerMain = subIsActive ? placeMain([...enemies, activePlayer.bounds]) : activePlayer;
    const playerSub = subIsActive ? activePlayer : placeSub(showAllySub ? [...enemies, activePlayer.bounds] : enemies);
    return {
      ...snapshot,
      safe: { enemyMain, enemySub, playerMain, playerSub },
    };
  }, [coreStatic, arenaWidth, arenaGeometry, arenaScale, S.enemySub?.id, S.enemySub?.isEvolved]);

  const { measuredEnemyTarget, measuredPlayerTarget, measuredPlayerSubTarget } = useSpriteTargets({
    layoutSignal: memoLaneSnapshot,
    screen: S.screen,
    phase: S.phase,
    enemyId: S.enemy?.id,
    enemyIsEvolved: S.enemy?.isEvolved,
    enemySceneMType: S.enemy?.sceneMType,
    enemyMType: S.enemy?.mType,
    playerStageIdx: S.pStg,
    battleMode: S.battleMode,
    pvpTurn,
    battleRootRef,
    enemySpriteRef,
    playerSpriteRef,
    playerSubSpriteRef,
  });
  const memoFallbackTargets = useMemo(() => {
    if (!memoLaneSnapshot) return null;
    const target = ({ cx, cy }: { cx: number; cy: number }): BattleSpriteTarget => ({
      cx, cy, right: `${arenaWidth - cx}px`, top: `${cy}px`,
      flyRight: (arenaWidth - cx) / arenaWidth * 100, flyTop: cy / arenaGeometry.rootHeight * 100,
    });
    return { enemyMain: target(memoLaneSnapshot.safe.enemyMain), enemySub: target(memoLaneSnapshot.safe.enemySub), playerMain: target(memoLaneSnapshot.safe.playerMain), playerSub: target(memoLaneSnapshot.safe.playerSub) };
  }, [memoLaneSnapshot, arenaWidth, arenaGeometry.rootHeight]);

  const memoEffectRoute = useMemo(() => {
    if (!memoFallbackTargets) return null;
    const targets = { ...memoFallbackTargets,
      enemyMain: measuredEnemyTarget || memoFallbackTargets.enemyMain,
      playerMain: measuredPlayerTarget || memoFallbackTargets.playerMain,
      playerSub: measuredPlayerSubTarget || memoFallbackTargets.playerSub,
    };
    const keys = getSkillActorKeys(S.atkEffect || { type: '', idx: 0, lvl: 1 });
    return { source: targets[keys.source], target: targets[keys.target] };
  }, [memoFallbackTargets, measuredEnemyTarget, measuredPlayerTarget, measuredPlayerSubTarget, S.atkEffect]);

  // ── Compute BattleFxTargets for particle/damage popup positioning ──
  const memoFxTargets = useMemo<BattleFxTargets>(() => {
    if (!memoFallbackTargets) return DEFAULT_FX_TARGETS;
    const pTarget = measuredPlayerTarget ?? memoFallbackTargets.playerMain;
    const subTarget = measuredPlayerSubTarget ?? memoFallbackTargets.playerSub;
    const eTarget = measuredEnemyTarget ?? memoFallbackTargets.enemyMain;
    const pCx = pTarget.cx ?? DEFAULT_FX_TARGETS.playerMain.x;
    const pCy = pTarget.cy ?? DEFAULT_FX_TARGETS.playerMain.y;
    const subCx = subTarget.cx ?? DEFAULT_FX_TARGETS.playerSub.x;
    const subCy = subTarget.cy ?? DEFAULT_FX_TARGETS.playerSub.y;
    const eCx = eTarget.cx ?? DEFAULT_FX_TARGETS.enemyMain.x;
    const eCy = eTarget.cy ?? DEFAULT_FX_TARGETS.enemyMain.y;

    return {
      playerMain: { x: Math.round(pCx), y: Math.round(pCy) },
      playerSub: { x: Math.round(subCx), y: Math.round(subCy) },
      enemyMain: { x: Math.round(eCx), y: Math.round(eCy) },
      enemyAbove: { x: Math.round(eCx), y: Math.round(eCy - 25) },
      playerAbove: { x: Math.round(pCx), y: Math.round(pCy - 30) },
    };
  }, [memoFallbackTargets, measuredEnemyTarget, measuredPlayerTarget, measuredPlayerSubTarget]);

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
    return resolveBattleSpriteAnimations({
      eAnim: S.eAnim,
      pAnim: S.pAnim,
      eSubAnim: S.eSubAnim,
      pSubAnim: S.pSubAnim,
      enemyIsBoss: BOSS_IDS.has(normalizeBossVisualId(coreStatic.enemy.id)),
      enemyDefeated: enemyDefeatedFlag,
      enemyLowHp: enemyLowHpFlag,
      lowPerfMode: UX.lowPerfMode,
    });
  }, [coreStatic, S.eAnim, S.pAnim, S.eSubAnim, S.pSubAnim, enemyDefeatedFlag, UX.lowPerfMode, enemyLowHpFlag]);

  // ── Sprite layout styles (position, size, filter — no animation strings) ──
  const memoSpriteStyles = useMemo(() => {
    if (!coreStatic || !memoSpriteAnims || !memoLaneSnapshot) return null;
    const {
      isCoopBattle,
      coopUsingSub,
      showAllySub,
      layout: {
        compactDual,
        playerComp,
        enemyComp,
        subComp,
      },
    } = coreStatic;

    const hasSelectableCoopPair = isCoopBattle && showAllySub;
    const mainIsActive = !hasSelectableCoopPair || !coopUsingSub;
    const subIsActive = hasSelectableCoopPair && coopUsingSub;
    const mainFilter = !hasSelectableCoopPair
      ? "none"
      : mainIsActive
        ? "saturate(1) brightness(1) drop-shadow(0 0 12px rgba(99,102,241,0.7))"
        : "saturate(0.82) brightness(0.94)";
    const subFilter = !hasSelectableCoopPair
      ? "none"
      : subIsActive
        ? "saturate(1) brightness(1) drop-shadow(0 0 12px rgba(34,197,94,0.75))"
        : "saturate(0.82) brightness(0.94)";

    const {
      enemySubScale,
      enemySubSize,
      lanePlayerMainScale: resolvedPlayerMainScale,
      lanePlayerSubScale: resolvedPlayerSubScale,
      laneEnemyMainScale: resolvedEnemyMainScale,
      laneEnemySubScale: resolvedEnemySubScale,
      safe,
    } = memoLaneSnapshot;

    const anchorStyle = (placement: ReturnType<typeof resolveBattleSpritePlacement>, rawSize: number, z: number): BattleCssVars => ({
      left: placement.left, top: placement.top, width: placement.width, height: placement.height, zIndex: z,
      '--sprite-raw-width': `${rawSize}px`,
      '--battle-sprite-fit-scale': placement.scale,
      '--battle-lunge-x': `${placement.lungeX}px`,
      '--battle-lunge-y': `${placement.lungeY}px`,
      '--battle-dodge-x': `${placement.dodgeX}px`,
      '--battle-dodge-y': `${placement.dodgeY}px`,
    });
    return {
      enemySubSize,
      lanePlayerMainScale: resolvedPlayerMainScale,
      laneEnemyMainScale: resolvedEnemyMainScale,
      enemyMainSpriteStyle: {
        ...anchorStyle(safe.enemyMain, coreStatic.layout.enemySize, 6),
        "--battle-enemy-main-scale": resolvedEnemyMainScale.toFixed(3),
        "--enemy-main-anim": memoSpriteAnims.enemyMain,
      } as BattleCssVars,
      enemySubSpriteStyle: {
        ...anchorStyle(safe.enemySub, enemySubSize, 4),
        "--enemy-sub-scale": enemySubScale,
        "--battle-enemy-sub-scale": resolvedEnemySubScale.toFixed(3),
        "--enemy-sub-anim": memoSpriteAnims.enemySub,
      } as BattleCssVars,
      enemyMainShadowStyle: {
        "--enemy-shadow-right": `${arenaGeometry.width - safe.enemyMain.cx - safe.enemyMain.width * 0.28}px`,
        "--enemy-shadow-top": `${safe.enemyMain.cy + safe.enemyMain.height / (enemyComp || 1) * 0.45}px`,
        "--enemy-shadow-width": `${safe.enemyMain.width * 0.56}px`,
        "--enemy-shadow-anim": memoSpriteAnims.enemyShadow,
      } as BattleCssVars,
      playerMainSpriteStyle: {
        ...anchorStyle(safe.playerMain, memoLaneSnapshot.mainPlayerSize, coopUsingSub ? 4 : 6),
        "--player-main-filter": mainFilter,
        "--battle-player-main-scale": resolvedPlayerMainScale.toFixed(3),
        "--player-main-z": coopUsingSub ? "4" : "6",
        "--player-main-opacity": mainIsActive ? "1" : ".82",
        "--battle-player-main-dim-scale": mainIsActive
          ? "1"
          : ((playerComp || 1) > 1.3 ? (compactDual ? ".58" : ".68") : ".84"),
        "--player-main-anim": memoSpriteAnims.playerMain,
      } as BattleCssVars,
      playerSubSpriteStyle: {
        ...anchorStyle(safe.playerSub, memoLaneSnapshot.subPlayerSize, coopUsingSub ? 6 : 4),
        "--player-sub-filter": subFilter,
        "--battle-player-sub-scale": resolvedPlayerSubScale.toFixed(3),
        "--player-sub-z": coopUsingSub ? "6" : "4",
        "--player-sub-opacity": subIsActive ? "1" : ".82",
        "--battle-player-sub-dim-scale": subIsActive
          ? "1"
          : ((subComp || 1) > 1.3 ? (compactDual ? ".82" : ".88") : ".88"),
        "--player-sub-anim": memoSpriteAnims.playerSub,
      } as BattleCssVars,
      playerMainShadowStyle: {
        "--player-shadow-left": `${safe.playerMain.cx - safe.playerMain.width * 0.25}px`,
        "--player-shadow-bottom": `${arenaGeometry.height - safe.playerMain.cy - safe.playerMain.height / (playerComp || 1) * 0.45}px`,
        "--player-shadow-width": `${safe.playerMain.width * 0.5}px`,
      } as BattleCssVars,
    };
  }, [coreStatic, memoSpriteAnims, memoLaneSnapshot, arenaGeometry.width, arenaGeometry.height]);

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
  const bossIntent = useMemo(() => getBossIntent({
    battleMode: S.battleMode,
    enemyId: S.enemy?.id,
    hp: S.eHp,
    maxHp: S.enemy?.maxHp ?? 0,
    bossTurn: S.bossTurn,
    bossCharging: S.bossCharging,
    sealedMove: S.sealedMove,
    frozen: S.frozen,
  }), [S.battleMode, S.enemy?.id, S.enemy?.maxHp, S.eHp, S.bossTurn, S.bossCharging, S.sealedMove, S.frozen]);
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

  const effectTarget = memoEffectRoute!.target;
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
      data-paused={S.gamePaused}
      style={impactStyle}
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
        effectSource={memoEffectRoute!.source}
        arenaSize={{ width: arenaGeometry.width, height: arenaGeometry.height }}
        dmgs={S.dmgs}
        parts={S.parts}
        battleMode={S.battleMode}
        moveLevelUpIdx={S.mLvlUp}
        starter={activeStarter || starter}
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
          panelRef={enemyInfoRef}
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
          spriteProfiles={coreStatic.spriteProfiles}
          spriteAnimations={memoSpriteAnims!}
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
          panelRef={playerInfoRef}
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

      </div>

      {/* Stable stage above; all transient status notices stay in the control panel. */}
      <div ref={battlePanelRef} className={battlePanelClassName}>
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
          bossCharging={S.bossCharging && S.phase !== 'menu' && S.phase !== 'question' && S.phase !== 'playerAtk'}
        />
        {/* Move menu */}
        {S.phase === 'menu' && activeStarter && (
          <BattleMoveMenu
            t={t}
            activeStarter={activeStarter}
            isCoopBattle={isCoopBattle}
            coopUsingSub={coopUsingSub}
            coopCanSwitch={coopCanSwitch}
            battleMode={S.battleMode}
            pvpTurn={pvpTurn}
            pvpActiveCharge={pvpActiveCharge}
            pvpActiveCombo={pvpActiveCombo}
            pvpActiveSpecDefReady={pvpActiveSpecDefReady}
            pvpComboTrigger={pvpComboTrigger}
            chargeReadyDisplay={chargeReadyDisplay}
            chargeReady={S.chargeReady}
            sealedTurns={S.sealedTurns}
            moveRuntime={moveRuntime}
            inventory={S.inventory}
            bossIntent={bossIntent}
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
            hintsRevealed={S.hintsRevealed}
            hintSteps={getLearningHintSteps(question, t)}
            hintCost={getLearningHintCost(question, S.hintsRevealed, BALANCE_CONFIG.hint.costPerStep)}
            currentXp={S.pExp}
            onRequestHint={A.requestHint}
          />
        )}

        {/* Text box */}
        {(S.phase === "text" || S.phase === "playerAtk" || S.phase === "enemyAtk" || S.phase === "victory" || S.phase === "ko")
          && <TextBox text={S.bText} onClick={canTapAdvance ? handleAdvance : undefined} />}
      </div>
    </div>
  );
}

export default memo(BattleScreenComponent, areBattleScreenPropsEqual);
