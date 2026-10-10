/**
 * Zoom and pan for the world map: buttons, two-finger pinch, trackpad pinch
 * (ctrl/⌘ + wheel) and mouse drag. The point under the fingers or cursor stays
 * put while zooming. One-finger touch panning is the browser's native scroll.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export const MAP_ZOOM_MIN = 1;
export const MAP_ZOOM_MAX = 3;
export const MAP_ZOOM_STEP = 1.4;

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return MAP_ZOOM_MIN;
  return Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, Math.round(value * 100) / 100));
}

type Anchor = { fracX: number; fracY: number; viewX: number; viewY: number };

/** Where the anchor (a fraction of the map, seen at a viewport point) lands after a zoom. */
export function anchoredScroll(anchor: Anchor, map: { left: number; top: number; width: number; height: number }) {
  return {
    left: Math.max(0, anchor.fracX * map.width + map.left - anchor.viewX),
    top: Math.max(0, anchor.fracY * map.height + map.top - anchor.viewY),
  };
}

function mapBox(map: HTMLElement) {
  return { left: map.offsetLeft, top: map.offsetTop, width: map.offsetWidth, height: map.offsetHeight };
}

export function useMapZoom(viewportRef: RefObject<HTMLDivElement | null>) {
  const [zoom, setZoom] = useState(MAP_ZOOM_MIN);
  const zoomRef = useRef(MAP_ZOOM_MIN);
  const anchorRef = useRef<Anchor | null>(null);

  /** Zoom keeping the map point under (viewX, viewY) — viewport-relative pixels — in place. */
  const zoomAround = useCallback((next: number, viewX?: number, viewY?: number) => {
    const viewport = viewportRef.current;
    const map = viewport?.firstElementChild as HTMLElement | null;
    const target = clampZoom(next);
    if (!viewport || !map || target === zoomRef.current) return;
    const x = viewX ?? viewport.clientWidth / 2;
    const y = viewY ?? viewport.clientHeight / 2;
    const box = mapBox(map);
    anchorRef.current = {
      fracX: box.width > 0 ? (viewport.scrollLeft + x - box.left) / box.width : 0.5,
      fracY: box.height > 0 ? (viewport.scrollTop + y - box.top) / box.height : 0.5,
      viewX: x,
      viewY: y,
    };
    zoomRef.current = target;
    setZoom(target);
  }, [viewportRef]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const map = viewport?.firstElementChild as HTMLElement | null;
    const anchor = anchorRef.current;
    if (!viewport || !map || !anchor) return;
    anchorRef.current = null;
    const { left, top } = anchoredScroll(anchor, mapBox(map));
    viewport.scrollLeft = left;
    viewport.scrollTop = top;
  }, [zoom, viewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const local = (clientX: number, clientY: number) => {
      const rect = viewport.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    // Trackpad pinch arrives as ctrl + wheel; ⌘ + wheel zooms with a mouse.
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const { x, y } = local(event.clientX, event.clientY);
      zoomAround(zoomRef.current * Math.exp(-event.deltaY * 0.01), x, y);
    };

    let pinch: { distance: number; zoom: number } | null = null;
    const touchInfo = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]];
      return {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        center: local((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2),
      };
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) pinch = { distance: touchInfo(event.touches).distance, zoom: zoomRef.current };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const { distance, center } = touchInfo(event.touches);
      if (pinch.distance > 0) zoomAround(pinch.zoom * (distance / pinch.distance), center.x, center.y);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinch = null;
    };

    // Mouse drag pans (touch already scrolls natively); clicks on markers still work.
    let drag: { x: number; y: number; left: number; top: number; moved: boolean } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      if ((event.target as HTMLElement | null)?.closest('button')) return;
      drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, moved: false };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      viewport.classList.add('is-dragging');
      viewport.scrollLeft = drag.left - dx;
      viewport.scrollTop = drag.top - dy;
    };
    const onPointerUp = () => {
      drag = null;
      viewport.classList.remove('is-dragging');
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd);
    viewport.addEventListener('touchcancel', onTouchEnd);
    viewport.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
      viewport.removeEventListener('touchend', onTouchEnd);
      viewport.removeEventListener('touchcancel', onTouchEnd);
      viewport.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [viewportRef, zoomAround]);

  return {
    zoom,
    zoomIn: () => zoomAround(zoomRef.current * MAP_ZOOM_STEP),
    zoomOut: () => zoomAround(zoomRef.current / MAP_ZOOM_STEP),
    reset: () => zoomAround(MAP_ZOOM_MIN),
  };
}
