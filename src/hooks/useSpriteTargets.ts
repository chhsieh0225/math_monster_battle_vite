import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export type SpriteTarget = {
  right: string;
  top: string;
  flyRight: number;
  flyTop: number;
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
};

type UseSpriteTargetsResult = {
  measuredEnemyTarget: SpriteTarget | null;
  measuredPlayerTarget: SpriteTarget | null;
};

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
}: UseSpriteTargetsArgs): UseSpriteTargetsResult {
  const [measuredEnemyTarget, setMeasuredEnemyTarget] = useState<SpriteTarget | null>(null);
  const [measuredPlayerTarget, setMeasuredPlayerTarget] = useState<SpriteTarget | null>(null);

  useEffect(() => {
    if (screen !== 'battle') return;
    let rafId = 0;

    const syncTargets = () => {
      const rootEl = battleRootRef.current;
      const enemyEl = enemySpriteRef.current;
      const playerEl = playerSpriteRef.current;
      if (!rootEl) return;

      const rootRect = rootEl.getBoundingClientRect();
      if (rootRect.width <= 0 || rootRect.height <= 0) return;

      if (enemyEl) {
        const enemyRect = enemyEl.getBoundingClientRect();
        if (enemyRect.width > 0 && enemyRect.height > 0) {
          const cx = enemyRect.left - rootRect.left + enemyRect.width / 2;
          const cy = enemyRect.top - rootRect.top + enemyRect.height / 2;
          const rightPx = rootRect.width - cx;
          const topPx = cy;
          setMeasuredEnemyTarget({
            right: `${rightPx}px`,
            top: `${topPx}px`,
            flyRight: rightPx / rootRect.width * 100,
            flyTop: topPx / rootRect.height * 100,
          });
        }
      }

      if (playerEl) {
        const playerRect = playerEl.getBoundingClientRect();
        if (playerRect.width > 0 && playerRect.height > 0) {
          const cx = playerRect.left - rootRect.left + playerRect.width / 2;
          const cy = playerRect.top - rootRect.top + playerRect.height / 2;
          const rightPx = rootRect.width - cx;
          const topPx = cy;
          setMeasuredPlayerTarget({
            right: `${rightPx}px`,
            top: `${topPx}px`,
            flyRight: rightPx / rootRect.width * 100,
            flyTop: topPx / rootRect.height * 100,
          });
        }
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
  ]);

  return { measuredEnemyTarget, measuredPlayerTarget };
}
