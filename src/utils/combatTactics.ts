import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import { computeBossPhase } from './turnFlow.ts';

export type FireTactic = 'kindle' | 'breach' | 'detonate' | 'finisher';
const FIRE_TACTICS: readonly FireTactic[] = ['kindle', 'breach', 'detonate', 'finisher'];
const TACTICS = BALANCE_CONFIG.tactics;

function boundedStacks(value: number, max: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
}

/** Preview and resolution share the same landed-hit plan; no RNG or state writes. */
export function planElementTactic(id: string | undefined, mode: string | undefined, index: number,
  tide = 0, charge = 0) {
  if (mode === 'pvp' || (id !== 'water' && id !== 'electric') || !Number.isInteger(index) || index < 0 || index > 3) return null;
  const water = id === 'water';
  const max = water ? TACTICS.water.maxTide : BALANCE_CONFIG.traits.player.staticMaxStacks;
  const before = boundedStacks(water ? tide : charge, max);
  const spent = water ? (index >= 2 ? before : 0) : index === 1 ? Math.min(1, before) : index === 3 ? before : 0;
  const added = water ? (index === 0 ? 1 : index === 1 ? TACTICS.water.surgeStacks : 0)
    : index === 0 ? 1 : index === 2 ? TACTICS.electric.stormStacks : 0;
  const stored = Math.min(max, before - spent + added);
  const discharge = !water && added > 0 && stored >= max;
  const bonusDamage = water ? spent * (index === 2 ? TACTICS.water.tsunamiPerStack : TACTICS.water.vortexPerStack)
    : spent * (index === 1 ? TACTICS.electric.pulseBonus : TACTICS.electric.finisherPerStack);
  return {
    kind: id, max, before, spent, added, next: discharge ? 0 : stored, bonusDamage,
    powerScale: water && index === 1 ? TACTICS.water.surgeDamageScale : 1,
    guaranteedFreeze: water && index === 3 && before === max,
    dischargeDamage: discharge ? BALANCE_CONFIG.traits.player.staticDischargeDamage : 0,
    wardBreak: (water ? index === 2 && before === max : index === 3 && spent >= TACTICS.electric.finisherWardAt) ? 2 : 1,
  };
}

export function getFireTactic(starterId: string | undefined, mode: string | undefined, index: number): FireTactic | null {
  return starterId === 'fire' && mode !== 'pvp' ? FIRE_TACTICS[index] ?? null : null;
}

/** A landed, selected attack consumes an opening; misses and passive support do not. */
export function planFireTactic(tactic: FireTactic | null, burn: number, exposed = false) {
  const stacks = Math.max(0, Math.min(BALANCE_CONFIG.traits.player.burnMaxStacks, Math.floor(burn || 0)));
  const consumesBurn = tactic === 'detonate' || tactic === 'finisher';
  const bonusPerStack = tactic === 'finisher' ? TACTICS.fire.finisherPerStack : TACTICS.fire.detonatePerStack;
  const added = tactic === 'kindle' ? TACTICS.fire.kindleStacks : tactic === 'breach' ? TACTICS.fire.rushStacks : 0;
  return {
    damageScale: exposed ? TACTICS.exposedScale : 1,
    bonusDamage: consumesBurn ? stacks * bonusPerStack : 0,
    nextBurn: consumesBurn ? 0 : Math.min(BALANCE_CONFIG.traits.player.burnMaxStacks, stacks + added),
    nextExposed: tactic === 'breach',
    wardBreak: tactic === 'breach' ? 2 : 1,
    consumedStacks: consumesBurn ? stacks : 0,
  };
}

export function getShadowWardMax(hp: number, maxHp: number): number {
  return computeBossPhase(hp, maxHp) >= 2 ? TACTICS.shadowWard.enragedLayers : TACTICS.shadowWard.layers;
}

export function getShadowWard(enemyId: string | undefined, mode: string | undefined,
  remaining: number | undefined, hp: number, maxHp: number) {
  if (enemyId !== 'boss' || mode === 'pvp' || hp <= 0) return null;
  const max = getShadowWardMax(hp, maxHp);
  // Old between-battle saves reset this field; malformed legacy values start guarded.
  const layers = Number.isFinite(remaining) && remaining! >= 0
    ? Math.min(TACTICS.shadowWard.enragedLayers, Math.floor(remaining!)) : max;
  return {
    layers, max: Math.max(max, layers), open: layers === 0,
    damageScale: layers === 0 ? TACTICS.shadowWard.openingScale : TACTICS.shadowWard.guardedScale,
  };
}

export function hitShadowWard(ward: NonNullable<ReturnType<typeof getShadowWard>>, breakPower = 1) {
  return ward.open ? ward.max : Math.max(0, ward.layers - Math.max(1, Math.floor(breakPower)));
}

/** The lowest-difficulty move remains available against the teaching boss. */
export function getBossSealPool(enemyId: string | undefined): readonly number[] {
  return enemyId === 'boss' ? [1, 2] : BALANCE_CONFIG.traits.boss.sealMovePool;
}
