/**
 * PvP balance knobs.
 * Keep all 1v1 player-vs-player tuning centralized here so future balancing
 * changes do not require touching battle flow logic.
 */
export const PVP_BALANCE = {
  baseScale: 0.84,
  // Tighten RNG spread so outcome relies more on answer quality than high-roll spikes.
  varianceMin: 0.92,
  varianceMax: 1.06,
  minDamage: 8,
  maxDamage: 40,
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
  crit: {
    chance: 0.1,
    riskyBonus: 0.04,
    minChance: 0.02,
    maxChance: 0.24,
    multiplier: 1.4,
    // Type-specific crit tuning.
    // critChanceBonus: added to attacker's crit chance.
    // critDamageBonus: added to crit multiplier.
    // antiCritRate: reduced from incoming crit chance.
    // antiCritDamage: scales down incoming crit multiplier.
    byType: {
      fire: { critChanceBonus: 0.01, critDamageBonus: 0.06, antiCritRate: 0.01, antiCritDamage: 0.03 },
      water: { critChanceBonus: 0.00, critDamageBonus: 0.02, antiCritRate: 0.03, antiCritDamage: 0.10 },
      grass: { critChanceBonus: 0.00, critDamageBonus: 0.03, antiCritRate: 0.02, antiCritDamage: 0.14 },
      electric: { critChanceBonus: 0.03, critDamageBonus: 0.04, antiCritRate: 0.00, antiCritDamage: 0.04 },
      light: { critChanceBonus: 0.02, critDamageBonus: 0.05, antiCritRate: 0.01, antiCritDamage: 0.06 },
      dark: { critChanceBonus: 0.03, critDamageBonus: 0.08, antiCritRate: 0.00, antiCritDamage: 0.00 },
    },
  },
  passive: {
    fireBurnCap: 2,
    // Burn in PvP should matter even when fights are short.
    fireBurnTickBase: 4,
    fireBurnTickPerStack: 2,
    waterFreezeChance: 0.12,
    electricDischargeAt: 3,
    electricDischargeDamage: 10,
    specDefComboTrigger: 4,
    lightCounterDamage: 14,
    grassReflectRatio: 0.32,
    grassReflectMin: 8,
    grassReflectCap: 18,
  },
  // Slightly reduce first-turn snowball in timed PvP starts.
  firstStrikeScale: 0.88,
  effectScale: {
    strong: 1.18,
    weak: 0.86,
    neutral: 1.0,
  },
};
