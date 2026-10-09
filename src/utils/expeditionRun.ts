/**
 * Expedition run state: the planned floors, both route lanes, and the lane the
 * player picked on each floor reached so far. Pure helpers so the battle hook,
 * the map screen and the save system agree on one model.
 */
import { EXPEDITION_FLOORS, REGION_IDS, getExpedition, type ExpeditionId, type RegionId } from '../data/worldMap.ts';
import type { ExpeditionPlan, RouteEvent, RouteOption } from './expeditionPlanner.ts';
import type { EnemyVm } from '../types/battle';

export type ExpeditionRun = {
  expeditionId: ExpeditionId;
  plan: ExpeditionPlan;
  /** lanes[lane][floor]: the enemy behind each route. */
  lanes: EnemyVm[][];
  /** Lane chosen on each floor reached so far; floor 0 (the grassland) is always lane 0. */
  path: number[];
  /** True while the player stands on the map choosing the next floor. */
  atMap: boolean;
};

export const ROUTE_TUNING = {
  /** Elite routes: tougher enemy, more EXP and one extra drop. */
  eliteXpMult: 1.5,
  /** Healing spring restores this share of max HP before the battle. */
  healingSpringPct: 0.3,
  /** Ambush costs this share of max HP at the start (never knocks the player out). */
  ambushPct: 0.12,
} as const;

export function createExpeditionRun(plan: ExpeditionPlan, lanes: EnemyVm[][]): ExpeditionRun {
  return { expeditionId: plan.expeditionId, plan, lanes, path: [0], atMap: false };
}

/** The run's enemy list in floor order, following the chosen path (lane 0 for floors not reached yet). */
export function expeditionRoster(run: ExpeditionRun): EnemyVm[] {
  return run.plan.floors.map((_, floor) => run.lanes[run.path[floor] ?? 0]?.[floor] ?? run.lanes[0][floor]);
}

/** Index of the floor the player will enter next. */
export function nextExpeditionFloor(run: ExpeditionRun): number {
  return run.path.length;
}

export function chosenOption(run: ExpeditionRun, floor: number): RouteOption | null {
  const options = run.plan.floors[floor]?.options;
  if (!options) return null;
  return options[run.path[floor] ?? 0] ?? options[0] ?? null;
}

export function arriveAtMap(run: ExpeditionRun): ExpeditionRun {
  return run.atMap ? run : { ...run, atMap: true };
}

/** Commit the route for the next floor. Returns null when the lane or floor is invalid. */
export function chooseExpeditionRoute(run: ExpeditionRun, lane: number): ExpeditionRun | null {
  const floor = nextExpeditionFloor(run);
  const options = run.plan.floors[floor]?.options;
  if (!run.atMap || !options || !Number.isInteger(lane) || lane < 0 || lane >= options.length) return null;
  return { ...run, path: [...run.path, lane], atMap: false };
}

export function isSpringOption(option: RouteOption | null | undefined): boolean {
  return option?.kind === 'spring';
}

/** Battles in this run: every floor except a chosen review spring. */
export function expeditionBattleCount(run: ExpeditionRun): number {
  return run.plan.floors.filter((_, floor) => !isSpringOption(chosenOption(run, floor)) || floor >= run.path.length).length;
}

export function isExpeditionEnemy(enemy: Pick<EnemyVm, 'campaignRegion'> | null | undefined): boolean {
  return typeof enemy?.campaignRegion === 'string' && enemy.campaignRegion.length > 0;
}

/** HP change for a route event, given the player's current and max HP. */
export function routeEventHpDelta(event: RouteEvent | null | undefined, hp: number, maxHp: number): number {
  if (event === 'healing_spring') {
    return Math.max(0, Math.min(maxHp - hp, Math.round(maxHp * ROUTE_TUNING.healingSpringPct)));
  }
  if (event === 'hazard_ambush') {
    return -Math.max(0, Math.min(hp - 1, Math.round(maxHp * ROUTE_TUNING.ambushPct)));
  }
  return 0;
}

/** Extra drops earned by beating this enemy on an expedition. */
export function expeditionBonusDrops(enemy: Pick<EnemyVm, 'campaignRegion' | 'campaignTier' | 'campaignEventTag'> | null | undefined): number {
  if (!enemy || !isExpeditionEnemy(enemy)) return 0;
  return (enemy.campaignTier === 'elite' ? 1 : 0) + (enemy.campaignEventTag === 'hazard_ambush' ? 1 : 0);
}

export function expeditionXpMult(enemy: Pick<EnemyVm, 'campaignRegion' | 'campaignTier'> | null | undefined): number {
  return enemy && isExpeditionEnemy(enemy) && enemy.campaignTier === 'elite' ? ROUTE_TUNING.eliteXpMult : 1;
}

// ─── Save support ────────────────────────────────────────────────

export type SerialExpeditionRun<E> = {
  expeditionId: ExpeditionId;
  plan: ExpeditionPlan;
  lanes: E[][];
  path: number[];
  atMap: boolean;
};

const TIERS = new Set(['normal', 'elite', 'boss']);
const KINDS = new Set(['battle', 'spring']);
const EVENTS = new Set(['healing_spring', 'focus_surge', 'hazard_ambush']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRouteOption(value: unknown): value is RouteOption {
  return isRecord(value)
    && REGION_IDS.includes(value.region as RegionId)
    && typeof value.tier === 'string' && TIERS.has(value.tier)
    && (value.event === null || (typeof value.event === 'string' && EVENTS.has(value.event)))
    && (value.kind === undefined || (typeof value.kind === 'string' && KINDS.has(value.kind)));
}

/** Structural check of a saved run; enemies are validated by the caller. */
export function isSerialExpeditionRun(value: unknown): value is SerialExpeditionRun<unknown> {
  if (!isRecord(value) || typeof value.expeditionId !== 'string' || !getExpedition(value.expeditionId)) return false;
  if (typeof value.atMap !== 'boolean' || !Array.isArray(value.path) || !Array.isArray(value.lanes)) return false;
  const plan = value.plan;
  if (!isRecord(plan) || plan.expeditionId !== value.expeditionId || !Array.isArray(plan.floors)) return false;
  if (plan.floors.length !== EXPEDITION_FLOORS || value.lanes.length !== 2) return false;
  const floorsOk = plan.floors.every((floor, index) => isRecord(floor)
    && floor.floor === index
    && Array.isArray(floor.options)
    && floor.options.length >= 1 && floor.options.length <= 2
    && floor.options.every(isRouteOption));
  if (!floorsOk) return false;
  if (!value.lanes.every((lane) => Array.isArray(lane) && lane.length === EXPEDITION_FLOORS)) return false;
  const path = value.path as unknown[];
  if (path.length < 1 || path.length > EXPEDITION_FLOORS) return false;
  return path.every((lane, floor) => Number.isInteger(lane)
    && (lane as number) >= 0
    && (lane as number) < (plan.floors as { options: unknown[] }[])[floor].options.length);
}
