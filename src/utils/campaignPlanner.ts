import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import type { StageWave } from '../data/stageConfigs.ts';
import type { EnemyVm } from '../types/battle';

export type CampaignBranch = 'left' | 'right';
export type CampaignTier = 'normal' | 'elite' | 'boss';
export type CampaignEventTag = 'healing_spring' | 'focus_surge' | 'hazard_ambush';

export type CampaignNodePlan = {
  roundIndex: number;
  totalNodes: number;
  branch: CampaignBranch;
  tier: CampaignTier;
  eventTag: CampaignEventTag | null;
  wave: StageWave;
  pathKey: string;
};

export type CampaignRunPlan = {
  nodes: CampaignNodePlan[];
  pathKey: string;
};

type PickIndex = (length: number) => number;

type CampaignWaveChoice = {
  left?: StageWave;
  right?: StageWave;
};

type ScalePair = {
  hp: number;
  atk: number;
};

type CampaignRosterEnemy = EnemyVm & {
  hp?: number;
  atk?: number;
};

const DEFAULT_EVENT_POOL: CampaignEventTag[] = ['healing_spring', 'focus_surge', 'hazard_ambush'];

function clampPositive(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function normalizePick(pickIndex: PickIndex, length: number): number {
  if (length <= 1) return 0;
  const raw = Number(pickIndex(length));
  if (!Number.isFinite(raw)) return 0;
  return Math.min(length - 1, Math.max(0, Math.trunc(raw)));
}

function normalizeWave(raw: unknown, fallback: StageWave): StageWave {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const wave = raw as StageWave;
  const monsterId = typeof wave.monsterId === 'string' && wave.monsterId.length > 0
    ? wave.monsterId
    : fallback.monsterId;
  return {
    monsterId,
    ...(typeof wave.slimeType === 'string' ? { slimeType: wave.slimeType } : {}),
    ...(typeof wave.sceneType === 'string' ? { sceneType: wave.sceneType } : {}),
  };
}

function resolveWaveChoices(): CampaignWaveChoice[] {
  const rawChoices = BALANCE_CONFIG?.stage?.campaign?.branchChoices;
  if (!Array.isArray(rawChoices) || rawChoices.length <= 0) {
    const fallbackSingleWaves = Array.isArray(BALANCE_CONFIG?.stage?.waves?.single)
      ? BALANCE_CONFIG.stage.waves.single
      : [];
    return fallbackSingleWaves.map((wave) => ({ left: wave, right: wave }));
  }
  return rawChoices as CampaignWaveChoice[];
}

function resolveEliteRounds(totalNodes: number): Set<number> {
  const raw = BALANCE_CONFIG?.stage?.campaign?.eliteRounds;
  const result = new Set<number>();
  if (!Array.isArray(raw)) return result;
  for (const item of raw) {
    const idx = Number(item);
    if (!Number.isFinite(idx)) continue;
    const round = Math.max(0, Math.min(totalNodes - 1, Math.floor(idx)));
    result.add(round);
  }
  return result;
}

function resolveEventRounds(totalNodes: number): Set<number> {
  const raw = BALANCE_CONFIG?.stage?.campaign?.eventRounds;
  const result = new Set<number>();
  if (!Array.isArray(raw)) return result;
  for (const item of raw) {
    const idx = Number(item);
    if (!Number.isFinite(idx)) continue;
    const round = Math.max(0, Math.min(totalNodes - 1, Math.floor(idx)));
    result.add(round);
  }
  return result;
}

function resolveEventPool(): CampaignEventTag[] {
  const raw = BALANCE_CONFIG?.stage?.campaign?.eventPool;
  if (!Array.isArray(raw) || raw.length <= 0) return [...DEFAULT_EVENT_POOL];
  const normalized = raw.filter((item): item is CampaignEventTag =>
    item === 'healing_spring' || item === 'focus_surge' || item === 'hazard_ambush');
  return normalized.length > 0 ? normalized : [...DEFAULT_EVENT_POOL];
}

function resolveTierScale(tier: CampaignTier): ScalePair {
  if (tier === 'elite') {
    const elite = BALANCE_CONFIG?.stage?.campaign?.tierScale?.elite;
    return {
      hp: clampPositive(elite?.hp, 1.22),
      atk: clampPositive(elite?.atk, 1.18),
    };
  }
  if (tier === 'boss') {
    const boss = BALANCE_CONFIG?.stage?.campaign?.tierScale?.boss;
    return {
      hp: clampPositive(boss?.hp, 1.08),
      atk: clampPositive(boss?.atk, 1.06),
    };
  }
  return { hp: 1, atk: 1 };
}

function resolveEventScale(eventTag: CampaignEventTag | null): ScalePair {
  if (!eventTag) return { hp: 1, atk: 1 };
  const rawScale = BALANCE_CONFIG?.stage?.campaign?.eventScaleByTag?.[eventTag];
  return {
    hp: clampPositive(rawScale?.hp, 1),
    atk: clampPositive(rawScale?.atk, 1),
  };
}

export function buildCampaignRunPlan(pickIndex: PickIndex): CampaignRunPlan {
  const choices = resolveWaveChoices();
  const totalNodes = Math.max(1, choices.length);
  const eliteRounds = resolveEliteRounds(totalNodes);
  const eventRounds = resolveEventRounds(totalNodes);
  const eventPool = resolveEventPool();

  const nodes: CampaignNodePlan[] = [];
  const pathParts: string[] = [];

  for (let roundIndex = 0; roundIndex < totalNodes; roundIndex += 1) {
    const choice = choices[roundIndex] || {};
    const fallbackWave = normalizeWave(choice.left || choice.right || { monsterId: 'slime' }, { monsterId: 'slime' });
    const canBranch = roundIndex < totalNodes - 1 && choice.left && choice.right;
    const branch: CampaignBranch = canBranch && normalizePick(pickIndex, 2) === 1 ? 'right' : 'left';
    const wave = normalizeWave(choice[branch] || choice.left || choice.right, fallbackWave);
    const tier: CampaignTier = roundIndex === totalNodes - 1
      ? 'boss'
      : (eliteRounds.has(roundIndex) ? 'elite' : 'normal');
    const eventTag: CampaignEventTag | null = eventRounds.has(roundIndex)
      ? eventPool[normalizePick(pickIndex, eventPool.length)] || eventPool[0] || null
      : null;

    if (roundIndex < totalNodes - 1) pathParts.push(branch === 'left' ? 'L' : 'R');

    nodes.push({
      roundIndex,
      totalNodes,
      branch,
      tier,
      eventTag,
      wave,
      pathKey: '',
    });
  }

  const pathKey = pathParts.join('');
  return {
    nodes: nodes.map((node) => ({ ...node, pathKey })),
    pathKey,
  };
}

export function applyCampaignPlanToRoster(
  roster: CampaignRosterEnemy[],
  plan: CampaignRunPlan | null,
): CampaignRosterEnemy[] {
  if (!Array.isArray(roster) || roster.length <= 0) return [];
  if (!plan || !Array.isArray(plan.nodes) || plan.nodes.length <= 0) return [...roster];

  return roster.map((enemy, index) => {
    const node = plan.nodes[index];
    if (!enemy || !node) return enemy;

    const tierScale = resolveTierScale(node.tier);
    const eventScale = resolveEventScale(node.eventTag);
    const hpScale = tierScale.hp * eventScale.hp;
    const atkScale = tierScale.atk * eventScale.atk;

    const baseMaxHp = Math.max(1, Number(enemy.maxHp || enemy.hp || 1));
    const baseAtk = Math.max(1, Number(enemy.atk || 1));
    const tunedMaxHp = Math.max(1, Math.round(baseMaxHp * hpScale));
    const tunedAtk = Math.max(1, Math.round(baseAtk * atkScale));

    return {
      ...enemy,
      maxHp: tunedMaxHp,
      hp: tunedMaxHp,
      atk: tunedAtk,
      campaignNodeIndex: node.roundIndex + 1,
      campaignNodeTotal: node.totalNodes,
      campaignTier: node.tier,
      campaignBranch: node.branch,
      campaignEventTag: node.eventTag,
      campaignPathKey: node.pathKey,
    };
  });
}

