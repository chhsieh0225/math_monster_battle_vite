import { useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useSpriteTargets } from '../../hooks/useSpriteTargets';
import { SCENES } from '../../data/scenes';
import { PVP_BALANCE } from '../../data/pvpBalance';
import { hasSpecialTrait } from '../../utils/traits';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import MonsterSprite from '../ui/MonsterSprite';
import HPBar from '../ui/HPBar';
import XPBar from '../ui/XPBar';
import DamagePopup from '../ui/DamagePopup';
import Particle from '../ui/Particle';
import TextBox from '../ui/TextBox';
import AttackEffect from '../effects/AttackEffect';
import AmbientParticles from '../effects/AmbientParticles';
import AchievementPopup from '../ui/AchievementPopup';
import { ACH_MAP } from '../../data/achievements';
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
import './BattleScreen.css';
type BattleCssVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

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
  const enemySpriteRef = useRef<HTMLDivElement | null>(null);
  const playerSpriteRef = useRef<HTMLDivElement | null>(null);
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
  const isKoPhase = S.phase === "ko" || S.phase === "victory";
  const enemyDefeated = isKoPhase && S.eHp === 0;
  const pvpComboTrigger = PVP_BALANCE.passive.specDefComboTrigger || 4;
  const {
    compactDual,
    enemyInfoRight,
    playerInfoLeft,
    enemyMainRightPct,
    enemySubRightPct,
    enemySubTopPct,
    playerMainLeftPct: rawMainLeftPct,
    playerMainBottomPct: rawMainBottomPct,
    playerSubLeftPct: rawSubLeftPct,
    playerSubBottomPct: rawSubBottomPct,
    mainPlayerSize: rawMainSize,
    subPlayerSize: rawSubSize,
    enemySize: eSize,
    enemyTopPct: eTopPct,
  } = layout;

  // Co-op: swap main/sub positions AND sizes so active character is always in front
  const playerMainLeftPct = coopUsingSub ? rawSubLeftPct : rawMainLeftPct;
  const playerMainBottomPct = coopUsingSub ? rawSubBottomPct : rawMainBottomPct;
  const playerSubLeftPct = coopUsingSub ? rawMainLeftPct : rawSubLeftPct;
  const playerSubBottomPct = coopUsingSub ? rawMainBottomPct : rawSubBottomPct;
  const mainPlayerSize = coopUsingSub ? rawSubSize : rawMainSize;
  const subPlayerSize = coopUsingSub ? rawMainSize : rawSubSize;
  const hpFocusClass = (active: boolean) => `battle-hp-focus ${active ? "is-active" : "is-dim"}`;

  // Enemy visual center fallback (used before first DOM measurement)
  // Note: MonsterSprite height = size * 100 / 120, so center Y uses sprite height / 2.
  const eHeight = eSize * 100 / 120;
  const enemyFallbackTarget = {
    top: `calc(${eTopPct}% + ${eHeight / 2}px)`,
    right: `calc(${enemyMainRightPct}% + ${eSize / 2}px)`,
    flyRight: enemyMainRightPct + eSize / 2 * 100 / 390,
    flyTop: eTopPct + eHeight / 2 * 100 / 550,
  };
  const pMainHeight = mainPlayerSize * 100 / 120;
  const playerCenterTopPct = Math.max(8, 100 - playerMainBottomPct - (pMainHeight * 100 / 550) / 2);
  const playerCenterRightPct = Math.max(8, 100 - playerMainLeftPct - (mainPlayerSize * 100 / 390) / 2);
  const playerFallbackTarget = {
    top: `calc(${playerCenterTopPct}% + 0px)`,
    right: `calc(${playerCenterRightPct}% + 0px)`,
    flyRight: playerCenterRightPct,
    flyTop: playerCenterTopPct,
  };
  const eTarget = measuredEnemyTarget || enemyFallbackTarget;
  const pTarget = measuredPlayerTarget || playerFallbackTarget;
  const effectTarget = S.atkEffect?.targetSide === "player" ? pTarget : eTarget;
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
  const toastShadowStyle: BattleCssVars | undefined = S.effMsg
    ? { "--battle-eff-shadow": `0 8px 22px ${S.effMsg.color}55` }
    : undefined;
  const sceneBgStyle: CSSProperties | undefined = scene.bgImg
    ? { backgroundImage: `url(${scene.bgImg})` }
    : undefined;
  const sceneSkyStyle: BattleCssVars = { "--scene-sky": scene.sky };
  const sceneGroundStyle: BattleCssVars = { "--scene-ground": scene.ground };
  const sceneTopPlatformStyle: BattleCssVars = { "--scene-platform-top": scene.platform2 };
  const sceneBottomPlatformStyle: BattleCssVars = { "--scene-platform-bottom": scene.platform1 };
  const enemyInfoStyle: BattleCssVars = { "--battle-enemy-info-right": enemyInfoRight };
  const playerInfoStyle: BattleCssVars = { "--battle-player-info-left": playerInfoLeft };
  const enemyLowHp = enemy.maxHp > 0 && S.eHp > 0 && S.eHp / enemy.maxHp < 0.25;
  const enemyIdleAnim = BOSS_IDS.has(enemy.id)
    ? "bossFloat 2.5s ease-in-out infinite, bossPulse 4s ease infinite"
    : enemyLowHp
      ? "float 1.4s ease-in-out infinite, struggle .8s ease-in-out infinite"
      : "float 3s ease-in-out infinite";
  const enemyMainSpriteStyle: BattleCssVars = ({
    "--enemy-main-right": `${enemyMainRightPct}%`,
    "--enemy-main-top": `${eTopPct}%`,
    "--enemy-main-anim": enemyDefeated
      ? "enemyDissolve .9s ease-out forwards"
      : S.eAnim || (UX.lowPerfMode ? "none" : enemyIdleAnim),
  });
  const isLargeEnemySub = S.enemySub?.id === "golumn" || S.enemySub?.id === "golumn_mud";
  const enemySubScale = isLargeEnemySub
    ? (compactDual ? "0.86" : "0.94")
    : (compactDual ? "0.72" : "0.8");
  const enemySubSize = !S.enemySub
    ? 96
    : BOSS_IDS.has(S.enemySub.id)
      ? 160
      : isLargeEnemySub
        ? 150
        : S.enemySub.isEvolved
          ? 120
          : 96;
  const enemySubSpriteStyle: BattleCssVars = ({
    "--enemy-sub-right": `${enemySubRightPct}%`,
    "--enemy-sub-top": `${enemySubTopPct}%`,
    "--enemy-sub-scale": enemySubScale,
    "--enemy-sub-anim": UX.lowPerfMode ? "none" : "float 3.8s ease-in-out infinite",
  });
  const enemyMainShadowStyle: BattleCssVars = ({
    "--enemy-shadow-right": `calc(${enemyMainRightPct}% + ${Math.round(eSize * 0.18)}px)`,
    "--enemy-shadow-top": `calc(${eTopPct}% + ${Math.round(eHeight * 0.72)}px)`,
    "--enemy-shadow-width": `${Math.round(eSize * 0.56)}px`,
    "--enemy-shadow-anim": BOSS_IDS.has(enemy.id) ? "bossShadowPulse 2.5s ease-in-out infinite" : "shadowPulse 3s ease-in-out infinite",
  });
  const playerMainSpriteStyle: BattleCssVars = ({
    "--player-main-left": `${playerMainLeftPct}%`,
    "--player-main-bottom": `${playerMainBottomPct}%`,
    "--player-main-filter": isCoopBattle && !coopUsingSub ? "drop-shadow(0 0 12px rgba(99,102,241,0.7))" : "none",
    "--player-main-z": coopUsingSub ? "4" : "6",
    "--player-main-opacity": coopUsingSub ? ".84" : "1",
    "--player-main-anim": S.pAnim || (UX.lowPerfMode ? "none" : "floatFlip 3s ease-in-out infinite"),
  });
  const playerSubSpriteStyle: BattleCssVars = ({
    "--player-sub-left": `${playerSubLeftPct}%`,
    "--player-sub-bottom": `${playerSubBottomPct}%`,
    "--player-sub-filter": isCoopBattle && coopUsingSub ? "drop-shadow(0 0 12px rgba(34,197,94,0.75))" : "none",
    "--player-sub-z": coopUsingSub ? "6" : "4",
    "--player-sub-opacity": coopUsingSub ? "1" : ".84",
    "--player-sub-anim": UX.lowPerfMode ? "none" : "floatFlip 3.8s ease-in-out infinite",
  });
  const playerMainShadowStyle: BattleCssVars = ({
    "--player-shadow-left": `calc(${playerMainLeftPct}% + ${Math.round(mainPlayerSize * 0.48)}px)`,
    "--player-shadow-bottom": `${Math.max(8, playerMainBottomPct - 1)}%`,
    "--player-shadow-width": `${Math.round(mainPlayerSize * 0.5)}px`,
  });
  const isUltimateEffect = !!(S.atkEffect && S.atkEffect.idx >= 3);
  const ultimateToneClass = S.atkEffect?.type === "fire"
    ? "is-fire"
    : S.atkEffect?.type === "water"
      ? "is-water"
      : S.atkEffect?.type === "electric"
        ? "is-electric"
        : S.atkEffect?.type === "grass"
          ? "is-grass"
          : S.atkEffect?.type === "light"
            ? "is-light"
            : "is-dark";
  const ultimateSyncStyle: BattleCssVars = ({
    "--ult-sync-top": effectTarget.top,
    "--ult-sync-right": effectTarget.right,
  });
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

      {/* Hit reaction layer */}
      {showHeavyFx && impactPhase !== "idle" && (
        <div className={`battle-hit-react-layer is-${impactPhase} ${isUltimateEffect ? "is-ult" : ""}`} aria-hidden="true" />
      )}

      {/* Popups & particles */}
      {S.dmgs.map((d) => <DamagePopup key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} onDone={() => A.rmD(d.id)} />)}
      {showHeavyFx && S.parts.map((p) => <Particle key={p.id} emoji={p.emoji} x={p.x} y={p.y} seed={p.id} onDone={() => A.rmP(p.id)} />)}

      {/* Move level-up toast */}
      {S.battleMode !== "pvp" && S.mLvlUp !== null && (
        <div className="battle-level-toast">
          {starter.moves[S.mLvlUp].icon} {starter.moves[S.mLvlUp].name}{" "}
          {t("battle.moveLevelUp", "leveled up to Lv.{level}! Power -> {power}", {
            level: S.mLvls[S.mLvlUp],
            power: V.getPow(S.mLvlUp),
          })}
        </div>
      )}
      {/* Achievement popup */}
      {S.achPopup && ACH_MAP[S.achPopup] && <AchievementPopup achievement={ACH_MAP[S.achPopup]} onDone={A.dismissAch} />}

      {/* Attack effects */}
      {showHeavyFx && isUltimateEffect && (
        <div className={`battle-ult-sync ${ultimateToneClass}`} style={ultimateSyncStyle}>
          <div className="battle-ult-sync-flash" />
          <div className="battle-ult-sync-core" />
          <div className="battle-ult-sync-ring" />
          <div className="battle-ult-sync-ring battle-ult-sync-ring-alt" />
        </div>
      )}
      {showHeavyFx && S.atkEffect && (
        <AttackEffect type={S.atkEffect.type} idx={S.atkEffect.idx} lvl={S.atkEffect.lvl} target={effectTarget} />
      )}

      {/* Victory drop toast */}
      {S.phase === "victory" && !UX.lowPerfMode && Array.isArray(enemy.drops) && enemy.drops.length > 0 && (
        <div className="battle-drop-toast" aria-hidden="true">
          {enemy.drops[0]}
        </div>
      )}

      {/* Special Defense animations */}
      {showHeavyFx && S.defAnim === "fire" && (
        <div className="battle-def-fx battle-def-fx-fire">
          <div className="battle-def-layer battle-def-layer-fire-core" />
          <div className="battle-def-layer battle-def-layer-fire-ring" />
          <div className="battle-def-icon battle-def-icon-fire">🛡️</div>
        </div>
      )}
      {showHeavyFx && S.defAnim === "water" && (
        <div className="battle-def-fx battle-def-fx-water">
          <div className="battle-def-layer battle-def-layer-water-ripple-1" />
          <div className="battle-def-layer battle-def-layer-water-ripple-2" />
          <div className="battle-def-layer battle-def-layer-water-ripple-3" />
          <div className="battle-def-icon battle-def-icon-water">💨</div>
        </div>
      )}
      {showHeavyFx && S.defAnim === "grass" && (
        <div className="battle-def-fx battle-def-fx-grass">
          <div className="battle-def-layer battle-def-layer-grass-core" />
          <div className="battle-def-layer battle-def-layer-grass-ring" />
          <div className="battle-def-icon battle-def-icon-grass">🌿</div>
        </div>
      )}
      {showHeavyFx && S.defAnim === "electric" && (
        <div className="battle-def-fx battle-def-fx-electric">
          <div className="battle-def-layer battle-def-layer-electric-core" />
          <div className="battle-def-layer battle-def-layer-electric-ring" />
          <div className="battle-def-icon battle-def-icon-electric">⚡</div>
        </div>
      )}
      {showHeavyFx && S.defAnim === "light" && (
        <div className="battle-def-fx battle-def-fx-light">
          <div className="battle-def-layer battle-def-layer-light-core" />
          <div className="battle-def-layer battle-def-layer-light-ring" />
          <div className="battle-def-layer battle-def-layer-light-ring-outer" />
          <div className="battle-def-icon battle-def-icon-light">✨</div>
        </div>
      )}
      {showHeavyFx && S.defAnim && <div className={`battle-def-screen battle-def-screen-${S.defAnim}`} />}

      {/* Type effectiveness popup */}
      {S.effMsg && (
        <div
          className={`battle-eff-toast ${S.effMsg.color === "#22c55e" ? "battle-eff-toast-good" : "battle-eff-toast-bad"}`}
          style={toastShadowStyle}
        >
          {S.effMsg.text}
        </div>
      )}

      {/* ═══ Battle arena ═══ */}
      <div className="battle-arena">
        {scene.bgImg && <div className="scene-bg" style={sceneBgStyle} />}
        <div className="battle-scene-sky" style={sceneSkyStyle} />
        <div className="battle-scene-ground" style={sceneGroundStyle} />
        <div className="battle-scene-platform-top" style={sceneTopPlatformStyle} />
        <div className="battle-scene-deco">{showHeavyFx && scene.Deco && <scene.Deco />}</div>

        {/* Enemy info */}
        <div className="battle-info-enemy" style={enemyInfoStyle}>
          <div className={hpFocusClass(pvpEnemyBarActive)}>
            <HPBar
              cur={S.eHp}
              max={enemy.maxHp}
              color={enemy.c1}
              label={`${enemy.typeIcon}${enemy.typeIcon2 || ''}${enemy.name} ${t("battle.level", "Lv.{level}", { level: enemy.lvl })}`}
            />
          </div>
          {showEnemySub && S.enemySub && (
            <div className={`battle-hp-sub-row ${hpFocusClass(false)}`}>
              <HPBar
                cur={S.eHpSub}
                max={S.enemySub.maxHp}
                color={S.enemySub.c1}
                label={`${t("battle.subUnit", "Sub")} ${S.enemySub.typeIcon}${S.enemySub.name} ${t("battle.level", "Lv.{level}", { level: S.enemySub.lvl })}`}
              />
            </div>
          )}
          <div className="battle-status-row">
            {S.battleMode === "pvp" ? (
              <>
                {pvpEnemyBurn > 0 && <div className="battle-status-chip is-burn">🔥 {t("battle.status.burnStack", "Burn x{count}", { count: pvpEnemyBurn })}</div>}
                {pvpEnemyFreeze && <div className="battle-status-chip is-freeze">❄️ {t("battle.status.freeze", "Freeze")}</div>}
                {pvpEnemyParalyze && <div className="battle-status-chip is-paralyze">⚡ {t("battle.status.paralyze", "Paralyze")}</div>}
                {pvpEnemyStatic > 0 && <div className="battle-status-chip is-static">⚡ {t("battle.status.chargeStack", "Charge x{count}", { count: pvpEnemyStatic })}</div>}
                {pvpEnemySpecDef && <div className="battle-status-chip is-counter">🛡️ {t("battle.status.counterReady", "Counter Ready")}</div>}
                {!pvpEnemySpecDef && pvpEnemyCombo > 0 && <div className="battle-status-chip is-counter-soft">🛡️ {t("battle.status.comboProgress", "Combo {count}/{target}", { count: pvpEnemyCombo, target: pvpComboTrigger })}</div>}
              </>
            ) : (
              <>
                {hasSpecialTrait(enemy.traitName, enemy.traitDesc) && <div className="battle-status-chip is-counter-soft">✦{enemy.traitName}</div>}
                {S.burnStack > 0 && <div className="battle-status-chip is-burn">🔥 {t("battle.status.burnStack", "Burn x{count}", { count: S.burnStack })}</div>}
                {S.frozen && <div className="battle-status-chip is-freeze">❄️ {t("battle.status.freeze", "Freeze")}</div>}
                {S.staticStack > 0 && <div className="battle-status-chip is-static">⚡ {t("battle.status.staticStack", "Static x{count}", { count: S.staticStack })}{S.staticStack >= 2 ? " ⚠️" : ""}</div>}
                {S.bossPhase >= 2 && <div className="battle-status-chip is-boss">{S.bossPhase >= 3 ? t("battle.status.bossAwaken", "💀 Awaken ATKx2") : t("battle.status.bossRage", "💀 Rage ATKx1.5")}</div>}
                {S.bossCharging && <div className="battle-status-chip is-charge">⚠️ {t("battle.status.charging", "Charging!")}</div>}
              </>
            )}
          </div>
        </div>

        {/* Enemy sprite */}
        <div ref={enemySpriteRef} className="battle-sprite-enemy-main" style={enemyMainSpriteStyle}>
          <MonsterSprite svgStr={eSvg} size={eSize} />
          {showHeavyFx && <AmbientParticles type={enemy.mType || 'grass'} type2={enemy.mType2} size={eSize} seed={`e-${enemy.id}`} />}
        </div>
        {showEnemySub && S.enemySub && eSubSvg && (
          <div className="battle-sprite-enemy-sub" style={enemySubSpriteStyle}>
            <MonsterSprite svgStr={eSubSvg} size={enemySubSize} />
          </div>
        )}
        {!S.eAnim && !UX.lowPerfMode && <div className="battle-sprite-enemy-shadow" style={enemyMainShadowStyle} />}

        {/* Player platform & info */}
        <div className="battle-scene-platform-bottom" style={sceneBottomPlatformStyle} />
        <div className="battle-info-player" style={playerInfoStyle}>
          <div className={hpFocusClass(mainBarActive)}>
            <HPBar
              cur={S.pHp}
              max={mainMaxHp}
              color="#6366f1"
              label={`${isCoopBattle && !coopUsingSub ? "▶ " : ""}${st.name} ${t("battle.level", "Lv.{level}", { level: S.pLvl })}`}
            />
          </div>
          {showAllySub && S.allySub && (
            <div className={`battle-hp-sub-row ${hpFocusClass(subBarActive)}`}>
              <HPBar
                cur={S.pHpSub}
                max={subMaxHp}
                color={S.allySub.c1}
                label={`${isCoopBattle && coopUsingSub ? "▶ " : ""}${t("battle.partner", "Partner")} ${S.allySub.typeIcon}${S.allySub.name}`}
              />
            </div>
          )}
          <XPBar exp={S.pExp} max={S.expNext} />
          {S.battleMode === "pvp" ? (
            <div className="battle-status-row">
              {pvpPlayerBurn > 0 && <div className="battle-status-chip is-burn">🔥 {t("battle.status.burnStack", "Burn x{count}", { count: pvpPlayerBurn })}</div>}
              {pvpPlayerFreeze && <div className="battle-status-chip is-freeze">❄️ {t("battle.status.freeze", "Freeze")}</div>}
              {pvpPlayerParalyze && <div className="battle-status-chip is-paralyze">⚡ {t("battle.status.paralyze", "Paralyze")}</div>}
              {pvpPlayerStatic > 0 && <div className="battle-status-chip is-static">⚡ {t("battle.status.chargeStack", "Charge x{count}", { count: pvpPlayerStatic })}</div>}
              {pvpPlayerSpecDef && <div className="battle-status-chip is-counter">🛡️ {t("battle.status.counterReady", "Counter Ready")}</div>}
              {!pvpPlayerSpecDef && pvpPlayerCombo > 0 && <div className="battle-status-chip is-counter-soft">🛡️ {t("battle.status.comboProgress", "Combo {count}/{target}", { count: pvpPlayerCombo, target: pvpComboTrigger })}</div>}
            </div>
          ) : (
            <>
              {S.cursed && <div className="battle-status-chip is-curse battle-status-chip-inline">💀 {t("battle.status.curse", "Cursed: next attack weakened")}</div>}
            </>
          )}
        </div>

        {/* Player sprite */}
        <div ref={playerSpriteRef} className="battle-sprite-player-main" style={playerMainSpriteStyle}>
          <MonsterSprite svgStr={pSvg} size={mainPlayerSize} />
          {showHeavyFx && <AmbientParticles type={starter.type || 'grass'} size={mainPlayerSize} seed={`p-${starter.type}`} count={5} />}
        </div>
        {showAllySub && pSubSvg && (
          <div className="battle-sprite-player-sub" style={playerSubSpriteStyle}>
            <MonsterSprite svgStr={pSubSvg} size={subPlayerSize} />
          </div>
        )}
        {!S.pAnim && !UX.lowPerfMode && <div className="battle-sprite-player-shadow" style={playerMainShadowStyle} />}

        <div className={`battle-top-right-stack ${UX.lowPerfMode ? "low-perf" : ""}`} aria-live="polite" aria-atomic="true">
          {S.streak >= 2 && <div className="battle-pill is-streak">🔥 {t("battle.streak", "{count} combo!", { count: S.streak })}</div>}
          {S.passiveCount >= 1 && !S.specDef && <div className="battle-pill is-passive">🛡️ {S.passiveCount}/8</div>}
          {S.timedMode && S.streak < 2 && <div className="battle-pill is-timed">⏱️ {t("battle.timed", "Timed")}</div>}
          {S.diffLevel !== 2 && (
            <div className={`battle-pill ${S.diffLevel > 2 ? "is-diff-up" : "is-diff-down"}`}>
              {S.diffLevel > 2 ? t("battle.diff.up", "📈 Difficulty +{value}", { value: S.diffLevel - 2 }) : t("battle.diff.down", "📉 Difficulty {value}", { value: S.diffLevel - 2 })}
            </div>
          )}
        </div>

        {/* Charge meter */}
        <div className={`battle-charge-meter ${UX.lowPerfMode ? "low-perf" : ""}`}>
          {[0, 1, 2].map(i => <div key={i} className={`battle-charge-dot ${i < chargeDisplay ? "is-on" : ""} ${!UX.lowPerfMode && i < chargeDisplay ? "is-glow" : ""}`} />)}
          {chargeReadyDisplay && <span className="battle-charge-max">{t("battle.charge.max", "MAX!")}</span>}
        </div>

        {/* Special defense ready badge */}
        <div className="battle-left-badge-stack" aria-live="polite" aria-atomic="true">
          {S.bossPhase >= 3 && <div className="battle-pill is-last-stand">{t("battle.lastStand", "🔥 Last Stand DMGx1.3")}</div>}
          {S.specDef && <div className={`battle-pill is-specdef ${specDefToneClass}`}>{specDefReadyLabel} {t("battle.ready", "Ready!")}</div>}
        </div>
        {S.bossCharging && <div className="battle-boss-hint">⚠️ {t("battle.bossBreakHint", "Answer correctly to interrupt charging!")}</div>}
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
