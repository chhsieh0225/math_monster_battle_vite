import {
  slimeSVG, fireLizardSVG, ghostSVG, dragonSVG, darkLordSVG,
  slimeEvolvedSVG, slimeElectricEvolvedSVG, slimeFireEvolvedSVG, slimeWaterEvolvedSVG, slimeSteelEvolvedSVG, slimeDarkEvolvedSVG,
  fireEvolvedSVG, ghostEvolvedSVG, dragonEvolvedSVG,
  slimeRedSVG, slimeBlueSVG, slimeYellowSVG, slimeDarkSVG, slimeSteelSVG,
} from './sprites.js';
import { DROP_TABLES } from './dropTables.js';
import {
  MONSTER_CONFIGS,
  SLIME_VARIANT_CONFIGS,
  EVOLVED_SLIME_VARIANT_CONFIGS,
} from './monsterConfigs.js';

export { TYPE_EFF, getEff } from './typeEffectiveness.js';

const SPRITE_MAP = {
  slimeSVG,
  fireLizardSVG,
  ghostSVG,
  dragonSVG,
  darkLordSVG,
  slimeEvolvedSVG,
  slimeElectricEvolvedSVG,
  slimeFireEvolvedSVG,
  slimeWaterEvolvedSVG,
  slimeSteelEvolvedSVG,
  slimeDarkEvolvedSVG,
  fireEvolvedSVG,
  ghostEvolvedSVG,
  dragonEvolvedSVG,
  slimeRedSVG,
  slimeBlueSVG,
  slimeYellowSVG,
  slimeDarkSVG,
  slimeSteelSVG,
};

function resolveSprite(spriteKey) {
  const fn = SPRITE_MAP[spriteKey];
  if (typeof fn !== "function") throw new Error(`[monsters] unknown spriteKey: ${spriteKey}`);
  return fn;
}

function resolveDrops(dropTable) {
  const drops = DROP_TABLES[dropTable];
  if (!Array.isArray(drops) || drops.length === 0) {
    throw new Error(`[monsters] unknown or empty drop table: ${dropTable}`);
  }
  return drops;
}

function hydrateVariant(config) {
  return {
    ...config,
    svgFn: resolveSprite(config.spriteKey),
    drops: resolveDrops(config.dropTable),
  };
}

function hydrateMonster(config) {
  return {
    ...config,
    svgFn: resolveSprite(config.spriteKey),
    evolvedSvgFn: config.evolvedSpriteKey ? resolveSprite(config.evolvedSpriteKey) : undefined,
    drops: resolveDrops(config.dropTable),
  };
}

/**
 * Slime variant traits:
 *   trait      — unique trait id for battle logic
 *   traitName  — display label
 *   traitDesc  — short description shown in encyclopedia
 *   hpMult     — multiplier applied to base HP
 *   atkMult    — multiplier applied to base ATK
 */
export const SLIME_VARIANTS = SLIME_VARIANT_CONFIGS.map(hydrateVariant);
export const EVOLVED_SLIME_VARIANTS = EVOLVED_SLIME_VARIANT_CONFIGS.map(hydrateVariant);
export const MONSTERS = MONSTER_CONFIGS.map(hydrateMonster);
