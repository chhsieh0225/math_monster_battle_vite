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
const CollectionScreen = lazy(() => import('./screens/CollectionScreen'));
const DailyChallengeScreen = lazy(() => import('./screens/DailyChallengeScreen'));

type SelectionPayload = Parameters<ComponentProps<typeof SelectionScreen>['onSelect']>[0];
type DualSelectionPayload = Extract<SelectionPayload, { p1: unknown; p2: unknown }>;

type TranslateFn = (key: string, fallback: string) => string;
type BattleSlices = Pick<UseBattlePublicApi, 'state' | 'actions' | 'view'>;

type AppScreenRouterProps = {
  battle: BattleSlices;
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
  // Consume battle slices only; do not depend on hook-level flattened fields.
  const B = {
    ...battle.state,
    ...battle.actions,
    ...battle.view,
  };

  const wrapMain = (node: ReactNode) => (
    <div id="main-content" className="screen-transition" key={B.screen} style={{ height: '100%' }}>
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

  if (B.screen === 'battle') return null;

  if (B.screen === 'title') {
    return wrapMain(
      <TitleScreen
        onStartNormal={() => {
          B.clearChallengeRun();
          B.setTimedMode(false);
          B.setBattleMode('single');
          B.setScreen('selection');
        }}
        onStartTimed={() => {
          B.clearChallengeRun();
          B.setTimedMode(true);
          B.setBattleMode('single');
          B.setScreen('selection');
        }}
        onStartCoop={() => {
          B.clearChallengeRun();
          B.setTimedMode(false);
          B.setBattleMode('coop');
          B.setScreen('selection');
        }}
        onStartPvp={() => {
          B.clearChallengeRun();
          B.setTimedMode(true);
          B.setBattleMode('pvp');
          B.setScreen('selection');
        }}
        onLeaderboard={() => B.setScreen('leaderboard')}
        onAchievements={() => B.setScreen('achievements')}
        onEncyclopedia={() => B.setScreen('encyclopedia')}
        onCollection={() => B.setScreen('collection')}
        onDashboard={() => B.setScreen('dashboard')}
        onDailyChallenge={() => B.setScreen('daily_challenge')}
        onSettings={() => onOpenSettings('title')}
        lowPerfMode={mobile.lowPerfMode}
      />,
    );
  }

  if (B.screen === 'daily_challenge') {
    return wrapMain(
      withScreenSuspense(
        <DailyChallengeScreen
          onBack={() => B.setScreen('title')}
          onStartDaily={(plan) => {
            B.queueDailyChallenge(plan);
            B.setScreen('selection');
          }}
          onStartTower={() => {
            B.clearChallengeRun();
            B.setTimedMode(true);
            B.setBattleMode('single');
            B.setScreen('selection');
          }}
        />,
      ),
    );
  }

  if (B.screen === 'achievements') {
    return wrapMain(
      withScreenSuspense(
        <AchievementScreen unlockedIds={B.achUnlocked} onBack={() => B.setScreen('title')} />,
      ),
    );
  }

  if (B.screen === 'encyclopedia') {
    return wrapMain(
      withScreenSuspense(
        <EncyclopediaScreen encData={B.encData} onBack={() => B.setScreen('title')} />,
      ),
    );
  }

  if (B.screen === 'collection') {
    return wrapMain(
      withScreenSuspense(
        <CollectionScreen onBack={() => B.setScreen('title')} />,
      ),
    );
  }

  if (B.screen === 'dashboard') {
    return wrapMain(
      withScreenSuspense(
        <DashboardScreen onBack={() => B.setScreen('title')} />,
      ),
    );
  }

  if (B.screen === 'settings') {
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

  if (B.screen === 'leaderboard') {
    return wrapMain(
      withScreenSuspense(
        <LeaderboardScreen totalEnemies={B.enemies.length} onBack={() => B.setScreen('title')} />,
      ),
    );
  }

  if (B.screen === 'selection') {
    return wrapMain(
      <SelectionScreen
        mode={B.battleMode}
        onSelect={(payload: SelectionPayload) => {
          B.sfx.init();
          if (B.battleMode === 'coop' && isDualSelectionPayload(payload)) {
            B.setStarter(payload.p1);
            B.startGame(payload.p1, 'coop', payload.p2);
            return;
          }
          if (B.battleMode === 'pvp' && isDualSelectionPayload(payload)) {
            B.setStarter(payload.p1);
            B.setPvpStarter2(payload.p2);
            B.startGame(payload.p1, 'pvp', payload.p2);
            return;
          }
          B.setStarter(payload);
          B.startGame(payload, B.battleMode);
        }}
        onBack={() => B.setScreen('title')}
      />,
    );
  }

  if (B.screen === 'pvp_result') {
    return wrapMain(
      withScreenSuspense(
        <PvpResultScreen
          p1Starter={B.starter}
          p2Starter={B.pvpStarter2}
          p1StageIdx={B.pStg}
          p2StageIdx={B.pvpStarter2?.selectedStageIdx || 0}
          winner={B.pvpWinner || 'p1'}
          onRematch={() => B.starter && B.startGame(B.starter, 'pvp')}
          onHome={() => B.setScreen('title')}
        />,
      ),
    );
  }

  if (B.screen === 'evolve') {
    return wrapMain(
      withScreenSuspense(
        <EvolveScreen starter={B.starter} stageIdx={B.pStg} onContinue={B.continueAfterEvolve} />,
      ),
    );
  }

  if (B.screen === 'gameover') {
    return wrapMain(
      withScreenSuspense(
        <GameOverScreen
          defeated={B.defeated}
          totalEnemies={B.enemies.length}
          tC={B.tC}
          tW={B.tW}
          pLvl={B.pLvl}
          timedMode={B.timedMode}
          maxStreak={B.maxStreak}
          starter={B.starter}
          mLvls={B.mLvls}
          getPow={B.getPow}
          dailyChallengeFeedback={B.dailyChallengeFeedback}
          onRestart={() => B.starter && B.startGame()}
          onLeaderboard={() => B.setScreen('leaderboard')}
          onHome={() => B.setScreen('title')}
        />,
      ),
    );
  }

  return wrapMain(screenLoadingFallback);
}
