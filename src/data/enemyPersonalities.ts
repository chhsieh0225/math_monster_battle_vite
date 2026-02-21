import type { EnemyPersonalityId } from '../types/game';

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
 * Note: battle has no speed stat, so "tempo-like" identity is modeled through:
 * - crit pressure (chance / damage),
 * - incoming damage scale (fragile/tanky feel).
 */
export const ENEMY_PERSONALITIES: readonly EnemyPersonalityDef[] = [
  {
    id: 'irritable',
    icon: '😡',
    name: '易怒的',
    nameEn: 'Irascible',
    desc: '攻擊慾望很強，但破綻也多。',
    descEn: 'Aggressive and explosive, but leaves more openings.',
    hpScale: 0.9,
    atkScale: 1.16,
    critChanceBonus: 0.04,
    critDamageBonus: 0.08,
    incomingDamageScale: 1.06,
  },
  {
    id: 'timid',
    icon: '😰',
    name: '膽小的',
    nameEn: 'Timid',
    desc: '保守應戰，火力偏低但更懂得保命。',
    descEn: 'Plays safe with lower offense and better self-preservation.',
    hpScale: 1.08,
    atkScale: 0.9,
    critChanceBonus: -0.03,
    critDamageBonus: -0.06,
    incomingDamageScale: 0.97,
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
    desc: '擅長抓空檔，爆發角度刁鑽。',
    descEn: 'Exploits openings with trickier burst windows.',
    hpScale: 0.96,
    atkScale: 1.04,
    critChanceBonus: 0.06,
    critDamageBonus: 0.04,
    incomingDamageScale: 1.03,
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
  const incomingDamageScale = clampScale(personalityDef.incomingDamageScale);

  const hp = Math.max(1, Math.round(enemy.hp * hpScale));
  const maxHp = Math.max(1, Math.round(enemy.maxHp * hpScale));
  const atk = Math.max(1, Math.round(enemy.atk * atkScale));

  return {
    ...enemy,
    hp,
    maxHp,
    atk,
    personality: {
      id: personalityDef.id,
      icon: personalityDef.icon,
      name: personalityDef.name,
      nameEn: personalityDef.nameEn,
      desc: personalityDef.desc,
      descEn: personalityDef.descEn,
      hpScale,
      atkScale,
      critChanceBonus: clampCritBonus(personalityDef.critChanceBonus),
      critDamageBonus: clampCritBonus(personalityDef.critDamageBonus),
      incomingDamageScale,
    },
  };
}
