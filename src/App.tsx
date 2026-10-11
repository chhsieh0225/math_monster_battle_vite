/**
 * App.tsx — Thin render shell.
 *
 * All game state and logic live in useBattle().
 * This file is purely responsible for:
 *   1. Screen routing handoff (AppScreenRouter / BattleScreen)
 *   2. Cross-screen settings entry / return flow
 *   3. Orientation-lock wrapper (GameShell)
 */
import { Suspense, useState, useEffect, useRef, Component } from 'react';
import { notePlaytestLowPerf, savePlaytestReport, savePlaytestReportSync, startPlaytestRecorder, trackPlaytestScreen } from './utils/playtestLog.ts';
import type { ReactNode } from 'react';
import './App.css';
import { useI18n } from './i18n';

// Hooks
import { useBattle } from './hooks/useBattle';
import { useMobileExperience } from './hooks/useMobileExperience';
import { useAudioState } from './hooks/useAudioState';
import { arriveAtMap } from './utils/expeditionRun.ts';
import { getScreenMusic, getEncounterMusic } from './utils/battleMusic.ts';
import type { BgmTrack } from './utils/sfx/bgm.ts';
import { scenePreloader, getBattleBackground, getEnemyPortrait, getEvolutionPortrait, getWorldMapImages, getRequiredSceneArt, getSceneKey, shouldConserveNetwork } from './utils/scenePreload.ts';
import { loadBattleScreen, loadWorldMapScreen, screenResources } from './utils/screenPreload.ts';
import SceneHandoff from './components/ui/SceneHandoff';
import { battleSpritePreloader, getBattleSpritePreloadSources } from './utils/battleSpritePreload.ts';

// Screens
import AppScreenRouter from './components/AppScreenRouter';
import type { ScreenName } from './types/battle';

const BattleScreen = screenResources.battle.Screen;

/** Lightweight locale lookup for class components that cannot use hooks. */
function staticT(_key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const STATIC_STRINGS: Record<string, Record<string, string>> = {
    "app.error.title":  { "zh-TW": "遊戲發生錯誤", "en-US": "A game error occurred" },
    "app.error.reload": { "zh-TW": "重新載入",     "en-US": "Reload" },
    "app.error.battleCrash": { "zh-TW": "戰鬥發生錯誤", "en-US": "Battle error" },
    "app.error.returnTitle": { "zh-TW": "返回標題畫面", "en-US": "Return to Title" },
  };
  try {
    const locale = window.localStorage.getItem("mathMonsterBattle_locale") || "zh-TW";
    return STATIC_STRINGS[_key]?.[locale] || fallback;
  } catch {
    return fallback;
  }
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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
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
        <button onClick={() => { window.location.reload(); }} className="app-error-reload">{staticT("app.error.reload", "Reload")}</button>
      </div>
      );
    }
    return this.props.children;
  }
}

type BattleErrorBoundaryProps = {
  children?: ReactNode;
  onReset: () => void;
};

class BattleErrorBoundary extends Component<BattleErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: BattleErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    if (error instanceof Error) return { error };
    return { error: String(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[BattleErrorBoundary] Battle render crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-wrap">
          <div className="app-error-icon">⚠️</div>
          <div className="app-error-title">{staticT("app.error.battleCrash", "Battle error")}</div>
          <button onClick={() => { this.setState({ error: null }); this.props.onReset(); }} className="app-error-reload">
            {staticT("app.error.returnTitle", "Return to Title")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── GameShell: orientation lock wrapper ───
const isTouchDevice = (): boolean => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function canLockScreenOrientation(value: unknown): value is { lock: (orientation: string) => Promise<void> } {
  if (!value || typeof value !== 'object') return false;
  return typeof Reflect.get(value, 'lock') === 'function';
}

function GameShell() {
  const { t } = useI18n();
  const [showRotateHint, setShowRotateHint] = useState(false);
  useEffect(() => {
    try {
      const orientation = screen.orientation;
      if (canLockScreenOrientation(orientation)) {
        orientation.lock("portrait-primary").catch(() => {});
      }
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
  const B = useBattle();
  const S = B.state;
  const A = B.actions;
  const V = B.view;
  const UX = useMobileExperience();
  const { bgmMuted, bgmVolume, sfxMuted } = useAudioState();
  const settingsReturnRef = useRef<ScreenName>("title");
  const resumeBattleAfterSettingsRef = useRef(false);
  const conserveNetwork = UX.lowPerfMode || shouldConserveNetwork();
  const desiredMusic = getScreenMusic(S);
  const [presentedMusic, setPresentedMusic] = useState(desiredMusic);
  const requiredArt = getRequiredSceneArt(S, UX.lowPerfMode);
  const nextEncounterStep = (S.battleMode === 'coop' || S.battleMode === 'double') && S.enemySub ? 2 : 1;
  const spritePreloadKey = getBattleSpritePreloadSources(S, conserveNetwork).join('\n');

  // Playtest log: frame pacing and time per screen; the Mac app saves it after each run.
  useEffect(() => {
    startPlaytestRecorder();
    const onUnload = () => savePlaytestReportSync();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);
  useEffect(() => { notePlaytestLowPerf(UX.lowPerfMode); }, [UX.lowPerfMode]);
  useEffect(() => {
    trackPlaytestScreen(S.screen);
    if (S.screen === 'gameover' || S.screen === 'worldmap' || S.screen === 'title') {
      void savePlaytestReport({ force: S.screen === 'gameover' });
    }
  }, [S.screen]);

  useEffect(() => {
    // Selection owns its local picks; battle owns the rolling encounter window.
    if (S.screen === 'selection' || S.screen === 'worldmap') return;
    battleSpritePreloader.preload(spritePreloadKey ? spritePreloadKey.split('\n') : []);
    if (S.screen !== 'battle' && S.screen !== 'evolve') scenePreloader.preload([]);
  }, [S.screen, spritePreloadKey]);

  // Warm code while choosing, not after the first battle has already started.
  useEffect(() => {
    if (S.screen === 'selection' || S.screen === 'worldmap' || S.screen === 'evolve' || S.screen === 'battle') {
      void loadBattleScreen().catch(() => {});
    }
    if (S.screen === 'battle') {
      void screenResources.evolve.load().catch(() => {});
      void screenResources.settings.load().catch(() => {});
    }
    if ((S.worldMapEnabled && (S.screen === 'selection' || S.screen === 'battle')) || S.screen === 'worldmap') {
      void loadWorldMapScreen().catch(() => {});
    }
  }, [S.screen, S.worldMapEnabled]);

  useEffect(() => {
    if (S.screen !== 'battle' && S.screen !== 'evolve') return;
    const next = S.enemies[S.round + nextEncounterStep];
    // Decode the next reveal during play, rather than when the victory button is pressed.
    const nextStage = S.pStg + (S.screen === 'evolve' ? 0 : 1);
    scenePreloader.preload(conserveNetwork ? [] : [
      ...(next ? [getBattleBackground(next, UX.lowPerfMode), getEnemyPortrait(next) || ''] : []),
      getEvolutionPortrait(S.starter, nextStage) || '',
      ...(S.worldMapEnabled ? getWorldMapImages(S.expeditionRun && arriveAtMap(S.expeditionRun), S.starter, S.pStg) : []),
    ]);
  }, [S.screen, S.enemies, S.round, S.pStg, S.starter, S.worldMapEnabled, S.expeditionRun,
    nextEncounterStep, conserveNetwork, UX.lowPerfMode]);

  // Tiered BGM prefetch:
  // metadata on constrained devices, aggressive warmup on stable devices.
  useEffect(() => {
    const nextTracks = new Set<BgmTrack>();
    if (S.screen === 'title' || S.screen === 'selection' || S.screen === 'daily_challenge' || S.screen === 'howto' || S.screen === 'worldmap' || S.screen === 'placement' || S.screen === 'spring') {
      nextTracks.add('menu');
      nextTracks.add('battle');
    } else if (S.screen === 'battle') {
      if (desiredMusic) nextTracks.add(desiredMusic);
      const step = nextEncounterStep;
      const nextEnemy = S.enemies?.[(S.round || 0) + step];
      const nextSub = step === 2 ? S.enemies?.[(S.round || 0) + step + 1] : null;
      if (nextEnemy) nextTracks.add(getEncounterMusic(nextEnemy, nextSub));
    }
    if (nextTracks.size > 0) {
      V.sfx.prefetchBgm(
        Array.from(nextTracks),
        conserveNetwork || S.screen !== 'battle' ? 'metadata' : 'auto',
      );
    }
  }, [
    S.screen,
    S.battleMode,
    S.round,
    S.enemies,
    desiredMusic,
    nextEncounterStep,
    V.sfx,
    conserveNetwork,
  ]);

  const handleSetBgmMuted = (next: boolean) => { V.sfx.setBgmMuted(next); };
  const handleSetSfxMuted = (next: boolean) => { V.sfx.setSfxMuted(next); };
  const handleSetBgmVolume = (next: number) => { V.sfx.setBgmVolume(next); };
  const openSettings = (fromScreen: ScreenName) => {
    settingsReturnRef.current = fromScreen;
    if (fromScreen === "battle" && !S.gamePaused) {
      resumeBattleAfterSettingsRef.current = true;
      A.togglePause();
    } else {
      resumeBattleAfterSettingsRef.current = false;
    }
    A.setScreen("settings");
  };
  const closeSettings = () => {
    const backTo = settingsReturnRef.current || "title";
    A.setScreen(backTo);
    if (backTo === "battle" && resumeBattleAfterSettingsRef.current) {
      setTimeout(() => {
        A.togglePause();
      }, 0);
    }
    resumeBattleAfterSettingsRef.current = false;
  };

  // ── Init audio on first user gesture (required for AudioContext) ──
  const sfxInitRef = useRef(false);
  const [sfxReady, setSfxReady] = useState(false);
  useEffect(() => {
    if (sfxInitRef.current) return;
    const initOnce = () => {
      if (sfxInitRef.current) return;
      sfxInitRef.current = true;
      void V.sfx.init().then(() => {
        if (!V.sfx.ready) { sfxInitRef.current = false; return; }
        setSfxReady(true);
        document.removeEventListener('click', initOnce, true);
        document.removeEventListener('touchstart', initOnce, true);
        document.removeEventListener('keydown', initOnce, true);
      }).catch(() => { sfxInitRef.current = false; });
    };
    document.addEventListener('click', initOnce, true);
    document.addEventListener('touchstart', initOnce, true);
    document.addEventListener('keydown', initOnce, true);
    return () => {
      document.removeEventListener('click', initOnce, true);
      document.removeEventListener('touchstart', initOnce, true);
      document.removeEventListener('keydown', initOnce, true);
    };
  }, [V.sfx]);

  // ── Release audio resources on unmount ──
  useEffect(() => () => { V.sfx.dispose(); }, [V.sfx]);

  // ── BGM driver ──
  useEffect(() => {
    if (presentedMusic) V.sfx.startBgm(presentedMusic);
    else V.sfx.stopBgm();
  }, [
    presentedMusic,
    bgmMuted,
    V.sfx,
    sfxReady,
  ]);

  const content = S.screen !== "battle" ? (
      <AppScreenRouter
        state={S}
        actions={A}
        view={V}
        mobile={UX}
        bgmMuted={bgmMuted}
        bgmVolume={bgmVolume}
        sfxMuted={sfxMuted}
        onSetBgmMuted={handleSetBgmMuted}
        onSetBgmVolume={handleSetBgmVolume}
        onSetSfxMuted={handleSetSfxMuted}
        onOpenSettings={openSettings}
        onCloseSettings={closeSettings}
        t={t}
      />
  ) : (
    <BattleErrorBoundary onReset={() => A.setScreen('title')}>
      <Suspense fallback={null}>
        <BattleScreen
          state={S}
          actions={A}
          view={V}
          mobile={UX}
          onOpenSettings={openSettings}
          t={t}
        />
      </Suspense>
    </BattleErrorBoundary>
  );
  const code = S.screen === 'title' || S.screen === 'selection' ? undefined : screenResources[S.screen];
  return <SceneHandoff sceneKey={getSceneKey(S)} {...requiredArt} code={code}
    music={desiredMusic} onPresented={(music, key) => {
      setPresentedMusic(music);
      if (key.startsWith('battle:')) A.presentBattle();
    }} onCancel={() => A.setScreen('title')} t={t}>
    {content}
  </SceneHandoff>;
}

export default GameShell;
