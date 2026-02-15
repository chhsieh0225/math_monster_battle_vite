/**
 * Stage progression is data-driven so stage order and enemy scaling can be
 * adjusted without changing roster builder logic.
 */
export const STAGE_SCALE_BASE = 1;
export const STAGE_SCALE_STEP = 0.12;

export const STAGE_WAVES = [
  { monsterId: "slime" },
  { monsterId: "fire" },
  { monsterId: "slime" },
  { monsterId: "ghost" },
  { monsterId: "slime" },
  { monsterId: "fire" },
  { monsterId: "dragon" },
  { monsterId: "ghost" },
  { monsterId: "dragon" },
  { monsterId: "boss" },
];

