import { createElement, type ComponentType } from 'react';
import type { ScreenName } from '../types/battle';

/** Unlike a fresh React.lazy wrapper, a preloaded screen renders synchronously on first mount. */
export function createScreenResource<P extends object>(importer: () => Promise<{ default: ComponentType<P> }>) {
  let resolved: ComponentType<P> | undefined;
  let pending: Promise<{ default: ComponentType<P> }> | undefined;
  const load = () => {
    pending ??= Promise.resolve().then(importer).then((module) => {
      resolved = module.default;
      return module;
    }).catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
  const Screen = (props: P) => {
    // Suspense consumes thenables here; this is not an application error.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    if (!resolved) throw load();
    return createElement(resolved, props);
  };
  return { Screen, load, isReady: () => Boolean(resolved) };
}

export const screenResources = {
  battle: createScreenResource(() => import('../components/screens/BattleScreen')),
  worldmap: createScreenResource(() => import('../components/screens/WorldMapScreen')),
  evolve: createScreenResource(() => import('../components/screens/EvolveScreen')),
  leaderboard: createScreenResource(() => import('../components/screens/LeaderboardScreen')),
  gameover: createScreenResource(() => import('../components/screens/GameOverScreen')),
  achievements: createScreenResource(() => import('../components/screens/AchievementScreen')),
  encyclopedia: createScreenResource(() => import('../components/screens/EncyclopediaScreen')),
  dashboard: createScreenResource(() => import('../components/screens/DashboardScreen')),
  settings: createScreenResource(() => import('../components/screens/SettingsScreen')),
  pvp_result: createScreenResource(() => import('../components/screens/PvpResultScreen')),
  daily_challenge: createScreenResource(() => import('../components/screens/DailyChallengeScreen')),
  howto: createScreenResource(() => import('../components/screens/HowToPlayScreen')),
  placement: createScreenResource(() => import('../components/screens/PlacementScreen')),
  spring: createScreenResource(() => import('../components/screens/ReviewSpringScreen')),
} satisfies Partial<Record<ScreenName, { load: () => Promise<unknown>; isReady: () => boolean }>>;

export const loadBattleScreen = screenResources.battle.load;
export const loadWorldMapScreen = screenResources.worldmap.load;
