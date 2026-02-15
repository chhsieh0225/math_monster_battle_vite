/**
 * PvP balance knobs.
 * Keep all 1v1 player-vs-player tuning centralized here so future balancing
 * changes do not require touching battle flow logic.
 */
export const PVP_BALANCE = {
  baseScale: 0.84,
  varianceMin: 0.9,
  varianceMax: 1.08,
  minDamage: 8,
  maxDamage: 42,
  riskyScale: 0.94,
  moveSlotScale: [0.94, 0.98, 1.02, 0.9],
  typeScale: {
    fire: 1.0,
    water: 1.0,
    grass: 1.0,
    electric: 1.0,
    light: 1.02,
    dark: 0.97,
  },
  effectScale: {
    strong: 1.18,
    weak: 0.86,
    neutral: 1.0,
  },
};

