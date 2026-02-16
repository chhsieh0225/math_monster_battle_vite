import { Suspense, lazy } from 'react';
import type { ComponentProps, ReactNode } from 'react';

import TitleScreen from './screens/TitleScreen';
import SelectionScreen from './screens/SelectionScreen';
import type { ScreenName, UseBattlePublicApi, UseMobileExperienceApi } from '../types/battle';

const LeaderboardScreen = lazy(() => import('./screens/LeaderboardScreen'));
const EvolveScreen = lazy(() => import('./screens/EvolveScreen'));
const GameOverScreen = lazy(() => import('./screens/GameOverScreen'));
const AchievementScreen = lazy(() => import('./screens/AchievementScreen'));
const EncyclopediaScreen = lazy(() => import('./screens/EncyclopediaScreen'));
const DashboardScreen = lazy(() => import('./screens/DashboardScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const PvpResultScreen = lazy(() => import('./screens/PvpResultScreen'));
const DailyChallengeScreen = lazy(() => import('./screens/DailyChallengeScreen'));

type SelectionPayload = Parameters<ComponentProps<typeof SelectionScreen>['onSelect']>[0];
type DualSelectionPayload = Extract<SelectionPayload, { p1: unknown; p2: unknown }>;

type TranslateFn = (key: string, fallback: string) => string;

type AppScreenRouterProps = {
  battle: UseBattlePublicApi;
  mobile: UseMobileExperienceApi;
  audioMuted: boolean;
  onSetAudioMuted: (nextMuted: boolean) => void;
  onOpenSettings: (fromScreen: ScreenName) => void;
  onCloseSettings: () => void;
  t: TranslateFn;
};

function isDualSelectionPayload(payload: SelectionPayload): payload is DualSelectionPayload {
  return typeof payload === 'object' && payload !== null && 'p1' in payload && 'p2' in payload;
}

export default function AppScreenRouter({
  battle,
  mobile,
  audioMuted,
  onSetAudioMuted,
  onOpenSettings,
  onCloseSettings,
  t,
}: AppScreenRouterProps): ReactNode {
  const wrapMain = (node: ReactNode) => (
    <div id="main-content" style={{ height: '100%' }}>
      {node}
    </div>
  );

  const screenLoadingFallback = (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg,#0f172a,#1e1b4b,#312e81)',
        color: 'white',
        fontSize: 14,
        fontWeight: 700,
        opacity: 0.75,
      }}
    >
      {t('app.loading.screen', 'Loading screen...')}
    </div>
  );

  const withScreenSuspense = (node: ReactNode) => (
    <Suspense fallback={screenLoadingFallback}>
      {node}
    </Suspense>
  );

  if (battle.screen === 'battle') return null;

  if (battle.screen === 'title') {
    return wrapMain(
      <TitleScreen
        onStartNormal={() => {
          battle.clearChallengeRun();
          battle.setTimedMode(false);
          battle.setBattleMode('single');
          battle.setScreen('selection');
        }}
        onStartTimed={() => {
          battle.clearChallengeRun();
          battle.setTimedMode(true);
          battle.setBattleMode('single');
          battle.setScreen('selection');
        }}
        onStartCoop={() => {
          battle.clearChallengeRun();
          battle.setTimedMode(false);
          battle.setBattleMode('coop');
          battle.setScreen('selection');
        }}
        onStartPvp={() => {
          battle.clearChallengeRun();
          battle.setTimedMode(true);
          battle.setBattleMode('pvp');
          battle.setScreen('selection');
        }}
        onLeaderboard={() => battle.setScreen('leaderboard')}
        onAchievements={() => battle.setScreen('achievements')}
        onEncyclopedia={() => battle.setScreen('encyclopedia')}
        onDashboard={() => battle.setScreen('dashboard')}
        onDailyChallenge={() => battle.setScreen('daily_challenge')}
        onSettings={() => onOpenSettings('title')}
        lowPerfMode={mobile.lowPerfMode}
      />,
    );
  }

  if (battle.screen === 'daily_challenge') {
    return wrapMain(
      withScreenSuspense(
        <DailyChallengeScreen
          onBack={() => battle.setScreen('title')}
          onStartDaily={(plan) => {
            battle.queueDailyChallenge(plan);
            battle.setScreen('selection');
          }}
          onStartTower={() => {
            battle.clearChallengeRun();
            battle.setTimedMode(true);
            battle.setBattleMode('single');
            battle.setScreen('selection');
          }}
        />,
      ),
    );
  }

  if (battle.screen === 'achievements') {
    return wrapMain(
      withScreenSuspense(
        <AchievementScreen unlockedIds={battle.achUnlocked} onBack={() => battle.setScreen('title')} />,
      ),
    );
  }

  if (battle.screen === 'encyclopedia') {
    return wrapMain(
      withScreenSuspense(
        <EncyclopediaScreen encData={battle.encData} onBack={() => battle.setScreen('title')} />,
      ),
    );
  }

  if (battle.screen === 'dashboard') {
    return wrapMain(
      withScreenSuspense(
        <DashboardScreen onBack={() => battle.setScreen('title')} />,
      ),
    );
  }

  if (battle.screen === 'settings') {
    return wrapMain(
      withScreenSuspense(
        <SettingsScreen
          onBack={onCloseSettings}
          perfMode={mobile.perfMode}
          lowPerfMode={mobile.lowPerfMode}
          autoLowEnd={mobile.autoLowEnd}
          onSetPerfMode={mobile.setPerfMode}
          audioMuted={audioMuted}
          onSetAudioMuted={onSetAudioMuted}
        />,
      ),
    );
  }

  if (battle.screen === 'leaderboard') {
    return wrapMain(
      withScreenSuspense(
        <LeaderboardScreen totalEnemies={battle.enemies.length} onBack={() => battle.setScreen('title')} />,
      ),
    );
  }

  if (battle.screen === 'selection') {
    return wrapMain(
      <SelectionScreen
        mode={battle.battleMode}
        onSelect={(payload: SelectionPayload) => {
          battle.sfx.init();
          if (battle.battleMode === 'coop' && isDualSelectionPayload(payload)) {
            battle.setStarter(payload.p1);
            battle.startGame(payload.p1, 'coop', payload.p2);
            return;
          }
          if (battle.battleMode === 'pvp' && isDualSelectionPayload(payload)) {
            battle.setStarter(payload.p1);
            battle.setPvpStarter2(payload.p2);
            battle.startGame(payload.p1, 'pvp', payload.p2);
            return;
          }
          battle.setStarter(payload);
          battle.startGame(payload, battle.battleMode);
        }}
        onBack={() => battle.setScreen('title')}
      />,
    );
  }

  if (battle.screen === 'pvp_result') {
    return wrapMain(
      withScreenSuspense(
        <PvpResultScreen
          p1Starter={battle.starter}
          p2Starter={battle.pvpStarter2}
          p1StageIdx={battle.pStg}
          p2StageIdx={battle.pvpStarter2?.selectedStageIdx || 0}
          winner={battle.pvpWinner || 'p1'}
          onRematch={() => battle.starter && battle.startGame(battle.starter, 'pvp')}
          onHome={() => battle.setScreen('title')}
        />,
      ),
    );
  }

  if (battle.screen === 'evolve') {
    return wrapMain(
      withScreenSuspense(
        <EvolveScreen starter={battle.starter} stageIdx={battle.pStg} onContinue={battle.continueAfterEvolve} />,
      ),
    );
  }

  if (battle.screen === 'gameover') {
    return wrapMain(
      withScreenSuspense(
        <GameOverScreen
          defeated={battle.defeated}
          totalEnemies={battle.enemies.length}
          tC={battle.tC}
          tW={battle.tW}
          pLvl={battle.pLvl}
          timedMode={battle.timedMode}
          maxStreak={battle.maxStreak}
          starter={battle.starter}
          mLvls={battle.mLvls}
          getPow={battle.getPow}
          dailyChallengeFeedback={battle.dailyChallengeFeedback}
          onRestart={() => battle.starter && battle.startGame()}
          onLeaderboard={() => battle.setScreen('leaderboard')}
          onHome={() => battle.setScreen('title')}
        />,
      ),
    );
  }

  return wrapMain(screenLoadingFallback);
}
