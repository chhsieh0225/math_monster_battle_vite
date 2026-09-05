import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBattleSpriteAnimations } from './battleAnimations.ts';

const idle = {
  eAnim: '', pAnim: '', eSubAnim: '', pSubAnim: '',
  lowPerfMode: false, enemyIsBoss: false, enemyLowHp: false, enemyDefeated: false,
};

test('each actor owns its own animation without moving other actors', () => {
  const channels = { eAnim: 'enemyMain', eSubAnim: 'enemySub', pAnim: 'playerMain', pSubAnim: 'playerSub' };
  for (const [channel, actor] of Object.entries(channels)) {
    const before = resolveBattleSpriteAnimations(idle);
    const after = resolveBattleSpriteAnimations({ ...idle, [channel]: 'playerHit 0.5s ease' });
    for (const other of Object.values(channels)) {
      assert.equal(after[other], other === actor ? 'playerHit 0.5s ease' : before[other]);
    }
  }
});

test('simultaneous attack and hit animations stay on their respective slots', () => {
  const resolved = resolveBattleSpriteAnimations({
    ...idle, pAnim: 'playerHit 0.5s ease', pSubAnim: 'attackLunge 0.6s ease',
    eSubAnim: 'enemyAttackLunge 0.6s ease',
  });
  assert.equal(resolved.playerMain, 'playerHit 0.5s ease');
  assert.equal(resolved.playerSub, 'attackLunge 0.6s ease');
  assert.equal(resolved.enemySub, 'enemyAttackLunge 0.6s ease');
});

test('low-performance mode preserves action feedback but disables idle animations', () => {
  const resolved = resolveBattleSpriteAnimations({ ...idle, lowPerfMode: true, pSubAnim: 'playerHit 0.5s ease' });
  assert.equal(resolved.playerMain, 'none');
  assert.equal(resolved.enemyMain, 'none');
  assert.equal(resolved.enemySub, 'none');
  assert.equal(resolved.playerSub, 'playerHit 0.5s ease');
});

test('boss idle, low-HP feedback, and defeat dissolve remain intact', () => {
  assert.match(resolveBattleSpriteAnimations({ ...idle, enemyIsBoss: true }).enemyMain, /battleBossFloat/);
  assert.match(resolveBattleSpriteAnimations({ ...idle, enemyLowHp: true }).enemyMain, /struggle/);
  assert.match(resolveBattleSpriteAnimations({ ...idle, enemyDefeated: true, eAnim: 'enemyHit' }).enemyMain, /enemyDissolve/);
});
