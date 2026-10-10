import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ENC_ENTRIES, STARTER_ENTRIES } from './encyclopedia.ts';
import { SPRITE_ANIMATION_ASSETS, getSpriteAnimationAsset } from './spriteAnimationAssets.ts';
import { getSpriteProfileKey } from './sprites.ts';
import { STARTERS } from './starters.ts';

const portraitPath = (file) => fileURLToPath(new URL(`../../public/sprites/portraits/${file}`, import.meta.url));

test('every battle atlas has a small idle portrait for menus', () => {
  for (const asset of Object.values(SPRITE_ANIMATION_ASSETS)) {
    assert.ok(existsSync(portraitPath(asset.file)), `missing portrait for ${asset.file}`);
  }
});

test('the encyclopedia and menus resolve to the same art as battle', () => {
  for (const entry of ENC_ENTRIES) {
    assert.ok(getSpriteAnimationAsset(entry.spriteKey), `encyclopedia ${entry.key} (${entry.spriteKey}) has no battle art`);
  }
  for (const entry of STARTER_ENTRIES) {
    const key = getSpriteProfileKey(entry.svgFn) ?? entry.spriteKey;
    assert.ok(getSpriteAnimationAsset(key), `starter entry ${entry.key} (${key}) has no battle art`);
  }
  for (const starter of STARTERS) {
    starter.stages.forEach((stage, idx) => {
      assert.ok(getSpriteAnimationAsset(getSpriteProfileKey(stage.svgFn)), `${starter.id} stage ${idx}`);
    });
  }
});
