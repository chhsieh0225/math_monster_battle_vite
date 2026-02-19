import { useCallback, useRef, useState } from 'react';
import type { BattleMode, EnemyVm } from '../../types/battle';
import { localizeEnemyRoster } from '../../utils/contentLocalization.ts';
import { buildRoster } from '../../utils/rosterBuilder';
import { applyCampaignPlanToRoster, buildCampaignRunPlan } from '../../utils/campaignPlanner.ts';

type PickIndex = (length: number) => number;

type BuildRosterOptions = {
  excludeStarterIds?: readonly string[];
};

type UseBattleRosterStateArgs = {
  pickIndex: PickIndex;
  locale: string;
  hasChallengeRun: boolean;
};

type CampaignNodeMeta = {
  roundIndex: number;
  totalNodes: number;
  branch: 'left' | 'right';
  tier: 'normal' | 'elite' | 'boss';
  eventTag: 'healing_spring' | 'focus_surge' | 'hazard_ambush' | null;
};

export function useBattleRosterState({
  pickIndex,
  locale,
  hasChallengeRun,
}: UseBattleRosterStateArgs) {
  const campaignPlanRef = useRef<ReturnType<typeof buildCampaignRunPlan> | null>(null);
  const [enemies, setEnemies] = useState<EnemyVm[]>(
    () => localizeEnemyRoster(buildRoster(pickIndex, 'single'), locale),
  );
  const [coopActiveSlot, setCoopActiveSlot] = useState<'main' | 'sub'>('main');

  const buildNewRoster = useCallback(
    (mode: BattleMode = 'single', options: BuildRosterOptions = {}): EnemyVm[] => {
      const rosterMode = mode === 'coop' || mode === 'double' ? 'double' : 'single';
      const starterRosterOptions = {
        enableStarterEncounters: !hasChallengeRun,
        excludedStarterIds: options.excludeStarterIds || [],
      };
      if (rosterMode === 'single' && !hasChallengeRun) {
        const campaignPlan = buildCampaignRunPlan(pickIndex);
        campaignPlanRef.current = campaignPlan;
        const campaignWaves = campaignPlan.nodes.map((node) => node.wave);
        const roster = buildRoster(pickIndex, 'single', {
          ...starterRosterOptions,
          singleWaves: campaignWaves,
          disableRandomSwap: true,
        });
        return localizeEnemyRoster(applyCampaignPlanToRoster(roster, campaignPlan), locale);
      }
      campaignPlanRef.current = null;
      return localizeEnemyRoster(
        buildRoster(pickIndex, rosterMode, starterRosterOptions),
        locale,
      );
    },
    [pickIndex, locale, hasChallengeRun],
  );

  const getCampaignNodeMeta = useCallback((roundIndex: number): CampaignNodeMeta | null => {
    const node = campaignPlanRef.current?.nodes?.[roundIndex];
    if (!node) return null;
    return {
      roundIndex: node.roundIndex,
      totalNodes: node.totalNodes,
      branch: node.branch,
      tier: node.tier,
      eventTag: node.eventTag,
    };
  }, []);

  return {
    buildNewRoster,
    enemies,
    setEnemies,
    coopActiveSlot,
    setCoopActiveSlot,
    getCampaignNodeMeta,
  };
}
