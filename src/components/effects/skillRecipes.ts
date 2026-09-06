import type { StarterId } from '../../types/game.ts';

export type SkillMotion = 'shot' | 'rush' | 'wave' | 'fall' | 'beam' | 'orbit' | 'lash' | 'slash' | 'field';
export type SkillRecipe = {
  motion: SkillMotion;
  mark: string;
  accent?: string;
  tone?: string;
};

const r = (motion: SkillMotion, mark: string, accent?: string, tone?: string): SkillRecipe => ({ motion, mark, accent, tone });
const claw = 'M-36 -30 Q-18 0 24 30 L-16 -6Z M-10 -36 Q4 0 38 20 L10 -8Z M-46 -10 Q-28 18 4 36 L-22 8Z';
const blade = 'M-42 32 Q-16 -16 40 -36 Q18 8 -42 32Z';
const crystal = 'M0 -40 L20 -12 L14 24 L0 40 L-14 24 L-20 -12Z M0 -40 L0 40 M-20 -12 L20 -12';
const wave = 'M-42 22 Q-18 -38 16 -24 Q-4 -20 -4 0 Q24 -26 42 -6 Q14 -6 18 16 Q-6 34 -42 22Z';
const bolt = 'M8 -44 L-28 4 L-5 0 L-14 42 L30 -12 L9 -8Z';
const ring = 'M0 -32 A32 32 0 1 1 -.01 -32 M0 -22 A22 22 0 1 0 .01 -22';

// Slot order is the stable catalog identity, independent of locale and evolution artwork.
export const CHARACTER_SKILL_RECIPES = {
  fire: [
    r('shot', 'M-34 12 Q-4 -6 -12 -36 Q4 -24 12 -8 Q34 -4 30 18 Q16 40 -8 26Z M-6 18 Q10 -8 18 16'),
    r('rush', 'M-46 24 Q-24 0 -42 -24 L8 -10 L0 -32 L44 0 L6 30 L12 10Z'),
    r('field', 'M-42 28 L-26 -8 L-16 12 L-4 -40 L10 -4 L26 -26 L20 12 L42 28Z M-40 34 L40 34'),
    r('fall', 'M-34 32 Q-50 6 -20 -14 L20 -40 L10 -8 L40 -26 L24 18 Q2 48 -34 32Z M-25 15 L-5 3 L5 24 L-15 32Z', '#e9d5ff'),
  ],
  water: [
    r('shot', 'M-8 -26 A26 26 0 1 1 -8 26 A26 26 0 0 1 -8 -26 M-24 -10 Q-22 -21 -12 -22 M26 -32 A10 10 0 1 1 25.9 -32 M24 20 A8 8 0 1 1 23.9 20'),
    r('wave', wave),
    r('wave', `${wave} M-44 36 Q-22 18 0 34 T44 28 M-32 -18 Q-8 -52 26 -32`, '#ffffff'),
    r('orbit', 'M-40 0 A40 30 0 1 1 0 30 A28 20 0 1 1 28 0 A18 12 0 1 1 0 -12 A9 7 0 1 1 -8 0 M-42 34 Q0 46 42 20', '#e9d5ff'),
  ],
  grass: [
    r('slash', 'M-38 28 Q-40 -34 34 -32 Q32 36 -38 28Z M-36 26 L30 -28 M-14 6 L-20 -14 M0 -8 L20 -8'),
    r('lash', 'M-42 28 Q-18 -42 6 -8 T40 -24 M-28 0 L-38 -12 L-18 -12 M10 0 L16 18 L24 -2'),
    r('orbit', 'M-40 6 Q-18 -38 16 -24 Q-12 -12 -40 6Z M30 -34 Q52 0 28 26 Q30 -4 30 -34Z M22 36 Q-18 50 -34 20 Q-6 36 22 36Z'),
    r('field', 'M-44 36 Q-30 4 -40 -18 L-16 6 L-6 -42 L8 0 L28 -32 L24 10 L44 -4 L32 36 M-30 30 L-20 -10 M8 28 L18 -16', '#e9d5ff'),
  ],
  electric: [
    r('shot', `${ring} M-40 -10 L-22 -18 L-6 0 L16 -14 L40 8 M-12 32 L4 12 L18 30`),
    r('fall', bolt),
    r('field', `${bolt} M-40 -34 L-48 -4 L-28 -10 L-34 22 M36 -26 L26 -2 L44 -6 L30 32`),
    r('lash', 'M-40 -24 L-20 0 L-36 24 L0 40 L36 24 L20 0 L40 -24 L0 -40Z M-20 0 L0 -14 L20 0 L0 16Z M0 -40 L0 -14 M0 16 L0 40', '#e9d5ff'),
  ],
  lion: [
    r('slash', claw),
    r('wave', 'M-30 -36 Q10 0 -30 36 M-12 -40 Q34 0 -12 40 M8 -42 Q56 0 8 42 M-42 -14 L-24 0 L-42 14'),
    r('rush', `${claw} M-40 32 Q-46 0 -30 -38 L-16 -16 M16 -28 L32 -38 L44 8`, '#fb923c'),
    r('wave', `${ring} M10 -30 A31 31 0 1 0 10 30 A24 24 0 0 1 10 -30 M-44 -20 L-32 -14 M32 14 L44 20 M0 -44 L0 -36 M0 36 L0 44`, '#f0abfc'),
  ],
  wolf: [
    r('slash', `${blade} M-30 -28 L-14 -12 L-30 4`),
    r('slash', 'M-44 8 Q-8 -22 36 -30 L-32 18Z M-36 34 Q0 4 44 -4 L-24 42Z'),
    r('slash', `${blade} M-38 -34 Q12 -16 36 38 Q4 12 -38 -34Z`),
    r('field', 'M0 -46 L7 10 L0 24 L-7 10Z M-38 -24 L-14 20 L-16 32 L-28 24Z M38 -24 L14 20 L16 32 L28 24Z M-40 36 Q0 18 40 36 Q0 54 -40 36Z'),
  ],
  tiger: [
    r('shot', crystal),
    r('orbit', 'M-26 -36 L26 -36 L40 0 L26 36 L-26 36 L-40 0Z M-16 -24 L16 -24 L28 0 L16 24 L-16 24 L-28 0Z M-10 14 L10 -14'),
    r('slash', `${claw} M-34 -32 L-22 -40 L-16 -22 M4 30 L14 40 L20 22`),
    r('fall', `${crystal} M-38 -28 L-22 -4 L-30 22 L-44 -4Z M38 -28 L22 -4 L30 22 L44 -4Z M-38 36 L38 36`),
  ],
  boss: [
    r('slash', `${claw} M0 -42 L-8 -16 L10 -22 L2 8`, '#facc15'),
    r('orbit', `${bolt} M-40 16 A44 32 0 1 1 36 24 M-30 26 L-40 16 L-44 34`, '#c4b5fd'),
    r('beam', 'M-42 -24 L-12 -16 L8 -34 L40 0 L8 34 L-12 16 L-42 24 L-26 0Z M-14 -6 L26 0 L-14 6'),
    r('fall', `${bolt} M-42 -26 L-32 8 L-20 -4 L-16 32 M42 -26 L32 8 L20 -4 L16 32 M-38 40 L38 40`, '#facc15'),
  ],
  boss_hydra: [
    r('slash', 'M-38 -32 L-28 28 L-12 -22 M38 -32 L28 28 L12 -22 M-12 -30 L0 38 L12 -30', '#d9f99d', '#a3e635'),
    r('wave', `${wave} M-32 -26 L-30 -38 M0 28 A5 5 0 1 1 -.01 28 M28 -28 A4 4 0 1 1 27.99 -28`, '#d9f99d', '#84cc16'),
    r('lash', 'M-40 30 Q-50 -34 -20 -24 Q0 -12 -20 12 M0 38 Q-20 -44 4 -36 Q28 -30 10 8 M36 30 Q52 -32 28 -24 Q8 -14 30 12', '#d9f99d', '#84cc16'),
    r('field', 'M-44 24 Q-22 2 0 24 T44 24 M-36 38 Q0 18 36 38 M-26 16 Q-44 -22 -28 -34 L-12 -18 M0 18 L-8 -42 L8 -42Z M26 16 Q44 -22 28 -34 L12 -18', '#e9d5ff', '#84cc16'),
  ],
  boss_crazy_dragon: [
    r('slash', 'M-42 -26 L-26 24 L-8 -12 L8 32 L26 -14 L42 -30 M-36 -32 L0 -16 L36 -36', '#fef08a', '#f97316'),
    r('rush', `${blade} M-40 -26 L0 -8 L-12 -38 L36 -12 L8 6`, '#fca5a5', '#ef4444'),
    r('beam', 'M-44 20 L-26 -18 L-6 0 L8 -36 L20 -6 L44 -24 L30 20Z M-30 30 Q0 14 36 30', '#e9d5ff', '#f97316'),
    r('fall', 'M0 -44 L14 -16 L44 -30 L28 8 L40 28 L8 18 L0 42 L-8 18 L-40 28 L-28 8 L-44 -30 L-14 -16Z', '#fca5a5', '#dc2626'),
  ],
  boss_sword_god: [
    r('slash', 'M-44 24 L38 -34 L22 -10 L-44 24Z M-24 -22 L-12 -10 M-12 -22 L-24 -10', '#fef9c3', '#e2e8f0'),
    r('orbit', 'M-36 -26 L0 -8 L-12 4Z M36 -26 L8 0 L-4 -12Z M26 36 L0 8 L12 -4Z M-36 26 L-8 0 L4 12Z', '#e0f2fe', '#cbd5e1'),
    r('beam', 'M-44 -4 L44 -4 L44 4 L-44 4Z M0 -42 L6 -10 L0 42 L-6 10Z M-28 -28 L28 28 M28 -28 L-28 28', '#fef08a', '#e2e8f0'),
    r('fall', 'M0 -46 L12 -28 L6 18 L0 34 L-6 18 L-12 -28Z M-22 6 L22 6 M-34 -22 L-24 28 L-18 12 M34 -22 L24 28 L18 12 M-40 38 Q0 16 40 38', '#fef08a', '#cbd5e1'),
  ],
} satisfies Record<StarterId, readonly [SkillRecipe, SkillRecipe, SkillRecipe, SkillRecipe]>;

const MONSTER_RECIPES: Record<string, SkillRecipe> = {
  slime: r('shot', 'M-38 12 Q-30 -20 -10 -8 Q0 -40 16 -12 Q38 -20 38 12 Q14 36 -14 26Z M-34 34 L-42 40 M32 28 L42 34'),
  fire: r('beam', 'M-42 -18 Q-16 -34 6 -8 L-2 -30 L40 0 L-2 30 L6 8 Q-16 34 -42 18'),
  ghost: r('orbit', 'M10 -36 A38 38 0 1 0 10 36 A28 28 0 0 1 10 -36 M24 -12 L34 0 L24 12 M36 -20 L44 -8', '#ddd6fe', '#a78bfa'),
  ghost_lantern: r('shot', 'M0 -40 Q30 -16 24 8 L36 26 L10 20 L0 38 L-10 20 L-36 26 L-24 8 Q-30 -16 0 -40Z M-10 -4 L-4 0 M10 -4 L4 0', '#fde68a', '#c4b5fd'),
  mushroom: r('field', 'M-38 0 Q-32 -40 0 -38 Q32 -40 38 0Z M-8 0 L-8 30 L8 30 L8 0 M-36 24 A5 5 0 1 1 -36.01 24 M30 14 A7 7 0 1 1 29.99 14', '#d9f99d', '#a3e635'),
  dragon: r('slash', `${claw} M-34 32 L-12 24 L12 40`, '#e2e8f0', '#94a3b8'),
  golumn: r('field', 'M-40 32 L-34 -8 L-18 -24 L-8 8 L8 -38 L30 -24 L40 32Z M-34 -8 L-14 2 M8 -38 L14 12 L40 32', '#fde68a', '#d6a268'),
  golumn_mud: r('wave', 'M-44 26 Q-30 -20 -12 -12 Q-4 -36 12 -20 Q40 -22 44 26Z M-30 32 L-40 40 M18 32 L28 40 M-2 20 L4 26', '#fef3c7', '#a88a64'),
  candy_knight: r('slash', `${blade} M-30 -26 L-14 -26 L-14 -10 L-30 -10Z M18 16 L32 16 L32 30 L18 30Z`, '#fef3c7', '#f9a8d4'),
  candy_monster: r('rush', 'M-26 -24 L26 -24 L32 24 L-32 24Z M-26 -14 L-44 -30 L-40 24 L-30 14 M26 -14 L44 -30 L40 24 L30 14 M-12 0 L12 0', '#fef9c3', '#f472b6'),
  colorful_butterfly: r('orbit', 'M0 0 Q-44 -48 -36 -6 Q-28 18 0 0 Q44 -48 36 -6 Q28 18 0 0 M0 0 Q-40 4 -22 30 Q-8 38 0 0 Q40 4 22 30 Q8 38 0 0', '#fef08a', '#4ade80'),
};

export function getSkillRecipe(skillId?: string): SkillRecipe | undefined {
  if (!skillId) return undefined;
  const [family, slot, extra] = skillId.split(':');
  if (extra !== undefined) return undefined;
  if (family === 'monster') return Object.hasOwn(MONSTER_RECIPES, slot) ? MONSTER_RECIPES[slot] : undefined;
  if (!/^[0-3]$/.test(slot) || !Object.hasOwn(CHARACTER_SKILL_RECIPES, family)) return undefined;
  return CHARACTER_SKILL_RECIPES[family as StarterId][Number(slot)];
}
