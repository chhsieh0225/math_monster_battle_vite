import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { mergeTiles, pickTileLevel, visibleTiles, type MapTile } from './mapTiles.ts';

/** Sharp tiles for the part of the map in view, re-evaluated on scroll, zoom and resize. */
export function useMapTiles(viewportRef: RefObject<HTMLDivElement | null>, baseUrl: string, deps: readonly unknown[]) {
  const [state, setState] = useState<{ level: number; tiles: MapTile[] }>({ level: 0, tiles: [] });
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const map = viewport.firstElementChild as HTMLElement | null;
      if (!map || map.offsetWidth === 0 || map.offsetHeight === 0) return;
      const level = pickTileLevel(map.offsetHeight, window.devicePixelRatio || 1);
      const view = {
        x0: (viewport.scrollLeft - map.offsetLeft) / map.offsetWidth,
        y0: (viewport.scrollTop - map.offsetTop) / map.offsetHeight,
        x1: (viewport.scrollLeft + viewport.clientWidth - map.offsetLeft) / map.offsetWidth,
        y1: (viewport.scrollTop + viewport.clientHeight - map.offsetTop) / map.offsetHeight,
      };
      setState((previous) => mergeTiles(previous, level, visibleTiles(level, view, baseUrl)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule();
    viewport.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      viewport.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when the caller's layout inputs (zoom, panel) change
  }, [viewportRef, baseUrl, ...deps]);
  return state;
}
