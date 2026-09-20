import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpriteBodyMotion, resolveBattleSpriteClip } from './battleSpriteMotion.ts';
import { decodeBattleSprite } from '../../../utils/battleSpritePreload.ts';
import { SPRITE_ANIMATION_ASSETS } from '../../../data/spriteAnimationAssets.ts';
import { resolveBattleSpriteAnimations } from '../../../utils/battleAnimations.ts';
import { effectOrchestrator } from '../../../hooks/battle/effectOrchestrator.ts';

test('body weight follows physical artwork, including variants and the second boss phase', () => {
  const groups = {};
  for (const key of Object.keys(SPRITE_ANIMATION_ASSETS)) {
    const family = getSpriteBodyMotion(key);
    (groups[family] ||= []).push(key);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, values.length])), {
    grounded: 23, heavy: 9, soft: 14, hover: 4, wing: 1,
  });
  for (const key of ['boss', 'boss_2nd_phase', 'boss_hydra', 'boss_crazy_dragon', 'candy_knight']) {
    assert.equal(getSpriteBodyMotion(key), 'heavy');
  }
  assert.equal(getSpriteBodyMotion('player_fire0'), 'grounded');
  assert.equal(getSpriteBodyMotion('ghost_evolved'), 'hover');
  assert.equal(getSpriteBodyMotion('boss_sword_god'), 'hover');
  assert.equal(getSpriteBodyMotion('slime_electric_evolved'), 'soft');
});

test('body contraction pivots remain inside every registered silhouette', () => {
  for (const [key, art] of Object.entries(SPRITE_ANIMATION_ASSETS)) {
    const [left, top, right, bottom] = art.bounds;
    assert.ok(art.footX >= left && art.footX <= right);
    assert.equal(bottom, 368);
    // Contraction and the bounded hover stay inside the same safe envelope.
    for (const scale of [.9, .92, .944, .96, .975, .988, 1]) {
      assert.ok(art.footX + (left - art.footX) * scale >= left);
      assert.ok(art.footX + (right - art.footX) * scale <= right);
      assert.ok(368 + (top - 368) * scale >= top);
    }
    if (getSpriteBodyMotion(key) === 'hover') {
      assert.ok(368 + (top - 368) * .976 - 384 * .018 >= top);
    }
  }
});

test('each physical slot owns its attack/hit clip even when other slots animate', () => {
  const animations = resolveBattleSpriteAnimations({
    eAnim: 'enemyFireHit 0.6s ease', eSubAnim: 'enemyAttackLunge 0.5s ease',
    pAnim: 'playerHit 0.5s ease', pSubAnim: 'attackLunge 0.4s ease',
    lowPerfMode: true, enemyIsBoss: true, enemyLowHp: false, enemyDefeated: false,
  });
  assert.deepEqual(Object.fromEntries(['enemyMain', 'enemySub', 'playerMain', 'playerSub']
    .map((slot) => [slot, resolveBattleSpriteClip(animations[slot]).clip])), {
    enemyMain: 'hurt', enemySub: 'attack', playerMain: 'hurt', playerSub: 'attack',
  });
});

test('hit, dodge, charge and defeat poses do not masquerade as attacks', () => {
  for (const name of ['playerHit', 'enemyHit', 'enemyFireHit', 'enemyWaterHit', 'enemyGrassHit', 'enemyElecHit', 'enemyDarkHit']) {
    assert.deepEqual(resolveBattleSpriteClip(`${name} 0.55s ease`), { clip: 'hurt', durationMs: 550 });
  }
  assert.equal(resolveBattleSpriteClip('bossShake 0.5s ease infinite').clip, 'charge');
  assert.equal(resolveBattleSpriteClip('enemyDissolve .9s ease-out forwards').clip, 'defeat');
  assert.equal(resolveBattleSpriteClip('dodgeSlide .9s ease').clip, 'brace');
  assert.equal(resolveBattleSpriteClip('enemyShieldPulse .5s ease').clip, 'brace');
  for (const name of ['', 'none', 'battleFloat 3s ease infinite', 'slideInBattle .6s ease']) {
    assert.equal(resolveBattleSpriteClip(name).clip, 'idle');
  }
  assert.equal(resolveBattleSpriteClip('attackLunge 280ms ease').durationMs, 280);
});

test('normal and PvP enemy clips finish with the authoritative slot clear', () => {
  for (const strikeDelay of [500, 380, 320]) {
    const callbacks = [], animations = [];
    let strikes = 0;
    effectOrchestrator.runEnemyLunge({ strikeDelay,
      safeTo: (fn, ms) => callbacks.push({ fn, ms }),
      setEAnim: (anim) => animations.push(anim), onStrike: () => { strikes++; },
    });
    assert.equal(resolveBattleSpriteClip(animations[0]).durationMs, strikeDelay);
    assert.equal(callbacks[0].ms, strikeDelay);
    assert.equal(strikes, 0);
    callbacks[0].fn();
    assert.equal(animations[1], '');
    assert.equal(strikes, 1);
  }
});

test('decode gate rejects network failures and malformed atlases without losing the fallback', async () => {
  const valid = { naturalWidth: 2048, naturalHeight: 768, decode: async () => {} };
  assert.equal(await decodeBattleSprite('/atlas.webp', () => valid), true);
  assert.equal(valid.src, '/atlas.webp');
  assert.equal(await decodeBattleSprite('/bad.webp', () => ({ ...valid, naturalWidth: 1024 })), false);
  assert.equal(await decodeBattleSprite('/offline.webp', () => ({ decode: async () => { throw new Error('offline'); } })), false);
  assert.equal(await decodeBattleSprite('/unsupported.webp', () => { throw new Error('unsupported'); }), false);
});
