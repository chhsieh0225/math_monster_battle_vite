import { useCallback, useEffect, useMemo, useState } from 'react';
import { readText, writeText } from '../utils/storage';

const PERF_MODE_KEY = "mathMonsterBattle_perfMode";
const PERF_AUTO = "auto";
const PERF_ON = "on";
const PERF_OFF = "off";

function initialViewport() {
  if (typeof window === "undefined") return { width: 390, height: 844 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function detectLowEndDevice() {
  if (typeof navigator === "undefined") return false;
  const cores = Number(navigator.hardwareConcurrency || 0);
  const memory = Number(navigator.deviceMemory || 0);
  return (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
}

function normalizePerfMode(mode) {
  if (mode === PERF_ON || mode === PERF_OFF || mode === PERF_AUTO) return mode;
  return PERF_AUTO;
}

function readPerfMode() {
  return normalizePerfMode(readText(PERF_MODE_KEY, PERF_AUTO));
}

export function useMobileExperience() {
  const [viewport, setViewport] = useState(initialViewport);
  const [perfMode, setPerfModeState] = useState(readPerfMode);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const autoLowEnd = useMemo(() => detectLowEndDevice(), []);
  const compactUI = viewport.width <= 390 || viewport.height <= 760;
  const lowPerfMode = perfMode === PERF_ON
    || (perfMode === PERF_AUTO && (autoLowEnd || prefersReducedMotion));

  const setPerfMode = useCallback((mode) => {
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
    const onChange = (event) => setPrefersReducedMotion(event.matches);
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
