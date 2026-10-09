import { useCallback, useRef, useState } from 'react';
import type { BattleMode, EnemyVm } from '../../types/battle';
import { localizeEnemyRoster } from '../../utils/contentLocalization.ts';
import { buildRoster } from '../../utils/rosterBuilder';
import {
  applyCampaignPlanToRoster,
  buildCampaignRunPlan,
  resolveCampaignPresetConfig,
} from '../../utils/campaignPlanner.ts';
import type { CampaignPreset } from '../../utils/campaignPlanner.ts';
import { getExpedition, type ExpeditionId } from '../../data/worldMap.ts';
import { buildExpeditionLanes, buildExpeditionPlan } from '../../utils/expeditionPlanner.ts';
import { createExpeditionRun, expeditionRoster, type ExpeditionRun } from '../../utils/expeditionRun.ts';

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
  // World-map expedition: queued by the map screen, consumed by the next single-mode roster build.
  const pendingExpeditionIdRef = useRef<ExpeditionId | null>(null);
  const expeditionRunRef = useRef<ExpeditionRun | null>(null);
  const [expeditionRun, setExpeditionRunState] = useState<ExpeditionRun | null>(null);
  const setExpeditionRun = useCallback((run: ExpeditionRun | null) => {
    expeditionRunRef.current = run;
    setExpeditionRunState(run);
  }, []);
  const queueExpedition = useCallback((id: ExpeditionId | null) => {
    pendingExpeditionIdRef.current = id;
  }, []);
  const [enemies, setEnemies] = useState<EnemyVm[]>(
    () => localizeEnemyRoster(buildRoster(pickIndex, 'single'), locale),
  );
  const [coopActiveSlot, setCoopActiveSlot] = useState<'main' | 'sub'>('main');

  const buildNewRoster = useCallback(
    (mode: BattleMode = 'single', options: BuildRosterOptions = {}): EnemyVm[] => {
      const rosterMode = mode === 'coop' || mode === 'double' ? 'double' : 'single';

      const pendingExpedition = getExpedition(pendingExpeditionIdRef.current);
      pendingExpeditionIdRef.current = null;

      // Double / co-op mode: unchanged path (no campaign planner)
      if (rosterMode === 'double') {
        campaignPlanRef.current = null;
        setExpeditionRun(null);
        return localizeEnemyRoster(
          buildRoster(pickIndex, 'double', {
            enableStarterEncounters: !hasChallengeRun,
            excludedStarterIds: options.excludeStarterIds || [],
          }),
          locale,
        );
      }

      // World-map expedition (normal and timed single play).
      if (pendingExpedition && !hasChallengeRun) {
        campaignPlanRef.current = null;
        const excluded = options.excludeStarterIds || [];
        const plan = buildExpeditionPlan(pendingExpedition, pickIndex, excluded);
        const lanes = buildExpeditionLanes(plan, pendingExpedition, pickIndex, excluded)
          .map((lane) => localizeEnemyRoster(lane, locale));
        const run = createExpeditionRun(plan, lanes);
        setExpeditionRun(run);
        return expeditionRoster(run);
      }
      setExpeditionRun(null);

      // Single mode: always use campaign planner; preset controls branching / events / flags
      const preset: CampaignPreset = hasChallengeRun ? 'timed' : 'normal';
      const presetConfig = resolveCampaignPresetConfig(preset);
      const campaignPlan = buildCampaignRunPlan(pickIndex, preset);
      campaignPlanRef.current = campaignPlan;

      const campaignWaves = campaignPlan.nodes.map((node) => node.wave);
      const roster = buildRoster(pickIndex, 'single', {
        singleWaves: campaignWaves,
        disableRandomSwap: !presetConfig.enableRandomSwap,
        enableStarterEncounters: presetConfig.enableStarterEncounters,
        excludedStarterIds: options.excludeStarterIds || [],
      });

      return localizeEnemyRoster(applyCampaignPlanToRoster(roster, campaignPlan), locale);
    },
    [pickIndex, locale, hasChallengeRun, setExpeditionRun],
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
    expeditionRun,
    expeditionRunRef,
    setExpeditionRun,
    queueExpedition,
  };
}
