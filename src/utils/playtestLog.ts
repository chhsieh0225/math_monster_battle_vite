/**
 * Playtest log: what a real child did and how smoothly the device ran it.
 *
 * Collected locally only: device facts, load timings, frame pacing per screen,
 * time spent per screen, plus the existing answer/battle event log, sessions,
 * learning record and progress. The Mac app writes the report as JSON into the
 * project's playtest/ folder; other platforms can export it from the parent
 * dashboard.
 */
import { loadEvents } from './eventLogger.ts';
import { loadSessions } from './sessionLogger.ts';
import { loadLearningProgress, summarizeLearningProgress } from './learningProgress.ts';
import { loadWorldProgress } from './worldProgress.ts';
import { loadPlayerProfile } from './playerProfile.ts';
import { getChallengePerks } from './challengeRewards.ts';

export const PLAYTEST_SCHEMA = 'math-monster-playtest/1';
const MAX_FRAME_BUCKET_MS = 250;
const MAX_SCREEN_VISITS = 300;

type DesktopBridge = {
  savePlaytest?: (json: string) => Promise<{ ok: boolean; file?: string }>;
  savePlaytestSync?: (json: string) => { ok: boolean; file?: string };
  releaseInfo?: () => Record<string, unknown> | null;
};

export function getDesktopBridge(): DesktopBridge | null {
  const bridge = (globalThis as { mmbDesktop?: DesktopBridge }).mmbDesktop;
  return bridge && typeof bridge === 'object' ? bridge : null;
}

// ─── Frame pacing ────────────────────────────────────────────────

export type FrameStats = {
  frames: number;
  totalMs: number;
  /** histogram[i] = frames that took i ms (last bucket: >= MAX). */
  histogram: number[];
  longTasks: number;
  longTaskMs: number;
};

export function createFrameStats(): FrameStats {
  return { frames: 0, totalMs: 0, histogram: new Array<number>(MAX_FRAME_BUCKET_MS + 1).fill(0), longTasks: 0, longTaskMs: 0 };
}

export function addFrame(stats: FrameStats, frameMs: number): void {
  if (!Number.isFinite(frameMs) || frameMs <= 0) return;
  stats.frames += 1;
  stats.totalMs += frameMs;
  stats.histogram[Math.min(MAX_FRAME_BUCKET_MS, Math.round(frameMs))] += 1;
}

function percentile(stats: FrameStats, p: number): number {
  if (stats.frames === 0) return 0;
  const target = Math.ceil(stats.frames * p);
  let seen = 0;
  for (let ms = 0; ms < stats.histogram.length; ms += 1) {
    seen += stats.histogram[ms];
    if (seen >= target) return ms;
  }
  return MAX_FRAME_BUCKET_MS;
}

export function summarizeFrames(stats: FrameStats) {
  const over = (limit: number) => stats.histogram.reduce((sum, count, ms) => (ms > limit ? sum + count : sum), 0);
  return {
    frames: stats.frames,
    avgFps: stats.totalMs > 0 ? Math.round((stats.frames / stats.totalMs) * 1000 * 10) / 10 : 0,
    p50FrameMs: percentile(stats, 0.5),
    p95FrameMs: percentile(stats, 0.95),
    p99FrameMs: percentile(stats, 0.99),
    /** Frames slower than 50 ms (visible stutter) and 100 ms (a hitch a child notices). */
    slowFrames: over(50),
    hitches: over(100),
    worstFrameMs: stats.histogram.reduce((worst, count, ms) => (count > 0 ? ms : worst), 0),
    longTasks: stats.longTasks,
    longTaskMs: Math.round(stats.longTaskMs),
  };
}

// ─── Recorder (one per app session) ──────────────────────────────

type ScreenVisit = { screen: string; at: string; ms: number };

const state = {
  started: false,
  startedAt: '',
  screen: 'boot',
  screenSince: 0,
  timeByScreen: {} as Record<string, number>,
  visits: [] as ScreenVisit[],
  frames: {} as Record<string, FrameStats>,
  heapMaxMb: 0,
  lowPerfMode: null as boolean | null,
};

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function framesFor(screen: string): FrameStats {
  if (!state.frames[screen]) state.frames[screen] = createFrameStats();
  return state.frames[screen];
}

/** Start the recorder once per page load (no-op outside a browser). */
export function startPlaytestRecorder(): void {
  if (state.started || typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  state.started = true;
  state.startedAt = new Date().toISOString();
  state.screenSince = now();
  let last = 0;
  const loop = (time: number) => {
    if (last > 0 && typeof document !== 'undefined' && document.visibilityState === 'visible') {
      addFrame(framesFor(state.screen), time - last);
    }
    last = time;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { last = 0; });
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const stats = framesFor(state.screen);
        stats.longTasks += 1;
        stats.longTaskMs += entry.duration;
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch { /* long tasks are Chromium-only */ }
  window.setInterval(() => {
    const memory = (performance as { memory?: { usedJSHeapSize?: number } }).memory;
    if (memory?.usedJSHeapSize) state.heapMaxMb = Math.max(state.heapMaxMb, Math.round(memory.usedJSHeapSize / 1048576));
  }, 15000);
}

export function trackPlaytestScreen(screen: string): void {
  if (screen === state.screen) return;
  const t = now();
  const spent = Math.max(0, Math.round(t - state.screenSince));
  state.timeByScreen[state.screen] = (state.timeByScreen[state.screen] ?? 0) + spent;
  state.visits.push({ screen: state.screen, at: new Date(Date.now() - spent).toISOString(), ms: spent });
  if (state.visits.length > MAX_SCREEN_VISITS) state.visits.splice(0, state.visits.length - MAX_SCREEN_VISITS);
  state.screen = screen;
  state.screenSince = t;
}

export function notePlaytestLowPerf(lowPerfMode: boolean): void {
  state.lowPerfMode = lowPerfMode;
}

function deviceInfo() {
  if (typeof window === 'undefined') return null;
  const nav = navigator as Navigator & { deviceMemory?: number; standalone?: boolean };
  const media = (query: string) => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : null);
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    cores: nav.hardwareConcurrency ?? null,
    memoryGb: nav.deviceMemory ?? null,
    touchPoints: nav.maxTouchPoints ?? 0,
    screen: { width: window.screen?.width, height: window.screen?.height, dpr: window.devicePixelRatio },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    standalone: Boolean(nav.standalone) || media('(display-mode: standalone)'),
    reducedMotion: media('(prefers-reduced-motion: reduce)'),
    lowPerfMode: state.lowPerfMode,
  };
}

function loadTimings() {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return null;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const paint = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint');
  return {
    domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadMs: nav ? Math.round(nav.loadEventEnd) : null,
    firstContentfulPaintMs: paint ? Math.round(paint.startTime) : null,
  };
}

function platform(): string {
  if (getDesktopBridge()) return 'mac-app';
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  if (capacitor?.isNativePlatform?.()) return capacitor.getPlatform?.() ?? 'native';
  return 'web';
}

/** The whole report as a plain object (everything stays on this device). */
export function buildPlaytestReport() {
  const spentNow = Math.max(0, Math.round(now() - state.screenSince));
  const timeByScreen = { ...state.timeByScreen, [state.screen]: (state.timeByScreen[state.screen] ?? 0) + spentNow };
  const learning = loadLearningProgress();
  return {
    schema: PLAYTEST_SCHEMA,
    generatedAt: new Date().toISOString(),
    appSessionStartedAt: state.startedAt || null,
    app: { platform: platform(), release: getDesktopBridge()?.releaseInfo?.() ?? null },
    device: deviceInfo(),
    load: loadTimings(),
    perf: {
      byScreen: Object.fromEntries(Object.entries(state.frames).map(([screen, stats]) => [screen, summarizeFrames(stats)])),
      heapMaxMb: state.heapMaxMb || null,
    },
    screens: { current: state.screen, timeMsByScreen: timeByScreen, visits: state.visits },
    player: {
      profile: loadPlayerProfile(),
      worldProgress: loadWorldProgress(),
      honors: getChallengePerks(),
      learningSummary: summarizeLearningProgress(learning),
      learningSkills: learning.skills,
    },
    sessions: loadSessions(),
    events: loadEvents(),
  };
}

let lastSaveAt = 0;

/** Mac app only: write the report into the playtest folder (throttled unless forced). */
export async function savePlaytestReport({ force = false } = {}): Promise<string | null> {
  const bridge = getDesktopBridge();
  if (!bridge?.savePlaytest) return null;
  const t = now();
  if (!force && t - lastSaveAt < 20000) return null;
  lastSaveAt = t;
  try {
    const result = await bridge.savePlaytest(JSON.stringify(buildPlaytestReport()));
    return result?.ok ? result.file ?? null : null;
  } catch {
    return null;
  }
}

/** Last chance on quit: synchronous so the window can close right after. */
export function savePlaytestReportSync(): void {
  const bridge = getDesktopBridge();
  if (!bridge?.savePlaytestSync) return;
  try { bridge.savePlaytestSync(JSON.stringify(buildPlaytestReport())); } catch { /* best effort */ }
}

/** Web / iOS: hand the report to the share sheet (iOS) or download it. */
export async function exportPlaytestReport(): Promise<'shared' | 'downloaded' | 'saved' | 'failed'> {
  const json = JSON.stringify(buildPlaytestReport(), null, 2);
  const name = `playtest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  if (getDesktopBridge()?.savePlaytest) return (await savePlaytestReport({ force: true })) ? 'saved' : 'failed';
  try {
    const file = new File([json], name, { type: 'application/json' });
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] }) && typeof nav.share === 'function') {
      await nav.share({ files: [file], title: name });
      return 'shared';
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
