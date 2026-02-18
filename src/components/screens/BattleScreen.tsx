import { useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useSpriteTargets } from '../../hooks/useSpriteTargets';
import { useBattleParallax } from '../../hooks/useBattleParallax';
import { SCENES } from '../../data/scenes';
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
import { buildBattleCore } from './battle/buildBattleCore.ts';
import { useAttackImpactPhase } from './battle/useAttackImpactPhase.ts';
import { BattleMoveMenu } from './battle/BattleMoveMenu.tsx';
import { BattleQuestionPanel } from './battle/BattleQuestionPanel.tsx';
import { BattleEnemyInfoPanel, BattlePlayerInfoPanel } from './battle/BattleInfoPanels.tsx';
import { BattleStatusOverlay } from './battle/BattleStatusOverlay.tsx';
import { BattleFxLayer } from './battle/BattleFxLayer.tsx';
import { BattleArenaSprites } from './battle/BattleArenaSprites.tsx';
import { BattleSceneLayers } from './battle/BattleSceneLayers.tsx';
import { BattleWeatherLayer } from './battle/BattleWeatherLayer.tsx';
import './BattleScreen.css';
type BattleCssVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

function normalizeBossVisualId(id?: string | null): string {
  if (!id) return '';
  return id.startsWith('pvp_') ? id.slice(4) : id;
}

type BattleScreenProps = {
  state: UseBattleState;
  actions: UseBattleActions;
  view: UseBattleView;
  mobile: UseMobileExperienceApi;
  onOpenSettings: (fromScreen: ScreenName) => void;
  t: Translator;
};

export default function BattleScreen({
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
  useBattleParallax({
    hostRef: battleArenaRef,
    // Disable on compact/mobile layout to reduce input/render jitter on lower-end devices.
    enabled: showHeavyFx && !S.gamePaused && !UX.compactUI,
  });
  const { measuredEnemyTarget, measuredPlayerTarget } = useSpriteTargets({
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
  });
  const {
    starter: stateStarter,
    enemy: stateEnemy,
    pLvl,
    pStg,
    battleMode,
    enemySub,
    allySub,
    pHpSub,
    coopActiveSlot,
    pvpTurn,
    pvpStarter2,
    pvpChargeP1,
    pvpChargeP2,
    pvpComboP1,
    pvpComboP2,
    pvpSpecDefP1,
    pvpSpecDefP2,
    pvpBurnP1,
    pvpBurnP2,
    pvpFreezeP1,
    pvpFreezeP2,
    pvpParalyzeP1,
    pvpParalyzeP2,
    pvpStaticP1,
    pvpStaticP2,
    charge,
    chargeReady,
    sealedMove,
    mLvls,
    mHits,
  } = S;
  const { getPow, dualEff } = V;

  const core = useMemo(() => buildBattleCore({
    state: {
      starter: stateStarter,
      enemy: stateEnemy,
      pLvl,
      pStg,
      battleMode,
      enemySub,
      allySub,
      pHpSub,
      coopActiveSlot,
      pvpTurn,
      pvpStarter2,
      pvpChargeP1,
      pvpChargeP2,
      pvpComboP1,
      pvpComboP2,
      pvpSpecDefP1,
      pvpSpecDefP2,
      pvpBurnP1,
      pvpBurnP2,
      pvpFreezeP1,
      pvpFreezeP2,
      pvpParalyzeP1,
      pvpParalyzeP2,
      pvpStaticP1,
      pvpStaticP2,
      charge,
      chargeReady,
      sealedMove,
      mLvls,
      mHits,
    },
    compactUI: UX.compactUI,
    getPow,
    dualEff,
    scenes: SCENES,
  }), [
    stateStarter,
    stateEnemy,
    pLvl,
    pStg,
    battleMode,
    enemySub,
    allySub,
    pHpSub,
    coopActiveSlot,
    pvpTurn,
    pvpStarter2,
    pvpChargeP1,
    pvpChargeP2,
    pvpComboP1,
    pvpComboP2,
    pvpSpecDefP1,
    pvpSpecDefP2,
    pvpBurnP1,
    pvpBurnP2,
    pvpFreezeP1,
    pvpFreezeP2,
    pvpParalyzeP1,
    pvpParalyzeP2,
    pvpStaticP1,
    pvpStaticP2,
    charge,
    chargeReady,
    sealedMove,
    mLvls,
    mHits,
    getPow,
    dualEff,
    UX.compactUI,
  ]);

  const memoSceneStyles = useMemo(() => {
    if (!core) return null;
    const { scene, layout } = core;
    const bgStyle: CSSProperties | undefined = scene.bgImg
      ? { backgroundImage: `url(${scene.bgImg})` }
      : undefined;
    return {
      sceneBgStyle: bgStyle,
      sceneSkyStyle: { "--scene-sky": scene.sky } as BattleCssVars,
      sceneGroundStyle: { "--scene-ground": scene.ground } as BattleCssVars,
      sceneTopPlatformStyle: { "--scene-platform-top": scene.platform2 } as BattleCssVars,
      sceneBottomPlatformStyle: { "--scene-platform-bottom": scene.platform1 } as BattleCssVars,
      enemyInfoStyle: { "--battle-enemy-info-right": layout.enemyInfoRight } as BattleCssVars,
      playerInfoStyle: { "--battle-player-info-left": layout.playerInfoLeft } as BattleCssVars,
    };
  }, [core]);

  const memoEffectTarget = useMemo(() => {
    if (!core) return null;
    const {
      layout: {
        enemyMainRightPct,
        enemyTopPct,
        playerMainLeftPct: rawMainLeftPct,
        playerMainBottomPct: rawMainBottomPct,
        playerSubLeftPct: rawSubLeftPct,
        playerSubBottomPct: rawSubBottomPct,
        mainPlayerSize: rawMainSize,
        subPlayerSize: rawSubSize,
        enemySize,
      },
      coopUsingSub,
    } = core;

    const playerMainLeftPct = coopUsingSub ? rawSubLeftPct : rawMainLeftPct;
    const playerMainBottomPct = coopUsingSub ? rawSubBottomPct : rawMainBottomPct;
    const mainPlayerSize = coopUsingSub ? rawSubSize : rawMainSize;

    const enemyHeight = enemySize * 100 / 120;
    const enemyFallbackTarget = {
      top: `calc(${enemyTopPct}% + ${enemyHeight / 2}px)`,
      right: `calc(${enemyMainRightPct}% + ${enemySize / 2}px)`,
      flyRight: enemyMainRightPct + enemySize / 2 * 100 / 390,
      flyTop: enemyTopPct + enemyHeight / 2 * 100 / 550,
    };

    const playerMainHeight = mainPlayerSize * 100 / 120;
    const playerCenterTopPct = Math.max(8, 100 - playerMainBottomPct - (playerMainHeight * 100 / 550) / 2);
    const playerCenterRightPct = Math.max(8, 100 - playerMainLeftPct - (mainPlayerSize * 100 / 390) / 2);
    const playerFallbackTarget = {
      top: `calc(${playerCenterTopPct}% + 0px)`,
      right: `calc(${playerCenterRightPct}% + 0px)`,
      flyRight: playerCenterRightPct,
      flyTop: playerCenterTopPct,
    };

    const enemyTarget = measuredEnemyTarget || enemyFallbackTarget;
    const playerTarget = measuredPlayerTarget || playerFallbackTarget;
    return S.atkEffect?.targetSide === "player" ? playerTarget : enemyTarget;
  }, [core, measuredEnemyTarget, measuredPlayerTarget, S.atkEffect?.targetSide]);

  const memoSpriteStyles = useMemo(() => {
    if (!core) return null;
    const {
      enemy,
      isCoopBattle,
      coopUsingSub,
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
      },
    } = core;

    const isKoPhase = S.phase === "ko" || S.phase === "victory";
    const enemyDefeated = isKoPhase && S.eHp === 0;
    const enemySubId = S.enemySub?.id ?? '';
    const enemySubIsEvolved = Boolean(S.enemySub?.isEvolved);
    const enemyLowHp = enemy.maxHp > 0 && S.eHp > 0 && S.eHp / enemy.maxHp < 0.25;
    const enemyIsBossVisual = BOSS_IDS.has(normalizeBossVisualId(enemy.id));
    const enemySubIsBossVisual = BOSS_IDS.has(normalizeBossVisualId(enemySubId));
    const enemyIdleAnim = enemyIsBossVisual
      ? "bossFloat 2.5s ease-in-out infinite, bossPulse 4s ease infinite"
      : enemyLowHp
        ? "float 1.4s ease-in-out infinite, struggle .8s ease-in-out infinite"
        : "float 3s ease-in-out infinite";

    const playerMainLeftPct = coopUsingSub ? rawSubLeftPct : rawMainLeftPct;
    const playerMainBottomPct = coopUsingSub ? rawSubBottomPct : rawMainBottomPct;
    const playerSubLeftPct = coopUsingSub ? rawMainLeftPct : rawSubLeftPct;
    const playerSubBottomPct = coopUsingSub ? rawMainBottomPct : rawSubBottomPct;
    const mainPlayerSize = coopUsingSub ? rawSubSize : rawMainSize;

    const isLargeEnemySub = enemySubId === "golumn" || enemySubId === "golumn_mud";
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

    const enemyHeight = enemySize * 100 / 120;
    return {
      enemySubSize,
      enemyMainSpriteStyle: {
        "--enemy-main-right": `${enemyMainRightPct}%`,
        "--enemy-main-top": `${enemyTopPct}%`,
        "--enemy-main-anim": enemyDefeated
          ? "enemyDissolve .9s ease-out forwards"
          : S.eAnim || (UX.lowPerfMode ? "none" : enemyIdleAnim),
      } as BattleCssVars,
      enemySubSpriteStyle: {
        "--enemy-sub-right": `${enemySubRightPct}%`,
        "--enemy-sub-top": `${enemySubTopPct}%`,
        "--enemy-sub-scale": enemySubScale,
        "--enemy-sub-anim": UX.lowPerfMode ? "none" : "float 3.8s ease-in-out infinite",
      } as BattleCssVars,
      enemyMainShadowStyle: {
        "--enemy-shadow-right": `calc(${enemyMainRightPct}% + ${Math.round(enemySize * 0.18)}px)`,
        "--enemy-shadow-top": `calc(${enemyTopPct}% + ${Math.round(enemyHeight * 0.72)}px)`,
        "--enemy-shadow-width": `${Math.round(enemySize * 0.56)}px`,
        "--enemy-shadow-anim": enemyIsBossVisual ? "bossShadowPulse 2.5s ease-in-out infinite" : "shadowPulse 3s ease-in-out infinite",
      } as BattleCssVars,
      playerMainSpriteStyle: {
        "--player-main-left": `${playerMainLeftPct}%`,
        "--player-main-bottom": `${playerMainBottomPct}%`,
        "--player-main-filter": isCoopBattle && !coopUsingSub ? "drop-shadow(0 0 12px rgba(99,102,241,0.7))" : "none",
        "--player-main-z": coopUsingSub ? "4" : "6",
        "--player-main-opacity": coopUsingSub ? ".84" : "1",
        "--player-main-anim": S.pAnim || (UX.lowPerfMode ? "none" : "floatFlip 3s ease-in-out infinite"),
      } as BattleCssVars,
      playerSubSpriteStyle: {
        "--player-sub-left": `${playerSubLeftPct}%`,
        "--player-sub-bottom": `${playerSubBottomPct}%`,
        "--player-sub-filter": isCoopBattle && coopUsingSub ? "drop-shadow(0 0 12px rgba(34,197,94,0.75))" : "none",
        "--player-sub-z": coopUsingSub ? "6" : "4",
        "--player-sub-opacity": coopUsingSub ? "1" : ".84",
        "--player-sub-anim": UX.lowPerfMode ? "none" : "floatFlip 3.8s ease-in-out infinite",
      } as BattleCssVars,
      playerMainShadowStyle: {
        "--player-shadow-left": `calc(${playerMainLeftPct}% + ${Math.round(mainPlayerSize * 0.48)}px)`,
        "--player-shadow-bottom": `${Math.max(8, playerMainBottomPct - 1)}%`,
        "--player-shadow-width": `${Math.round(mainPlayerSize * 0.5)}px`,
      } as BattleCssVars,
    };
  }, [core, S.eHp, S.eAnim, S.enemySub?.id, S.enemySub?.isEvolved, S.pAnim, S.phase, UX.lowPerfMode]);

  if (!core) return (
    <div className="battle-loading-wrap">
      <div className="battle-loading-icon">⚔️</div>
      <div className="battle-loading-text">{t("app.loading.battle", "Preparing battle...")}</div>
    </div>
  );

  // ─── Battle screen locals ───
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
    pvpActiveCharge,
    pvpActiveCombo,
    pvpActiveSpecDefReady,
    chargeDisplay,
    chargeReadyDisplay,
    eSvg,
    eSubSvg,
    pSubSvg,
    pSvg,
    mainMaxHp,
    subMaxHp,
    sceneKey,
    scene,
    layout,
    pvpEnemyBarActive,
    mainBarActive,
    subBarActive,
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
  } = core;

  const canTapAdvance = S.phase === "text" || S.phase === "victory";
  const pvpComboTrigger = PVP_BALANCE.passive.specDefComboTrigger || 4;
  const {
    mainPlayerSize: rawMainSize,
    subPlayerSize: rawSubSize,
    enemySize: eSize,
  } = layout;
  const mainPlayerSize = coopUsingSub ? rawSubSize : rawMainSize;
  const subPlayerSize = coopUsingSub ? rawMainSize : rawSubSize;

  const effectTarget = memoEffectTarget!;
  const question = S.q;
  const feedback = S.fb;
  const selectedMove = activeStarter && S.selIdx != null
    ? activeStarter.moves[S.selIdx]
    : null;
  const questionTypeLabel = !question
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
    : t("battle.qtype.mixed", "Mixed");
  const specDefReadyLabel = starter.type === "fire"
    ? t("battle.specDef.fire", "🛡️ Shield")
    : starter.type === "water"
      ? t("battle.specDef.water", "💨 Perfect Dodge")
      : starter.type === "electric"
        ? t("battle.specDef.electric", "⚡ Paralysis")
        : starter.type === "light"
          ? t("battle.specDef.light", "✨ Lion Roar")
          : t("battle.specDef.grass", "🌿 Reflect");
  const specDefToneClass = starter.type === "fire"
    ? "battle-pill-specdef-fire"
    : starter.type === "water"
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
    sceneTopPlatformStyle,
    sceneBottomPlatformStyle,
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
  } = memoSpriteStyles!;
  const impactPhaseClass = showHeavyFx ? `battle-impact-${impactPhase}` : "battle-impact-idle";

  return (
    <div
      id="main-content"
      ref={battleRootRef}
      className={`battle-root ${UX.compactUI ? "compact-ui" : ""} ${UX.lowPerfMode ? "low-perf" : ""} ${canTapAdvance ? "battle-root-advance" : ""} ${impactPhaseClass}`}
      role={canTapAdvance ? "button" : undefined}
      tabIndex={canTapAdvance ? 0 : -1}
      aria-label={canTapAdvance ? t("a11y.battle.advance", "Advance to next step") : undefined}
      onKeyDown={(e) => {
        if (!canTapAdvance) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          A.advance();
        }
      }}
      onClick={canTapAdvance ? A.advance : undefined}
    >
      {/* Pause overlay */}
      {S.gamePaused && <div
        role="button"
        tabIndex={0}
        className={`battle-pause-overlay ${UX.lowPerfMode ? "low-perf" : ""}`}
        aria-label={t("a11y.overlay.pauseResume", "Resume game")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            A.togglePause();
          }
        }}
        onClick={A.togglePause}
      >
        <div className="battle-pause-icon">⏸️</div>
        <div className="battle-pause-title">{t("app.pause.title", "Game Paused")}</div>
        <div className="battle-pause-hint">{t("app.pause.hint", "Tap anywhere to resume")}</div>
      </div>}

      <BattleFxLayer
        t={t}
        showHeavyFx={showHeavyFx}
        lowPerfMode={UX.lowPerfMode}
        impactPhase={impactPhase}
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
        phase={S.phase}
        enemyDrops={enemy.drops}
        defAnim={S.defAnim}
        effMsg={S.effMsg}
        onRemoveDamage={A.rmD}
        onRemoveParticle={A.rmP}
        onDismissAchievement={A.dismissAch}
      />

      {/* ═══ Battle arena ═══ */}
      <div className="battle-arena" ref={battleArenaRef}>
        <BattleSceneLayers
          showHeavyFx={showHeavyFx}
          bgStyle={sceneBgStyle}
          skyStyle={sceneSkyStyle}
          groundStyle={sceneGroundStyle}
          platformTopStyle={sceneTopPlatformStyle}
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
          enemySpriteRef={enemySpriteRef}
          playerSpriteRef={playerSpriteRef}
          enemyMainSpriteStyle={enemyMainSpriteStyle}
          enemySubSpriteStyle={enemySubSpriteStyle}
          enemyMainShadowStyle={enemyMainShadowStyle}
          playerMainSpriteStyle={playerMainSpriteStyle}
          playerSubSpriteStyle={playerSubSpriteStyle}
          playerMainShadowStyle={playerMainShadowStyle}
          showEnemyShadow={!S.eAnim && !UX.lowPerfMode}
          showPlayerShadow={!S.pAnim && !UX.lowPerfMode}
        />

        {/* Player platform & info */}
        <div className="battle-scene-platform-bottom" style={sceneBottomPlatformStyle} />
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
      <div className={`battle-panel ${S.phase === "question" ? "is-question" : "is-normal"}`}>
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
            onSelectMove={A.selectMove}
            onToggleCoopActive={A.toggleCoopActive}
            onTogglePause={A.togglePause}
            onOpenSettings={() => onOpenSettings('battle')}
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
        {(S.phase === "text" || S.phase === "playerAtk" || S.phase === "enemyAtk" || S.phase === "victory" || S.phase === "ko") && <TextBox text={S.bText} onClick={A.advance} />}
      </div>
    </div>
  );
}
