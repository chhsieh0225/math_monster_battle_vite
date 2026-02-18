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
import zhTW from './i18n/locales/zh-TW';
import enUS from './i18n/locales/en-US';

// Hooks
import { useBattle } from './hooks/useBattle';
import { useMobileExperience } from './hooks/useMobileExperience';
import { BOSS_IDS } from './data/monsterConfigs.ts';

// Screens
import AppScreenRouter from './components/AppScreenRouter';
import type { ScreenName } from './types/battle';

const BattleScreen = lazy(() => import('./components/screens/BattleScreen'));

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
  const B = useBattle();
  const S = B.state;
  const A = B.actions;
  const V = B.view;
  const UX = useMobileExperience();
  const [bgmMuted, setBgmMuted] = useState<boolean>(() => Boolean(V.sfx.bgmMuted));
  const [bgmVolume, setBgmVolume] = useState<number>(() => Number(V.sfx.bgmVolume ?? 0.24));
  const [sfxMuted, setSfxMuted] = useState<boolean>(() => Boolean(V.sfx.sfxMuted));
  const settingsReturnRef = useRef<ScreenName>("title");
  const resumeBattleAfterSettingsRef = useRef(false);
  const handleSetBgmMuted = (next: boolean) => {
    const m = V.sfx.setBgmMuted(next);
    setBgmMuted(m);
  };
  const handleSetSfxMuted = (next: boolean) => {
    const m = V.sfx.setSfxMuted(next);
    setSfxMuted(m);
  };
  const handleSetBgmVolume = (next: number) => {
    const v = V.sfx.setBgmVolume(next);
    setBgmVolume(v);
  };
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
      void V.sfx.init().then(() => setSfxReady(true)).catch(() => {});
      document.removeEventListener('click', initOnce, true);
      document.removeEventListener('touchstart', initOnce, true);
      document.removeEventListener('keydown', initOnce, true);
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

  // ── BGM driver ──
  useEffect(() => {
    if (bgmMuted) { V.sfx.stopBgm(); return; }
    if (S.screen === 'title' || S.screen === 'selection' || S.screen === 'daily_challenge') {
      V.sfx.startBgm('menu');
    } else if (S.screen === 'battle') {
      const isBoss = BOSS_IDS.has(S.enemy?.id ?? '');
      V.sfx.startBgm(isBoss ? 'boss' : 'battle');
    } else {
      V.sfx.stopBgm();
    }
  }, [S.screen, S.enemy?.id, bgmMuted, V.sfx, sfxReady]);

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
  );
}

export default GameShell;
