/**
 * View model for the world map screen: expedition cards, the traveled path and
 * the routes on offer. Pure so the screen stays a thin renderer.
 */
import { EXPEDITIONS, START_REGION, type ExpeditionId, type RegionId } from '../../data/worldMap.ts';
import { routeMatchup, type RouteOption } from '../../utils/expeditionPlanner.ts';
import { chosenOption, nextExpeditionFloor, type ExpeditionRun } from '../../utils/expeditionRun.ts';
import { isExpeditionUnlocked, type WorldProgress } from '../../utils/worldProgress.ts';
import type { EnemyVm } from '../../types/battle';

export type ExpeditionCardVm = {
  id: ExpeditionId;
  order: number;
  bossId: string;
  region: RegionId;
  unlocked: boolean;
  clears: number;
  bestFloor: number;
  /** Boss to beat first when locked. */
  requiresBossId: string | null;
};

export function buildExpeditionCards(progress: WorldProgress): ExpeditionCardVm[] {
  return [...EXPEDITIONS]
    .sort((a, b) => a.order - b.order)
    .map((expedition) => {
      const record = progress.expeditions[expedition.id];
      const previous = EXPEDITIONS.find((item) => item.order === expedition.order - 1) ?? null;
      const unlocked = isExpeditionUnlocked(progress, expedition.id);
      return {
        id: expedition.id,
        order: expedition.order,
        bossId: expedition.bossId,
        region: expedition.region,
        unlocked,
        clears: record?.clears ?? 0,
        bestFloor: record?.bestFloor ?? 0,
        requiresBossId: unlocked ? null : previous?.bossId ?? null,
      };
    });
}

/** The newest unlocked expedition not cleared yet, or the last unlocked one. */
export function defaultExpeditionId(progress: WorldProgress): ExpeditionId {
  const cards = buildExpeditionCards(progress).filter((card) => card.unlocked);
  return (cards.find((card) => card.clears === 0) ?? cards.at(-1) ?? buildExpeditionCards(progress)[0]).id;
}

/** Regions walked so far, floor by floor (the first is always the grassland). */
export function traveledRegions(run: ExpeditionRun | null): RegionId[] {
  if (!run) return [START_REGION];
  return run.path.map((_, floor) => chosenOption(run, floor)?.region ?? START_REGION);
}

export type RouteChoiceVm = {
  lane: number;
  option: RouteOption;
  enemy: EnemyVm | null;
  matchup: ReturnType<typeof routeMatchup>;
};

/** The routes offered for the next floor while the player stands on the map. */
export function routeChoices(run: ExpeditionRun | null, starterType: string | undefined): RouteChoiceVm[] {
  if (!run?.atMap) return [];
  const floor = nextExpeditionFloor(run);
  const options = run.plan.floors[floor]?.options ?? [];
  return options.map((option, lane) => {
    const enemy = run.lanes[lane]?.[floor] ?? run.lanes[0]?.[floor] ?? null;
    return { lane, option, enemy, matchup: routeMatchup(starterType, enemy) };
  });
}

/** Multiplier text without float noise (1.5, 0.6, 1.8 …). */
export function formatMultiplier(value: number): string {
  return String(Math.round(value * 100) / 100);
}
