import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

type UseBattleArenaScaleArgs = {
  arenaRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute a stable, device-aware sprite scale factor from arena size.
 * Keeps player/enemy proportions consistent across phone/tablet/desktop.
 */
export function useBattleArenaScale({
  arenaRef,
  enabled = true,
}: UseBattleArenaScaleArgs): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    const BASE_WIDTH = 430;
    const BASE_HEIGHT = 320;
    const MIN_SCALE = 0.9;
    const MAX_SCALE = 1.16;

    const updateScale = () => {
      const arena = arenaRef.current;
      if (!arena) return;
      const rect = arena.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const byWidth = rect.width / BASE_WIDTH;
      const byHeight = rect.height / BASE_HEIGHT;
      const next = clamp(Math.min(byWidth, byHeight), MIN_SCALE, MAX_SCALE);
      setScale((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScale);
    };

    scheduleUpdate();
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
