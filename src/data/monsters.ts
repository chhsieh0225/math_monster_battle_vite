import {
  slimeSVG, fireLizardSVG, ghostSVG, dragonSVG, darkLordSVG, bossHydraSVG,
  slimeEvolvedSVG, slimeElectricEvolvedSVG, slimeFireEvolvedSVG, slimeWaterEvolvedSVG, slimeSteelEvolvedSVG, slimeDarkEvolvedSVG,
  fireEvolvedSVG, ghostEvolvedSVG, dragonEvolvedSVG,
  slimeRedSVG, slimeBlueSVG, slimeYellowSVG, slimeDarkSVG, slimeSteelSVG,
} from './sprites.js';
import type {
  HydratedMonster,
  HydratedSlimeVariant,
  MonsterConfig,
  SlimeVariantConfig,
  SpriteFn,
} from '../types/game';
import { DROP_TABLES } from './dropTables.ts';
import {
  MONSTER_CONFIGS,
  SLIME_VARIANT_CONFIGS,
  EVOLVED_SLIME_VARIANT_CONFIGS,
} from './monsterConfigs.ts';

export { TYPE_EFF, getEff } from './typeEffectiveness.ts';

const SPRITE_MAP: Record<string, SpriteFn> = {
  slimeSVG,
  fireLizardSVG,
  ghostSVG,
  dragonSVG,
  darkLordSVG,
  bossHydraSVG,
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

function resolveSprite(spriteKey: string): SpriteFn {
  const fn = SPRITE_MAP[spriteKey];
  if (typeof fn !== "function") throw new Error(`[monsters] unknown spriteKey: ${spriteKey}`);
  return fn;
}

function resolveDrops(dropTable: string): string[] {
  const drops = DROP_TABLES[dropTable];
  if (!Array.isArray(drops) || drops.length === 0) {
    throw new Error(`[monsters] unknown or empty drop table: ${dropTable}`);
  }
  return drops;
}

function hydrateVariant(config: SlimeVariantConfig): HydratedSlimeVariant {
  const { spriteKey, dropTable, ...rest } = config;
  return {
    ...rest,
    svgFn: resolveSprite(spriteKey),
    drops: resolveDrops(dropTable),
  };
}

function hydrateMonster(config: MonsterConfig): HydratedMonster {
  const { spriteKey, evolvedSpriteKey, dropTable, ...rest } = config;
  return {
    ...rest,
    svgFn: resolveSprite(spriteKey),
    evolvedSvgFn: evolvedSpriteKey ? resolveSprite(evolvedSpriteKey) : undefined,
    drops: resolveDrops(dropTable),
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
export const SLIME_VARIANTS: HydratedSlimeVariant[] = SLIME_VARIANT_CONFIGS.map(hydrateVariant);
export const EVOLVED_SLIME_VARIANTS: HydratedSlimeVariant[] = EVOLVED_SLIME_VARIANT_CONFIGS.map(hydrateVariant);
export const MONSTERS: HydratedMonster[] = MONSTER_CONFIGS.map(hydrateMonster);
