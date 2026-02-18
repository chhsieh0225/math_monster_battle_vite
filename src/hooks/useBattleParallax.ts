import { useEffect } from 'react';
import type { RefObject } from 'react';

type UseBattleParallaxArgs = {
  hostRef: RefObject<HTMLElement | null>;
  enabled: boolean;
};

const CSS_VAR_X = '--battle-parallax-x';
const CSS_VAR_Y = '--battle-parallax-y';
const MAX_OFFSET_PX = 14;
const SMOOTHING = 0.2;
const STOP_DELTA = 0.16;
const ORIENTATION_MAX_DEG = 18;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useBattleParallax({ hostRef, enabled }: UseBattleParallaxArgs): void {
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    host.style.setProperty(CSS_VAR_X, '0px');
    host.style.setProperty(CSS_VAR_Y, '0px');

    const active = enabled && !prefersReducedMotion();
    if (!active) return undefined;

    let rafId = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const render = () => {
      rafId = 0;
      currentX += (targetX - currentX) * SMOOTHING;
      currentY += (targetY - currentY) * SMOOTHING;

      host.style.setProperty(CSS_VAR_X, `${currentX.toFixed(2)}px`);
      host.style.setProperty(CSS_VAR_Y, `${currentY.toFixed(2)}px`);

      if (Math.abs(targetX - currentX) > STOP_DELTA || Math.abs(targetY - currentY) > STOP_DELTA) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    const queueRender = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(render);
    };

    const setTarget = (nx: number, ny: number) => {
      targetX = clamp(nx, -1, 1) * MAX_OFFSET_PX;
      targetY = clamp(ny, -1, 1) * MAX_OFFSET_PX;
      queueRender();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      setTarget(nx, ny);
    };

    const onPointerLeave = () => setTarget(0, 0);

    host.addEventListener('pointermove', onPointerMove, { passive: true });
    host.addEventListener('pointerleave', onPointerLeave);

    const onDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.gamma !== 'number' || typeof event.beta !== 'number') return;
      const nx = clamp(event.gamma / ORIENTATION_MAX_DEG, -1, 1);
      const ny = clamp(event.beta / ORIENTATION_MAX_DEG, -1, 1) * 0.72;
      setTarget(nx, ny);
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', onDeviceOrientation, true);
    }

    return () => {
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', onDeviceOrientation, true);
      }
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      host.style.setProperty(CSS_VAR_X, '0px');
      host.style.setProperty(CSS_VAR_Y, '0px');
    };
  }, [hostRef, enabled]);
}
