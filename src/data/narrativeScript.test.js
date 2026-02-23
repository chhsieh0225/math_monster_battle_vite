import assert from 'node:assert/strict';
import test from 'node:test';
import { getNarrativeBeat } from './narrativeScript.ts';

test('getNarrativeBeat returns beats for narrative rounds', () => {
  const beat0 = getNarrativeBeat(0);
  assert.notEqual(beat0, null);
  assert.equal(beat0.round, 0);
  assert.equal(beat0.textKey, 'narrative.prologue');

  const beat3 = getNarrativeBeat(3);
  assert.notEqual(beat3, null);
  assert.equal(beat3.round, 3);
  assert.equal(beat3.textKey, 'narrative.midpoint');

  const beat6 = getNarrativeBeat(6);
  assert.notEqual(beat6, null);
  assert.equal(beat6.round, 6);
  assert.equal(beat6.textKey, 'narrative.lategame');

  const beat9 = getNarrativeBeat(9);
  assert.notEqual(beat9, null);
  assert.equal(beat9.round, 9);
  assert.equal(beat9.textKey, 'narrative.preBoss');
});

test('getNarrativeBeat returns null for non-narrative rounds', () => {
  for (const round of [1, 2, 4, 5, 7, 8, 10, 50]) {
    assert.equal(getNarrativeBeat(round), null, `round ${round} should have no beat`);
  }
});

test('getNarrativeBeat returns null for pvp mode', () => {
  assert.equal(getNarrativeBeat(0, 'pvp'), null);
  assert.equal(getNarrativeBeat(3, 'pvp'), null);
  assert.equal(getNarrativeBeat(9, 'pvp'), null);
});

test('getNarrativeBeat returns beats for non-pvp modes', () => {
  for (const mode of ['single', 'double', 'coop', undefined]) {
    const beat = getNarrativeBeat(0, mode);
    assert.notEqual(beat, null, `mode "${mode}" should return a beat for round 0`);
  }
});

test('all narrative beats have valid textKey and non-empty fallback', () => {
  for (const round of [0, 3, 6, 9]) {
    const beat = getNarrativeBeat(round);
    assert.notEqual(beat, null);
    assert.equal(typeof beat.textKey, 'string');
    assert.ok(beat.textKey.length > 0, `round ${round} textKey should be non-empty`);
    assert.equal(typeof beat.fallback, 'string');
    assert.ok(beat.fallback.length > 0, `round ${round} fallback should be non-empty`);
  }
});
