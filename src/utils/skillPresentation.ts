import { MAX_MOVE_LVL } from '../data/constants.ts';
import { BOSS_IDS } from '../data/monsterConfigs.ts';
import type { AttackEffectVm } from '../types/battle.ts';

export function getSkillMastery(level = 1) {
  const lvl = Number.isFinite(level) ? Math.max(1, Math.min(MAX_MOVE_LVL, Math.floor(level))) : 1;
  const tier = lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1;
  return { lvl, tier, nextLevel: tier === 1 ? 3 : tier === 2 ? 5 : null };
}

export function getSkillImpactSize(level = 1, index = 0, boss = false) {
  const { tier } = getSkillMastery(level);
  const move = Number.isFinite(index) ? Math.max(0, Math.min(3, Math.floor(index))) : 0;
  return 38 + tier * 10 + move * 9 + (boss ? 12 : 0);
}

export function getEnemySkillEffect(enemy: { id?: string; mType?: string; lvl?: number }, phase = 1, ultimate = false): Pick<AttackEffectVm, 'type' | 'idx' | 'lvl' | 'signature'> {
  const boss = BOSS_IDS.has(enemy.id || '');
  const bossPhase = Number.isFinite(phase) ? Math.max(1, Math.min(3, Math.floor(phase))) : 1;
  const level = Number.isFinite(enemy.lvl) ? Math.max(1, enemy.lvl!) : 1;
  const lvl = getSkillMastery(boss ? 2 + bossPhase + (ultimate ? 1 : 0) : 1 + Math.floor((level - 1) / 3)).lvl;
  return {
    type: enemy.id === 'boss_sword_god' ? 'steel' : enemy.mType || 'dark',
    idx: ultimate ? 3 : boss ? 2 : level >= 6 ? 1 : 0,
    lvl,
    signature: boss ? enemy.id : undefined,
  };
}

/** Physical ownership is captured by the flow, never inferred from the current active tab. */
export function getSkillActorKeys(effect: AttackEffectVm) {
  const incoming = effect.targetSide === 'player';
  return {
    source: incoming ? (effect.sourceSlot === 'sub' ? 'enemySub' : 'enemyMain')
      : (effect.sourceSlot === 'sub' ? 'playerSub' : 'playerMain'),
    target: incoming ? (effect.targetSlot === 'sub' ? 'playerSub' : 'playerMain') : 'enemyMain',
  } as const;
}
