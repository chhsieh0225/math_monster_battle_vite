import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import { BOSS_IDS } from '../data/monsterConfigs.ts';

const DEFAULT_BOSS_DAMAGE_SCALE = BALANCE_CONFIG.traits.boss.incomingDamageScale;

function normalizeTargetId(targetId: string | null | undefined): string {
  if (typeof targetId !== 'string') return '';
  return targetId.startsWith('pvp_') ? targetId.slice(4) : targetId;
}

export function isBossTarget(targetId: string | null | undefined): boolean {
  return BOSS_IDS.has(normalizeTargetId(targetId));
}

export function applyBossDamageReduction(
  rawDamage: number,
  targetId: string | null | undefined,
  damageScale = DEFAULT_BOSS_DAMAGE_SCALE,
): number {
  const normalizedDamage = Math.max(0, Math.round(rawDamage));
  if (normalizedDamage <= 0) return 0;
  if (!isBossTarget(targetId)) return normalizedDamage;
  const safeScale = Number.isFinite(damageScale) ? damageScale : DEFAULT_BOSS_DAMAGE_SCALE;
  return Math.max(1, Math.round(normalizedDamage * safeScale));
}
