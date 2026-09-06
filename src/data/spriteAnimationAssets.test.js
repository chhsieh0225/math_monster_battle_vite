import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as sprites from './sprites.ts';
import { PROFILES } from './spriteProfiles.ts';
import { fitSpriteAtlas, getSpriteAnimationAsset, getSpritePosePosition, SPRITE_ANIMATION_ASSETS } from './spriteAnimationAssets.ts';

const registration = JSON.parse(readFileSync(new URL('../../public/sprites/visual-pilot/registration-v2.json', import.meta.url), 'utf8'));
const wolfRegistration = JSON.parse(readFileSync(new URL('../../public/sprites/visual-pilot/registration-wolf-v1.json', import.meta.url), 'utf8'));
const records = { ...registration.assets, ...wolfRegistration.assets };

test('all 51 forms have explicit factory identities; only four opt into new art', () => {
  assert.equal(Object.keys(sprites.SPRITE_IMGS).length, 51);
  assert.equal(Object.keys(PROFILES).length, 51);
  for (const [key, profile] of Object.entries(PROFILES)) {
    assert.equal(sprites.getSpriteProfileKey(sprites[key]), key);
    assert.ok(profile.imgKey in sprites.SPRITE_IMGS);
  }
  assert.deepEqual(Object.keys(SPRITE_ANIMATION_ASSETS).sort(), ['boss_crazy_dragon', 'player_wolf0', 'player_wolf1', 'player_wolf2']);
  assert.equal(Object.keys(PROFILES).filter((key) => !getSpriteAnimationAsset(key)).length, 47);
  assert.equal(getSpriteAnimationAsset('missing'), null);
  assert.equal(getSpriteAnimationAsset(), null);
  assert.equal(sprites.getSpriteProfileKey(() => ''), undefined);
});

test('all registered atlases use fixed union bounds inside the original visual envelope in every pose', () => {
  for (const key of Object.keys(PROFILES).filter((key) => getSpriteAnimationAsset(key))) {
    const { art, profile, src } = getSpriteAnimationAsset(key);
    assert.ok(src.endsWith(`/sprites/visual-pilot/${art.file}`));
    const poses = records[art.file.replace('.webp', '')].frames;
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

for (const art of Object.values(SPRITE_ANIMATION_ASSETS)) {
  test(`${art.file} has real alpha, a verified footprint and eight registered frames`, () => {
    const record = Object.values(records).find((r) => r.file === art.file);
    const bytes = readFileSync(new URL(`../../public/sprites/visual-pilot/${art.file}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8X');
    assert.ok(bytes[20] & 0x10, 'atlas must have alpha');
    assert.equal(bytes.readUIntLE(24, 3) + 1, 2048);
    assert.equal(bytes.readUIntLE(27, 3) + 1, 768);
    assert.ok(bytes.length < 400_000, 'per-atlas transfer budget');
    assert.equal(record.bytes, bytes.length);
    assert.equal(record.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.equal(record.footX, art.footX);
    assert.equal(record.frames.length, 8);
    for (const [index, frame] of record.frames.entries()) {
      assert.equal(frame.index, index);
      assert.ok(Math.abs(frame.offset[0] + frame.sourceFootX * record.uniformScale - art.footX) <= .5);
      assert.equal(frame.offset[1] + frame.size[1], 368);
      const [l, t, r, b] = frame.visibleBounds;
      assert.ok(l >= 12 && t >= 12 && r <= 500 && b <= 368);
    }
  });
}

test('atlas positions cannot select a nonexistent cell', () => {
  for (const index of [-1, 8, .5, NaN, Infinity]) assert.equal(getSpritePosePosition(index), '0% 0%');
  assert.equal(new Set(Array.from({ length: 8 }, (_, i) => getSpritePosePosition(i))).size, 8);
});
