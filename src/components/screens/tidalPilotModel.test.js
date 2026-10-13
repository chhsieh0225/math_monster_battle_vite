import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlayerSkillMotion } from '../../utils/effectTiming.ts';
import { SKILL_SETS } from '../../data/skillSets.ts';
import { getTidalFrame, getTidalLayout, tidalSeed, TIDAL_TIMING } from '../effects/skillEffectModel.ts';

test('tidal preview uses the actual tsunami slot and production strike deadline', () => {
  assert.equal(SKILL_SETS.water[2].name, '海嘯衝擊');
  const motion = getPlayerSkillMotion('water:2');
  assert.equal(TIDAL_TIMING.flight, motion.flightMs);
  assert.equal(TIDAL_TIMING.hit, Math.round(motion.durationMs * .36));
  assert.equal(TIDAL_TIMING.end, motion.durationMs);
});

test('charge, flight and impact do not hit early and fully clear at the end', () => {
  assert.equal(getTidalFrame(0).phase, 'ready');
  assert.equal(getTidalFrame(1).phase, 'charge');
  assert.equal(getTidalFrame(TIDAL_TIMING.release).phase, 'surge');
  assert.equal(getTidalFrame(TIDAL_TIMING.hit - 1).contact, false);
  assert.equal(getTidalFrame(TIDAL_TIMING.hit).phase, 'impact');
  assert.equal(getTidalFrame(TIDAL_TIMING.hit).flight, 1);
  assert.equal(getTidalFrame(TIDAL_TIMING.hit + 180).phase, 'settle');
  assert.equal(getTidalFrame(TIDAL_TIMING.end).phase, 'done');
  assert.equal(getTidalFrame(TIDAL_TIMING.end).contact, false);
});

test('mastery adds bounded detail without changing flight, impact or sprite scale', () => {
  assert.deepEqual([1, 3, 5].map((lv) => getTidalFrame(350, lv).waveCount), [1, 2, 3]);
  for (const level of [-9, 0, 1, 3, 5, 100, NaN, Infinity]) {
    const frame = getTidalFrame(TIDAL_TIMING.hit, level);
    assert.equal(frame.contact, true);
    assert.ok(frame.sprayCount <= 42);
    assert.ok(frame.waveCount <= 3 && frame.waveCount >= 1);
  }
});

test('mobile and reversed anchors retain the same actor size and remain inside the arena', () => {
  for (const [w, h] of [[294, 300], [364, 300], [720, 380], [940, 390]]) {
    const forward = getTidalLayout(w, h);
    const reverse = getTidalLayout(w, h, true);
    assert.equal(forward.source.size, reverse.source.size);
    assert.equal(forward.source.cx, reverse.target.cx);
    assert.equal(forward.target.cx, reverse.source.cx);
    assert.equal(reverse.direction, -1);
    for (const actor of [forward.source, forward.target]) {
      assert.ok(actor.cx - actor.size / 2 > 0);
      assert.ok(actor.cx + actor.size / 2 < w);
      assert.ok(actor.cy - actor.size / 2 > 0);
      assert.ok(actor.cy + actor.size / 2 < h);
    }
  }
});

test('seeking is deterministic and invalid geometry or time stays finite', () => {
  for (let i = 0; i < 42; i++) {
    assert.equal(tidalSeed(i), tidalSeed(i));
    assert.ok(tidalSeed(i) >= 0 && tidalSeed(i) < 1);
  }
  assert.deepEqual(getTidalFrame(390, 5), getTidalFrame(390, 5));
  for (const time of [-1, NaN, Infinity]) assert.equal(getTidalFrame(time).phase, 'ready');
  const layout = getTidalLayout(NaN, -20);
  assert.ok(Number.isFinite(layout.source.cx));
  assert.ok(layout.width > 0 && layout.height > 0);
});
