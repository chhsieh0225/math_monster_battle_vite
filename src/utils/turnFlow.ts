export function computeBossPhase(
  hp: number | null | undefined,
  maxHp: number | null | undefined,
): number {
  if (!maxHp || maxHp <= 0) return 1;
  const safeHp = Number.isFinite(hp) ? Number(hp) : 0;
  const ratio = safeHp / maxHp;
  if (ratio <= 0.3) return 3;
  if (ratio <= 0.6) return 2;
  return 1;
}

type DecideBossTurnEventArgs = {
  isBoss?: boolean;
  bossCharging?: boolean;
  turnCount?: number;
  bossPhase?: number;
  sealedMove?: number;
};

type BossTurnEvent = 'attack' | 'release' | 'start_charge' | 'seal_move';

export function decideBossTurnEvent({
  isBoss = false,
  bossCharging = false,
  turnCount = 0,
  bossPhase = 1,
  sealedMove = -1,
}: DecideBossTurnEventArgs): BossTurnEvent {
  if (!isBoss) return 'attack';
  if (bossCharging) return 'release';
  if (turnCount > 0 && turnCount % 4 === 0) return 'start_charge';
  if (bossPhase >= 2 && sealedMove < 0 && turnCount > 0 && turnCount % 3 === 0) return 'seal_move';
  return 'attack';
}
