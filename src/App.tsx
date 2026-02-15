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
import type { ComponentProps, ReactNode } from 'react';
import './App.css';
import { useI18n } from './i18n';

// Hooks
import { useBattle } from './hooks/useBattle';
import { useMobileExperience } from './hooks/useMobileExperience';

// Data
import { SCENES } from './data/scenes';
import { TIMER_SEC, HITS_PER_LVL, MAX_MOVE_LVL, POWER_CAPS } from './data/constants';
import { PVP_BALANCE } from './data/pvpBalance';
import { getStageMaxHp, getStarterMaxHp } from './utils/playerHp';

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
import TitleScreen from './components/screens/TitleScreen';
import SelectionScreen from './components/screens/SelectionScreen';
import LeaderboardScreen from './components/screens/LeaderboardScreen';
import EvolveScreen from './components/screens/EvolveScreen';
import GameOverScreen from './components/screens/GameOverScreen';
import AchievementScreen from './components/screens/AchievementScreen';
import EncyclopediaScreen from './components/screens/EncyclopediaScreen';
import DashboardScreen from './components/screens/DashboardScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import PvpResultScreen from './components/screens/PvpResultScreen';
import AchievementPopup from './components/ui/AchievementPopup';
import { ACH_MAP } from './data/achievements';
import type { ScreenName, TimerSubscribe } from './types/battle';

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
      <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#1e1b4b", color:"white", padding:24, textAlign:"center", gap:12 }}>
        <div style={{ fontSize:40 }}>⚠️</div>
        <div style={{ fontSize:16, fontWeight:800 }}>遊戲發生錯誤</div>
        <div style={{ fontSize:11, opacity:0.6, maxWidth:320, wordBreak:"break-all" }}>{errorText}</div>
        <button onClick={() => { this.setState({ error: null }); }} style={{ marginTop:12, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"white", padding:"8px 20px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>重新載入</button>
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
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0f172a", display: "flex", justifyContent: "center" }}>
      <a className="skip-link" href="#main-content" aria-label={t("a11y.skip.main", "Skip to main content")}>
        {t("app.skip.main", "Skip to main content")}
      </a>
      <div style={{ width: "100%", maxWidth: 480, height: "100%", position: "relative", background: "#000", boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}>
        <ErrorBoundary><App /></ErrorBoundary>
        {showRotateHint && (
          <div
            role="button"
            tabIndex={0}
            aria-label={t("a11y.overlay.rotateDismiss", "Dismiss rotate hint and continue")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowRotateHint(false);
              }
            }}
            onClick={() => setShowRotateHint(false)}
            style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#0f172a,#1e1b4b,#312e81)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", zIndex: 9999, cursor: "pointer" }}
          >
            <div style={{ fontSize: 56, marginBottom: 20, animation: "float 3s ease-in-out infinite" }}>📱</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t("app.rotate.title", "Please rotate your phone to portrait")}</div>
            <div style={{ fontSize: 13, opacity: 0.5 }}>{t("app.rotate.hint", "This game supports portrait mode only")}</div>
            <div style={{ fontSize: 12, opacity: 0.35, marginTop: 24 }}>{t("app.rotate.continue", "Tap anywhere to continue")}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App: main game component (render only) ───
type SpriteTarget = {
  right: string;
  top: string;
  flyRight: number;
  flyTop: number;
};

type SelectionPayload = Parameters<ComponentProps<typeof SelectionScreen>["onSelect"]>[0];
type DualSelectionPayload = Extract<SelectionPayload, { p1: unknown; p2: unknown }>;

function isDualSelectionPayload(payload: SelectionPayload): payload is DualSelectionPayload {
  return typeof payload === "object" && payload !== null && "p1" in payload && "p2" in payload;
}

function App() {
  const { t } = useI18n();
  const B = useBattle();
  const UX = useMobileExperience();
  const showHeavyFx = !UX.lowPerfMode;
  const [audioMuted, setAudioMuted] = useState<boolean>(() => Boolean(B.sfx.muted));
  const battleRootRef = useRef<HTMLDivElement | null>(null);
  const enemySpriteRef = useRef<HTMLDivElement | null>(null);
  const playerSpriteRef = useRef<HTMLDivElement | null>(null);
  const [measuredEnemyTarget, setMeasuredEnemyTarget] = useState<SpriteTarget | null>(null);
  const [measuredPlayerTarget, setMeasuredPlayerTarget] = useState<SpriteTarget | null>(null);
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

  useEffect(() => {
    if (B.screen !== "battle") return;
    let rafId = 0;
    const syncTargets = () => {
      const rootEl = battleRootRef.current;
      const enemyEl = enemySpriteRef.current;
      const playerEl = playerSpriteRef.current;
      if (!rootEl) return;

      const rootRect = rootEl.getBoundingClientRect();
      if (rootRect.width <= 0 || rootRect.height <= 0) return;

      if (enemyEl) {
        const enemyRect = enemyEl.getBoundingClientRect();
        if (enemyRect.width > 0 && enemyRect.height > 0) {
          const cx = enemyRect.left - rootRect.left + enemyRect.width / 2;
          const cy = enemyRect.top - rootRect.top + enemyRect.height / 2;
          const rightPx = rootRect.width - cx;
          const topPx = cy;
          setMeasuredEnemyTarget({
            right: `${rightPx}px`,
            top: `${topPx}px`,
            flyRight: rightPx / rootRect.width * 100,
            flyTop: topPx / rootRect.height * 100,
          });
        }
      }

      if (playerEl) {
        const playerRect = playerEl.getBoundingClientRect();
        if (playerRect.width > 0 && playerRect.height > 0) {
          const cx = playerRect.left - rootRect.left + playerRect.width / 2;
          const cy = playerRect.top - rootRect.top + playerRect.height / 2;
          const rightPx = rootRect.width - cx;
          const topPx = cy;
          setMeasuredPlayerTarget({
            right: `${rightPx}px`,
            top: `${topPx}px`,
            flyRight: rightPx / rootRect.width * 100,
            flyTop: topPx / rootRect.height * 100,
          });
        }
      }
    };
    const scheduleSync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncTargets);
    };

    scheduleSync();
    window.addEventListener("resize", scheduleSync);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleSync);
      if (battleRootRef.current) observer.observe(battleRootRef.current);
      if (enemySpriteRef.current) observer.observe(enemySpriteRef.current);
      if (playerSpriteRef.current) observer.observe(playerSpriteRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", scheduleSync);
      if (observer) observer.disconnect();
    };
  }, [B.screen, B.phase, B.enemy?.id, B.enemy?.isEvolved, B.enemy?.sceneMType, B.enemy?.mType, B.pStg, B.battleMode, B.pvpTurn]);

  const wrapMain = (node: ReactNode) => (
    <div id="main-content" style={{ height: "100%" }}>
      {node}
    </div>
  );

  // ─── Screen routing ───
  if (B.screen === "title") return wrapMain(
    <TitleScreen
      onStartNormal={() => { B.setTimedMode(false); B.setBattleMode("single"); B.setScreen("selection"); }}
      onStartTimed={() => { B.setTimedMode(true); B.setBattleMode("single"); B.setScreen("selection"); }}
      onStartCoop={() => { B.setTimedMode(false); B.setBattleMode("coop"); B.setScreen("selection"); }}
      onStartPvp={() => { B.setTimedMode(true); B.setBattleMode("pvp"); B.setScreen("selection"); }}
      onLeaderboard={() => B.setScreen("leaderboard")}
      onAchievements={() => B.setScreen("achievements")}
      onEncyclopedia={() => B.setScreen("encyclopedia")}
      onDashboard={() => B.setScreen("dashboard")}
      onSettings={() => openSettings("title")}
      lowPerfMode={UX.lowPerfMode}
    />
  );
  if (B.screen === "achievements") return wrapMain(
    <AchievementScreen unlockedIds={B.achUnlocked} onBack={() => B.setScreen("title")} />
  );
  if (B.screen === "encyclopedia") return wrapMain(
    <EncyclopediaScreen encData={B.encData} onBack={() => B.setScreen("title")} />
  );
  if (B.screen === "dashboard") return wrapMain(
    <DashboardScreen onBack={() => B.setScreen("title")} />
  );
  if (B.screen === "settings") return wrapMain(
    <SettingsScreen
      onBack={closeSettings}
      perfMode={UX.perfMode}
      lowPerfMode={UX.lowPerfMode}
      autoLowEnd={UX.autoLowEnd}
      onSetPerfMode={UX.setPerfMode}
      audioMuted={audioMuted}
      onSetAudioMuted={setAudioMute}
    />
  );
  if (B.screen === "leaderboard") return wrapMain(
    <LeaderboardScreen totalEnemies={B.enemies.length} onBack={() => B.setScreen("title")} />
  );
  if (B.screen === "selection") return wrapMain(
    <SelectionScreen
      mode={B.battleMode}
      onSelect={(payload: SelectionPayload) => {
        B.sfx.init();
        if (B.battleMode === "coop" && isDualSelectionPayload(payload)) {
          B.setStarter(payload.p1);
          B.startGame(payload.p1, "coop", payload.p2);
          return;
        }
        if (B.battleMode === "pvp" && isDualSelectionPayload(payload)) {
          B.setStarter(payload.p1);
          B.setPvpStarter2(payload.p2);
          B.startGame(payload.p1, "pvp", payload.p2);
          return;
        }
        B.setStarter(payload);
        B.startGame(payload, B.battleMode);
      }}
      onBack={() => B.setScreen("title")}
    />
  );
  if (B.screen === "pvp_result") return wrapMain(
    <PvpResultScreen
      p1Starter={B.starter}
      p2Starter={B.pvpStarter2}
      p1StageIdx={B.pStg}
      p2StageIdx={B.pvpStarter2?.selectedStageIdx || 0}
      winner={B.pvpWinner || "p1"}
      onRematch={() => B.starter && B.startGame(B.starter, "pvp")}
      onHome={() => B.setScreen("title")}
    />
  );
  if (B.screen === "evolve") return wrapMain(
    <EvolveScreen starter={B.starter} stageIdx={B.pStg} onContinue={B.continueAfterEvolve} />
  );
  if (B.screen === "gameover") return wrapMain(
    <GameOverScreen
      defeated={B.defeated} totalEnemies={B.enemies.length}
      tC={B.tC} tW={B.tW} pLvl={B.pLvl} timedMode={B.timedMode}
      maxStreak={B.maxStreak} starter={B.starter} mLvls={B.mLvls}
      getPow={B.getPow}
      onRestart={() => B.starter && B.startGame()}
      onLeaderboard={() => B.setScreen("leaderboard")}
      onHome={() => B.setScreen("title")}
    />
  );
  if (!B.enemy || !B.starter) return wrapMain(
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#0f172a,#1e1b4b,#312e81)", color: "white", gap: 16 }}>
      <div style={{ fontSize: 48, animation: "float 2s ease-in-out infinite" }}>⚔️</div>
      <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.6 }}>{t("app.loading.battle", "Preparing battle...")}</div>
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

  return (
    <div
      id="main-content"
      ref={battleRootRef}
      className={`battle-root ${UX.compactUI ? "compact-ui" : ""} ${UX.lowPerfMode ? "low-perf" : ""}`}
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
      style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", cursor: canTapAdvance ? "pointer" : "default" }}
    >
      {/* Pause overlay */}
      {B.gamePaused && <div
        role="button"
        tabIndex={0}
        aria-label={t("a11y.overlay.pauseResume", "Resume game")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            B.togglePause();
          }
        }}
        onClick={B.togglePause}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", zIndex: 9000, cursor: "pointer", backdropFilter: UX.lowPerfMode ? "none" : "blur(4px)" }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏸️</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{t("app.pause.title", "Game Paused")}</div>
        <div style={{ fontSize: 13, opacity: 0.5 }}>{t("app.pause.hint", "Tap anywhere to resume")}</div>
      </div>}

      {/* Popups & particles */}
      {B.dmgs.map((d) => <DamagePopup key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} onDone={() => B.rmD(d.id)} />)}
      {showHeavyFx && B.parts.map((p) => <Particle key={p.id} emoji={p.emoji} x={p.x} y={p.y} seed={p.id} onDone={() => B.rmP(p.id)} />)}

      {/* Move level-up toast */}
      {B.battleMode !== "pvp" && B.mLvlUp !== null && B.starter && <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,rgba(251,191,36,0.9),rgba(245,158,11,0.9))", color: "white", padding: "6px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 200, animation: "popIn 0.3s ease", boxShadow: "0 4px 16px rgba(245,158,11,0.4)", whiteSpace: "nowrap" }}>{B.starter.moves[B.mLvlUp].icon} {B.starter.moves[B.mLvlUp].name} 升級到 Lv.{B.mLvls[B.mLvlUp]}！威力 → {B.getPow(B.mLvlUp)}</div>}
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
      {showHeavyFx && B.defAnim === "fire" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 160, height: 160, zIndex: 50, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,rgba(251,191,36,0.5),rgba(245,158,11,0.15),transparent 70%)", animation: "shieldPulse 1.2s ease forwards" }} />
        <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "3px solid rgba(251,191,36,0.6)", animation: "shieldPulse 1.2s ease 0.1s forwards", opacity: 0 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 12px rgba(251,191,36,0.8))" }}>🛡️</div>
      </div>}
      {showHeavyFx && B.defAnim === "water" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 130, height: 130, zIndex: 50, pointerEvents: "none" }}>
        {[0, 1, 2].map(i => <div key={i} style={{ position: "absolute", inset: 0, background: "radial-gradient(circle,rgba(56,189,248,0.35),transparent 70%)", borderRadius: "50%", animation: `shieldPulse 0.8s ease ${i * 0.15}s forwards`, opacity: 0 }} />)}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 40, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 10px rgba(56,189,248,0.8))" }}>💨</div>
      </div>}
      {showHeavyFx && B.defAnim === "grass" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 160, height: 160, zIndex: 50, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,0.45),rgba(22,163,74,0.12),transparent 70%)", animation: "vineCounter 1.4s ease forwards" }} />
        <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: "3px solid rgba(34,197,94,0.5)", animation: "vineCounter 1.4s ease 0.1s forwards", opacity: 0 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 44, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 10px rgba(34,197,94,0.8))" }}>🌿</div>
      </div>}
      {showHeavyFx && B.defAnim === "electric" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 160, height: 160, zIndex: 50, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,rgba(251,191,36,0.5),rgba(234,179,8,0.15),transparent 70%)", animation: "shieldPulse 1.2s ease forwards" }} />
        <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "3px solid rgba(251,191,36,0.6)", animation: "shieldPulse 1.2s ease 0.1s forwards", opacity: 0 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 12px rgba(251,191,36,0.8))" }}>⚡</div>
      </div>}
      {showHeavyFx && B.defAnim === "light" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 170, height: 170, zIndex: 50, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,158,11,0.55),rgba(251,191,36,0.2),transparent 70%)", animation: "shieldPulse 1.2s ease forwards" }} />
        <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "3px solid rgba(245,158,11,0.6)", animation: "shieldPulse 1.2s ease 0.1s forwards", opacity: 0 }} />
        <div style={{ position: "absolute", inset: -16, borderRadius: "50%", border: "2px solid rgba(251,191,36,0.3)", animation: "shieldPulse 1.2s ease 0.2s forwards", opacity: 0 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 14px rgba(245,158,11,0.9))" }}>✨</div>
      </div>}
      {showHeavyFx && B.defAnim && <div style={{ position: "absolute", inset: 0, zIndex: 45, pointerEvents: "none", animation: B.defAnim === "fire" ? "shieldFlash 0.8s ease" : B.defAnim === "water" ? "dodgeFlash 0.8s ease" : B.defAnim === "electric" ? "shieldFlash 0.8s ease" : B.defAnim === "light" ? "shieldFlash 0.8s ease" : "counterFlash 0.8s ease" }} />}

      {/* Type effectiveness popup */}
      {B.effMsg && <div style={{ position: "absolute", top: "38%", left: "50%", transform: "translateX(-50%)", background: B.effMsg.color === "#22c55e" ? "linear-gradient(135deg,rgba(34,197,94,0.95),rgba(22,163,74,0.95))" : "linear-gradient(135deg,rgba(100,116,139,0.9),rgba(71,85,105,0.9))", color: "white", padding: "6px 20px", borderRadius: 20, fontSize: 14, fontWeight: 800, zIndex: 200, animation: "popIn 0.3s ease", boxShadow: `0 4px 16px ${B.effMsg.color}44`, letterSpacing: 1 }}>{B.effMsg.text}</div>}

      {/* ═══ Battle arena ═══ */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, background: "#111", transition: "background 1s ease" }}>
        {scene.bgImg && <div className="scene-bg" style={{ backgroundImage: `url(${scene.bgImg})` }} />}
        <div style={{ position: "absolute", inset: 0, background: scene.sky, opacity: 0.25, zIndex: 1, transition: "background 1s ease" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: scene.ground, transition: "background 1s ease", zIndex: 2 }} />
        <div style={{ position: "absolute", right: "5%", top: "8%", width: "55%", height: 12, background: scene.platform2, borderRadius: "50%", filter: "blur(2px)", zIndex: 3 }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}>{showHeavyFx && scene.Deco && <scene.Deco />}</div>

        {/* Enemy info */}
        <div style={{ position: "absolute", top: 10, left: 10, right: enemyInfoRight, zIndex: 10 }}>
          <div style={hpBarFocusStyle(pvpEnemyBarActive)}>
            <HPBar cur={B.eHp} max={B.enemy.maxHp} color={B.enemy.c1} label={`${B.enemy.typeIcon}${B.enemy.name} Lv.${B.enemy.lvl}`} />
          </div>
          {B.enemySub && (
            <div style={{ marginTop: 4, ...hpBarFocusStyle(false) }}>
              <HPBar cur={B.eHpSub} max={B.enemySub.maxHp} color={B.enemySub.c1} label={`副將 ${B.enemySub.typeIcon}${B.enemySub.name} Lv.${B.enemySub.lvl}`} />
            </div>
          )}
          <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
            {B.battleMode === "pvp" ? (
              <>
                {pvpEnemyBurn > 0 && <div style={{ background: "rgba(239,68,68,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>🔥灼燒 x{pvpEnemyBurn}</div>}
                {pvpEnemyFreeze && <div style={{ background: "rgba(56,189,248,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>❄️凍結</div>}
                {pvpEnemyParalyze && <div style={{ background: "rgba(234,179,8,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>⚡麻痺</div>}
                {pvpEnemyStatic > 0 && <div style={{ background: "rgba(234,179,8,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>⚡蓄電 x{pvpEnemyStatic}</div>}
                {pvpEnemySpecDef && <div style={{ background: "rgba(99,102,241,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>🛡️反制就緒</div>}
                {!pvpEnemySpecDef && pvpEnemyCombo > 0 && <div style={{ background: "rgba(99,102,241,0.7)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>🛡️連擊 {pvpEnemyCombo}/{pvpComboTrigger}</div>}
              </>
            ) : (
              <>
                {B.enemy.traitName && B.enemy.traitName !== "普通" && <div style={{ background: "rgba(99,102,241,0.7)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>✦{B.enemy.traitName}</div>}
                {B.burnStack > 0 && <div style={{ background: "rgba(239,68,68,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>🔥灼燒 x{B.burnStack}</div>}
                {B.frozen && <div style={{ background: "rgba(56,189,248,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>❄️凍結</div>}
                {B.staticStack > 0 && <div style={{ background: "rgba(234,179,8,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>⚡靜電 x{B.staticStack}{B.staticStack >= 2 ? " ⚠️" : ""}</div>}
                {B.bossPhase >= 2 && <div style={{ background: "rgba(168,85,247,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>{B.bossPhase >= 3 ? "💀覺醒 ATK×2" : "💀狂暴 ATK×1.5"}</div>}
                {B.bossCharging && <div style={{ background: "rgba(251,191,36,0.9)", color: "#000", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>⚠️蓄力中！</div>}
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
            <HPBar cur={B.pHp} max={mainMaxHp} color="#6366f1" label={`${isCoopBattle && !coopUsingSub ? "▶ " : ""}${st.name} Lv.${B.pLvl}`} />
          </div>
          {B.allySub && (
            <div style={{ marginTop: 4, ...hpBarFocusStyle(subBarActive) }}>
              <HPBar cur={B.pHpSub} max={subMaxHp} color={B.allySub.c1} label={`${isCoopBattle && coopUsingSub ? "▶ " : ""}夥伴 ${B.allySub.typeIcon}${B.allySub.name}`} />
            </div>
          )}
          <XPBar exp={B.pExp} max={B.expNext} />
          {B.battleMode === "pvp" ? (
            <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
              {pvpPlayerBurn > 0 && <div style={{ background: "rgba(239,68,68,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>🔥灼燒 x{pvpPlayerBurn}</div>}
              {pvpPlayerFreeze && <div style={{ background: "rgba(56,189,248,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>❄️凍結</div>}
              {pvpPlayerParalyze && <div style={{ background: "rgba(234,179,8,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>⚡麻痺</div>}
              {pvpPlayerStatic > 0 && <div style={{ background: "rgba(234,179,8,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>⚡蓄電 x{pvpPlayerStatic}</div>}
              {pvpPlayerSpecDef && <div style={{ background: "rgba(99,102,241,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>🛡️反制就緒</div>}
              {!pvpPlayerSpecDef && pvpPlayerCombo > 0 && <div style={{ background: "rgba(99,102,241,0.7)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>🛡️連擊 {pvpPlayerCombo}/{pvpComboTrigger}</div>}
            </div>
          ) : (
            <>
              {B.cursed && <div style={{ background: "rgba(168,85,247,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, marginTop: 3, display: "inline-block", animation: "popIn 0.3s ease" }}>💀詛咒：下次攻擊弱化</div>}
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

        {/* Streak badge */}
        {B.streak >= 2 && <div style={{ position: "absolute", top: 10, right: 10, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", padding: "3px 10px", borderRadius: 16, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease", zIndex: 20 }}>🔥 {B.streak} 連擊！</div>}
        {/* Passive counter progress (shows when passiveCount >= 1) */}
        {B.passiveCount >= 1 && !B.specDef && <div style={{ position: "absolute", top: B.streak >= 2 ? 32 : 10, right: B.timedMode && B.streak < 2 ? 80 : 10, background: "rgba(99,102,241,0.8)", color: "white", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, zIndex: 20, display: "flex", alignItems: "center", gap: 3 }}>🛡️ {B.passiveCount}/8</div>}
        {B.timedMode && B.streak < 2 && <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(239,68,68,0.7)", color: "white", padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, zIndex: 20, backdropFilter: UX.lowPerfMode ? "none" : "blur(4px)" }}>⏱️ 計時</div>}
        {B.diffLevel !== 2 && <div style={{ position: "absolute", top: (B.streak >= 2 || B.timedMode) ? 32 : 10, right: 10, background: B.diffLevel > 2 ? "rgba(239,68,68,0.7)" : "rgba(56,189,248,0.7)", color: "white", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, zIndex: 20, animation: "popIn 0.3s ease" }}>{B.diffLevel > 2 ? `📈難度+${B.diffLevel - 2}` : `📉難度${B.diffLevel - 2}`}</div>}

        {/* Charge meter */}
        <div style={{ position: "absolute", bottom: 50, left: 10, display: "flex", gap: 4, zIndex: 20, background: "rgba(0,0,0,0.3)", padding: "3px 8px", borderRadius: 10, backdropFilter: UX.lowPerfMode ? "none" : "blur(4px)" }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: i < chargeDisplay ? "#f59e0b" : "rgba(0,0,0,0.15)", border: "2px solid rgba(255,255,255,0.4)", transition: "all 0.3s", animation: !UX.lowPerfMode && i < chargeDisplay ? "chargeGlow 1.5s ease infinite" : "none" }} />)}
          {chargeReadyDisplay && <span style={{ fontSize: 9, color: "#b45309", fontWeight: 700, marginLeft: 2, animation: "popIn 0.3s ease" }}>MAX!</span>}
        </div>

        {/* Special defense ready badge */}
        {B.bossPhase >= 3 && <div style={{ position: "absolute", bottom: 92, left: 10, zIndex: 20, background: "linear-gradient(135deg,rgba(251,191,36,0.9),rgba(245,158,11,0.9))", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease, specDefReady 2s ease infinite", boxShadow: "0 2px 12px rgba(251,191,36,0.4)" }}>🔥背水一戰 DMG×1.3</div>}
        {B.bossCharging && <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translateX(-50%)", zIndex: 20, background: "rgba(251,191,36,0.95)", color: "#000", padding: "6px 16px", borderRadius: 12, fontSize: 14, fontWeight: 800, animation: "popIn 0.3s ease", boxShadow: "0 4px 20px rgba(251,191,36,0.6)" }}>⚠️ 答對可以打斷蓄力！</div>}
        {B.specDef && <div style={{ position: "absolute", bottom: 70, left: 10, zIndex: 20, background: B.starter.type === "fire" ? "linear-gradient(135deg,rgba(251,191,36,0.9),rgba(245,158,11,0.9))" : B.starter.type === "water" ? "linear-gradient(135deg,rgba(56,189,248,0.9),rgba(14,165,233,0.9))" : B.starter.type === "electric" ? "linear-gradient(135deg,rgba(251,191,36,0.9),rgba(234,179,8,0.9))" : B.starter.type === "light" ? "linear-gradient(135deg,rgba(245,158,11,0.9),rgba(217,119,6,0.9))" : "linear-gradient(135deg,rgba(34,197,94,0.9),rgba(22,163,74,0.9))", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease, specDefReady 2s ease infinite", boxShadow: B.starter.type === "fire" ? "0 2px 12px rgba(251,191,36,0.4)" : B.starter.type === "water" ? "0 2px 12px rgba(56,189,248,0.4)" : B.starter.type === "electric" ? "0 2px 12px rgba(234,179,8,0.4)" : B.starter.type === "light" ? "0 2px 12px rgba(245,158,11,0.4)" : "0 2px 12px rgba(34,197,94,0.4)" }}>{B.starter.type === "fire" ? "🛡️防護罩" : B.starter.type === "water" ? "💨完美閃避" : B.starter.type === "electric" ? "⚡電流麻痺" : B.starter.type === "light" ? "✨獅王咆哮" : "🌿反彈"} 準備！</div>}
      </div>

      {/* ═══ Bottom panel ═══ */}
      <div className="battle-panel" style={{ background: "linear-gradient(to top,#0f172a,#1e293b)", borderTop: "3px solid rgba(255,255,255,0.1)", flexShrink: 0, minHeight: B.phase === "question" ? 210 : 170, position: "relative" }}>
        {/* Move menu */}
        {B.phase === "menu" && activeStarter && <div style={{ padding: 10 }}>
          {isCoopBattle && (
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
              🤝 雙人合作 · 目前出招：{activeStarter.typeIcon} {activeStarter.name}
            </div>
          )}
          {B.battleMode === "pvp" && (
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
              {B.pvpTurn === "p1" ? "🔵 玩家1 回合" : "🔴 玩家2 回合"} · {activeStarter.typeIcon} {activeStarter.name} · ⚡{pvpActiveCharge}/3 · {pvpActiveSpecDefReady ? "🛡️反制就緒" : `🛡️${pvpActiveCombo}/${pvpComboTrigger}`}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {activeStarter.moves.map((m, i: number) => {
              const sealed = B.battleMode === "pvp" ? false : B.sealedMove === i;
              const pvpLocked = B.battleMode === "pvp" ? (m.risky && !chargeReadyDisplay) : false;
              const locked = B.battleMode === "pvp" ? pvpLocked : ((m.risky && !B.chargeReady) || sealed);
              const lv = B.mLvls[i];
              const pw = B.battleMode === "pvp" ? m.basePower : B.getPow(i);
              const atCap = lv >= MAX_MOVE_LVL || m.basePower + lv * m.growth > POWER_CAPS[i];
              const eff = B.battleMode === "pvp" ? 1 : B.dualEff(m);
              return <button className="battle-menu-btn" key={i} onClick={() => !locked && B.selectMove(i)} style={{ background: locked ? "rgba(255,255,255,0.03)" : eff > 1 ? `linear-gradient(135deg,${m.bg},rgba(34,197,94,0.08))` : eff < 1 ? `linear-gradient(135deg,${m.bg},rgba(148,163,184,0.08))` : m.bg, border: `2px solid ${sealed ? "rgba(168,85,247,0.4)" : locked ? "rgba(255,255,255,0.08)" : eff > 1 ? "#22c55e66" : m.color + "44"}`, borderRadius: 12, padding: "10px 10px", textAlign: "left", opacity: locked ? 0.4 : 1, cursor: locked ? "default" : "pointer", transition: "all 0.2s", animation: `fadeSlide 0.3s ease ${i * 0.05}s both`, position: "relative", overflow: "hidden" }}>
                {sealed && <div style={{ position: "absolute", inset: 0, background: "rgba(168,85,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, borderRadius: 12 }}><span style={{ fontSize: 20 }}>🔮封印中 ({B.sealedTurns})</span></div>}
                {B.battleMode !== "pvp" && lv > 1 && <div style={{ position: "absolute", top: 4, right: eff !== 1 ? 44 : 6, background: atCap ? "linear-gradient(135deg,#f59e0b,#ef4444)" : m.color, color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8, fontFamily: "'Press Start 2P',monospace" }}>Lv{lv}</div>}
                {eff > 1 && <div style={{ position: "absolute", top: 4, right: 6, background: "#22c55e", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8 }}>效果↑</div>}
                {eff < 1 && <div style={{ position: "absolute", top: 4, right: 6, background: "#64748b", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8 }}>效果↓</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}><span style={{ fontSize: 20 }}>{m.icon}</span><span className="move-name" style={{ fontSize: 15, fontWeight: 700, color: locked ? "#64748b" : m.color }}>{m.name}</span></div>
                <div style={{ fontSize: 12, color: locked ? "#475569" : "#64748b" }}>{m.desc} · 威力 <b style={{ color: lv > 1 ? m.color : "inherit" }}>{pw}</b>{eff > 1 ? " ×1.5" : eff < 1 ? " ×0.6" : ""}{m.risky && B.battleMode === "pvp" && !chargeReadyDisplay && " 🔒需3次正答"}{m.risky && B.battleMode === "pvp" && chargeReadyDisplay && " ⚡可施放"}{m.risky && !B.chargeReady && B.battleMode !== "pvp" && " 🔒"}{m.risky && B.chargeReady && B.battleMode !== "pvp" && " ⚡蓄力完成！"}{B.battleMode !== "pvp" && !m.risky && !atCap && lv > 1 && " ↑"}{B.battleMode !== "pvp" && atCap && " ✦MAX"}</div>
                {B.battleMode !== "pvp" && !m.risky && !atCap && <div style={{ height: 3, background: "rgba(0,0,0,0.1)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}><div style={{ width: `${(B.mHits[i] % (HITS_PER_LVL * B.mLvls[i])) / (HITS_PER_LVL * B.mLvls[i]) * 100}%`, height: "100%", background: m.color, borderRadius: 2, transition: "width 0.3s" }} /></div>}
              </button>;
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
            {isCoopBattle && (
              <button className="battle-util-btn" onClick={B.toggleCoopActive} disabled={!coopCanSwitch} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: coopCanSwitch ? "rgba(255,255,255,0.45)" : "rgba(148,163,184,0.45)", fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: coopCanSwitch ? "pointer" : "not-allowed", opacity: coopCanSwitch ? 1 : 0.55 }}>
                🔁 {coopUsingSub ? "主將出招" : "副將出招"}
              </button>
            )}
            <button className="battle-util-btn" aria-label={t("a11y.battle.pause", "Pause game")} onClick={B.togglePause} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: "pointer" }}>⏸️ 暫停</button>
            <button className="battle-util-btn" aria-label={t("a11y.battle.settings", "Open battle settings")} onClick={() => openSettings("battle")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: "pointer" }}>⚙️ 設定</button>
            <button className="battle-util-btn" aria-label={t("a11y.battle.run", "Run from battle")} onClick={B.quitGame} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: "pointer" }}>🏳️ 逃跑</button>
          </div>
        </div>}

        {/* Question panel */}
        {B.phase === "question" && question && activeStarter && selectedMove && <div style={{ padding: "10px 14px", animation: "fadeSlide 0.25s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><span style={{ fontSize: 18 }}>{selectedMove.icon}</span><span style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{selectedMove.name}！</span><span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{activeStarter.typeIcon} {activeStarter.name}</span><span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{B.timedMode ? "⏱️ 限時回答！" : "回答正確才能命中"}</span></div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 16px", textAlign: "center", marginBottom: 8, border: "1px solid rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            {B.timedMode && !B.answered && (
              <QuestionTimerHud
                timerSec={TIMER_SEC}
                subscribe={B.timerSubscribe}
                getSnapshot={B.getTimerLeft}
              />
            )}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{question.op === "×" ? "乘法題" : question.op === "÷" ? "除法題" : question.op === "+" ? "加法題" : question.op === "-" ? "減法題" : question.op === "mixed2" ? "加減混合題" : question.op === "mixed3" ? "乘加混合題" : question.op === "mixed4" ? "四則運算題" : question.op === "unknown1" ? "加減求未知題" : question.op === "unknown2" ? "乘除求未知題" : question.op === "unknown3" ? "大數求未知題" : question.op === "unknown4" ? "混合求未知題" : "混合題"}</div>
            <div className="question-expression" style={{ fontSize: 36, fontWeight: 900, color: "white", letterSpacing: 2 }}>{question.display}{question.op && question.op.startsWith("unknown") ? "" : " = ?"}</div>
          </div>
          {feedback && <div style={{ textAlign: "center", marginBottom: 4, fontSize: 16, fontWeight: 700, color: feedback.correct ? "#22c55e" : "#ef4444", animation: "popIn 0.2s ease" }}>{feedback.correct ? "✅ 命中！" : `❌ 答案是 ${feedback.answer}`}</div>}
          {feedback && !feedback.correct && (feedback.steps?.length || 0) > 0 && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 6, animation: "fadeIn 0.4s ease" }}>
              <div style={{ fontSize: 11, color: "#fca5a5", fontWeight: 700, marginBottom: 4 }}>📝 解題過程：</div>
              {(feedback.steps ?? []).map((step: string, i: number) => (
                <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600, lineHeight: 1.8, fontFamily: "monospace" }}>
                  {(feedback.steps?.length || 0) > 1 && <span style={{ color: "#fca5a5", fontSize: 11, marginRight: 4 }}>Step {i + 1}.</span>}{step}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {question.choices.map((c: number, i: number) => {
              let bg = "rgba(255,255,255,0.08)", bd = "rgba(255,255,255,0.15)", co = "white";
              if (feedback) { if (c === question.answer) { bg = "rgba(34,197,94,0.2)"; bd = "#22c55e"; co = "#22c55e"; } else { bg = "rgba(255,255,255,0.03)"; co = "rgba(255,255,255,0.3)"; } }
              return <button className="answer-btn" key={i} onClick={() => B.onAns(c)} disabled={B.answered} style={{ background: bg, border: `2px solid ${bd}`, borderRadius: 10, padding: "12px 8px", fontSize: 26, fontWeight: 700, color: co, transition: "all 0.2s" }}>{c}</button>;
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
