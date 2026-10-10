/**
 * Persistent world-map progress: which regions the player has reached and won in,
 * and which expeditions are cleared. Expeditions unlock in order.
 */
import { EXPEDITIONS, REGION_IDS, type ExpeditionId, type RegionId } from '../data/worldMap.ts';
import { readJson, writeJson } from './storage.ts';
import { SECRET_IDS, type SecretId } from '../data/worldSecrets.ts';

const STORAGE_KEY = 'mathMonsterBattle_world_v1';

export type RegionRecord = { visits: number; wins: number };
export type ExpeditionRecord = { clears: number; bestFloor: number };

export type WorldProgress = {
  version: 1;
  regions: Partial<Record<RegionId, RegionRecord>>;
  expeditions: Partial<Record<ExpeditionId, ExpeditionRecord>>;
  /** Hidden spots found on the map (added later; older saves have none). */
  secrets: SecretId[];
};

export function createWorldProgress(): WorldProgress {
  return { version: 1, regions: {}, expeditions: {}, secrets: [] };
}

function count(value: unknown, max = 1_000_000): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeWorldProgress(raw: unknown): WorldProgress {
  const progress = createWorldProgress();
  if (!isRecord(raw) || raw.version !== 1) return progress;
  if (isRecord(raw.regions)) {
    for (const id of REGION_IDS) {
      const record = raw.regions[id];
      if (isRecord(record)) progress.regions[id] = { visits: count(record.visits), wins: count(record.wins) };
    }
  }
  if (isRecord(raw.expeditions)) {
    for (const { id } of EXPEDITIONS) {
      const record = raw.expeditions[id];
      if (isRecord(record)) progress.expeditions[id] = { clears: count(record.clears), bestFloor: count(record.bestFloor, 10) };
    }
  }
  if (Array.isArray(raw.secrets)) {
    progress.secrets = SECRET_IDS.filter((id) => (raw.secrets as unknown[]).includes(id));
  }
  return progress;
}

export function loadWorldProgress(): WorldProgress {
  return normalizeWorldProgress(readJson<unknown>(STORAGE_KEY, null));
}

export function saveWorldProgress(progress: WorldProgress): boolean {
  return writeJson(STORAGE_KEY, progress);
}

function updateRegion(progress: WorldProgress, region: RegionId, change: Partial<RegionRecord>): WorldProgress {
  const current = progress.regions[region] ?? { visits: 0, wins: 0 };
  return {
    ...progress,
    regions: {
      ...progress.regions,
      [region]: { visits: current.visits + (change.visits ?? 0), wins: current.wins + (change.wins ?? 0) },
    },
  };
}

export function recordRegionVisit(progress: WorldProgress, region: RegionId): WorldProgress {
  return updateRegion(progress, region, { visits: 1 });
}

export function recordRegionWin(progress: WorldProgress, region: RegionId): WorldProgress {
  return updateRegion(progress, region, { wins: 1 });
}

/** floor is 1-based (1 = start, 10 = boss). */
export function recordExpeditionFloor(progress: WorldProgress, id: ExpeditionId, floor: number): WorldProgress {
  const current = progress.expeditions[id] ?? { clears: 0, bestFloor: 0 };
  if (floor <= current.bestFloor) return progress;
  return { ...progress, expeditions: { ...progress.expeditions, [id]: { ...current, bestFloor: Math.min(10, floor) } } };
}

export function recordExpeditionClear(progress: WorldProgress, id: ExpeditionId): WorldProgress {
  const current = progress.expeditions[id] ?? { clears: 0, bestFloor: 0 };
  return { ...progress, expeditions: { ...progress.expeditions, [id]: { clears: current.clears + 1, bestFloor: 10 } } };
}

export function isExpeditionUnlocked(progress: WorldProgress, id: ExpeditionId): boolean {
  const expedition = EXPEDITIONS.find((item) => item.id === id);
  if (!expedition) return false;
  if (expedition.order <= 1) return true;
  const previous = EXPEDITIONS.find((item) => item.order === expedition.order - 1);
  return Boolean(previous && (progress.expeditions[previous.id]?.clears ?? 0) > 0);
}

export function isRegionDiscovered(progress: WorldProgress, region: RegionId): boolean {
  return (progress.regions[region]?.visits ?? 0) > 0;
}

export function recordSecretFound(progress: WorldProgress, id: SecretId): WorldProgress {
  if (progress.secrets.includes(id) || !SECRET_IDS.includes(id)) return progress;
  return { ...progress, secrets: [...progress.secrets, id] };
}

export function isSecretFound(progress: WorldProgress, id: SecretId): boolean {
  return progress.secrets.includes(id);
}
