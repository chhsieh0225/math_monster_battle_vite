import { runPvpStartFlow, runStandardStartFlow } from './startGameFlow.ts';

type RunPvpStartFlowArgs = Parameters<typeof runPvpStartFlow>[0];
type RunStandardStartFlowArgs = Parameters<typeof runStandardStartFlow>[0];
type StarterLite = RunPvpStartFlowArgs['leader'];

type RunStartGameControllerArgs = {
  starterOverride?: StarterLite;
  modeOverride?: string | null;
  allyOverride?: StarterLite;
  sr: {
    current: {
      battleMode?: string;
      starter?: StarterLite;
      pvpStarter2?: StarterLite;
      timedMode?: boolean;
    };
  };
  battleMode: string;
  pvpStarter2: StarterLite;
  locale: string;
  localizeStarter: (starter: StarterLite, locale: string) => StarterLite;
  pickPartnerStarter: (mainStarter: StarterLite) => StarterLite;
  getStarterStageIdx: (starter: StarterLite) => number;
  getStageMaxHp: (stageIdx: number, levelOverride?: number) => number;
  pvpStartDeps: Omit<RunPvpStartFlowArgs, 'leader' | 'rival' | 'leaderMaxHp' | 'leaderStageIdx'>;
  standardStartDeps: Omit<
    RunStandardStartFlowArgs,
    'mode' | 'leader' | 'partner' | 'leaderMaxHp' | 'leaderStageIdx' | 'currentTimedMode'
  >;
};

/**
 * runStartGameController
 *
 * Centralizes game-start branch selection (PvP vs non-PvP) and
 * derived starter/partner values.
 */
export function runStartGameController({
  starterOverride,
  modeOverride = null,
  allyOverride = null,
  sr,
  battleMode,
  pvpStarter2,
  locale,
  localizeStarter,
  pickPartnerStarter,
  getStarterStageIdx,
  getStageMaxHp,
  pvpStartDeps,
  standardStartDeps,
}: RunStartGameControllerArgs): void {
  const mode = modeOverride || sr.current.battleMode || battleMode;
  const leader = localizeStarter(starterOverride || sr.current.starter || null, locale);
  const rival = localizeStarter(
    allyOverride
      || sr.current.pvpStarter2
      || pvpStarter2
      || pickPartnerStarter(leader),
    locale,
  );
  const leaderStageIdx = getStarterStageIdx(leader);
  const leaderMaxHp = getStageMaxHp(leaderStageIdx, 1);

  if (mode === 'pvp') {
    runPvpStartFlow({
      ...pvpStartDeps,
      leader,
      rival,
      leaderMaxHp,
      leaderStageIdx,
    });
    return;
  }

  const isCoop = mode === 'coop' || mode === 'double';
  const partner = isCoop
    ? localizeStarter(allyOverride || pickPartnerStarter(leader), locale)
    : null;

  runStandardStartFlow({
    ...standardStartDeps,
    mode,
    leader,
    partner,
    leaderMaxHp,
    leaderStageIdx,
    currentTimedMode: !!sr.current.timedMode,
  });
}
