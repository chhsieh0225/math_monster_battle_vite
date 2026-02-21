import { useCallback, useEffect, useMemo, useState } from 'react';
import { readText, writeText } from '../utils/storage.ts';
import type { PerfMode, UseMobileExperienceApi } from '../types/battle';

const PERF_MODE_KEY = "mathMonsterBattle_perfMode";
const PERF_AUTO: PerfMode = "auto";
const PERF_ON: PerfMode = "on";
const PERF_OFF: PerfMode = "off";

type Viewport = {
  width: number;
  height: number;
};

function initialViewport(): Viewport {
  if (typeof window === "undefined") return { width: 390, height: 844 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function detectLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = Number(navigator.hardwareConcurrency || 0);
  const memory = Number(Reflect.get(navigator, 'deviceMemory') || 0);
  return (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
}

function isPerfMode(mode: unknown): mode is PerfMode {
  return mode === PERF_ON || mode === PERF_OFF || mode === PERF_AUTO;
}

function normalizePerfMode(mode: unknown): PerfMode {
  if (isPerfMode(mode)) return mode;
  return PERF_OFF;
}

function readPerfMode(): PerfMode {
  return normalizePerfMode(readText(PERF_MODE_KEY, PERF_OFF));
}

export function useMobileExperience(): UseMobileExperienceApi {
  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const [perfMode, setPerfModeState] = useState<PerfMode>(readPerfMode);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const autoLowEnd = useMemo(() => detectLowEndDevice(), []);
  // Use width-first compact detection so mobile browser URL-bar height
  // changes do not flip compact mode mid-session.
  const compactUI = viewport.width <= 430;
  const lowPerfMode = perfMode === PERF_ON
    || (perfMode === PERF_AUTO && (autoLowEnd || prefersReducedMotion));

  const setPerfMode = useCallback((mode: PerfMode) => {
    const next = normalizePerfMode(mode);
    setPerfModeState(next);
    writeText(PERF_MODE_KEY, next);
  }, []);

  const cyclePerfMode = useCallback(() => {
    const next = perfMode === PERF_AUTO ? PERF_ON : perfMode === PERF_ON ? PERF_OFF : PERF_AUTO;
    setPerfMode(next);
  }, [perfMode, setPerfMode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("low-perf-mode", lowPerfMode);
    document.body.classList.toggle("compact-ui", compactUI);
    return () => {
      document.body.classList.remove("low-perf-mode");
      document.body.classList.remove("compact-ui");
    };
  }, [lowPerfMode, compactUI]);

  return {
    compactUI,
    lowPerfMode,
    autoLowEnd,
    perfMode,
    setPerfMode,
    cyclePerfMode,
  };
}
