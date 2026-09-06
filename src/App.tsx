/**
 * App.tsx — Thin render shell.
 *
 * All game state and logic live in useBattle().
 * This file is purely responsible for:
 *   1. Screen routing handoff (AppScreenRouter / BattleScreen)
 *   2. Cross-screen settings entry / return flow
 *   3. Orientation-lock wrapper (GameShell)
 */
import { Suspense, lazy, useState, useEffect, useRef, Component } from 'react';
import type { ReactNode } from 'react';
import './App.css';
import { useI18n } from './i18n';

// Hooks
import { useBattle } from './hooks/useBattle';
import { useMobileExperience } from './hooks/useMobileExperience';
import { useAudioState } from './hooks/useAudioState';
import { getScreenMusic, getEncounterMusic } from './utils/battleMusic.ts';
import type { BgmTrack } from './utils/sfx/bgm.ts';
import { BG_IMGS, BG_IMGS_LOW } from './data/sprites.ts';

// Screens
import AppScreenRouter from './components/AppScreenRouter';
import type { ScreenName } from './types/battle';

const BattleScreen = lazy(() => import('./components/screens/BattleScreen'));

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

const preloadedSceneBackgrounds = new Set<string>();

const TITLE_SCENE_KEYS = ['grass', 'fire', 'water', 'electric', 'ghost', 'steel', 'dark', 'rock'] as const;
const LATE_SCENE_KEYS = ['poison', 'heaven', 'burnt_warplace'] as const;

function shouldConserveNetwork(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = Reflect.get(navigator, 'connection') as { saveData?: boolean; effectiveType?: string } | undefined;
  if (!connection) return false;
  if (connection.saveData) return true;
  const effectiveType = String(connection.effectiveType || '').toLowerCase();
  return effectiveType.includes('2g') || effectiveType.includes('3g');
}

function preloadSceneBackground(src: string): void {
  if (typeof window === "undefined" || !src || preloadedSceneBackgrounds.has(src)) return;
  preloadedSceneBackgrounds.add(src);
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  if (typeof img.decode === "function") {
    void img.decode().catch(() => {});
  }
}

function resolveSceneBackground(sceneType: string | null | undefined, preferLowQuality = false): string | null {
  if (!sceneType) return null;
  const key = sceneType as keyof typeof BG_IMGS;
  const sourceMap = preferLowQuality ? BG_IMGS_LOW : BG_IMGS;
  const src = sourceMap[key] || BG_IMGS[key];
  return typeof src === 'string' ? src : null;
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
  const nextEncounterStep = (S.battleMode === 'coop' || S.battleMode === 'double') && S.enemySub ? 2 : 1;

  // Tiered background preload:
  // 1) title pool first, 2) non-critical scenes later on non-constrained devices.
  useEffect(() => {
    TITLE_SCENE_KEYS.forEach((sceneKey) => {
      const src = resolveSceneBackground(sceneKey, conserveNetwork);
      if (src) preloadSceneBackground(src);
    });
    if (conserveNetwork) return;
    const timer = window.setTimeout(() => {
      LATE_SCENE_KEYS.forEach((sceneKey) => {
        const src = resolveSceneBackground(sceneKey, false);
        if (src) preloadSceneBackground(src);
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [conserveNetwork]);

  // Explicitly preload current + next battle scene backgrounds to smooth transitions.
  useEffect(() => {
    if (S.screen !== 'battle') return;

    const sceneTypes = new Set<string>();
    const currentSceneType = S.enemy?.sceneMType || S.enemy?.mType;
    const subSceneType = S.enemySub?.sceneMType || S.enemySub?.mType;
    const nextEnemy = S.enemies?.[(S.round || 0) + nextEncounterStep] || null;
    const nextSceneType = nextEnemy?.sceneMType || nextEnemy?.mType;

    if (currentSceneType) sceneTypes.add(currentSceneType);
    if (subSceneType) sceneTypes.add(subSceneType);
    if (nextSceneType) sceneTypes.add(nextSceneType);

    sceneTypes.forEach((sceneType) => {
      const src = resolveSceneBackground(sceneType, conserveNetwork);
      if (src) preloadSceneBackground(src);
    });
  }, [
    S.screen,
    S.battleMode,
    S.round,
    S.enemies,
    S.enemy?.sceneMType,
    S.enemy?.mType,
    S.enemySub?.sceneMType,
    S.enemySub?.mType,
    nextEncounterStep,
    conserveNetwork,
  ]);

  // Tiered BGM prefetch:
  // metadata on constrained devices, aggressive warmup on stable devices.
  useEffect(() => {
    const nextTracks = new Set<BgmTrack>();
    if (S.screen === 'title' || S.screen === 'selection' || S.screen === 'daily_challenge' || S.screen === 'howto') {
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
        conserveNetwork ? 'metadata' : 'auto',
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
    if (desiredMusic) V.sfx.startBgm(desiredMusic);
    else V.sfx.stopBgm();
  }, [
    desiredMusic,
    bgmMuted,
    V.sfx,
    sfxReady,
  ]);

  if (S.screen !== "battle") {
    return (
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
    );
  }

  return (
    <BattleErrorBoundary onReset={() => A.setScreen('title')}>
      <Suspense
        fallback={(
          <div className="battle-loading-wrap">
            <div className="battle-loading-icon">⚔️</div>
            <div className="battle-loading-text">{t("app.loading.battle", "Preparing battle...")}</div>
          </div>
        )}
      >
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
}

export default GameShell;
