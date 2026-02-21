import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

type UseBattleArenaScaleArgs = {
  arenaRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
};

const BASE_WIDTH = 430;
const MIN_SCALE = 0.9;
const MAX_SCALE = 1.16;
const SCALE_STEP = 0.02;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeScale(arena: HTMLElement | null): number {
  if (!arena) return 1;
  const rect = arena.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return 1;
  // Width-only scaling keeps sprite size stable across rounds/phases.
  // Arena height changes with question/menu panel states and can cause
  // visible "same character suddenly bigger/smaller" jitter.
  const byWidth = rect.width / BASE_WIDTH;
  const raw = clamp(byWidth, MIN_SCALE, MAX_SCALE);
  return Math.round(raw / SCALE_STEP) * SCALE_STEP;
}

/**
 * Compute a stable, device-aware sprite scale factor from arena size.
 * Keeps player/enemy proportions consistent across phone/tablet/desktop.
 *
 * Uses useLayoutEffect so the first computed scale is applied before the
 * browser paints, eliminating the visible snap from default → actual scale.
 */
export function useBattleArenaScale({
  arenaRef,
  enabled = true,
}: UseBattleArenaScaleArgs): number {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (!enabled) return;

    const updateScale = () => {
      const next = computeScale(arenaRef.current);
      setScale((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
    };

    // Synchronous first measurement — runs before paint.
    updateScale();

    let rafId = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScale);
    };

    window.addEventListener('resize', scheduleUpdate);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleUpdate);
      if (arenaRef.current) observer.observe(arenaRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleUpdate);
      if (observer) observer.disconnect();
    };
  }, [arenaRef, enabled]);

  return enabled ? scale : 1;
}
