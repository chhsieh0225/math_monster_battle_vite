import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export type SpriteTarget = {
  right: string;
  top: string;
  flyRight: number;
  flyTop: number;
  /** Center-x from left edge of battle-root, in pixels. */
  cx: number;
  /** Center-y from top edge of battle-root, in pixels. */
  cy: number;
};

type UseSpriteTargetsArgs = {
  screen: string;
  phase: string;
  enemyId?: string;
  enemyIsEvolved?: boolean;
  enemySceneMType?: string;
  enemyMType?: string;
  playerStageIdx: number;
  battleMode: string;
  pvpTurn: string;
  battleRootRef: RefObject<HTMLDivElement | null>;
  enemySpriteRef: RefObject<HTMLDivElement | null>;
  playerSpriteRef: RefObject<HTMLDivElement | null>;
  playerSubSpriteRef?: RefObject<HTMLDivElement | null>;
};

type UseSpriteTargetsResult = {
  measuredEnemyTarget: SpriteTarget | null;
  measuredPlayerTarget: SpriteTarget | null;
  measuredPlayerSubTarget: SpriteTarget | null;
};

function measureSpriteTarget(
  rootRect: DOMRect,
  el: HTMLElement,
): SpriteTarget | null {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const cxVal = r.left - rootRect.left + r.width / 2;
  const cyVal = r.top - rootRect.top + r.height / 2;
  const rightPx = rootRect.width - cxVal;
  const topPx = cyVal;
  return {
    right: `${rightPx}px`,
    top: `${topPx}px`,
    flyRight: rightPx / rootRect.width * 100,
    flyTop: topPx / rootRect.height * 100,
    cx: cxVal,
    cy: cyVal,
  };
}

export function useSpriteTargets({
  screen,
  phase,
  enemyId,
  enemyIsEvolved,
  enemySceneMType,
  enemyMType,
  playerStageIdx,
  battleMode,
  pvpTurn,
  battleRootRef,
  enemySpriteRef,
  playerSpriteRef,
  playerSubSpriteRef,
}: UseSpriteTargetsArgs): UseSpriteTargetsResult {
  const [measuredEnemyTarget, setMeasuredEnemyTarget] = useState<SpriteTarget | null>(null);
  const [measuredPlayerTarget, setMeasuredPlayerTarget] = useState<SpriteTarget | null>(null);
  const [measuredPlayerSubTarget, setMeasuredPlayerSubTarget] = useState<SpriteTarget | null>(null);

  const shouldUpdateTarget = (prev: SpriteTarget | null, next: SpriteTarget): boolean => {
    if (!prev) return true;
    const dx = Math.abs(prev.flyRight - next.flyRight);
    const dy = Math.abs(prev.flyTop - next.flyTop);
    return dx > 0.08 || dy > 0.08;
  };

  useEffect(() => {
    if (screen !== 'battle') return;
    let rafId = 0;

    const syncTargets = () => {
      const rootEl = battleRootRef.current;
      if (!rootEl) return;

      const rootRect = rootEl.getBoundingClientRect();
      if (rootRect.width <= 0 || rootRect.height <= 0) return;

      const enemyEl = enemySpriteRef.current;
      if (enemyEl) {
        const t = measureSpriteTarget(rootRect, enemyEl);
        if (t) setMeasuredEnemyTarget((prev) => (shouldUpdateTarget(prev, t) ? t : prev));
      }

      const playerEl = playerSpriteRef.current;
      if (playerEl) {
        const t = measureSpriteTarget(rootRect, playerEl);
        if (t) setMeasuredPlayerTarget((prev) => (shouldUpdateTarget(prev, t) ? t : prev));
      }

      const subEl = playerSubSpriteRef?.current;
      if (subEl) {
        const t = measureSpriteTarget(rootRect, subEl);
        if (t) setMeasuredPlayerSubTarget((prev) => (shouldUpdateTarget(prev, t) ? t : prev));
      }
    };

    const scheduleSync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncTargets);
    };

    scheduleSync();
    window.addEventListener('resize', scheduleSync);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleSync);
      if (battleRootRef.current) observer.observe(battleRootRef.current);
      if (enemySpriteRef.current) observer.observe(enemySpriteRef.current);
      if (playerSpriteRef.current) observer.observe(playerSpriteRef.current);
      const subEl = playerSubSpriteRef?.current;
      if (subEl) observer.observe(subEl);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleSync);
      if (observer) observer.disconnect();
    };
  }, [
    screen,
    phase,
    enemyId,
    enemyIsEvolved,
    enemySceneMType,
    enemyMType,
    playerStageIdx,
    battleMode,
    pvpTurn,
    battleRootRef,
    enemySpriteRef,
    playerSpriteRef,
    playerSubSpriteRef,
  ]);

  return { measuredEnemyTarget, measuredPlayerTarget, measuredPlayerSubTarget };
}
