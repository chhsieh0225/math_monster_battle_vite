import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import type { BossTactic } from '../types/battle';

const BOSS_BALANCE = BALANCE_CONFIG.traits.boss;
const BOSS_IDS = new Set<string>(BALANCE_CONFIG.monsters.bossIds);

type BossTacticState = {
  battleMode?: string;
  enemyId?: string;
  bossCharging?: boolean;
};

export function canChooseBossTactic(state: BossTacticState): boolean {
  return state.battleMode !== 'pvp'
    && BOSS_IDS.has(state.enemyId ?? '')
    && state.bossCharging === true;
}

export function getBossTacticProfile(tactic?: BossTactic) {
  return tactic === 'guarded'
    ? { damageScale: BOSS_BALANCE.guardedBreakDamageScale, counterRatio: 0 }
    : { damageScale: 1, counterRatio: BOSS_BALANCE.chargeCounterRatio };
}

export type BossIntent = {
  event: BossTurnEvent | 'frozen';
  charging: boolean;
};

export function getBossIntent(state: BossTacticState & {
  hp: number;
  maxHp: number;
  bossTurn: number;
  sealedMove?: number | null;
  frozen?: boolean;
}): BossIntent | null {
  if (state.battleMode === 'pvp' || !BOSS_IDS.has(state.enemyId ?? '') || state.hp <= 0) return null;
  return {
    charging: state.bossCharging === true,
    event: state.frozen ? 'frozen' : decideBossTurnEvent({
      isBoss: true,
      bossCharging: state.bossCharging,
      turnCount: state.bossTurn + 1,
      bossPhase: computeBossPhase(state.hp, state.maxHp),
      sealedMove: state.sealedMove ?? -1,
      enemyId: state.enemyId,
    }),
  };
}

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
  enemyId?: string;
};

type BossTurnEvent = 'attack' | 'release' | 'start_charge' | 'seal_move';

export function decideBossTurnEvent({
  isBoss = false,
  bossCharging = false,
  turnCount = 0,
  bossPhase = 1,
  sealedMove = -1,
  enemyId = '',
}: DecideBossTurnEventArgs): BossTurnEvent {
  if (!isBoss) return 'attack';
  if (bossCharging) return 'release';
  const chargeInterval = enemyId === 'boss_sword_god'
    ? BOSS_BALANCE.swordGodChargeEveryTurns
    : BOSS_BALANCE.chargeEveryTurns;
  if (turnCount > 0 && turnCount % chargeInterval === 0) return 'start_charge';
  if (
    bossPhase >= BOSS_BALANCE.sealStartsAtPhase
    && sealedMove < 0
    && turnCount > 0
    && turnCount % BOSS_BALANCE.sealEveryTurns === 0
  ) return 'seal_move';
  return 'attack';
}
