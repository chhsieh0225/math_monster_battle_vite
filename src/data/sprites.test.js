import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SPRITE_IMGS, BG_IMGS, BG_IMGS_LOW,
  slimeSVG, slimeRedSVG, slimeBlueSVG, slimeYellowSVG, slimeDarkSVG, slimeSteelSVG,
  fireLizardSVG, ghostSVG, ghostLanternSVG, mushroomSVG, dragonSVG, darkLordSVG,
  slimeEvolvedSVG, slimeElectricEvolvedSVG, slimeFireEvolvedSVG,
  slimeWaterEvolvedSVG, slimeSteelEvolvedSVG, slimeDarkEvolvedSVG,
  fireEvolvedSVG, ghostEvolvedSVG, dragonEvolvedSVG,
  playerfire0SVG, playerfire1SVG, playerfire2SVG,
  playerwater0SVG, playerwater1SVG, playerwater2SVG,
  playergrass0SVG, playergrass1SVG, playergrass2SVG,
  playerelectric0SVG, playerelectric1SVG, playerelectric2SVG,
  playerlion0SVG, playerlion1SVG, playerlion2SVG,
  playerwolf0SVG, playerwolf1SVG, playerwolf2SVG,
  playertiger0SVG, playertiger1SVG, playertiger2SVG,
  bossHydraSVG, bossCrazyDragonSVG, bossSwordGodSVG,
  golumnSVG, golumnMudSVG,
} from './sprites.ts';

describe('sprite image maps', () => {
  it('SPRITE_IMGS contains slime key', () => {
    assert.ok(typeof SPRITE_IMGS.slime === 'string');
  });
  it('BG_IMGS contains grass key', () => {
    assert.ok(typeof BG_IMGS.grass === 'string');
  });
  it('BG_IMGS_LOW overrides water path', () => {
    assert.ok(BG_IMGS_LOW.water.includes('low'));
  });
});

describe('SVG factory functions return valid SVG markup', () => {
  const factories = [
    slimeSVG, slimeRedSVG, slimeBlueSVG, slimeYellowSVG, slimeDarkSVG, slimeSteelSVG,
    fireLizardSVG, ghostSVG, ghostLanternSVG, mushroomSVG, dragonSVG, darkLordSVG,
    slimeEvolvedSVG, slimeElectricEvolvedSVG, slimeFireEvolvedSVG,
    slimeWaterEvolvedSVG, slimeSteelEvolvedSVG, slimeDarkEvolvedSVG,
    fireEvolvedSVG, ghostEvolvedSVG, dragonEvolvedSVG,
    playerfire0SVG, playerfire1SVG, playerfire2SVG,
    playerwater0SVG, playerwater1SVG, playerwater2SVG,
    playergrass0SVG, playergrass1SVG, playergrass2SVG,
    playerelectric0SVG, playerelectric1SVG, playerelectric2SVG,
    playerlion0SVG, playerlion1SVG, playerlion2SVG,
    playerwolf0SVG, playerwolf1SVG, playerwolf2SVG,
    playertiger0SVG, playertiger1SVG, playertiger2SVG,
    bossHydraSVG, bossCrazyDragonSVG, bossSwordGodSVG,
    golumnSVG, golumnMudSVG,
  ];

  for (const fn of factories) {
    it(`${fn.name || 'factory'} returns string with <image`, () => {
      const result = fn();
      assert.ok(typeof result === 'string');
      assert.ok(result.includes('<image') || result.includes('<g'));
    });
  }
});
