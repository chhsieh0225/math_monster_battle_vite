export function computeBossPhase(hp, maxHp) {
  if (!maxHp || maxHp <= 0) return 1;
  const ratio = hp / maxHp;
  if (ratio <= 0.3) return 3;
  if (ratio <= 0.6) return 2;
  return 1;
}

export function decideBossTurnEvent({
  isBoss,
  bossCharging,
  turnCount,
  bossPhase,
  sealedMove,
}) {
  if (!isBoss) return "attack";
  if (bossCharging) return "release";
  if (turnCount > 0 && turnCount % 4 === 0) return "start_charge";
  if (bossPhase >= 2 && sealedMove < 0 && turnCount > 0 && turnCount % 3 === 0) return "seal_move";
  return "attack";
}
