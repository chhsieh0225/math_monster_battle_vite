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
    light: 1.0,
    dark: 0.97,
  },
  // Skill-budget tuning per starter type and move slot (index 0..3).
  skillScaleByType: {
    fire: [1.0, 0.99, 0.98, 0.96],
    water: [1.0, 0.99, 0.98, 0.95],
    grass: [0.99, 0.99, 0.98, 0.95],
    electric: [1.0, 0.99, 0.97, 0.94],
    light: [0.99, 0.99, 0.98, 0.95],
    dark: [1.0, 1.0, 1.0, 1.0],
  },
  // Passive-budget normalization. Values <1 reserve power for passive value.
  passiveScaleByType: {
    fire: 0.99,
    water: 0.98,
    grass: 0.95,
    electric: 0.97,
    light: 0.96,
    dark: 0.97,
  },
  // Grass sustain in PvP (kept modest to avoid snowball).
  grassSustain: {
    healRatio: 0.12,
    healCap: 6,
  },
  // Light comeback bonus scales with missing HP.
  lightComeback: {
    maxBonus: 0.16,
  },
  passive: {
    fireBurnCap: 2,
    fireBurnTickBase: 2,
    fireBurnTickPerStack: 2,
    waterFreezeChance: 0.28,
    electricDischargeAt: 3,
    electricDischargeDamage: 10,
  },
  firstStrikeScale: 0.9,
  effectScale: {
    strong: 1.18,
    weak: 0.86,
    neutral: 1.0,
  },
};
