import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  showPvpEffectivenessMessage,
  runPvpAttackAnimation,
} from './pvpAnimationOrchestrator.ts';

describe('showPvpEffectivenessMessage', () => {
  it('shows critical message for crit strikes', () => {
    let msg = null;
    showPvpEffectivenessMessage({
      strike: { isCrit: true, eff: 1 },
      setEffMsg: (v) => { msg = v; },
      scheduleClear: () => {},
    });
    assert.ok(msg !== null);
    assert.ok(msg.text.includes('Critical'));
  });

  it('shows super effective for eff > 1', () => {
    let msg = null;
    showPvpEffectivenessMessage({
      strike: { isCrit: false, eff: 2 },
      setEffMsg: (v) => { msg = v; },
      scheduleClear: () => {},
    });
    assert.ok(msg !== null);
    assert.ok(msg.text.includes('Super effective'));
  });

  it('shows not very effective for eff < 1', () => {
    let msg = null;
    showPvpEffectivenessMessage({
      strike: { isCrit: false, eff: 0.5 },
      setEffMsg: (v) => { msg = v; },
      scheduleClear: () => {},
    });
    assert.ok(msg !== null);
    assert.ok(msg.text.includes('Not very effective'));
  });

  it('does nothing for neutral eff=1 non-crit', () => {
    let msg = 'unchanged';
    showPvpEffectivenessMessage({
      strike: { isCrit: false, eff: 1 },
      setEffMsg: (v) => { msg = v; },
      scheduleClear: () => {},
    });
    assert.equal(msg, 'unchanged');
  });
});

describe('runPvpAttackAnimation', () => {
  it('runs player lunge for p1 turn', () => {
    const log = [];
    runPvpAttackAnimation({
      turn: 'p1',
      safeTo: () => {},
      setPhase: (v) => log.push(`phase:${v}`),
      setPAnim: () => {},
      setEAnim: () => {},
      onStrike: () => {},
      orchestratorApi: {
        runPlayerLunge: (args) => { log.push('playerLunge'); args.onReady(); },
        runEnemyLunge: () => { log.push('enemyLunge'); },
      },
    });
    assert.ok(log.includes('phase:playerAtk'));
    assert.ok(log.includes('playerLunge'));
    assert.ok(!log.includes('enemyLunge'));
  });

  it('runs enemy lunge for p2 turn', () => {
    const log = [];
    runPvpAttackAnimation({
      turn: 'p2',
      safeTo: () => {},
      setPhase: (v) => log.push(`phase:${v}`),
      setPAnim: () => {},
      setEAnim: () => {},
      onStrike: () => {},
      orchestratorApi: {
        runPlayerLunge: () => { log.push('playerLunge'); },
        runEnemyLunge: (args) => { log.push('enemyLunge'); args.onStrike(); },
      },
    });
    assert.ok(log.includes('phase:playerAtk'));
    assert.ok(log.includes('enemyLunge'));
    assert.ok(!log.includes('playerLunge'));
  });
});
