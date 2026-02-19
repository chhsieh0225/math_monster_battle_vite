import { Suspense, lazy } from 'react';
import type { ComponentProps, ReactNode } from 'react';

import TitleScreen from './screens/TitleScreen';
import SelectionScreen from './screens/SelectionScreen';
import type {
  ScreenName,
  UseBattleActions,
  UseBattleState,
  UseBattleView,
  UseMobileExperienceApi,
} from '../types/battle';

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
  state: UseBattleState;
  actions: UseBattleActions;
  view: UseBattleView;
  mobile: UseMobileExperienceApi;
  bgmMuted: boolean;
  bgmVolume: number;
  sfxMuted: boolean;
  onSetBgmMuted: (nextMuted: boolean) => void;
  onSetBgmVolume: (nextVolume: number) => void;
  onSetSfxMuted: (nextMuted: boolean) => void;
  onOpenSettings: (fromScreen: ScreenName) => void;
  onCloseSettings: () => void;
  t: TranslateFn;
};

function isDualSelectionPayload(payload: SelectionPayload): payload is DualSelectionPayload {
  return typeof payload === 'object' && payload !== null && 'p1' in payload && 'p2' in payload;
}

export default function AppScreenRouter({
  state,
  actions,
  view,
  mobile,
  bgmMuted,
  bgmVolume,
  sfxMuted,
  onSetBgmMuted,
  onSetBgmVolume,
  onSetSfxMuted,
  onOpenSettings,
  onCloseSettings,
  t,
}: AppScreenRouterProps): ReactNode {
  const S = state;
  const A = actions;
  const V = view;

  const wrapMain = (node: ReactNode) => (
    <div id="main-content" className="screen-transition" key={S.screen} style={{ height: '100%' }}>
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

  if (S.screen === 'battle') return null;

  if (S.screen === 'title') {
    return wrapMain(
      <TitleScreen
        onStartNormal={() => {
          A.clearChallengeRun();
          A.setTimedMode(false);
          A.setBattleMode('single');
          A.setScreen('selection');
        }}
        onStartTimed={() => {
          A.clearChallengeRun();
          A.setTimedMode(true);
          A.setBattleMode('single');
          A.setScreen('selection');
        }}
        onStartCoop={() => {
          A.clearChallengeRun();
          A.setTimedMode(false);
          A.setBattleMode('coop');
          A.setScreen('selection');
        }}
        onStartPvp={() => {
          A.clearChallengeRun();
          A.setTimedMode(true);
          A.setBattleMode('pvp');
          A.setScreen('selection');
        }}
        onLeaderboard={() => A.setScreen('leaderboard')}
        onAchievements={() => A.setScreen('achievements')}
        onEncyclopedia={() => A.setScreen('encyclopedia')}
        onDashboard={() => A.setScreen('dashboard')}
        onDailyChallenge={() => A.setScreen('daily_challenge')}
        onSettings={() => onOpenSettings('title')}
        lowPerfMode={mobile.lowPerfMode}
      />,
    );
  }

  if (S.screen === 'daily_challenge') {
    return wrapMain(
      withScreenSuspense(
        <DailyChallengeScreen
          onBack={() => A.setScreen('title')}
          onStartDaily={(plan) => {
            A.queueDailyChallenge(plan);
            A.setScreen('selection');
          }}
          onStartTower={(plan) => {
            A.queueTowerChallenge(plan);
            A.setScreen('selection');
          }}
        />,
      ),
    );
  }

  if (S.screen === 'achievements') {
    return wrapMain(
      withScreenSuspense(
        <AchievementScreen unlockedIds={S.achUnlocked} onBack={() => A.setScreen('title')} />,
      ),
    );
  }

  if (S.screen === 'encyclopedia') {
    return wrapMain(
      withScreenSuspense(
        <EncyclopediaScreen encData={S.encData} onBack={() => A.setScreen('title')} />,
      ),
    );
  }

  if (S.screen === 'dashboard') {
    return wrapMain(
      withScreenSuspense(
        <DashboardScreen onBack={() => A.setScreen('title')} />,
      ),
    );
  }

  if (S.screen === 'settings') {
    return wrapMain(
      withScreenSuspense(
        <SettingsScreen
          onBack={onCloseSettings}
          perfMode={mobile.perfMode}
          lowPerfMode={mobile.lowPerfMode}
          autoLowEnd={mobile.autoLowEnd}
          onSetPerfMode={mobile.setPerfMode}
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          sfxMuted={sfxMuted}
          onSetBgmMuted={onSetBgmMuted}
          onSetBgmVolume={onSetBgmVolume}
          onSetSfxMuted={onSetSfxMuted}
        />,
      ),
    );
  }

  if (S.screen === 'leaderboard') {
    return wrapMain(
      withScreenSuspense(
        <LeaderboardScreen totalEnemies={S.enemies.length} onBack={() => A.setScreen('title')} />,
      ),
    );
  }

  if (S.screen === 'selection') {
    return wrapMain(
      <SelectionScreen
        mode={S.battleMode}
        encData={S.encData}
        onSelect={(payload: SelectionPayload) => {
          void V.sfx.init().catch(() => {});
          if (S.battleMode === 'coop' && isDualSelectionPayload(payload)) {
            A.setStarter(payload.p1);
            A.startGame(payload.p1, 'coop', payload.p2);
            return;
          }
          if (S.battleMode === 'pvp' && isDualSelectionPayload(payload)) {
            A.setStarter(payload.p1);
            A.setPvpStarter2(payload.p2);
            A.startGame(payload.p1, 'pvp', payload.p2);
            return;
          }
          if (isDualSelectionPayload(payload)) {
            return;
          }
          A.setStarter(payload);
          A.startGame(payload, S.battleMode);
        }}
        onBack={() => A.setScreen('title')}
      />,
    );
  }

  if (S.screen === 'pvp_result') {
    return wrapMain(
      withScreenSuspense(
        <PvpResultScreen
          p1Starter={S.starter}
          p2Starter={S.pvpStarter2}
          p1StageIdx={S.pStg}
          p2StageIdx={S.pvpStarter2?.selectedStageIdx || 0}
          winner={S.pvpWinner || 'p1'}
          onRematch={() => S.starter && A.startGame(S.starter, 'pvp')}
          onHome={() => A.setScreen('title')}
        />,
      ),
    );
  }

  if (S.screen === 'evolve') {
    return wrapMain(
      withScreenSuspense(
        <EvolveScreen starter={S.starter} stageIdx={S.pStg} onContinue={A.continueAfterEvolve} />,
      ),
    );
  }

  if (S.screen === 'gameover') {
    return wrapMain(
      withScreenSuspense(
        <GameOverScreen
          defeated={S.defeated}
          totalEnemies={S.enemies.length}
          tC={S.tC}
          tW={S.tW}
          pLvl={S.pLvl}
          pStg={S.pStg}
          timedMode={S.timedMode}
          maxStreak={S.maxStreak}
          starter={S.starter}
          mLvls={S.mLvls}
          getPow={V.getPow}
          dailyChallengeFeedback={S.dailyChallengeFeedback}
          towerChallengeFeedback={S.towerChallengeFeedback}
          onRestart={() => S.starter && A.startGame()}
          onLeaderboard={() => A.setScreen('leaderboard')}
          onHome={() => A.setScreen('title')}
        />,
      ),
    );
  }

  return wrapMain(screenLoadingFallback);
}
