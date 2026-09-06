import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as sprites from './sprites.ts';
import { PROFILES } from './spriteProfiles.ts';
import { fitSpriteAtlas, getSpriteAnimationAsset, getSpritePosePosition, SPRITE_ANIMATION_ASSETS } from './spriteAnimationAssets.ts';

const registration = JSON.parse(readFileSync(new URL('../../public/sprites/visual-pilot/registration-v2.json', import.meta.url), 'utf8'));

test('all 51 forms have explicit factory identities; only two opt into new art', () => {
  assert.equal(Object.keys(sprites.SPRITE_IMGS).length, 51);
  assert.equal(Object.keys(PROFILES).length, 51);
  for (const [key, profile] of Object.entries(PROFILES)) {
    assert.equal(sprites.getSpriteProfileKey(sprites[key]), key);
    assert.ok(profile.imgKey in sprites.SPRITE_IMGS);
  }
  assert.deepEqual(Object.keys(SPRITE_ANIMATION_ASSETS).sort(), ['boss_crazy_dragon', 'player_wolf2']);
  assert.equal(Object.keys(PROFILES).filter((key) => !getSpriteAnimationAsset(key)).length, 49);
  assert.equal(getSpriteAnimationAsset('missing'), null);
  assert.equal(getSpriteAnimationAsset(), null);
  assert.equal(sprites.getSpriteProfileKey(() => ''), undefined);
});

test('both atlases use fixed union bounds inside the original visual envelope in every pose', () => {
  for (const key of ['playerwolf2SVG', 'bossCrazyDragonSVG']) {
    const { art, profile, src } = getSpriteAnimationAsset(key);
    assert.ok(src.endsWith(`/sprites/visual-pilot/${art.file}`));
    const poses = registration.assets[art.file.replace('.webp', '')].frames;
    assert.deepEqual(art.bounds, [
      Math.min(...poses.map((p) => p.visibleBounds[0])), Math.min(...poses.map((p) => p.visibleBounds[1])),
      Math.max(...poses.map((p) => p.visibleBounds[2])), Math.max(...poses.map((p) => p.visibleBounds[3])),
    ]);
    const frame = fitSpriteAtlas(profile, art);
    const scale = Math.min(120 * (1 - 2 * profile.safePad) / profile.natW,
      100 * (1 - 2 * profile.safePad) / profile.natH);
    const w = Math.round(profile.natW * scale), h = Math.round(profile.natH * scale);
    for (const { visibleBounds: [l, t, r, b] } of poses) {
      assert.ok(frame.x + l * frame.scale >= (120 - w) / 2 - .001);
      assert.ok(frame.x + r * frame.scale <= (120 + w) / 2 + .001);
      assert.ok(frame.y + t * frame.scale >= Math.round((100 - h) / 2) - .001);
      assert.ok(frame.y + b * frame.scale <= Math.round((100 - h) / 2) + h + .001);
    }
  }
  assert.equal(getSpriteAnimationAsset('playerwolf2SVG').profile.flip, undefined);
  assert.equal(getSpriteAnimationAsset('bossCrazyDragonSVG').profile.flip, true);
});

test('atlas positions cannot select a nonexistent cell', () => {
  for (const index of [-1, 8, .5, NaN, Infinity]) assert.equal(getSpritePosePosition(index), '0% 0%');
  assert.equal(new Set(Array.from({ length: 8 }, (_, i) => getSpritePosePosition(i))).size, 8);
});
