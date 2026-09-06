import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBattleSprite, resolveBattleSpriteClip } from './battleSpriteMotion.ts';
import { resolveBattleSpriteAnimations } from '../../../utils/battleAnimations.ts';
import { effectOrchestrator } from '../../../hooks/battle/effectOrchestrator.ts';

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
