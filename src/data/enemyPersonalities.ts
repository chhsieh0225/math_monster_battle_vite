import type { EnemyPersonalityId } from '../types/game';
import { BOSS_IDS } from './monsterConfigs.ts';

export type EnemyPersonalityDef = {
  id: EnemyPersonalityId;
  icon: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  hpScale: number;
  atkScale: number;
  critChanceBonus: number;
  critDamageBonus: number;
  incomingDamageScale: number;
};

/**
 * Clamped, applied personality attached to an enemy instance.
 * All numeric fields are pre-clamped — consumers can trust them directly.
 */
export type EnemyPersonality = {
  id: EnemyPersonalityId;
  icon: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  hpScale: number;
  atkScale: number;
  critChanceBonus: number;
  critDamageBonus: number;
  incomingDamageScale: number;
};

type PickIndex = (length: number) => number;

const MIN_SCALE = 0.75;
const MAX_SCALE = 1.35;
/** Additive crit bonus absolute bound: |Δ| ≤ 0.10. */
const MAX_CRIT_BONUS = 0.10;

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function clampCritBonus(value: number): number {
  return Math.min(MAX_CRIT_BONUS, Math.max(-MAX_CRIT_BONUS, value));
}

/**
 * Wild encounter personalities (六個個性詞綴).
 *
 * Irritable, timid and crafty use the telegraphed tactics below instead of
 * stacking large passive damage bonuses. The other three retain their stats.
 */
export const ENEMY_PERSONALITIES: readonly EnemyPersonalityDef[] = [
  {
    id: 'irritable',
    icon: '😡',
    name: '易怒的',
    nameEn: 'Irascible',
    desc: '被選招命中兩次後暴怒強攻，隨後露出一次重擊破綻。',
    descEn: 'Two selected hits trigger a rage strike, then leave an opening for your next hit.',
    hpScale: 0.95,
    atkScale: 1,
    critChanceBonus: 0,
    critDamageBonus: 0,
    incomingDamageScale: 1,
  },
  {
    id: 'timid',
    icon: '😰',
    name: '膽小的',
    nameEn: 'Timid',
    desc: '生命不高於40%時架盾，減輕一次選招攻擊；每場只用一次。',
    descEn: 'At 40% HP or below, guards one selected hit. Only once per encounter.',
    hpScale: 1,
    atkScale: 0.9,
    critChanceBonus: -0.03,
    critDamageBonus: -0.06,
    incomingDamageScale: 1,
  },
  {
    id: 'impatient',
    icon: '😤',
    name: '急躁的',
    nameEn: 'Impatient',
    desc: '出手猛烈但節奏失衡，容易被重擊。',
    descEn: 'Hits hard in haste, but overcommits and gets punished.',
    hpScale: 0.95,
    atkScale: 1.1,
    critChanceBonus: 0.03,
    critDamageBonus: 0.14,
    incomingDamageScale: 1.08,
  },
  {
    id: 'resilient',
    icon: '🛡️',
    name: '堅韌的',
    nameEn: 'Resilient',
    desc: '耐久極高，但輸出較保守。',
    descEn: 'Very durable, but offense is more conservative.',
    hpScale: 1.18,
    atkScale: 0.9,
    critChanceBonus: -0.01,
    critDamageBonus: 0,
    incomingDamageScale: 0.9,
  },
  {
    id: 'crafty',
    icon: '🦊',
    name: '狡詐的',
    nameEn: 'Crafty',
    desc: '招架上一個命中的招式；換招可繞過招架。只有一招可用時不招架。',
    descEn: 'Parries the last landed move; change moves to outwit it. No parry with only one usable move.',
    hpScale: 1,
    atkScale: 1,
    critChanceBonus: 0,
    critDamageBonus: 0,
    incomingDamageScale: 1,
  },
  {
    id: 'composed',
    icon: '🧘',
    name: '沉著的',
    nameEn: 'Composed',
    desc: '攻勢平穩，擅長減少失誤與致命破綻。',
    descEn: 'Steady and disciplined, minimizing fatal mistakes.',
    hpScale: 1.1,
    atkScale: 0.95,
    critChanceBonus: -0.02,
    critDamageBonus: -0.08,
    incomingDamageScale: 0.94,
  },
];

type PersonalityReadyEnemy = {
  hp: number;
  maxHp: number;
  atk: number;
};

export function rollEnemyPersonality(pickIndex: PickIndex): EnemyPersonalityDef {
  const count = ENEMY_PERSONALITIES.length;
  const raw = Number(pickIndex(count));
  const idx = Number.isFinite(raw) ? Math.max(0, Math.min(count - 1, Math.trunc(raw))) : 0;
  return ENEMY_PERSONALITIES[idx];
}

export function applyEnemyPersonality<T extends PersonalityReadyEnemy>(
  enemy: T,
  personalityDef: EnemyPersonalityDef,
): T & { personality: EnemyPersonality } {
  const hpScale = clampScale(personalityDef.hpScale);
  const atkScale = clampScale(personalityDef.atkScale);

  const hp = Math.max(1, Math.round(enemy.hp * hpScale));
  const maxHp = Math.max(1, Math.round(enemy.maxHp * hpScale));
  const atk = Math.max(1, Math.round(enemy.atk * atkScale));

  return {
    ...enemy,
    hp,
    maxHp,
    atk,
    personality: normalizeEnemyPersonality(personalityDef),
  };
}

function normalizeEnemyPersonality(personalityDef: EnemyPersonalityDef): EnemyPersonality {
  return {
    id: personalityDef.id,
    icon: personalityDef.icon,
    name: personalityDef.name,
    nameEn: personalityDef.nameEn,
    desc: personalityDef.desc,
    descEn: personalityDef.descEn,
    hpScale: clampScale(personalityDef.hpScale),
    atkScale: clampScale(personalityDef.atkScale),
    critChanceBonus: clampCritBonus(personalityDef.critChanceBonus),
    critDamageBonus: clampCritBonus(personalityDef.critDamageBonus),
    incomingDamageScale: clampScale(personalityDef.incomingDamageScale),
  };
}

/** Restore modifiers only; saved HP and ATK already include personality scaling. */
export function getEnemyPersonality(id: string): EnemyPersonality | undefined {
  const definition = ENEMY_PERSONALITIES.find((personality) => personality.id === id);
  return definition ? normalizeEnemyPersonality(definition) : undefined;
}

export const PERSONALITY_TACTICS = {
  angerHits: 2, rageScale: 1.25, openingScale: 1.25,
  timidHpRatio: 0.4, guardScale: 0.65, parryScale: 0.65, outwitScale: 1.1,
} as const;

export type PersonalityBattleState = {
  anger: number;
  opening: boolean;
  guardSpent: boolean;
  watchedMoveKey: string | null;
  watchedMoveName: string;
};
export type EnemyBehaviorState = { main: PersonalityBattleState; sub: PersonalityBattleState };
const EMPTY_TACTIC: Readonly<PersonalityBattleState> = Object.freeze({
  anger: 0, opening: false, guardSpent: false, watchedMoveKey: null, watchedMoveName: '',
});
export function createEnemyBehaviorState(): EnemyBehaviorState {
  return { main: { ...EMPTY_TACTIC }, sub: { ...EMPTY_TACTIC } };
}

export type PersonalityContext = {
  enemy?: { id?: string; maxHp?: number; personality?: { id?: string } } | null;
  hp: number;
  state?: PersonalityBattleState;
  battleMode?: string;
};
export type PersonalityCue = 'anger' | 'rage' | 'opening' | 'timid' | 'guard' | 'spent' | 'observe' | 'watch';

/** The HUD and damage planners read the same encounter-local state. */
export function getPersonalityCue({ enemy, hp, state = EMPTY_TACTIC, battleMode }: PersonalityContext): PersonalityCue | null {
  if (!enemy || hp <= 0 || battleMode === 'pvp' || BOSS_IDS.has(enemy.id ?? '')) return null;
  switch (enemy.personality?.id) {
    case 'irritable': return state.opening ? 'opening' : state.anger >= PERSONALITY_TACTICS.angerHits ? 'rage' : 'anger';
    case 'timid': return state.guardSpent ? 'spent' : hp <= (enemy.maxHp ?? 0) * PERSONALITY_TACTICS.timidHpRatio ? 'guard' : 'timid';
    case 'crafty': return state.watchedMoveKey ? 'watch' : 'observe';
    default: return null;
  }
}

export function personalityMoveKey(starter: { id?: string; type?: string }, index: number): string {
  return `${starter.id || starter.type || 'unknown'}:${index}`;
}

export function canVaryPersonalityMoves(moves: readonly { risky?: boolean }[] = [], sealedMove = -1, chargeReady = false): boolean {
  return moves.filter((move, index) => index !== sealedMove && (!move.risky || chargeReady)).length > 1;
}

export type PersonalityHitFeedback = 'exploit' | 'guardBreak' | 'parried' | 'outwit' | 'rageReady';
export function planPersonalityHit(context: PersonalityContext & {
  moveKey: string; moveName: string; canVary: boolean;
}): { damageScale: number; next: PersonalityBattleState; feedback?: PersonalityHitFeedback } | null {
  const cue = getPersonalityCue(context);
  if (!cue) return null;
  const state = context.state ?? EMPTY_TACTIC;
  const next = { ...state };
  if (cue === 'opening') {
    return { damageScale: PERSONALITY_TACTICS.openingScale, next: { ...next, opening: false, anger: 0 }, feedback: 'exploit' };
  }
  if (cue === 'anger' || cue === 'rage') {
    next.anger = Math.min(PERSONALITY_TACTICS.angerHits, state.anger + 1);
    return { damageScale: 1, next, feedback: cue !== 'rage' && next.anger === PERSONALITY_TACTICS.angerHits ? 'rageReady' : undefined };
  }
  if (cue === 'guard') return { damageScale: PERSONALITY_TACTICS.guardScale, next: { ...next, guardSpent: true }, feedback: 'guardBreak' };
  if (cue === 'observe' || cue === 'watch') {
    const repeat = context.canVary && state.watchedMoveKey === context.moveKey;
    const outwit = context.canVary && !!state.watchedMoveKey && !repeat;
    next.watchedMoveKey = context.canVary ? context.moveKey : null;
    next.watchedMoveName = context.canVary ? context.moveName : '';
    return { damageScale: repeat ? PERSONALITY_TACTICS.parryScale : outwit ? PERSONALITY_TACTICS.outwitScale : 1,
      next, feedback: repeat ? 'parried' : outwit ? 'outwit' : undefined };
  }
  return { damageScale: 1, next };
}

/** Called once at attack contact, even when the player blocks the rage strike. */
export function planPersonalityAttack(context: PersonalityContext): { damageScale: number; next: PersonalityBattleState } | null {
  if (getPersonalityCue(context) !== 'rage') return null;
  return { damageScale: PERSONALITY_TACTICS.rageScale, next: { ...(context.state ?? EMPTY_TACTIC), anger: 0, opening: true } };
}
