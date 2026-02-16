/**
 * App.tsx — Thin render shell.
 *
 * All game state and logic live in useBattle().
 * This file is purely responsible for:
 *   1. Screen routing (title / selection / battle / evolve / gameover / leaderboard)
 *   2. Battle-screen layout & visual rendering
 *   3. Orientation-lock wrapper (GameShell)
 */
import { useState, useEffect, useRef, useSyncExternalStore, Component } from 'react';
import type { ReactNode } from 'react';
import './App.css';
import { useI18n } from './i18n';
import zhTW from './i18n/locales/zh-TW';
import enUS from './i18n/locales/en-US';

// Hooks
import { useBattle } from './hooks/useBattle';
import { useMobileExperience } from './hooks/useMobileExperience';
import { useSpriteTargets } from './hooks/useSpriteTargets';

// Data
import { SCENES } from './data/scenes';
import { TIMER_SEC, HITS_PER_LVL, MAX_MOVE_LVL, POWER_CAPS } from './data/constants';
import { PVP_BALANCE } from './data/pvpBalance';
import { getStageMaxHp, getStarterMaxHp } from './utils/playerHp';
import { hasSpecialTrait } from './utils/traits';

// UI Components
import MonsterSprite from './components/ui/MonsterSprite';
import HPBar from './components/ui/HPBar';
import XPBar from './components/ui/XPBar';
import DamagePopup from './components/ui/DamagePopup';
import Particle from './components/ui/Particle';
import TextBox from './components/ui/TextBox';

// Effects
import { FireEffect, ElecEffect, WaterEffect, GrassEffect, DarkEffect, LightEffect } from './components/effects';

// Screens
import AppScreenRouter from './components/AppScreenRouter';
import AchievementPopup from './components/ui/AchievementPopup';
import { ACH_MAP } from './data/achievements';
import type { ScreenName, TimerSubscribe, UseBattlePublicApi } from './types/battle';

type StaticLocaleCode = "zh-TW" | "en-US";

function resolveStaticLocale(): StaticLocaleCode {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("mathMonsterBattle_locale");
      if (stored === "zh-TW" || stored === "en-US") return stored;
    } catch {
      // ignore
    }
  }
  return "zh-TW";
}

const STATIC_DICTS: Record<StaticLocaleCode, Record<string, string>> = {
  "zh-TW": zhTW as Record<string, string>,
  "en-US": enUS as Record<string, string>,
};

function staticT(key: string, fallback: string): string {
  const locale = resolveStaticLocale();
  return STATIC_DICTS[locale][key] || STATIC_DICTS["zh-TW"][key] || fallback;
}

// ─── ErrorBoundary: catches render crashes to show error instead of black screen ───
type ErrorBoundaryProps = {
  children?: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | string | null;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    if (error instanceof Error) return { error };
    return { error: String(error) };
  }

  render() {
    if (this.state.error) {
      const errorText = typeof this.state.error === "string"
        ? this.state.error
        : this.state.error.message;
      return (
      <div className="app-error-wrap">
        <div className="app-error-icon">⚠️</div>
        <div className="app-error-title">{staticT("app.error.title", "A game error occurred")}</div>
        <div className="app-error-detail">{errorText}</div>
        <button onClick={() => { this.setState({ error: null }); }} className="app-error-reload">{staticT("app.error.reload", "Reload")}</button>
      </div>
      );
    }
    return this.props.children;
  }
}

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

  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 4,
          background: tone,
          width: `${left / timerSec * 100}%`,
          borderRadius: 2,
          transition: "width 0.05s linear,background 0.3s",
          animation: left <= 1.5 ? "timerPulse 0.4s ease infinite" : "none",
        }}
      />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: left <= 1.5 ? "#ef4444" : left <= 3 ? "#f59e0b" : "rgba(255,255,255,0.4)",
          marginTop: 2,
          fontFamily: "'Press Start 2P',monospace",
          transition: "color 0.3s",
        }}
      >
        {left.toFixed(1)}s
      </div>
    </>
  );
}

// ─── GameShell: orientation lock wrapper ───
const isTouchDevice = (): boolean => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function GameShell() {
  const { t } = useI18n();
  const [showRotateHint, setShowRotateHint] = useState(false);
  useEffect(() => {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      orientation.lock?.("portrait-primary").catch(() => {});
    } catch {
      // unsupported
    }
    let tid: ReturnType<typeof setTimeout> | null = null;
    const chk = () => {
      const isLandscape = window.innerWidth > window.innerHeight * 1.05;
      setShowRotateHint(isLandscape && isTouchDevice());
    };
    chk();
    const ochk = () => { if (tid) clearTimeout(tid); tid = setTimeout(chk, 350); };
    window.addEventListener("resize", chk);
    window.addEventListener("orientationchange", ochk);
    return () => { window.removeEventListener("resize", chk); window.removeEventListener("orientationchange", ochk); if (tid) clearTimeout(tid); };
  }, []);

  return (
    <div className="shell-root">
      <a className="skip-link" href="#main-content" aria-label={t("a11y.skip.main", "Skip to main content")}>
        {t("app.skip.main", "Skip to main content")}
      </a>
      <div className="shell-stage">
        <ErrorBoundary><App /></ErrorBoundary>
        {showRotateHint && (
          <div
            role="button"
            tabIndex={0}
            className="rotate-overlay"
            aria-label={t("a11y.overlay.rotateDismiss", "Dismiss rotate hint and continue")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowRotateHint(false);
              }
            }}
            onClick={() => setShowRotateHint(false)}
          >
            <div className="rotate-overlay-icon">📱</div>
            <div className="rotate-overlay-title">{t("app.rotate.title", "Please rotate your phone to portrait")}</div>
            <div className="rotate-overlay-subtitle">{t("app.rotate.hint", "This game supports portrait mode only")}</div>
            <div className="rotate-overlay-hint">{t("app.rotate.continue", "Tap anywhere to continue")}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App: main game component (render only) ───
function App() {
  const { t } = useI18n();
  const B: UseBattlePublicApi = useBattle();
  const UX = useMobileExperience();
  const showHeavyFx = !UX.lowPerfMode;
  const [audioMuted, setAudioMuted] = useState<boolean>(() => Boolean(B.sfx.muted));
  const battleRootRef = useRef<HTMLDivElement | null>(null);
  const enemySpriteRef = useRef<HTMLDivElement | null>(null);
  const playerSpriteRef = useRef<HTMLDivElement | null>(null);
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
  const settingsReturnRef = useRef<ScreenName>("title");
  const resumeBattleAfterSettingsRef = useRef(false);
  const setAudioMute = (next: boolean) => {
    const muted = B.sfx.setMuted(next);
    setAudioMuted(muted);
  };
  const openSettings = (fromScreen: ScreenName) => {
    settingsReturnRef.current = fromScreen;
    if (fromScreen === "battle" && !B.gamePaused) {
      resumeBattleAfterSettingsRef.current = true;
      B.togglePause();
    } else {
      resumeBattleAfterSettingsRef.current = false;
    }
    B.setScreen("settings");
  };
  const closeSettings = () => {
    const backTo = settingsReturnRef.current || "title";
    B.setScreen(backTo);
    if (backTo === "battle" && resumeBattleAfterSettingsRef.current) {
      setTimeout(() => {
        B.togglePause();
      }, 0);
    }
    resumeBattleAfterSettingsRef.current = false;
  };

  if (B.screen !== "battle") {
    return (
      <AppScreenRouter
        battle={B}
        mobile={UX}
        audioMuted={audioMuted}
        onSetAudioMuted={setAudioMute}
        onOpenSettings={openSettings}
        onCloseSettings={closeSettings}
        t={t}
      />
    );
  }

  if (!B.enemy || !B.starter) return (
    <div className="battle-loading-wrap">
      <div className="battle-loading-icon">⚔️</div>
      <div className="battle-loading-text">{t("app.loading.battle", "Preparing battle...")}</div>
    </div>
  );

  // ─── Battle screen locals ───
  const st = B.starter.stages[B.pStg];
  const isCoopBattle = B.battleMode === "coop" || B.battleMode === "double";
  const coopCanSwitch = isCoopBattle && Boolean(B.allySub) && B.pHpSub > 0;
  const coopUsingSub = coopCanSwitch && B.coopActiveSlot === "sub";
  const activeStarter = B.battleMode === "pvp"
    ? (B.pvpTurn === "p1" ? B.starter : B.pvpStarter2)
    : (coopUsingSub ? B.allySub : B.starter);
  const pvpComboTrigger = PVP_BALANCE.passive.specDefComboTrigger || 4;
  const pvpActiveCharge = B.battleMode === "pvp"
    ? (B.pvpTurn === "p1" ? (B.pvpChargeP1 || 0) : (B.pvpChargeP2 || 0))
    : 0;
  const pvpActiveCombo = B.battleMode === "pvp"
    ? (B.pvpTurn === "p1" ? (B.pvpComboP1 || 0) : (B.pvpComboP2 || 0))
    : 0;
  const pvpActiveSpecDefReady = B.battleMode === "pvp"
    ? (B.pvpTurn === "p1" ? !!B.pvpSpecDefP1 : !!B.pvpSpecDefP2)
    : false;
  const chargeDisplay = B.battleMode === "pvp" ? pvpActiveCharge : B.charge;
  const chargeReadyDisplay = B.battleMode === "pvp" ? pvpActiveCharge >= 3 : B.chargeReady;
  const eSvg = B.enemy.svgFn();
  const eSubSvg = B.enemySub ? B.enemySub.svgFn() : null;
  const allyStage = B.allySub ? (B.allySub.stages[B.allySub.selectedStageIdx || 0] || B.allySub.stages[0]) : null;
  const pSubSvg = allyStage ? allyStage.svgFn() : null;
  const pSvg = st.svgFn();
  const mainMaxHp = getStageMaxHp(B.pStg);
  const subMaxHp = B.allySub ? getStarterMaxHp(B.allySub) : getStageMaxHp(0);
  const sceneKey = (B.enemy.sceneMType || B.enemy.mType) as keyof typeof SCENES;
  const scene = SCENES[sceneKey] || SCENES.grass;
  const canTapAdvance = B.phase === "text" || B.phase === "victory";
  const hasDualUnits = !!(B.enemySub || B.allySub);
  const compactDual = hasDualUnits && UX.compactUI;
  const enemyInfoRight = hasDualUnits ? "44%" : "42%";
  const playerInfoLeft = hasDualUnits ? "44%" : "42%";
  const enemyMainRightPct = hasDualUnits ? (compactDual ? 5 : 8) : 10;
  const enemySubRightPct = hasDualUnits ? (compactDual ? 25 : 24) : 24;
  const enemySubTopPct = hasDualUnits ? (compactDual ? 27 : 23) : 14;
  const playerMainLeftPct = hasDualUnits ? (compactDual ? 4 : 6) : 6;
  const playerMainBottomPct = hasDualUnits ? (compactDual ? 9 : 11) : 14;
  const playerSubLeftPct = hasDualUnits ? (compactDual ? 21 : 23) : 24;
  const playerSubBottomPct = hasDualUnits ? (compactDual ? 13 : 15) : 17;
  const mainPlayerBaseSize = B.pStg >= 2 ? 200 : B.pStg >= 1 ? 170 : 120;
  const mainPlayerScale = hasDualUnits ? (compactDual ? 0.82 : 0.9) : 1;
  const mainPlayerSize = Math.round(mainPlayerBaseSize * mainPlayerScale);
  const subPlayerSize = Math.round((compactDual ? 96 : 104) * (hasDualUnits ? (compactDual ? 0.82 : 0.88) : 1));
  const pvpEnemyBarActive = B.battleMode !== "pvp" || B.pvpTurn === "p2";
  const mainBarActive = B.battleMode === "pvp"
    ? B.pvpTurn === "p1"
    : (isCoopBattle ? !coopUsingSub : true);
  const subBarActive = isCoopBattle && !!B.allySub && coopUsingSub;
  const hpBarFocusStyle = (active: boolean) => ({
    opacity: active ? 1 : 0.62,
    transform: active ? "scale(1)" : "scale(0.98)",
    filter: active ? "none" : "saturate(0.72)",
    transition: "opacity 0.2s ease,transform 0.2s ease,filter 0.2s ease",
  });
  const pvpEnemyBurn = B.pvpBurnP2 || 0;
  const pvpEnemyFreeze = !!B.pvpFreezeP2;
  const pvpEnemyParalyze = !!B.pvpParalyzeP2;
  const pvpEnemyStatic = B.pvpStaticP2 || 0;
  const pvpEnemyCombo = B.pvpComboP2 || 0;
  const pvpEnemySpecDef = !!B.pvpSpecDefP2;
  const pvpPlayerBurn = B.pvpBurnP1 || 0;
  const pvpPlayerFreeze = !!B.pvpFreezeP1;
  const pvpPlayerParalyze = !!B.pvpParalyzeP1;
  const pvpPlayerStatic = B.pvpStaticP1 || 0;
  const pvpPlayerCombo = B.pvpComboP1 || 0;
  const pvpPlayerSpecDef = !!B.pvpSpecDefP1;

  // Enemy visual center fallback (used before first DOM measurement)
  // Note: MonsterSprite height = size * 100 / 120, so center Y uses sprite height / 2.
  const eBaseSize = B.enemy.id === "boss" ? 230
    : (B.enemy.id === "fire" || B.enemy.id === "dragon" || (B.enemy.id.startsWith("slime") && B.enemy.isEvolved)) ? 190
    : B.enemy.isEvolved ? 155 : 120;
  const enemyMainScale = hasDualUnits ? (compactDual ? 0.86 : 0.92) : 1;
  const eSize = Math.round(eBaseSize * enemyMainScale);
  const eHeight = eSize * 100 / 120;
  const eSceneType = B.enemy.sceneMType || B.enemy.mType;
  const eBaseTopPct = (eSceneType === "ghost" || B.enemy.id === "boss") ? 12
    : eSceneType === "steel" ? 16 : 26;
  const eTopPct = eBaseTopPct + (hasDualUnits ? (compactDual ? 8 : 6) : 0);
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
  const specDefReadyLabel = B.starter.type === "fire"
    ? t("battle.specDef.fire", "🛡️ Shield")
    : B.starter.type === "water"
      ? t("battle.specDef.water", "💨 Perfect Dodge")
      : B.starter.type === "electric"
        ? t("battle.specDef.electric", "⚡ Paralysis")
        : B.starter.type === "light"
          ? t("battle.specDef.light", "✨ Lion Roar")
          : t("battle.specDef.grass", "🌿 Reflect");
  const specDefToneClass = B.starter.type === "fire"
    ? "battle-pill-specdef-fire"
    : B.starter.type === "water"
      ? "battle-pill-specdef-water"
      : B.starter.type === "electric"
        ? "battle-pill-specdef-electric"
        : B.starter.type === "light"
          ? "battle-pill-specdef-light"
          : "battle-pill-specdef-grass";

  return (
    <div
      id="main-content"
      ref={battleRootRef}
      className={`battle-root ${UX.compactUI ? "compact-ui" : ""} ${UX.lowPerfMode ? "low-perf" : ""} ${canTapAdvance ? "battle-root-advance" : ""}`}
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

      {/* Popups & particles */}
      {B.dmgs.map((d) => <DamagePopup key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} onDone={() => B.rmD(d.id)} />)}
      {showHeavyFx && B.parts.map((p) => <Particle key={p.id} emoji={p.emoji} x={p.x} y={p.y} seed={p.id} onDone={() => B.rmP(p.id)} />)}

      {/* Move level-up toast */}
      {B.battleMode !== "pvp" && B.mLvlUp !== null && B.starter && (
        <div className="battle-level-toast">
          {B.starter.moves[B.mLvlUp].icon} {B.starter.moves[B.mLvlUp].name}{" "}
          {t("battle.moveLevelUp", "leveled up to Lv.{level}! Power -> {power}", {
            level: B.mLvls[B.mLvlUp],
            power: B.getPow(B.mLvlUp),
          })}
        </div>
      )}
      {/* Achievement popup */}
      {B.achPopup && ACH_MAP[B.achPopup] && <AchievementPopup achievement={ACH_MAP[B.achPopup]} onDone={B.dismissAch} />}

      {/* Attack effects */}
      {showHeavyFx && B.atkEffect && B.atkEffect.type === "fire" && <FireEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} target={effectTarget} />}
      {showHeavyFx && B.atkEffect && B.atkEffect.type === "electric" && <ElecEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} target={effectTarget} />}
      {showHeavyFx && B.atkEffect && B.atkEffect.type === "water" && <WaterEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} target={effectTarget} />}
      {showHeavyFx && B.atkEffect && B.atkEffect.type === "grass" && <GrassEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} target={effectTarget} />}
      {showHeavyFx && B.atkEffect && B.atkEffect.type === "dark" && <DarkEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} target={effectTarget} />}
      {showHeavyFx && B.atkEffect && B.atkEffect.type === "light" && <LightEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} target={effectTarget} />}

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
          style={{ boxShadow: `0 8px 22px ${B.effMsg.color}55` }}
        >
          {B.effMsg.text}
        </div>
      )}

      {/* ═══ Battle arena ═══ */}
      <div className="battle-arena">
        {scene.bgImg && <div className="scene-bg" style={{ backgroundImage: `url(${scene.bgImg})` }} />}
        <div style={{ position: "absolute", inset: 0, background: scene.sky, opacity: 0.25, zIndex: 1, transition: "background 1s ease" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: scene.ground, transition: "background 1s ease", zIndex: 2 }} />
        <div style={{ position: "absolute", right: "5%", top: "8%", width: "55%", height: 12, background: scene.platform2, borderRadius: "50%", filter: "blur(2px)", zIndex: 3 }} />
        <div className="battle-scene-deco">{showHeavyFx && scene.Deco && <scene.Deco />}</div>

        {/* Enemy info */}
        <div style={{ position: "absolute", top: 10, left: 10, right: enemyInfoRight, zIndex: 10 }}>
          <div style={hpBarFocusStyle(pvpEnemyBarActive)}>
            <HPBar
              cur={B.eHp}
              max={B.enemy.maxHp}
              color={B.enemy.c1}
              label={`${B.enemy.typeIcon}${B.enemy.name} ${t("battle.level", "Lv.{level}", { level: B.enemy.lvl })}`}
            />
          </div>
          {B.enemySub && (
            <div style={{ marginTop: 4, ...hpBarFocusStyle(false) }}>
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
                {hasSpecialTrait(B.enemy.traitName, B.enemy.traitDesc) && <div className="battle-status-chip is-counter-soft">✦{B.enemy.traitName}</div>}
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
        <div ref={enemySpriteRef} style={{ position: "absolute", right: `${enemyMainRightPct}%`, top: `${eTopPct}%`, zIndex: 6, animation: B.eAnim || (UX.lowPerfMode ? "none" : (B.enemy && B.enemy.id === "boss" ? "bossFloat 2.5s ease-in-out infinite, bossPulse 4s ease infinite" : "float 3s ease-in-out infinite")) }}>
          <MonsterSprite svgStr={eSvg} size={eSize} />
        </div>
        {B.enemySub && eSubSvg && (
          <div style={{ position: "absolute", right: `${enemySubRightPct}%`, top: `${enemySubTopPct}%`, zIndex: 4, opacity: 0.78, transform: `scale(${compactDual ? 0.72 : 0.8})`, filter: "saturate(0.9)", animation: UX.lowPerfMode ? "none" : "float 3.8s ease-in-out infinite" }}>
            <MonsterSprite svgStr={eSubSvg} size={B.enemySub.id === "boss" ? 160 : B.enemySub.isEvolved ? 120 : 96} />
          </div>
        )}
        {!B.eAnim && !UX.lowPerfMode && <div style={{ position: "absolute", right: `calc(${enemyMainRightPct}% + ${Math.round(eSize * 0.18)}px)`, top: `calc(${eTopPct}% + ${Math.round(eHeight * 0.72)}px)`, width: Math.round(eSize * 0.56), height: 12, background: "radial-gradient(ellipse,rgba(0,0,0,0.6),transparent)", borderRadius: "50%", zIndex: 4, animation: B.enemy && B.enemy.id === "boss" ? "bossShadowPulse 2.5s ease-in-out infinite" : "shadowPulse 3s ease-in-out infinite" }} />}

        {/* Player platform & info */}
        <div style={{ position: "absolute", left: "2%", bottom: "12%", width: "50%", height: 10, background: scene.platform1, borderRadius: "50%", filter: "blur(2px)", zIndex: 3 }} />
        <div style={{ position: "absolute", bottom: 10, right: 10, left: playerInfoLeft, zIndex: 10 }}>
          <div style={hpBarFocusStyle(mainBarActive)}>
            <HPBar
              cur={B.pHp}
              max={mainMaxHp}
              color="#6366f1"
              label={`${isCoopBattle && !coopUsingSub ? "▶ " : ""}${st.name} ${t("battle.level", "Lv.{level}", { level: B.pLvl })}`}
            />
          </div>
          {B.allySub && (
            <div style={{ marginTop: 4, ...hpBarFocusStyle(subBarActive) }}>
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
        <div ref={playerSpriteRef} style={{ position: "absolute", left: `${playerMainLeftPct}%`, bottom: `${playerMainBottomPct}%`, transform: "scaleX(-1)", zIndex: 6, filter: isCoopBattle && !coopUsingSub ? "drop-shadow(0 0 12px rgba(99,102,241,0.7))" : "none", transition: "filter 0.2s ease", animation: B.pAnim || (UX.lowPerfMode ? "none" : "floatFlip 3s ease-in-out infinite") }}>
          <MonsterSprite svgStr={pSvg} size={mainPlayerSize} />
        </div>
        {B.allySub && pSubSvg && (
          <div style={{ position: "absolute", left: `${playerSubLeftPct}%`, bottom: `${playerSubBottomPct}%`, transform: "scaleX(-1)", zIndex: 4, opacity: 0.84, filter: isCoopBattle && coopUsingSub ? "drop-shadow(0 0 12px rgba(34,197,94,0.75))" : "none", transition: "filter 0.2s ease", animation: UX.lowPerfMode ? "none" : "floatFlip 3.8s ease-in-out infinite" }}>
            <MonsterSprite svgStr={pSubSvg} size={subPlayerSize} />
          </div>
        )}
        {!B.pAnim && !UX.lowPerfMode && <div style={{ position: "absolute", left: `calc(${playerMainLeftPct}% + ${Math.round(mainPlayerSize * 0.14)}px)`, bottom: `${Math.max(8, playerMainBottomPct - 1)}%`, width: Math.round(mainPlayerSize * 0.5), height: 10, background: "radial-gradient(ellipse,rgba(0,0,0,0.55),transparent)", borderRadius: "50%", zIndex: 4, animation: "shadowPulse 3s ease-in-out infinite" }} />}

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
            {activeStarter.moves.map((m, i: number) => {
              const sealed = B.battleMode === "pvp" ? false : B.sealedMove === i;
              const pvpLocked = B.battleMode === "pvp" ? (m.risky && !chargeReadyDisplay) : false;
              const locked = B.battleMode === "pvp" ? pvpLocked : ((m.risky && !B.chargeReady) || sealed);
              const lv = B.mLvls[i];
              const pw = B.battleMode === "pvp" ? m.basePower : B.getPow(i);
              const atCap = lv >= MAX_MOVE_LVL || m.basePower + lv * m.growth > POWER_CAPS[i];
              const eff = B.battleMode === "pvp" ? 1 : B.dualEff(m);
              return <button
                className={`battle-menu-btn ${locked ? "is-locked" : ""}`}
                key={i}
                onClick={() => !locked && B.selectMove(i)}
                style={{
                  background: locked ? "rgba(255,255,255,0.03)" : eff > 1 ? `linear-gradient(135deg,${m.bg},rgba(34,197,94,0.08))` : eff < 1 ? `linear-gradient(135deg,${m.bg},rgba(148,163,184,0.08))` : m.bg,
                  border: `2px solid ${sealed ? "rgba(168,85,247,0.4)" : locked ? "rgba(255,255,255,0.08)" : eff > 1 ? "#22c55e66" : m.color + "44"}`,
                  opacity: locked ? 0.4 : 1,
                  cursor: locked ? "default" : "pointer",
                  animation: `fadeSlide 0.3s ease ${i * 0.05}s both`,
                }}
              >
                {sealed && <div className="move-sealed-mask"><span className="move-sealed-text">{t("battle.sealed", "🔮 Sealed ({turns})", { turns: B.sealedTurns })}</span></div>}
                <div className="move-badge-stack">
                  {B.battleMode !== "pvp" && lv > 1 && (
                    <div
                      className={`move-badge move-badge-level ${atCap ? "cap" : ""}`}
                      style={atCap ? undefined : { background: m.color }}
                    >
                      Lv{lv}
                    </div>
                  )}
                  {eff > 1 && <div className="move-badge move-badge-up">{t("battle.effect.up", "Effect Up")}</div>}
                  {eff < 1 && <div className="move-badge move-badge-down">{t("battle.effect.down", "Effect Down")}</div>}
                </div>
                <div className="move-name-row">
                  <span className="move-icon">{m.icon}</span>
                  <span className="move-name" style={{ color: locked ? "#94a3b8" : m.color }}>{m.name}</span>
                </div>
                <div className="move-desc-row" style={{ color: locked ? "#64748b" : "#94a3b8" }}>
                  {m.desc} · {t("battle.power", "Power")} <b style={{ color: lv > 1 ? m.color : "inherit" }}>{pw}</b>{eff > 1 ? " ×1.5" : eff < 1 ? " ×0.6" : ""}{m.risky && B.battleMode === "pvp" && !chargeReadyDisplay && ` ${t("battle.risky.lockedPvp", "🔒Need 3 correct")}`}{m.risky && B.battleMode === "pvp" && chargeReadyDisplay && ` ${t("battle.risky.readyPvp", "⚡Cast Ready")}`}{m.risky && !B.chargeReady && B.battleMode !== "pvp" && ` ${t("battle.risky.locked", "🔒")}`}{m.risky && B.chargeReady && B.battleMode !== "pvp" && ` ${t("battle.risky.ready", "⚡Charge Ready!")}`}{B.battleMode !== "pvp" && !m.risky && !atCap && lv > 1 && " ↑"}{B.battleMode !== "pvp" && atCap && ` ${t("battle.max", "✦MAX")}`}
                </div>
                {B.battleMode !== "pvp" && !m.risky && !atCap && <div className="move-progress-track"><div className="move-progress-fill" style={{ width: `${(B.mHits[i] % (HITS_PER_LVL * B.mLvls[i])) / (HITS_PER_LVL * B.mLvls[i]) * 100}%`, background: m.color }} /></div>}
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
            <button className="battle-util-btn" aria-label={t("a11y.battle.settings", "Open battle settings")} onClick={() => openSettings("battle")}>⚙️ {t("battle.settings", "Settings")}</button>
            <button className="battle-util-btn battle-util-btn-danger" aria-label={t("a11y.battle.run", "Run from battle")} onClick={B.quitGame}>🏳️ {t("battle.run", "Run")}</button>
          </div>
        </div>}

        {/* Question panel */}
        {B.phase === "question" && question && activeStarter && selectedMove && <div className="battle-question-wrap">
          <div className="battle-question-head"><span className="battle-question-icon">{selectedMove.icon}</span><span className="battle-question-title">{selectedMove.name}！</span><span className="battle-question-sub">{activeStarter.typeIcon} {activeStarter.name}</span><span className="battle-question-note">{B.timedMode ? t("battle.answer.timed", "⏱️ Timed Answer!") : t("battle.answer.hit", "Answer correctly to hit")}</span></div>
          <div className="battle-question-card">
            {B.timedMode && !B.answered && (
              <QuestionTimerHud
                timerSec={TIMER_SEC}
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

export default GameShell;
