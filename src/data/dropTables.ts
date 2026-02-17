/**
 * Drop tables are content-only data so balancing can be done without touching
 * battle flow logic.
 */
export const DROP_TABLES: Record<string, string[]> = {
  slime: ['🍬', '🧪'],
  slime_red: ['🔥', '🍬'],
  slime_blue: ['💧', '🍬'],
  slime_yellow: ['⚡', '🍬'],
  slime_dark: ['💀', '🍬'],
  slime_steel: ['🛡️', '🍬'],

  slimeEvolved: ['🍬', '🧪'],
  slimeElectricEvolved: ['⚡', '🧪'],
  slimeFireEvolved: ['🔥', '🧪'],
  slimeWaterEvolved: ['💧', '🧪'],
  slimeSteelEvolved: ['🛡️', '🧪'],
  slimeDarkEvolved: ['💀', '🧪'],

  fire: ['🔥', '💎'],
  ghost: ['👻', '⭐'],
  dragon: ['🐉', '👑'],
  boss: ['👑', '🏆'],
  boss_hydra: ['☠️', '💎'],
};
