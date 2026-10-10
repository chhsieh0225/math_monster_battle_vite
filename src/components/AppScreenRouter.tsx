import { Component, Suspense, lazy, useRef } from 'react';
import type { ComponentProps, ErrorInfo, ReactNode } from 'react';

import TitleScreen from './screens/TitleScreen';
import SelectionScreen from './screens/SelectionScreen';
import { hasSave as checkHasSave } from '../utils/savegame.ts';
import { getLevelMaxHp } from '../utils/playerHp.ts';
import { expeditionBattleCount } from '../utils/expeditionRun.ts';
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
const HowToPlayScreen = lazy(() => import('./screens/HowToPlayScreen'));
const WorldMapScreen = lazy(() => import('./screens/WorldMapScreen'));
const PlacementScreen = lazy(() => import('./screens/PlacementScreen'));
const ReviewSpringScreen = lazy(() => import('./screens/ReviewSpringScreen'));

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

class ChunkErrorBoundary extends Component<
  { children?: ReactNode; t: (key: string, fallback: string) => string },
  { hasError: boolean }
> {
  constructor(props: { children?: ReactNode; t: (key: string, fallback: string) => string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ChunkErrorBoundary] Chunk load failed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 12, padding: 24,
          color: 'rgba(255,255,255,0.85)', textAlign: 'center' as const,
        }}>
          <div style={{ fontSize: 36 }}>📡</div>
          <div style={{ fontSize: 16 }}>
            {this.props.t('app.error.chunkLoad', 'Failed to load. Please check your connection.')}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 24px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.15)', color: 'white',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            {this.props.t('app.error.retry', 'Retry')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
  // Where the grade check returns to: first play → monster selection, otherwise where it was opened.
  const placementFromRef = useRef<'first' | 'selection' | 'dashboard'>('first');
  const openPlacement = (from: 'first' | 'selection' | 'dashboard') => {
    placementFromRef.current = from;
    A.setScreen('placement');
  };

  // Check for mid-run save on every render when screen is title (cheap sync read)
  const savedGameExists = S.screen === 'title' ? checkHasSave() : false;
  // First play: a short placement check sets the child's grade before choosing a monster.
  const needsPlacement = S.playerGrade === null;

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
    <ChunkErrorBoundary t={t}>
      <Suspense fallback={screenLoadingFallback}>
        {node}
      </Suspense>
    </ChunkErrorBoundary>
  );

  if (S.screen === 'battle') return null;

  if (S.screen === 'title') {
    return wrapMain(
      <TitleScreen
        onStartNormal={() => {
          A.clearChallengeRun();
          A.setTimedMode(false);
          A.setBattleMode('single');
          if (needsPlacement) openPlacement('first');
          else A.setScreen('selection');
        }}
        onStartTimed={() => {
          A.clearChallengeRun();
          A.setTimedMode(true);
          A.setBattleMode('single');
          if (needsPlacement) openPlacement('first');
          else A.setScreen('selection');
        }}
        onStartCoop={() => {
          A.clearChallengeRun();
          A.setTimedMode(false);
          A.setBattleMode('coop');
          if (needsPlacement) openPlacement('first');
          else A.setScreen('selection');
        }}
        onStartPvp={() => {
          A.clearChallengeRun();
          A.setTimedMode(true);
          A.setBattleMode('pvp');
          A.setScreen('selection');
        }}
        onHowTo={() => A.setScreen('howto')}
        onLeaderboard={() => A.setScreen('leaderboard')}
        onAchievements={() => A.setScreen('achievements')}
        onEncyclopedia={() => A.setScreen('encyclopedia')}
        onDashboard={() => A.setScreen('dashboard')}
        onDailyChallenge={() => A.setScreen('daily_challenge')}
        onSettings={() => onOpenSettings('title')}
        hasSavedGame={savedGameExists}
        onContinue={() => {
          void V.sfx.init().catch(() => {});
          A.resumeFromSave();
        }}
        lowPerfMode={mobile.lowPerfMode}
      />,
    );
  }

  if (S.screen === 'howto') {
    return wrapMain(
      withScreenSuspense(
        <HowToPlayScreen onBack={() => A.setScreen('title')} />,
      ),
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
        <DashboardScreen
          onBack={() => A.setScreen('title')}
          playerGrade={S.playerGrade}
          onRetakePlacement={() => openPlacement('dashboard')}
        />,
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
        playerGrade={S.battleMode === 'pvp' ? null : S.playerGrade}
        onChangeGrade={S.battleMode === 'pvp' ? undefined : () => openPlacement('selection')}
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
          if (S.worldMapEnabled) {
            // Normal / timed single play: pick an expedition on the world map first.
            A.openWorldMap();
            return;
          }
          A.startGame(payload, S.battleMode);
        }}
        onBack={() => A.setScreen('title')}
      />,
    );
  }

  if (S.screen === 'placement') {
    const from = placementFromRef.current;
    return wrapMain(
      withScreenSuspense(
        <PlacementScreen
          currentGrade={S.playerGrade}
          onDone={(profile) => {
            A.setPlayerProfile(profile);
            A.setScreen(from === 'dashboard' ? 'dashboard' : 'selection');
          }}
          onCancel={() => A.setScreen(from === 'first' ? 'title' : from)}
        />,
      ),
    );
  }

  if (S.screen === 'spring') {
    return wrapMain(
      withScreenSuspense(
        <ReviewSpringScreen
          starter={S.starter}
          grade={S.playerGrade}
          persistentLearning={S.battleMode === 'single' && !S.timedMode}
          pHp={S.pHp}
          maxHp={getLevelMaxHp(S.pLvl, S.pStg)}
          pLvl={S.pLvl}
          onFinish={A.finishSpring}
        />,
      ),
    );
  }

  if (S.screen === 'worldmap') {
    return wrapMain(
      withScreenSuspense(
        <WorldMapScreen
          progress={S.worldProgress}
          run={S.expeditionRun}
          starter={S.starter}
          stageIdx={S.pStg}
          pHp={S.pHp}
          maxHp={getLevelMaxHp(S.pLvl, S.pStg)}
          pLvl={S.pLvl}
          onStartExpedition={(id) => {
            void V.sfx.init().catch(() => {});
            A.startExpedition(id);
          }}
          onChooseRoute={A.chooseRoute}
          onBack={() => A.setScreen('selection')}
          onPause={A.pauseExpedition}
          grade={S.playerGrade}
          onDiscoverSecret={A.discoverSecret}
        />,
      ),
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
          winner={S.pvpState.winner || 'p1'}
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
          totalEnemies={S.expeditionRun ? expeditionBattleCount(S.expeditionRun) : S.enemies.length}
          tC={S.tC}
          tW={S.tW}
          wrongQuestions={S.wrongQuestions}
          pLvl={S.pLvl}
          pStg={S.pStg}
          timedMode={S.timedMode}
          maxStreak={S.maxStreak}
          starter={S.starter}
          mLvls={S.mLvls}
          getPow={V.getPow}
          dailyChallengeFeedback={S.dailyChallengeFeedback}
          towerChallengeFeedback={S.towerChallengeFeedback}
          onRestart={() => {
            if (!S.starter) return;
            if (S.worldMapEnabled) A.openWorldMap();
            else A.startGame();
          }}
          onLeaderboard={() => A.setScreen('leaderboard')}
          onHome={() => A.setScreen('title')}
        />,
      ),
    );
  }

  return wrapMain(screenLoadingFallback);
}
