import type { SpriteKey } from '../../../data/spriteProfiles.ts';

export type BattleSpriteClip = 'idle' | 'attack' | 'hurt' | 'brace' | 'charge' | 'defeat';

export type SpriteBodyMotion = 'grounded' | 'soft' | 'hover' | 'wing' | 'heavy';

/** Material and weight affect presentation only, never battle clocks or slot ownership. */
export function getSpriteBodyMotion(key: SpriteKey): SpriteBodyMotion {
  if (key.startsWith('slime') || key === 'candy_monster' || key === 'mushroom') return 'soft';
  if (key.startsWith('ghost') || key === 'boss_sword_god') return 'hover';
  if (key === 'colorful_butterfly') return 'wing';
  if (key.startsWith('boss') || key.startsWith('golumn') || key.startsWith('dragon') || key === 'candy_knight') return 'heavy';
  return 'grounded';
}

/** Consume the physical slot's animation, never global phase or the active co-op role. */
export function resolveBattleSpriteClip(animation: string): { clip: BattleSpriteClip; durationMs: number } {
  const [name = '', duration = ''] = animation.trim().split(/\s+/);
  const parsed = /^(\d*\.?\d+)(ms|s)$/.exec(duration);
  const durationMs = parsed ? Math.max(1, Number(parsed[1]) * (parsed[2] === 's' ? 1000 : 1)) : 500;
  let clip: BattleSpriteClip = 'idle';
  if (name === 'attackLunge' || name === 'enemyAttackLunge') clip = 'attack';
  else if (/^(?:player|enemy)(?:Fire|Grass|Water|Elec|Dark|Light|Steel|Ice)?Hit$/.test(name)) clip = 'hurt';
  else if (name === 'dodgeSlide' || name === 'enemyShieldPulse') clip = 'brace';
  else if (name === 'bossShake') clip = 'charge';
  else if (name === 'enemyDissolve') clip = 'defeat';
  return { clip, durationMs };
}

/** Decode before replacing the original, including on slow/offline connections. */
export async function decodeBattleSprite(src: string, createImage: () => HTMLImageElement = () => new Image()): Promise<boolean> {
  try {
    const img = createImage();
    img.src = src;
    await img.decode();
    return img.naturalWidth === 2048 && img.naturalHeight === 768;
  } catch {
    return false;
  }
}
