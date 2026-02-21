import assert from 'node:assert/strict';
import test from 'node:test';
import { PROFILES, heightCompensation, getCompensation, VB_W, VB_H } from './spriteProfiles.ts';
import { SPRITE_IMGS } from './sprites.ts';

// ── Profile completeness ─────────────────────────────────────────────

test('every SPRITE_IMGS key has a corresponding profile', () => {
  const imgKeys = Object.keys(SPRITE_IMGS);
  const profileImgKeys = new Set(Object.values(PROFILES).map(p => p.imgKey));
  const missing = imgKeys.filter(k => !profileImgKeys.has(k));
  assert.deepStrictEqual(missing, [], `Missing profiles for SPRITE_IMGS keys: ${missing.join(', ')}`);
});

test('every profile imgKey exists in SPRITE_IMGS', () => {
  for (const [name, p] of Object.entries(PROFILES)) {
    assert.ok(
      p.imgKey in SPRITE_IMGS,
      `Profile "${name}" references unknown SPRITE_IMGS key "${p.imgKey}"`,
    );
  }
});

// ── Height compensation invariants ───────────────────────────────────

test('all profiles have heightCompensation >= 1', () => {
  for (const [name, p] of Object.entries(PROFILES)) {
    const c = heightCompensation(p);
    assert.ok(c >= 1 - 1e-9, `Profile "${name}" has compensation ${c} < 1`);
  }
});

test('standard-fill sprites (120×100, safePad=0) have compensation = 1', () => {
  const stdProfiles = Object.entries(PROFILES)
    .filter(([, p]) => p.natW === VB_W && p.natH === VB_H && p.safePad === 0);
  assert.ok(stdProfiles.length > 0, 'Should have at least one standard-fill profile');
  for (const [name, p] of stdProfiles) {
    assert.equal(heightCompensation(p), 1, `Standard profile "${name}" should have compensation 1`);
  }
});

test('width-bound sprites have compensation > 1', () => {
  // 677×369 are width-bound (aspect > 1.2)
  const wideProfiles = Object.entries(PROFILES)
    .filter(([, p]) => p.natW / p.natH > 1.2);
  assert.ok(wideProfiles.length > 0, 'Should have at least one wide profile');
  for (const [name, p] of wideProfiles) {
    const c = heightCompensation(p);
    assert.ok(c > 1.01, `Wide profile "${name}" should have compensation > 1, got ${c}`);
  }
});

test('height-bound sprites have compensation close to 1', () => {
  // candy_monster 530×471 is height-bound (aspect < 1.2)
  const hBound = Object.entries(PROFILES)
    .filter(([, p]) => p.natW / p.natH < 1.2 && !(p.natW === VB_W && p.natH === VB_H));
  for (const [name, p] of hBound) {
    const c = heightCompensation(p);
    // Height-bound with safePad: compensation = 1/(1-2*safePad) ≈ 1.04–1.09
    assert.ok(c < 1.15, `Height-bound profile "${name}" should have compensation < 1.15, got ${c}`);
  }
});

// ── Formula correctness ─────────────────────────────────────────────

test('compensation for 677×369 (safePad=0) equals old ×1.5 approximation', () => {
  const c = heightCompensation({ imgKey: 'slime', natW: 677, natH: 369, safePad: 0 });
  // Expected: VB_H / (natH * min(VB_W/natW, VB_H/natH))
  //         = 100 / (369 * 120/677) = 100 / 65.4 = 1.529
  assert.ok(Math.abs(c - 1.529) < 0.01, `Expected ~1.529, got ${c}`);
});

test('compensation for 677×369 (safePad=0.05) is ~1.61', () => {
  const c = heightCompensation({ imgKey: 'slime', natW: 677, natH: 369, safePad: 0.05 });
  // aW = 108, aH = 90, s = min(108/677, 90/369) = 0.1595
  // visH = 369 * 0.1595 = 58.86, c = 100/58.86 = 1.699
  assert.ok(c > 1.6 && c < 1.75, `Expected ~1.7, got ${c}`);
});

test('compensation for 590×423 (safePad=0.05) is ~1.22', () => {
  // candy_knight — previously had NO compensation (bug)
  const c = heightCompensation({ imgKey: 'slime', natW: 590, natH: 423, safePad: 0.05 });
  assert.ok(c > 1.15 && c < 1.3, `Expected ~1.22, got ${c}`);
});

// ── getCompensation fallback ─────────────────────────────────────────

test('getCompensation returns 1 for unknown keys', () => {
  assert.equal(getCompensation('nonExistentSprite'), 1);
});

test('getCompensation returns correct value for known profiles', () => {
  const ghost = getCompensation('ghostLanternSVG');
  assert.ok(ghost > 1.5, `ghostLanternSVG compensation should be > 1.5, got ${ghost}`);
  const slime = getCompensation('slimeSVG');
  assert.equal(slime, 1, 'slimeSVG should have compensation 1');
});

// ── Specific sprite values ───────────────────────────────────────────

test('butterfly has higher compensation than ghost_lantern due to extra safePad', () => {
  const butterfly = getCompensation('colorfulButterflySVG');
  const ghost = getCompensation('ghostLanternSVG');
  assert.ok(butterfly > ghost, `butterfly (${butterfly}) should be > ghost (${ghost})`);
});

test('boss_sword_god (tall sprite) has small but non-trivial compensation', () => {
  const sg = getCompensation('bossSwordGodSVG');
  // 409×610 is height-bound. safePad=0.04 → compensation = 1/(1-0.08) ≈ 1.087
  assert.ok(sg > 1.05 && sg < 1.15, `boss_sword_god compensation should be ~1.09, got ${sg}`);
});
