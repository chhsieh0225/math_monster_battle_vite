import type { AttackEffectVm, UseBattleState } from '../types/battle';
import { getSignatureCastAnimation } from './effectTiming.ts';

type BattleSpriteAnimationArgs = Pick<UseBattleState, 'eAnim' | 'pAnim' | 'eSubAnim' | 'pSubAnim'> & {
  lowPerfMode: boolean;
  enemyIsBoss: boolean;
  enemyLowHp: boolean;
  enemyDefeated: boolean;
  /** Element of the finishing hit; picks the defeat animation. */
  enemyFinisherType?: string | null;
  attackEffect?: AttackEffectVm | null;
  battleMode?: string;
};

/** Seconds into the boss defeat when the white flashes end and the shards break away. */
export const BOSS_SHATTER_START_S = 0.9;
/** Total length of the boss defeat on the battlefield, before the victory cinematic. */
export const BOSS_DEFEAT_MS = 2300;

const ELEMENT_DEFEATS: Record<string, string> = {
  fire: 'enemyDeathBurn 1.2s ease-in forwards',
  water: 'enemyDeathMelt 1.2s ease-in forwards',
  electric: 'enemyDeathZap 1.1s linear forwards',
  grass: 'enemyDeathWither 1.3s ease-in forwards',
  ice: 'enemyDeathFreeze 1.3s ease-in forwards',
  light: 'enemyDeathAscend 1.3s ease-in forwards',
  dark: 'enemyDeathVoid 1.2s ease-in forwards',
  steel: 'enemyDeathKnockout 1s ease-in forwards',
};

const DEFAULT_DEFEAT = 'enemyDissolve .9s ease-out forwards';

/**
 * Bosses flash white twice and then break into shards; other enemies fall the
 * way the finishing element suggests. Low-performance mode keeps one cheap fade.
 */
export function resolveEnemyDefeat({ isBoss, finisherType, lowPerfMode }: {
  isBoss: boolean;
  finisherType?: string | null;
  lowPerfMode: boolean;
}): { animation: string; shatter: boolean } {
  if (isBoss) {
    return lowPerfMode
      ? { animation: 'enemyDeathBossLite 1.6s linear forwards', shatter: false }
      : { animation: `enemyDeathBoss ${BOSS_DEFEAT_MS / 1000}s linear forwards`, shatter: true };
  }
  if (lowPerfMode) return { animation: DEFAULT_DEFEAT, shatter: false };
  return { animation: ELEMENT_DEFEATS[String(finisherType || '')] ?? DEFAULT_DEFEAT, shatter: false };
}

// Animation ownership is independent of turn selection and sprite layout.
export function resolveBattleSpriteAnimations({
  eAnim, pAnim, eSubAnim, pSubAnim,
  lowPerfMode, enemyIsBoss, enemyLowHp, enemyDefeated, enemyFinisherType, attackEffect, battleMode,
}: BattleSpriteAnimationArgs) {
  const enemyIdle = enemyIsBoss
    ? 'battleBossFloat 2.5s ease-in-out infinite, bossPulse 4s ease infinite'
    : enemyLowHp
      ? 'battleFloat 1.4s ease-in-out infinite, struggle .8s ease-in-out infinite'
      : 'battleFloat 3s ease-in-out infinite';
  // Late enemy/PvP lunges end on contact. Recover visually without adding battle timers
  // or overwriting a newer hurt/defeat animation. Early player clips already recover.
  const landed = attackEffect?.impact?.outcome === 'hit' || attackEffect?.impact?.outcome === 'critical';
  const incoming = attackEffect?.targetSide === 'player';
  const followName = landed && !lowPerfMode && (incoming || battleMode === 'pvp')
    ? getSignatureCastAnimation(attackEffect?.skillId, 'immediate') : undefined;
  const source = `${incoming ? 'enemy' : 'player'}${attackEffect?.sourceSlot === 'sub' ? 'Sub' : 'Main'}`;
  const follow = (slot: string) => followName && source === slot ? `${followName} .4s ease both` : '';
  return {
    enemyMain: enemyDefeated
      ? resolveEnemyDefeat({ isBoss: enemyIsBoss, finisherType: enemyFinisherType, lowPerfMode }).animation
      : eAnim || follow('enemyMain') || (lowPerfMode ? 'none' : enemyIdle),
    enemySub: eSubAnim || follow('enemySub') || (lowPerfMode ? 'none' : 'battleFloat 3.8s ease-in-out infinite'),
    enemyShadow: enemyIsBoss ? 'bossShadowPulse 2.5s ease-in-out infinite' : 'shadowPulse 3s ease-in-out infinite',
    playerMain: pAnim || follow('playerMain') || (lowPerfMode ? 'none' : 'floatFlip 3s ease-in-out infinite'),
    playerSub: pSubAnim || follow('playerSub') || (lowPerfMode ? 'none' : 'floatFlip 3.8s ease-in-out infinite'),
  };
}
