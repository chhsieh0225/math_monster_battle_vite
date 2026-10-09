/**
 * Expedition planning: a 10-floor journey across the world map.
 * Floor 1 is the grassland start, floors 2-9 offer two routes, floor 10 is the boss.
 * Both routes are generated up front so the player can see what each choice means.
 */
import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import { getDualEff, getEff } from '../data/typeEffectiveness.ts';
import {
  EXPEDITION_FLOORS,
  START_REGION,
  WORLD_REGIONS,
  type Expedition,
  type ExpeditionId,
  type RegionId,
} from '../data/worldMap.ts';
import type { StageWave } from '../data/stageConfigs.ts';
import type { EnemyVm } from '../types/battle';
import { buildRoster, sceneHasWildMonster } from './rosterBuilder.ts';

export type RouteEvent = 'healing_spring' | 'focus_surge' | 'hazard_ambush';
export type RouteTier = 'normal' | 'elite' | 'boss';

export type RouteKind = 'battle' | 'spring';

export type RouteOption = {
  region: RegionId;
  tier: RouteTier;
  event: RouteEvent | null;
  /** 'spring' is the review spring: review questions instead of a battle. Absent means battle. */
  kind?: RouteKind;
};

/** Floor (0-based) where one route is the review spring. */
export const SPRING_FLOOR = 4;

export type ExpeditionFloor = {
  floor: number;
  options: RouteOption[];
};

export type ExpeditionPlan = {
  expeditionId: ExpeditionId;
  floors: ExpeditionFloor[];
};

type PickIndex = (length: number) => number;

const CAMPAIGN = BALANCE_CONFIG.stage.campaign;
const ELITE_FLOORS = new Set<number>(CAMPAIGN.eliteRounds);
const EVENT_FLOORS = new Set<number>(CAMPAIGN.eventRounds);
const EVENT_POOL = CAMPAIGN.eventPool as readonly RouteEvent[];

function pick<T>(items: readonly T[], pickIndex: PickIndex): T {
  const raw = Math.trunc(Number(pickIndex(items.length)));
  return items[Number.isFinite(raw) ? Math.max(0, Math.min(items.length - 1, raw)) : 0];
}

function stagePool(expedition: Expedition, floor: number): RegionId[] {
  if (floor <= 3) return expedition.stages.early;
  if (floor <= 6) return expedition.stages.mid;
  return expedition.stages.late;
}

/** Two different regions, preferring ones not offered on the previous floor. */
function pickTwoRegions(pool: readonly RegionId[], previous: readonly RegionId[], pickIndex: PickIndex): [RegionId, RegionId] {
  const unique = [...new Set(pool)];
  const fresh = unique.filter((region) => !previous.includes(region));
  const firstPool = fresh.length > 0 ? fresh : unique;
  const first = pick(firstPool, pickIndex);
  const rest = unique.filter((region) => region !== first);
  const secondPool = rest.filter((region) => !previous.includes(region));
  const second = rest.length === 0 ? first : pick(secondPool.length > 0 ? secondPool : rest, pickIndex);
  return [first, second];
}

/** Drop regions whose only wild monster is the player's own starter (when enough remain). */
function playablePool(pool: readonly RegionId[], excludedStarterIds: readonly string[]): RegionId[] {
  const playable = pool.filter((region) => sceneHasWildMonster(WORLD_REGIONS[region].scene, excludedStarterIds));
  return playable.length >= 2 ? playable : [...pool];
}

export function buildExpeditionPlan(
  expedition: Expedition,
  pickIndex: PickIndex,
  excludedStarterIds: readonly string[] = [],
): ExpeditionPlan {
  const floors: ExpeditionFloor[] = [];
  let previous: RegionId[] = [START_REGION];
  for (let floor = 0; floor < EXPEDITION_FLOORS; floor += 1) {
    if (floor === 0) {
      floors.push({ floor, options: [{ region: START_REGION, tier: 'normal', event: null }] });
      continue;
    }
    if (floor === EXPEDITION_FLOORS - 1) {
      floors.push({ floor, options: [{ region: expedition.region, tier: 'boss', event: null }] });
      continue;
    }
    const [a, b] = pickTwoRegions(playablePool(stagePool(expedition, floor), excludedStarterIds), previous, pickIndex);
    const options: RouteOption[] = [
      { region: a, tier: 'normal', event: null },
      { region: b, tier: 'normal', event: null },
    ];
    // Risk vs reward: one route is an elite, the other stays normal.
    if (ELITE_FLOORS.has(floor)) options[pick([0, 1], pickIndex)].tier = 'elite';
    // One route carries an event; the other is a plain battle.
    if (EVENT_FLOORS.has(floor)) options[pick([0, 1], pickIndex)].event = pick(EVENT_POOL, pickIndex);
    // Midway, one route is the review spring: rest and revisit earlier mistakes.
    if (floor === SPRING_FLOOR) options[pick([0, 1], pickIndex)].kind = 'spring';
    floors.push({ floor, options });
    previous = [a, b];
  }
  return { expeditionId: expedition.id, floors };
}

function waveFor(option: RouteOption, floor: number, expedition: Expedition): StageWave {
  if (floor === 0) return { monsterId: 'slime', slimeType: 'grass', sceneType: 'grass' };
  if (option.tier === 'boss') return { monsterId: expedition.bossId, sceneType: WORLD_REGIONS[expedition.region].scene };
  return { sceneType: WORLD_REGIONS[option.region].scene };
}

function tierScale(tier: RouteTier): { hp: number; atk: number } {
  if (tier === 'elite') return CAMPAIGN.tierScale.elite;
  if (tier === 'boss') return CAMPAIGN.tierScale.boss;
  return { hp: 1, atk: 1 };
}

function tuneEnemy(enemy: EnemyVm, option: RouteOption, floor: number, lane: number, expedition: Expedition): EnemyVm {
  const scale = tierScale(option.tier);
  const maxHp = Math.max(1, Math.round((enemy.maxHp || 1) * scale.hp * expedition.power));
  const atk = Math.max(1, Math.round((enemy.atk || 1) * scale.atk * expedition.power));
  return {
    ...enemy,
    maxHp,
    hp: maxHp,
    atk,
    campaignNodeIndex: floor + 1,
    campaignNodeTotal: EXPEDITION_FLOORS,
    campaignTier: option.tier,
    campaignBranch: lane === 0 ? 'left' : 'right',
    campaignEventTag: option.event,
    campaignPathKey: '',
    campaignRegion: option.region,
  };
}

/**
 * lanes[lane][floor] is the enemy behind route `lane` on that floor. Single-route
 * floors (start and boss) share one enemy so both lanes agree.
 */
export function buildExpeditionLanes(
  plan: ExpeditionPlan,
  expedition: Expedition,
  pickIndex: PickIndex,
  excludedStarterIds: readonly string[] = [],
): EnemyVm[][] {
  const lanes = [0, 1].map((lane) => {
    const waves = plan.floors.map((floor) => waveFor(floor.options[lane] ?? floor.options[0], floor.floor, expedition));
    const roster = buildRoster(pickIndex, 'single', {
      singleWaves: waves,
      disableRandomSwap: true,
      enableStarterEncounters: false,
      excludedStarterIds,
      fixedBossIds: true,
    }) as EnemyVm[];
    return roster.map((enemy, floor) => {
      const option = plan.floors[floor].options[lane] ?? plan.floors[floor].options[0];
      return tuneEnemy(enemy, option, floor, lane, expedition);
    });
  });
  plan.floors.forEach((floor, index) => {
    if (floor.options.length < 2) lanes[1][index] = lanes[0][index];
  });
  return lanes;
}

export type Matchup = 'advantage' | 'disadvantage' | 'neutral';

/** How the player's element fares against an enemy: attack multiplier, the enemy's, and a verdict. */
export function routeMatchup(starterType: string | undefined, enemy: Pick<EnemyVm, 'mType' | 'mType2'> | null | undefined) {
  const attack = enemy ? getDualEff(starterType, enemy.mType, enemy.mType2) : 1;
  const defense = enemy
    ? Math.max(getEff(enemy.mType, starterType), enemy.mType2 ? getEff(enemy.mType2, starterType) : 0)
    : 1;
  const score = (attack > 1 ? 1 : attack < 1 ? -1 : 0) + (defense > 1 ? -1 : defense < 1 ? 1 : 0);
  const verdict: Matchup = score > 0 ? 'advantage' : score < 0 ? 'disadvantage' : 'neutral';
  return { attack, defense, verdict };
}
