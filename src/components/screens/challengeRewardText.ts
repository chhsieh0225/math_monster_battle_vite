/** Localized lines for challenge rewards that were actually granted. */
import { ITEM_CATALOG } from '../../data/itemCatalog.ts';
import { CHALLENGE_REWARD_TUNING, type ChallengePerks, type GrantedReward } from '../../utils/challengeRewards.ts';

type Translate = (key: string, fallback?: string, params?: Record<string, string | number>) => string;

const BADGE_FALLBACK: Record<string, string> = {
  daily_clear_badge: 'Daily Victor',
  daily_combo_badge: 'Tempo Rider',
};

const TITLE_FALLBACK: Record<string, string> = {
  daily_weekly: 'Weekly Challenger',
  daily_unknown_weekly: 'Equation Hunter',
  daily_combo_weekly: 'Combo Specialist',
};

export function badgeName(key: string, t: Translate): string {
  const tower = /^tower_checkpoint_(\d+)$/.exec(key);
  if (tower) return t('reward.badge.tower', 'Tower Floor {floor} Badge', { floor: Number(tower[1]) });
  return t(`reward.badge.${key}`, BADGE_FALLBACK[key] ?? key);
}

export function titleName(key: string, t: Translate): string {
  return t(`reward.title.${key}`, TITLE_FALLBACK[key] ?? key);
}

export function percent(value: number): number {
  return Math.round(value * 1000) / 10;
}

export function describeGrantedReward(reward: GrantedReward, perks: ChallengePerks, t: Translate): string {
  if (reward.kind === 'honor') {
    return t('reward.line.honor', '⭐ Honor +{amount}', { amount: reward.amount });
  }
  if (reward.kind === 'badge') {
    const name = badgeName(reward.key, t);
    return reward.isNew
      ? t('reward.line.badgeNew', '🏅 New badge "{name}"! Permanent damage bonus now +{pct}%', { name, pct: percent(perks.damageBonus) })
      : t('reward.line.badgeOwned', '🏅 Badge "{name}" (already owned)', { name });
  }
  if (reward.kind === 'title') {
    const name = titleName(reward.key, t);
    return reward.isNew
      ? t('reward.line.titleNew', '🎖️ New title "{name}"! Every win now restores +{hp} extra HP', { name, hp: perks.victoryHeal })
      : t('reward.line.titleOwned', '🎖️ Title "{name}" (already owned)', { name });
  }
  const item = ITEM_CATALOG[reward.item];
  const itemName = t(item.nameKey, item.nameFallback);
  if (reward.amount <= 0) {
    return t('reward.line.itemFull', '{icon} {item}: your bag is full', { icon: item.icon, item: itemName });
  }
  return reward.fromHonor
    ? t('reward.line.honorItem', '{icon} Every {per} honor: {item} ×{amount}', {
      icon: item.icon, item: itemName, amount: reward.amount, per: CHALLENGE_REWARD_TUNING.honorPerPotion,
    })
    : t('reward.line.item', '{icon} {item} ×{amount}', { icon: item.icon, item: itemName, amount: reward.amount });
}
