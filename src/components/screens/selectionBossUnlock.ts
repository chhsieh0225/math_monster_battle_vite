import type { EncyclopediaData, SelectionMode, StarterId } from '../../types/game';

const PVP_UNLOCK_REQUIRED_BOSS_IDS: ReadonlySet<StarterId> = new Set([
  'boss',
  'boss_hydra',
  'boss_crazy_dragon',
  'boss_sword_god',
]);

export function isPvpBossLockedForSelection(
  mode: SelectionMode,
  starterId: StarterId,
  encData?: EncyclopediaData,
): boolean {
  if (mode !== 'pvp') return false;
  if (!PVP_UNLOCK_REQUIRED_BOSS_IDS.has(starterId)) return false;
  return (encData?.defeated?.[starterId] || 0) < 1;
}
