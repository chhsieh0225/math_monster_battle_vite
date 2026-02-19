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
import { BG_IMGS, BG_IMGS_LOW } from './data/sprites.ts';

// Screens
import AppScreenRouter from './components/AppScreenRouter';
import type { ScreenName } from './types/battle';

const BattleScreen = lazy(() => import('./components/screens/BattleScreen'));

type BattleBgmTrack =
  | 'menu'
  | 'battle'
  | 'volcano'
  | 'coast'
  | 'thunder'
  | 'ironclad'
  | 'graveyard'
  | 'canyon'
  | 'boss'
  | 'boss_hydra'
  | 'boss_crazy_dragon'
  | 'boss_sword_god'
  | 'boss_dark_king';

type BgmTier = 'full' | 'core';

function resolveBossTrack(starterId: string | undefined | null): BattleBgmTrack | null {
  if (starterId === 'boss_hydra') return 'boss_hydra';
  if (starterId === 'boss_crazy_dragon') return 'boss_crazy_dragon';
  if (starterId === 'boss_sword_god') return 'boss_sword_god';
  if (starterId === 'boss') return 'boss_dark_king';
  return null;
}

function resolveSceneTrack(sceneType: string): BattleBgmTrack | null {
  if (sceneType === 'fire') return 'volcano';
  if (sceneType === 'water') return 'coast';
  if (sceneType === 'electric') return 'thunder';
  if (sceneType === 'steel') return 'ironclad';
  if (sceneType === 'ghost') return 'graveyard';
  if (sceneType === 'rock') return 'canyon';
  return null;
}

function toTieredTrack(track: BattleBgmTrack | null, tier: BgmTier): BattleBgmTrack | null {
  if (!track || tier === 'full') return track;
  if (track === 'menu') return 'menu';
  if (track.startsWith('boss')) return 'boss';
  return 'battle';
}

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

const STATIC_DICTS: Readonly<Record<StaticLocaleCode, Record<string, string>>> = {
  "zh-TW": { ...zhTW },
  "en-US": { ...enUS },
};

function staticT(key: string, fallback: string): string {
  const locale = resolveStaticLocale();
  return STATIC_DICTS[locale][key] || STATIC_DICTS["zh-TW"][key] || fallback;
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
  const [bgmMuted, setBgmMuted] = useState<boolean>(() => Boolean(V.sfx.bgmMuted));
  const [bgmVolume, setBgmVolume] = useState<number>(() => Number(V.sfx.bgmVolume ?? 0.24));
  const [sfxMuted, setSfxMuted] = useState<boolean>(() => Boolean(V.sfx.sfxMuted));
  const settingsReturnRef = useRef<ScreenName>("title");
  const resumeBattleAfterSettingsRef = useRef(false);
  const conserveNetwork = UX.lowPerfMode || shouldConserveNetwork();

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
    const nextEnemy = S.enemies?.[(S.round || 0) + 1] || null;
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
    S.round,
    S.enemies,
    S.enemy?.sceneMType,
    S.enemy?.mType,
    S.enemySub?.sceneMType,
    S.enemySub?.mType,
    conserveNetwork,
  ]);

  // Tiered BGM prefetch:
  // metadata on constrained devices, aggressive warmup on stable devices.
  useEffect(() => {
    const bgmTier: BgmTier = conserveNetwork ? 'core' : 'full';
    const nextTracks = new Set<BattleBgmTrack>();
    if (S.screen === 'title' || S.screen === 'selection' || S.screen === 'daily_challenge' || S.screen === 'howto') {
      nextTracks.add('menu');
      nextTracks.add('battle');
    } else if (S.screen === 'battle') {
      const p1BossTrack = resolveBossTrack(S.starter?.id);
      const p2BossTrack = resolveBossTrack(S.pvpStarter2?.id);
      const enemyId = S.enemy?.id ?? '';
      const sceneType = S.enemy?.sceneMType || S.enemy?.mType || '';
      const enemyBossTrack = resolveBossTrack(enemyId);
      const sceneTrack = resolveSceneTrack(sceneType);
      const currentBaseTrack = S.battleMode === 'pvp'
        ? (p1BossTrack || p2BossTrack || sceneTrack || 'battle')
        : (enemyBossTrack || sceneTrack || (BOSS_IDS.has(enemyId) ? 'boss' : 'battle'));
      const currentTrack = toTieredTrack(currentBaseTrack, bgmTier) || 'battle';
      nextTracks.add(currentTrack);

      const nextEnemy = S.enemies?.[(S.round || 0) + 1] || null;
      const nextEnemyId = nextEnemy?.id || '';
      const nextSceneType = nextEnemy?.sceneMType || nextEnemy?.mType || '';
      const nextBaseTrack = resolveBossTrack(nextEnemyId) || resolveSceneTrack(nextSceneType) || (BOSS_IDS.has(nextEnemyId) ? 'boss' : null);
      const nextTrack = toTieredTrack(nextBaseTrack, bgmTier);
      if (nextTrack) nextTracks.add(nextTrack);
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
    S.enemy?.id,
    S.enemy?.sceneMType,
    S.enemy?.mType,
    S.starter?.id,
    S.pvpStarter2?.id,
    V.sfx,
    conserveNetwork,
  ]);

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
    const bgmTier: BgmTier = conserveNetwork ? 'core' : 'full';
    if (bgmMuted) { V.sfx.stopBgm(); return; }
    if (S.screen === 'title' || S.screen === 'selection' || S.screen === 'daily_challenge' || S.screen === 'howto') {
      const track = toTieredTrack('menu', bgmTier) || 'menu';
      V.sfx.startBgm(track);
    } else if (S.screen === 'battle') {
      const p1BossTrack = resolveBossTrack(S.starter?.id);
      const p2BossTrack = resolveBossTrack(S.pvpStarter2?.id);
      const enemyId = S.enemy?.id ?? '';
      const sceneType = S.enemy?.sceneMType || S.enemy?.mType || '';
      const enemyBossTrack = resolveBossTrack(enemyId);
      const sceneTrack = resolveSceneTrack(sceneType);

      // PvP/Double-player: lock to one theme (P1 priority), never mix two boss themes.
      if (S.battleMode === 'pvp') {
        const track = toTieredTrack(p1BossTrack || p2BossTrack || sceneTrack || 'battle', bgmTier) || 'battle';
        V.sfx.startBgm(track);
      } else {
        const track = toTieredTrack(
          enemyBossTrack || sceneTrack || (BOSS_IDS.has(enemyId) ? 'boss' : 'battle'),
          bgmTier,
        ) || 'battle';
        V.sfx.startBgm(track);
      }
    } else {
      V.sfx.stopBgm();
    }
  }, [
    S.screen,
    S.battleMode,
    S.starter?.id,
    S.pvpStarter2?.id,
    S.enemy?.id,
    S.enemy?.sceneMType,
    S.enemy?.mType,
    bgmMuted,
    V.sfx,
    sfxReady,
    conserveNetwork,
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
