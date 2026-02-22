import { useEffect, useRef, useState } from 'react';
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
  pvpTurn: 'p1' | 'p2';
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

function shouldUpdateTarget(prev: SpriteTarget | null, next: SpriteTarget): boolean {
  if (!prev) return true;
  const dx = Math.abs(prev.flyRight - next.flyRight);
  const dy = Math.abs(prev.flyTop - next.flyTop);
  return dx > 0.08 || dy > 0.08;
}

const NOOP = () => {};

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
  const scheduleSyncRef = useRef<() => void>(NOOP);

  useEffect(() => {
    if (screen !== 'battle') {
      scheduleSyncRef.current = NOOP;
      return;
    }

    let rafId = 0;
    let observer: ResizeObserver | null = null;
    let observedRoot: HTMLElement | null = null;
    let observedEnemy: HTMLElement | null = null;
    let observedPlayer: HTMLElement | null = null;
    let observedPlayerSub: HTMLElement | null = null;

    const syncTargets = () => {
      const rootEl = battleRootRef.current;
      if (!rootEl) return;

      const rootRect = rootEl.getBoundingClientRect();
      if (rootRect.width <= 0 || rootRect.height <= 0) return;

      const enemyEl = enemySpriteRef.current;
      if (enemyEl) {
        const t = measureSpriteTarget(rootRect, enemyEl);
        if (t) {
          setMeasuredEnemyTarget((prev) => (shouldUpdateTarget(prev, t) ? t : prev));
        }
      }

      const playerEl = playerSpriteRef.current;
      if (playerEl) {
        const t = measureSpriteTarget(rootRect, playerEl);
        if (t) {
          setMeasuredPlayerTarget((prev) => (shouldUpdateTarget(prev, t) ? t : prev));
        }
      }

      const subEl = playerSubSpriteRef?.current;
      if (subEl) {
        const t = measureSpriteTarget(rootRect, subEl);
        if (t) {
          setMeasuredPlayerSubTarget((prev) => (shouldUpdateTarget(prev, t) ? t : prev));
        }
      }
    };

    const bindObservedElements = () => {
      if (!observer) return;
      const rootEl = battleRootRef.current;
      const enemyEl = enemySpriteRef.current;
      const playerEl = playerSpriteRef.current;
      const playerSubEl = playerSubSpriteRef?.current || null;

      if (observedRoot !== rootEl) {
        if (observedRoot) observer.unobserve(observedRoot);
        if (rootEl) observer.observe(rootEl);
        observedRoot = rootEl;
      }
      if (observedEnemy !== enemyEl) {
        if (observedEnemy) observer.unobserve(observedEnemy);
        if (enemyEl) observer.observe(enemyEl);
        observedEnemy = enemyEl;
      }
      if (observedPlayer !== playerEl) {
        if (observedPlayer) observer.unobserve(observedPlayer);
        if (playerEl) observer.observe(playerEl);
        observedPlayer = playerEl;
      }
      if (observedPlayerSub !== playerSubEl) {
        if (observedPlayerSub) observer.unobserve(observedPlayerSub);
        if (playerSubEl) observer.observe(playerSubEl);
        observedPlayerSub = playerSubEl;
      }
    };

    const scheduleSync = () => {
      bindObservedElements();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncTargets);
    };
    scheduleSyncRef.current = scheduleSync;

    scheduleSync();
    window.addEventListener('resize', scheduleSync);

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleSync);
      bindObservedElements();
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleSync);
      if (observer) observer.disconnect();
      scheduleSyncRef.current = NOOP;
    };
  }, [
    screen,
    battleRootRef,
    enemySpriteRef,
    playerSpriteRef,
    playerSubSpriteRef,
  ]);

  useEffect(() => {
    if (screen !== 'battle') return;
    scheduleSyncRef.current();
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
  ]);

  return {
    measuredEnemyTarget: screen === 'battle' ? measuredEnemyTarget : null,
    measuredPlayerTarget: screen === 'battle' ? measuredPlayerTarget : null,
    measuredPlayerSubTarget: screen === 'battle' ? measuredPlayerSubTarget : null,
  };
}
