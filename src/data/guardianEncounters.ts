import type { MonsterType } from '../types/game';

const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';

type GuardianEncounter = {
  background: string;
  habitat: string;
  region: 'light' | 'steel' | 'water';
  skills: readonly { name: string; nameEn: string; type: MonsterType }[];
};

export const GUARDIAN_ENCOUNTERS = {
  limit_knight: {
    background: 'limit-sanctum', habitat: '雲上積分聖壇', region: 'light',
    skills: [
      { name: '微分光刃', nameEn: 'Differential Edge', type: 'light' },
      { name: '積分劍雨', nameEn: 'Integral Swordfall', type: 'light' },
      { name: '極限聖環', nameEn: 'Limit Halo', type: 'light' },
    ],
  },
  topology_knight: {
    background: 'orbital-court', habitat: '環軌機關庭院', region: 'steel',
    skills: [
      { name: '莫比烏斯斬', nameEn: 'Mobius Slash', type: 'steel' },
      { name: '環結束縛', nameEn: 'Knot Bind', type: 'steel' },
      { name: '無限環軌', nameEn: 'Infinite Orbit', type: 'steel' },
    ],
  },
  algebra_knight: {
    background: 'matrix-citadel', habitat: '矩陣光城', region: 'light',
    skills: [
      { name: '向量穿刺', nameEn: 'Vector Pierce', type: 'light' },
      { name: '矩陣封陣', nameEn: 'Matrix Array', type: 'light' },
      { name: '方程裂光', nameEn: 'Equation Rift', type: 'light' },
    ],
  },
  blue_butterfly: {
    background: 'moonfall-vale', habitat: '月瀑藍花谷', region: 'water',
    skills: [
      { name: '藍月翅刃', nameEn: 'Blue Moon Wing', type: 'water' },
      { name: '蝶鱗環舞', nameEn: 'Petalwing Waltz', type: 'water' },
      { name: '月瀑蝶雨', nameEn: 'Moonfall Wings', type: 'water' },
    ],
  },
} as const satisfies Record<string, GuardianEncounter>;

export type GuardianId = keyof typeof GUARDIAN_ENCOUNTERS;

export function getGuardianEncounter(id?: string): GuardianEncounter | undefined {
  return id && Object.hasOwn(GUARDIAN_ENCOUNTERS, id)
    ? GUARDIAN_ENCOUNTERS[id as GuardianId] : undefined;
}

export function getGuardianBackground(id?: string): string | undefined {
  const encounter = getGuardianEncounter(id);
  return encounter ? `${BASE}backgrounds/guardians/${encounter.background}-v1.webp` : undefined;
}

/** Levels unlock a wider repertoire; the battle-owned turn selects it without RNG. */
export function getGuardianSkill(id?: string, level = 1, turn = 0) {
  const encounter = getGuardianEncounter(id);
  if (!encounter) return undefined;
  const safeLevel = Number.isFinite(level) ? Math.max(1, level) : 1;
  const unlocked = safeLevel >= 7 ? 3 : safeLevel >= 4 ? 2 : 1;
  const slot = (Number.isFinite(turn) ? Math.max(0, Math.floor(turn)) : 0) % unlocked;
  return { ...encounter.skills[slot], slot, skillId: `${id}:${slot}` };
}
