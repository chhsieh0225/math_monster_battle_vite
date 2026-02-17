import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { useSpriteTargets } from '../../hooks/useSpriteTargets';
import { SCENES } from '../../data/scenes';
import { HITS_PER_LVL, MAX_MOVE_LVL, POWER_CAPS } from '../../data/constants';
import { PVP_BALANCE } from '../../data/pvpBalance';
import { getStageMaxHp, getStarterMaxHp } from '../../utils/playerHp';
import { resolveBattleLayout } from '../../utils/battleLayout';
import { hasSpecialTrait } from '../../utils/traits';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import MonsterSprite from '../ui/MonsterSprite';
import HPBar from '../ui/HPBar';
import XPBar from '../ui/XPBar';
import DamagePopup from '../ui/DamagePopup';
import Particle from '../ui/Particle';
import TextBox from '../ui/TextBox';
import AttackEffect from '../effects/AttackEffect';
import AchievementPopup from '../ui/AchievementPopup';
import { ACH_MAP } from '../../data/achievements';
import type { ScreenName, TimerSubscribe, UseBattlePublicApi, UseMobileExperienceApi } from '../../types/battle';

const NOOP_SUBSCRIBE: TimerSubscribe = () => () => {};
const ZERO_SNAPSHOT = (): number => 0;

type QuestionTimerHudProps = {
  timerSec: number;
  subscribe?: TimerSubscribe;
  getSnapshot?: () => number;
};

function QuestionTimerHud({ timerSec, subscribe, getSnapshot }: QuestionTimerHudProps) {
  const timerLeft = useSyncExternalStore(
    subscribe || NOOP_SUBSCRIBE,
    getSnapshot || ZERO_SNAPSHOT,
    getSnapshot || ZERO_SNAPSHOT,
  );
  const left = Math.max(0, Math.min(timerSec, timerLeft));
  const tone = left <= 1.5 ? "#ef4444" : left <= 3 ? "#f59e0b" : "#22c55e";
  const timerBarStyle = {
    "--battle-timer-width": `${left / timerSec * 100}%`,
    "--battle-timer-tone": tone,
    "--battle-timer-pulse": left <= 1.5 ? "timerPulse 0.4s ease infinite" : "none",
  } as CSSProperties;
  const timerTextStyle = {
    "--battle-timer-text-tone": left <= 1.5 ? "#ef4444" : left <= 3 ? "#f59e0b" : "rgba(255,255,255,0.4)",
  } as CSSProperties;

  return (
    <>
      <div className="battle-timer-bar" style={timerBarStyle} />
      <div className="battle-timer-text" style={timerTextStyle}>
        {left.toFixed(1)}s
      </div>
    </>
  );
}

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;
type BattleSlices = Pick<UseBattlePublicApi, 'state' | 'actions' | 'view'>;
type ImpactPhase = 'idle' | 'charge' | 'freeze' | 'shake' | 'settle';

type ImpactProfile = {
  chargeMs: number;
  freezeMs: number;
  shakeMs: number;
  settleMs: number;
};

function resolveImpactProfile(idx = 0, lvl = 1): ImpactProfile {
  const levelBoost = Math.min(36, Math.max(0, (lvl - 1) * 6));
  if (idx >= 3) {
    return {
      chargeMs: 95 + levelBoost,
      freezeMs: 100,
      shakeMs: 230,
      settleMs: 190,
    };
  }
  if (idx === 2) {
    return {
      chargeMs: 75 + levelBoost,
      freezeMs: 86,
      shakeMs: 175,
      settleMs: 150,
    };
  }
  return {
    chargeMs: 44 + Math.floor(levelBoost * 0.4),
    freezeMs: 68,
    shakeMs: 130,
    settleMs: 116,
  };
}

type BattleScreenProps = {
  battle: BattleSlices;
  mobile: UseMobileExperienceApi;
  onOpenSettings: (fromScreen: ScreenName) => void;
  t: Translator;
};

export default function BattleScreen({ battle, mobile: UX, onOpenSettings, t }: BattleScreenProps) {
  // Consume battle slices only; do not depend on hook-level flattened fields.
  const B = {
    ...battle.state,
    ...battle.actions,
    ...battle.view,
  };

  const showHeavyFx = !UX.lowPerfMode;
  const battleRootRef = useRef<HTMLDivElement | null>(null);
  const enemySpriteRef = useRef<HTMLDivElement | null>(null);
  const playerSpriteRef = useRef<HTMLDivElement | null>(null);
  const [impactPhase, setImpactPhase] = useState<ImpactPhase>('idle');
  const impactTimersRef = useRef<number[]>([]);
  const lastAtkEffectKeyRef = useRef('');

  const clearImpactTimers = useCallback(() => {
    if (impactTimersRef.current.length === 0) return;
    impactTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    impactTimersRef.current = [];
  }, []);

  useEffect(() => () => clearImpactTimers(), [clearImpactTimers]);

  useEffect(() => {
    if (!showHeavyFx || !B.atkEffect) {
      clearImpactTimers();
      lastAtkEffectKeyRef.current = '';
      const toIdle = window.setTimeout(() => setImpactPhase('idle'), 0);
      impactTimersRef.current = [toIdle];
      return clearImpactTimers;
    }

    const atkKey = `${B.atkEffect.type}-${B.atkEffect.idx}-${B.atkEffect.lvl}-${B.atkEffect.targetSide || "enemy"}`;
    if (lastAtkEffectKeyRef.current === atkKey) return;
    lastAtkEffectKeyRef.current = atkKey;

    clearImpactTimers();
    const profile = resolveImpactProfile(B.atkEffect.idx, B.atkEffect.lvl);

    const toCharge = window.setTimeout(() => setImpactPhase('charge'), 0);
    const toFreeze = window.setTimeout(() => setImpactPhase('freeze'), profile.chargeMs);
    const toShake = window.setTimeout(() => setImpactPhase('shake'), profile.chargeMs + profile.freezeMs);
    const toSettle = window.setTimeout(() => setImpactPhase('settle'), profile.chargeMs + profile.freezeMs + profile.shakeMs);
    const toIdle = window.setTimeout(() => setImpactPhase('idle'), profile.chargeMs + profile.freezeMs + profile.shakeMs + profile.settleMs);

    impactTimersRef.current = [toCharge, toFreeze, toShake, toSettle, toIdle];
    return clearImpactTimers;
  }, [B.atkEffect, clearImpactTimers, showHeavyFx]);
  const { measuredEnemyTarget, measuredPlayerTarget } = useSpriteTargets({
    screen: B.screen,
    phase: B.phase,
    enemyId: B.enemy?.id,
    enemyIsEvolved: B.enemy?.isEvolved,
    enemySceneMType: B.enemy?.sceneMType,
    enemyMType: B.enemy?.mType,
    playerStageIdx: B.pStg,
    battleMode: B.battleMode,
    pvpTurn: B.pvpTurn,
    battleRootRef,
    enemySpriteRef,
    playerSpriteRef,
  });
  const {
    starter: stateStarter,
    enemy: stateEnemy,
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
  } = battle.state;
  const { getPow, dualEff } = battle.view;

  const core = useMemo(() => {
    const starter = stateStarter;
    const enemy = stateEnemy;
    if (!starter || !enemy) return null;

    const st = starter.stages[pStg] || starter.stages[0];
    if (!st) return null;

    const isCoopBattle = battleMode === "coop" || battleMode === "double";
    const showEnemySub = isCoopBattle && Boolean(enemySub);
    const showAllySub = isCoopBattle && Boolean(allySub);
    const hasDualUnits = showEnemySub || showAllySub;
    const coopCanSwitch = showAllySub && pHpSub > 0;
    const coopUsingSub = coopCanSwitch && coopActiveSlot === "sub";
    const activeStarter = battleMode === "pvp"
      ? (pvpTurn === "p1" ? starter : pvpStarter2)
      : (coopUsingSub ? allySub : starter);

    const pvpActiveCharge = battleMode === "pvp"
      ? (pvpTurn === "p1" ? (pvpChargeP1 || 0) : (pvpChargeP2 || 0))
      : 0;
    const pvpActiveCombo = battleMode === "pvp"
      ? (pvpTurn === "p1" ? (pvpComboP1 || 0) : (pvpComboP2 || 0))
      : 0;
    const pvpActiveSpecDefReady = battleMode === "pvp"
      ? (pvpTurn === "p1" ? !!pvpSpecDefP1 : !!pvpSpecDefP2)
      : false;
    const chargeDisplay = battleMode === "pvp" ? pvpActiveCharge : charge;
    const chargeReadyDisplay = battleMode === "pvp" ? pvpActiveCharge >= 3 : chargeReady;

    const eSvg = enemy.svgFn();
    const eSubSvg = showEnemySub && enemySub ? enemySub.svgFn() : null;
    const allyStage = showAllySub && allySub
      ? (allySub.stages[allySub.selectedStageIdx || 0] || allySub.stages[0])
      : null;
    const pSubSvg = allyStage ? allyStage.svgFn() : null;
    const pSvg = st.svgFn();

    const mainMaxHp = getStageMaxHp(pStg);
    const subMaxHp = showAllySub && allySub ? getStarterMaxHp(allySub) : getStageMaxHp(0);
    const sceneKey = (enemy.sceneMType || enemy.mType) as keyof typeof SCENES;
    const scene = SCENES[sceneKey] || SCENES.grass;

    const layout = resolveBattleLayout({
      battleMode,
      hasDualUnits,
      compactUI: UX.compactUI,
      playerStageIdx: pStg,
      enemyId: enemy.id,
      enemySceneType: enemy.sceneMType || enemy.mType,
      enemyIsEvolved: enemy.isEvolved,
    });

    const pvpEnemyBarActive = battleMode !== "pvp" || pvpTurn === "p2";
    const mainBarActive = battleMode === "pvp"
      ? pvpTurn === "p1"
      : (isCoopBattle ? !coopUsingSub : true);
    const subBarActive = showAllySub && coopUsingSub;
    const moveRuntime = (activeStarter?.moves || []).map((m, i) => {
      const sealed = battleMode === "pvp" ? false : sealedMove === i;
      const pvpLocked = battleMode === "pvp" ? (m.risky && !chargeReadyDisplay) : false;
      const locked = battleMode === "pvp" ? pvpLocked : ((m.risky && !chargeReady) || sealed);
      const lv = mLvls[i];
      const pw = battleMode === "pvp" ? m.basePower : getPow(i);
      const atCap = lv >= MAX_MOVE_LVL || m.basePower + lv * m.growth > POWER_CAPS[i];
      const eff = battleMode === "pvp" ? 1 : dualEff(m);
      const progressBase = HITS_PER_LVL * mLvls[i];
      const moveProgressPct = progressBase > 0 ? (mHits[i] % progressBase) / progressBase * 100 : 0;
      return { m, i, sealed, locked, lv, pw, atCap, eff, moveProgressPct };
    });

    return {
      starter,
      enemy,
      st,
      isCoopBattle,
      showEnemySub,
      showAllySub,
      hasDualUnits,
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
      pvpEnemyBurn: pvpBurnP2 || 0,
      pvpEnemyFreeze: !!pvpFreezeP2,
      pvpEnemyParalyze: !!pvpParalyzeP2,
      pvpEnemyStatic: pvpStaticP2 || 0,
      pvpEnemyCombo: pvpComboP2 || 0,
      pvpEnemySpecDef: !!pvpSpecDefP2,
      pvpPlayerBurn: pvpBurnP1 || 0,
      pvpPlayerFreeze: !!pvpFreezeP1,
      pvpPlayerParalyze: !!pvpParalyzeP1,
      pvpPlayerStatic: pvpStaticP1 || 0,
      pvpPlayerCombo: pvpComboP1 || 0,
      pvpPlayerSpecDef: !!pvpSpecDefP1,
    };
  }, [
    stateStarter,
    stateEnemy,
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

  const canTapAdvance = B.phase === "text" || B.phase === "victory";
  const isKoPhase = B.phase === "ko" || B.phase === "victory";
  const enemyDefeated = isKoPhase && B.eHp === 0;
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
  const effectTarget = B.atkEffect?.targetSide === "player" ? pTarget : eTarget;
  const question = B.q;
  const feedback = B.fb;
  const selectedMove = activeStarter && B.selIdx !== null
    ? activeStarter.moves[B.selIdx]
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
  const toastShadowStyle = B.effMsg
    ? ({ "--battle-eff-shadow": `0 8px 22px ${B.effMsg.color}55` } as CSSProperties)
    : undefined;
  const sceneBgStyle = scene.bgImg
    ? ({ backgroundImage: `url(${scene.bgImg})` } as CSSProperties)
    : undefined;
  const sceneSkyStyle = ({ "--scene-sky": scene.sky } as CSSProperties);
  const sceneGroundStyle = ({ "--scene-ground": scene.ground } as CSSProperties);
  const sceneTopPlatformStyle = ({ "--scene-platform-top": scene.platform2 } as CSSProperties);
  const sceneBottomPlatformStyle = ({ "--scene-platform-bottom": scene.platform1 } as CSSProperties);
  const enemyInfoStyle = ({ "--battle-enemy-info-right": enemyInfoRight } as CSSProperties);
  const playerInfoStyle = ({ "--battle-player-info-left": playerInfoLeft } as CSSProperties);
  const enemyLowHp = enemy.maxHp > 0 && B.eHp > 0 && B.eHp / enemy.maxHp < 0.25;
  const enemyIdleAnim = BOSS_IDS.has(enemy.id)
    ? "bossFloat 2.5s ease-in-out infinite, bossPulse 4s ease infinite"
    : enemyLowHp
      ? "float 1.4s ease-in-out infinite, struggle .8s ease-in-out infinite"
      : "float 3s ease-in-out infinite";
  const enemyMainSpriteStyle = ({
    "--enemy-main-right": `${enemyMainRightPct}%`,
    "--enemy-main-top": `${eTopPct}%`,
    "--enemy-main-anim": enemyDefeated
      ? "enemyDissolve .9s ease-out forwards"
      : B.eAnim || (UX.lowPerfMode ? "none" : enemyIdleAnim),
  } as CSSProperties);
  const enemySubSpriteStyle = ({
    "--enemy-sub-right": `${enemySubRightPct}%`,
    "--enemy-sub-top": `${enemySubTopPct}%`,
    "--enemy-sub-scale": compactDual ? "0.72" : "0.8",
    "--enemy-sub-anim": UX.lowPerfMode ? "none" : "float 3.8s ease-in-out infinite",
  } as CSSProperties);
  const enemyMainShadowStyle = ({
    "--enemy-shadow-right": `calc(${enemyMainRightPct}% + ${Math.round(eSize * 0.18)}px)`,
    "--enemy-shadow-top": `calc(${eTopPct}% + ${Math.round(eHeight * 0.72)}px)`,
    "--enemy-shadow-width": `${Math.round(eSize * 0.56)}px`,
    "--enemy-shadow-anim": BOSS_IDS.has(enemy.id) ? "bossShadowPulse 2.5s ease-in-out infinite" : "shadowPulse 3s ease-in-out infinite",
  } as CSSProperties);
  const playerMainSpriteStyle = ({
    "--player-main-left": `${playerMainLeftPct}%`,
    "--player-main-bottom": `${playerMainBottomPct}%`,
    "--player-main-filter": isCoopBattle && !coopUsingSub ? "drop-shadow(0 0 12px rgba(99,102,241,0.7))" : "none",
    "--player-main-z": coopUsingSub ? "4" : "6",
    "--player-main-opacity": coopUsingSub ? ".84" : "1",
    "--player-main-anim": B.pAnim || (UX.lowPerfMode ? "none" : "floatFlip 3s ease-in-out infinite"),
  } as CSSProperties);
  const playerSubSpriteStyle = ({
    "--player-sub-left": `${playerSubLeftPct}%`,
    "--player-sub-bottom": `${playerSubBottomPct}%`,
    "--player-sub-filter": isCoopBattle && coopUsingSub ? "drop-shadow(0 0 12px rgba(34,197,94,0.75))" : "none",
    "--player-sub-z": coopUsingSub ? "6" : "4",
    "--player-sub-opacity": coopUsingSub ? "1" : ".84",
    "--player-sub-anim": UX.lowPerfMode ? "none" : "floatFlip 3.8s ease-in-out infinite",
  } as CSSProperties);
  const playerMainShadowStyle = ({
    "--player-shadow-left": `calc(${playerMainLeftPct}% + ${Math.round(mainPlayerSize * 0.48)}px)`,
    "--player-shadow-bottom": `${Math.max(8, playerMainBottomPct - 1)}%`,
    "--player-shadow-width": `${Math.round(mainPlayerSize * 0.5)}px`,
  } as CSSProperties);
  const isUltimateEffect = !!(B.atkEffect && B.atkEffect.idx >= 3);
  const ultimateToneClass = B.atkEffect?.type === "fire"
    ? "is-fire"
    : B.atkEffect?.type === "water"
      ? "is-water"
      : B.atkEffect?.type === "electric"
        ? "is-electric"
        : B.atkEffect?.type === "grass"
          ? "is-grass"
          : B.atkEffect?.type === "light"
            ? "is-light"
            : "is-dark";
  const ultimateSyncStyle = ({
    "--ult-sync-top": effectTarget.top,
    "--ult-sync-right": effectTarget.right,
  } as CSSProperties);
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
          B.advance();
        }
      }}
      onClick={canTapAdvance ? B.advance : undefined}
    >
      {/* Pause overlay */}
      {B.gamePaused && <div
        role="button"
        tabIndex={0}
        className={`battle-pause-overlay ${UX.lowPerfMode ? "low-perf" : ""}`}
        aria-label={t("a11y.overlay.pauseResume", "Resume game")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            B.togglePause();
          }
        }}
        onClick={B.togglePause}
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
      {B.dmgs.map((d) => <DamagePopup key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} onDone={() => B.rmD(d.id)} />)}
      {showHeavyFx && B.parts.map((p) => <Particle key={p.id} emoji={p.emoji} x={p.x} y={p.y} seed={p.id} onDone={() => B.rmP(p.id)} />)}

      {/* Move level-up toast */}
      {B.battleMode !== "pvp" && B.mLvlUp !== null && (
        <div className="battle-level-toast">
          {starter.moves[B.mLvlUp].icon} {starter.moves[B.mLvlUp].name}{" "}
          {t("battle.moveLevelUp", "leveled up to Lv.{level}! Power -> {power}", {
            level: B.mLvls[B.mLvlUp],
            power: B.getPow(B.mLvlUp),
          })}
        </div>
      )}
      {/* Achievement popup */}
      {B.achPopup && ACH_MAP[B.achPopup] && <AchievementPopup achievement={ACH_MAP[B.achPopup]} onDone={B.dismissAch} />}

      {/* Attack effects */}
      {showHeavyFx && isUltimateEffect && (
        <div className={`battle-ult-sync ${ultimateToneClass}`} style={ultimateSyncStyle}>
          <div className="battle-ult-sync-flash" />
          <div className="battle-ult-sync-core" />
          <div className="battle-ult-sync-ring" />
          <div className="battle-ult-sync-ring battle-ult-sync-ring-alt" />
        </div>
      )}
      {showHeavyFx && B.atkEffect && (
        <AttackEffect type={B.atkEffect.type} idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} target={effectTarget} />
      )}

      {/* Victory drop toast */}
      {B.phase === "victory" && !UX.lowPerfMode && Array.isArray(enemy.drops) && enemy.drops.length > 0 && (
        <div className="battle-drop-toast" aria-hidden="true">
          {enemy.drops[0]}
        </div>
      )}

      {/* Special Defense animations */}
      {showHeavyFx && B.defAnim === "fire" && (
        <div className="battle-def-fx battle-def-fx-fire">
          <div className="battle-def-layer battle-def-layer-fire-core" />
          <div className="battle-def-layer battle-def-layer-fire-ring" />
          <div className="battle-def-icon battle-def-icon-fire">🛡️</div>
        </div>
      )}
      {showHeavyFx && B.defAnim === "water" && (
        <div className="battle-def-fx battle-def-fx-water">
          <div className="battle-def-layer battle-def-layer-water-ripple-1" />
          <div className="battle-def-layer battle-def-layer-water-ripple-2" />
          <div className="battle-def-layer battle-def-layer-water-ripple-3" />
          <div className="battle-def-icon battle-def-icon-water">💨</div>
        </div>
      )}
      {showHeavyFx && B.defAnim === "grass" && (
        <div className="battle-def-fx battle-def-fx-grass">
          <div className="battle-def-layer battle-def-layer-grass-core" />
          <div className="battle-def-layer battle-def-layer-grass-ring" />
          <div className="battle-def-icon battle-def-icon-grass">🌿</div>
        </div>
      )}
      {showHeavyFx && B.defAnim === "electric" && (
        <div className="battle-def-fx battle-def-fx-electric">
          <div className="battle-def-layer battle-def-layer-electric-core" />
          <div className="battle-def-layer battle-def-layer-electric-ring" />
          <div className="battle-def-icon battle-def-icon-electric">⚡</div>
        </div>
      )}
      {showHeavyFx && B.defAnim === "light" && (
        <div className="battle-def-fx battle-def-fx-light">
          <div className="battle-def-layer battle-def-layer-light-core" />
          <div className="battle-def-layer battle-def-layer-light-ring" />
          <div className="battle-def-layer battle-def-layer-light-ring-outer" />
          <div className="battle-def-icon battle-def-icon-light">✨</div>
        </div>
      )}
      {showHeavyFx && B.defAnim && <div className={`battle-def-screen battle-def-screen-${B.defAnim}`} />}

      {/* Type effectiveness popup */}
      {B.effMsg && (
        <div
          className={`battle-eff-toast ${B.effMsg.color === "#22c55e" ? "battle-eff-toast-good" : "battle-eff-toast-bad"}`}
          style={toastShadowStyle}
        >
          {B.effMsg.text}
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
              cur={B.eHp}
              max={enemy.maxHp}
              color={enemy.c1}
              label={`${enemy.typeIcon}${enemy.typeIcon2 || ''}${enemy.name} ${t("battle.level", "Lv.{level}", { level: enemy.lvl })}`}
            />
          </div>
          {showEnemySub && B.enemySub && (
            <div className={`battle-hp-sub-row ${hpFocusClass(false)}`}>
              <HPBar
                cur={B.eHpSub}
                max={B.enemySub.maxHp}
                color={B.enemySub.c1}
                label={`${t("battle.subUnit", "Sub")} ${B.enemySub.typeIcon}${B.enemySub.name} ${t("battle.level", "Lv.{level}", { level: B.enemySub.lvl })}`}
              />
            </div>
          )}
          <div className="battle-status-row">
            {B.battleMode === "pvp" ? (
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
                {B.burnStack > 0 && <div className="battle-status-chip is-burn">🔥 {t("battle.status.burnStack", "Burn x{count}", { count: B.burnStack })}</div>}
                {B.frozen && <div className="battle-status-chip is-freeze">❄️ {t("battle.status.freeze", "Freeze")}</div>}
                {B.staticStack > 0 && <div className="battle-status-chip is-static">⚡ {t("battle.status.staticStack", "Static x{count}", { count: B.staticStack })}{B.staticStack >= 2 ? " ⚠️" : ""}</div>}
                {B.bossPhase >= 2 && <div className="battle-status-chip is-boss">{B.bossPhase >= 3 ? t("battle.status.bossAwaken", "💀 Awaken ATKx2") : t("battle.status.bossRage", "💀 Rage ATKx1.5")}</div>}
                {B.bossCharging && <div className="battle-status-chip is-charge">⚠️ {t("battle.status.charging", "Charging!")}</div>}
              </>
            )}
          </div>
        </div>

        {/* Enemy sprite */}
        <div ref={enemySpriteRef} className="battle-sprite-enemy-main" style={enemyMainSpriteStyle}>
          <MonsterSprite svgStr={eSvg} size={eSize} />
        </div>
        {showEnemySub && B.enemySub && eSubSvg && (
          <div className="battle-sprite-enemy-sub" style={enemySubSpriteStyle}>
            <MonsterSprite svgStr={eSubSvg} size={BOSS_IDS.has(B.enemySub.id) ? 160 : B.enemySub.isEvolved ? 120 : 96} />
          </div>
        )}
        {!B.eAnim && !UX.lowPerfMode && <div className="battle-sprite-enemy-shadow" style={enemyMainShadowStyle} />}

        {/* Player platform & info */}
        <div className="battle-scene-platform-bottom" style={sceneBottomPlatformStyle} />
        <div className="battle-info-player" style={playerInfoStyle}>
          <div className={hpFocusClass(mainBarActive)}>
            <HPBar
              cur={B.pHp}
              max={mainMaxHp}
              color="#6366f1"
              label={`${isCoopBattle && !coopUsingSub ? "▶ " : ""}${st.name} ${t("battle.level", "Lv.{level}", { level: B.pLvl })}`}
            />
          </div>
          {showAllySub && B.allySub && (
            <div className={`battle-hp-sub-row ${hpFocusClass(subBarActive)}`}>
              <HPBar
                cur={B.pHpSub}
                max={subMaxHp}
                color={B.allySub.c1}
                label={`${isCoopBattle && coopUsingSub ? "▶ " : ""}${t("battle.partner", "Partner")} ${B.allySub.typeIcon}${B.allySub.name}`}
              />
            </div>
          )}
          <XPBar exp={B.pExp} max={B.expNext} />
          {B.battleMode === "pvp" ? (
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
              {B.cursed && <div className="battle-status-chip is-curse battle-status-chip-inline">💀 {t("battle.status.curse", "Cursed: next attack weakened")}</div>}
            </>
          )}
        </div>

        {/* Player sprite */}
        <div ref={playerSpriteRef} className="battle-sprite-player-main" style={playerMainSpriteStyle}>
          <MonsterSprite svgStr={pSvg} size={mainPlayerSize} />
        </div>
        {showAllySub && pSubSvg && (
          <div className="battle-sprite-player-sub" style={playerSubSpriteStyle}>
            <MonsterSprite svgStr={pSubSvg} size={subPlayerSize} />
          </div>
        )}
        {!B.pAnim && !UX.lowPerfMode && <div className="battle-sprite-player-shadow" style={playerMainShadowStyle} />}

        <div className={`battle-top-right-stack ${UX.lowPerfMode ? "low-perf" : ""}`} aria-live="polite" aria-atomic="true">
          {B.streak >= 2 && <div className="battle-pill is-streak">🔥 {t("battle.streak", "{count} combo!", { count: B.streak })}</div>}
          {B.passiveCount >= 1 && !B.specDef && <div className="battle-pill is-passive">🛡️ {B.passiveCount}/8</div>}
          {B.timedMode && B.streak < 2 && <div className="battle-pill is-timed">⏱️ {t("battle.timed", "Timed")}</div>}
          {B.diffLevel !== 2 && (
            <div className={`battle-pill ${B.diffLevel > 2 ? "is-diff-up" : "is-diff-down"}`}>
              {B.diffLevel > 2 ? t("battle.diff.up", "📈 Difficulty +{value}", { value: B.diffLevel - 2 }) : t("battle.diff.down", "📉 Difficulty {value}", { value: B.diffLevel - 2 })}
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
          {B.bossPhase >= 3 && <div className="battle-pill is-last-stand">{t("battle.lastStand", "🔥 Last Stand DMGx1.3")}</div>}
          {B.specDef && <div className={`battle-pill is-specdef ${specDefToneClass}`}>{specDefReadyLabel} {t("battle.ready", "Ready!")}</div>}
        </div>
        {B.bossCharging && <div className="battle-boss-hint">⚠️ {t("battle.bossBreakHint", "Answer correctly to interrupt charging!")}</div>}
      </div>

      {/* ═══ Bottom panel ═══ */}
      <div className={`battle-panel ${B.phase === "question" ? "is-question" : "is-normal"}`}>
        {/* Move menu */}
        {B.phase === "menu" && activeStarter && <div className="battle-menu-wrap">
          {isCoopBattle && (
            <div className="battle-menu-hint">
              🤝 {t("battle.coopTurn", "Co-op · Active:")} {activeStarter.typeIcon} {activeStarter.name}
            </div>
          )}
          {B.battleMode === "pvp" && (
            <div className="battle-menu-hint">
              {B.pvpTurn === "p1" ? t("battle.pvpTurn.p1", "🔵 Player 1 Turn") : t("battle.pvpTurn.p2", "🔴 Player 2 Turn")} · {activeStarter.typeIcon} {activeStarter.name} · ⚡{pvpActiveCharge}/3 · {pvpActiveSpecDefReady ? `🛡️${t("battle.status.counterReady", "Counter Ready")}` : `🛡️${pvpActiveCombo}/${pvpComboTrigger}`}
            </div>
          )}
          <div className="battle-menu-grid">
            {moveRuntime.map(({ m, i, sealed, locked, lv, pw, atCap, eff, moveProgressPct }) => {
              const moveBtnStyle = {
                "--move-bg": locked ? "rgba(255,255,255,0.03)" : eff > 1 ? `linear-gradient(135deg,${m.bg},rgba(34,197,94,0.08))` : eff < 1 ? `linear-gradient(135deg,${m.bg},rgba(148,163,184,0.08))` : m.bg,
                "--move-border": sealed ? "rgba(168,85,247,0.4)" : locked ? "rgba(255,255,255,0.08)" : eff > 1 ? "#22c55e66" : `${m.color}44`,
                "--move-opacity": locked ? "0.4" : "1",
                "--move-cursor": locked ? "default" : "pointer",
                "--move-enter-delay": `${i * 0.05}s`,
                "--move-name-color": locked ? "#94a3b8" : m.color,
                "--move-desc-color": locked ? "#64748b" : "#94a3b8",
                "--move-power-color": lv > 1 ? m.color : "inherit",
              } as CSSProperties;
              const moveLevelBadgeStyle = atCap
                ? undefined
                : ({ "--move-level-bg": m.color } as CSSProperties);
              const moveProgressStyle = {
                "--move-progress-width": `${moveProgressPct}%`,
                "--move-progress-color": m.color,
              } as CSSProperties;
              return <button
                className={`battle-menu-btn ${locked ? "is-locked" : ""}`}
                key={i}
                onClick={() => !locked && B.selectMove(i)}
                style={moveBtnStyle}
              >
                {sealed && <div className="move-sealed-mask"><span className="move-sealed-text">{t("battle.sealed", "🔮 Sealed ({turns})", { turns: B.sealedTurns })}</span></div>}
                <div className="move-badge-stack">
                  {B.battleMode !== "pvp" && lv > 1 && (
                    <div
                      className={`move-badge move-badge-level ${atCap ? "cap" : ""}`}
                      style={moveLevelBadgeStyle}
                    >
                      Lv{lv}
                    </div>
                  )}
                  {eff > 1 && <div className="move-badge move-badge-up">{t("battle.effect.up", "Effect Up")}</div>}
                  {eff < 1 && <div className="move-badge move-badge-down">{t("battle.effect.down", "Effect Down")}</div>}
                </div>
                <div className="move-name-row">
                  <span className="move-icon">{m.icon}</span>
                  <span className="move-name">{m.name}</span>
                </div>
                <div className="move-desc-row">
                  {m.desc} · {t("battle.power", "Power")} <b className="move-power">{pw}</b>{eff > 1 ? " ×1.5" : eff < 1 ? " ×0.6" : ""}{m.risky && B.battleMode === "pvp" && !chargeReadyDisplay && ` ${t("battle.risky.lockedPvp", "🔒Need 3 correct")}`}{m.risky && B.battleMode === "pvp" && chargeReadyDisplay && ` ${t("battle.risky.readyPvp", "⚡Cast Ready")}`}{m.risky && !B.chargeReady && B.battleMode !== "pvp" && ` ${t("battle.risky.locked", "🔒")}`}{m.risky && B.chargeReady && B.battleMode !== "pvp" && ` ${t("battle.risky.ready", "⚡Charge Ready!")}`}{B.battleMode !== "pvp" && !m.risky && !atCap && lv > 1 && " ↑"}{B.battleMode !== "pvp" && atCap && ` ${t("battle.max", "✦MAX")}`}
                </div>
                {B.battleMode !== "pvp" && !m.risky && !atCap && <div className="move-progress-track"><div className="move-progress-fill" style={moveProgressStyle} /></div>}
              </button>;
            })}
          </div>
          <div className="battle-util-row">
            {isCoopBattle && (
              <button className="battle-util-btn" onClick={B.toggleCoopActive} disabled={!coopCanSwitch}>
                🔁 {coopUsingSub ? t("battle.coop.mainTurn", "Main Turn") : t("battle.coop.subTurn", "Sub Turn")}
              </button>
            )}
            <button className="battle-util-btn" aria-label={t("a11y.battle.pause", "Pause game")} onClick={B.togglePause}>⏸️ {t("battle.pause", "Pause")}</button>
            <button className="battle-util-btn" aria-label={t("a11y.battle.settings", "Open battle settings")} onClick={() => onOpenSettings("battle")}>⚙️ {t("battle.settings", "Settings")}</button>
            <button className="battle-util-btn battle-util-btn-danger" aria-label={t("a11y.battle.run", "Run from battle")} onClick={B.quitGame}>🏳️ {t("battle.run", "Run")}</button>
          </div>
        </div>}

        {/* Question panel */}
        {B.phase === "question" && question && activeStarter && selectedMove && <div className="battle-question-wrap">
          <div className="battle-question-head"><span className="battle-question-icon">{selectedMove.icon}</span><span className="battle-question-title">{selectedMove.name}！</span><span className="battle-question-sub">{activeStarter.typeIcon} {activeStarter.name}</span><span className="battle-question-note">{B.timedMode ? t("battle.answer.timed", "⏱️ Timed Answer!") : t("battle.answer.hit", "Answer correctly to hit")}</span></div>
          <div className="battle-question-card">
            {B.timedMode && !B.answered && (
              <QuestionTimerHud
                timerSec={B.questionTimerSec}
                subscribe={B.timerSubscribe}
                getSnapshot={B.getTimerLeft}
              />
            )}
            <div className="battle-question-type">{questionTypeLabel}</div>
            <div className="question-expression battle-question-expression">{question.display}{question.op && question.op.startsWith("unknown") ? "" : " = ?"}</div>
          </div>
          {feedback && <div className={`battle-feedback ${feedback.correct ? "is-correct" : "is-wrong"}`}>{feedback.correct ? t("battle.feedback.hit", "✅ Hit!") : t("battle.feedback.answer", "❌ Answer is {answer}", { answer: feedback.answer })}</div>}
          {feedback && !feedback.correct && (feedback.steps?.length || 0) > 0 && (
            <div className="battle-feedback-steps">
              <div className="battle-feedback-steps-title">📝 {t("battle.feedback.steps", "Solution Steps:")}</div>
              {(feedback.steps ?? []).map((step: string, i: number) => (
                <div key={i} className="battle-feedback-step-row">
                  {(feedback.steps?.length || 0) > 1 && <span className="battle-feedback-step-index">{t("battle.feedback.step", "Step {index}.", { index: i + 1 })}</span>}{step}
                </div>
              ))}
            </div>
          )}
          <div className="battle-answer-grid">
            {question.choices.map((c: number, i: number) => {
              let answerState = "";
              if (feedback) answerState = c === question.answer ? "is-correct" : "is-dim";
              return <button className={`answer-btn battle-answer-btn ${answerState}`} key={i} onClick={() => B.onAns(c)} disabled={B.answered}>{c}</button>;
            })}
          </div>
        </div>}

        {/* Text box */}
        {(B.phase === "text" || B.phase === "playerAtk" || B.phase === "enemyAtk" || B.phase === "victory" || B.phase === "ko") && <TextBox text={B.bText} onClick={B.advance} />}
      </div>
    </div>
  );
}
