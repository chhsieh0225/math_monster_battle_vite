import type { UseBattleState } from '../types/battle';

type BattleSpriteAnimationArgs = Pick<UseBattleState, 'eAnim' | 'pAnim' | 'eSubAnim' | 'pSubAnim'> & {
  lowPerfMode: boolean;
  enemyIsBoss: boolean;
  enemyLowHp: boolean;
  enemyDefeated: boolean;
};

// Animation ownership is independent of turn selection and sprite layout.
export function resolveBattleSpriteAnimations({
  eAnim, pAnim, eSubAnim, pSubAnim,
  lowPerfMode, enemyIsBoss, enemyLowHp, enemyDefeated,
}: BattleSpriteAnimationArgs) {
  const enemyIdle = enemyIsBoss
    ? 'battleBossFloat 2.5s ease-in-out infinite, bossPulse 4s ease infinite'
    : enemyLowHp
      ? 'battleFloat 1.4s ease-in-out infinite, struggle .8s ease-in-out infinite'
      : 'battleFloat 3s ease-in-out infinite';
  return {
    enemyMain: enemyDefeated
      ? 'enemyDissolve .9s ease-out forwards'
      : eAnim || (lowPerfMode ? 'none' : enemyIdle),
    enemySub: eSubAnim || (lowPerfMode ? 'none' : 'battleFloat 3.8s ease-in-out infinite'),
    enemyShadow: enemyIsBoss ? 'bossShadowPulse 2.5s ease-in-out infinite' : 'shadowPulse 3s ease-in-out infinite',
    playerMain: pAnim || (lowPerfMode ? 'none' : 'floatFlip 3s ease-in-out infinite'),
    playerSub: pSubAnim || (lowPerfMode ? 'none' : 'floatFlip 3.8s ease-in-out infinite'),
  };
}
