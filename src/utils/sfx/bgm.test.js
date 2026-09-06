import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { createBgmController } from './bgm.ts';
import { resumeAudioContext } from './transport.ts';

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

function harness(t, context = null) {
  let now = 0, nextId = 1, muted = false, volume = .5;
  const timers = new Map(), audio = [], playResults = [];
  const schedule = (fn, ms, repeat) => {
    const id = nextId++;
    timers.set(id, { fn, ms, repeat, at: now + ms });
    return id;
  };
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => schedule(fn, ms, false));
  t.mock.method(globalThis, 'setInterval', (fn, ms) => schedule(fn, ms, true));
  t.mock.method(globalThis, 'clearTimeout', (id) => timers.delete(id));
  t.mock.method(globalThis, 'clearInterval', (id) => timers.delete(id));
  t.mock.method(Date, 'now', () => now);
  const tick = (ms) => {
    const end = now + ms;
    while (true) {
      const task = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!task || task[1].at > end) break;
      const [id, entry] = task;
      now = entry.at;
      if (entry.repeat) entry.at += entry.ms;
      else timers.delete(id);
      entry.fn();
    }
    now = end;
  };
  const doc = new EventTarget(), win = new EventTarget();
  doc.visibilityState = 'visible';
  class FakeAudio extends EventTarget {
    constructor(src) {
      super(); Object.assign(this, { src, paused: true, ended: false, error: null, volume: 0, currentTime: 0, duration: 30, playCalls: 0 });
      audio.push(this);
    }
    setAttribute() {}
    load() {}
    pause() { this.paused = true; this.onpause?.(); }
    play() {
      this.playCalls++;
      const result = playResults.shift();
      if (result) return result(this);
      this.paused = false; this.ended = false;
      return Promise.resolve();
    }
  }
  const saved = ['Audio', 'document', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  Object.assign(globalThis, { Audio: FakeAudio, document: doc, window: win });
  const bgm = createBgmController({
    getCtx: () => context, getReady: () => Boolean(context), getBgmMuted: () => muted,
    getBgmVolume: () => volume, getReverbConvolver: () => null, getCachedNoiseBuffer: () => null,
  });
  t.after(() => {
    bgm.dispose();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return { bgm, audio, playResults, doc, win, tick, timers,
    mute: (next) => { const prev = muted; muted = next; bgm.onMutedChanged(prev, next); },
    volume: (next) => { volume = next; bgm.onVolumeChanged(); },
  };
}

function synthContext() {
  let voices = 0;
  const parameter = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), Q: parameter(), detune: parameter(), connect() {}, disconnect() {}, start() { voices++; }, stop() {} });
  return { state: 'running', currentTime: 0, destination: {}, resume: async () => {},
    createGain: node, createOscillator: node, createBiquadFilter: node, get voices() { return voices; } };
}

test('all file tracks exist and native looping does not allocate new players at track endings', async (t) => {
  const { bgm, audio, tick } = harness(t);
  for (const track of ['menu', 'battle', 'volcano', 'coast', 'thunder', 'ironclad', 'graveyard', 'canyon',
    'boss_hydra', 'boss_crazy_dragon', 'boss_sword_god', 'boss_dark_king']) {
    bgm.startBgm(track);
    await flush();
    const el = audio.at(-1), count = audio.length;
    assert.ok(existsSync(`public${el.src}`), el.src);
    assert.equal(el.loop, true);
    tick(1000);
    for (let loop = 0; loop < 3; loop++) {
      el.ended = true; el.paused = true; el.currentTime = el.duration;
      el.onended();
      await flush();
      tick(1000);
      assert.equal(el.currentTime, 0);
      assert.equal(el.paused, false);
      assert.equal(audio.length, count);
      assert.equal(bgm.getTrack(), track);
    }
    assert.equal(audio.filter(a => !a.paused).length, 1);
  }
});

test('foreground resumes a paused track in place, without requiring the level to change', async (t) => {
  const { bgm, audio, doc } = harness(t);
  bgm.startBgm('boss_sword_god'); await flush();
  const el = audio[0]; el.currentTime = 17;
  el.pause();
  doc.dispatchEvent(new Event('visibilitychange')); await flush();
  assert.equal(el.paused, false);
  assert.equal(el.currentTime, 17);
  assert.equal(audio.length, 1);
  bgm.startBgm('boss_sword_god'); await flush();
  assert.equal(el.playCalls, 2, 'healthy same-track requests do not restart playback');
});

test('autoplay rejection is retried on a gesture, independently of Web Audio unlock', async (t) => {
  const context = { state: 'suspended', resume: () => Promise.reject(new Error('blocked')) };
  const { bgm, audio, playResults, doc } = harness(t, context);
  playResults.push(() => Promise.reject(new Error('autoplay blocked')));
  bgm.startBgm('coast'); await flush();
  assert.equal(audio[0].paused, true);
  doc.dispatchEvent(new Event('click')); await flush();
  assert.equal(audio.at(-1).paused, false);
  assert.equal(bgm.getTrack(), 'coast');
});

test('late playback rejection cannot stop the new level music or resurrect a stopped track', async (t) => {
  const { bgm, audio, playResults, doc, win, tick } = harness(t);
  let reject;
  playResults.push(() => new Promise((_, no) => { reject = no; }));
  bgm.startBgm('volcano');
  bgm.startBgm('boss_sword_god'); await flush();
  reject(new Error('old load failed')); await flush(); tick(1000);
  assert.equal(bgm.getTrack(), 'boss_sword_god');
  assert.equal(audio.at(-1).paused, false);
  bgm.stopBgm(true);
  doc.dispatchEvent(new Event('click')); win.dispatchEvent(new Event('focus')); await flush();
  assert.equal(bgm.getTrack(), null);
  assert.equal(audio.every(el => el.paused), true);
});

test('muting and changing level resumes the latest requested theme; volume ramps cannot undo settings', async (t) => {
  const { bgm, audio, tick, mute, volume } = harness(t);
  bgm.startBgm('battle'); await flush();
  tick(160); volume(.2); tick(1600);
  assert.equal(audio.at(-1).volume, .2);
  mute(true); bgm.startBgm('boss_hydra');
  assert.equal(audio.every(el => el.paused), true);
  mute(false); await flush(); tick(1000);
  assert.equal(bgm.getTrack(), 'boss_hydra');
  assert.equal(audio.at(-1).volume, .2);
});

test('stalled loads and mid-track media errors fall back once instead of remaining silent', async (t) => {
  const context = synthContext();
  const { bgm, audio, playResults, tick, timers } = harness(t, context);
  playResults.push(() => new Promise(() => {}));
  bgm.startBgm('volcano'); tick(8001); await flush();
  assert.ok(context.voices > 0);
  assert.equal(bgm.getTrack(), 'volcano');
  assert.equal(audio[0].paused, true);
  bgm.startBgm('coast'); await flush();
  const el = audio.at(-1), voices = context.voices;
  el.onerror(); await flush();
  assert.ok(context.voices > voices);
  assert.equal(bgm.getTrack(), 'coast');
  assert.equal(el.onerror, null);
  bgm.dispose();
  assert.equal(timers.size, 0);
});

test('a stalled stream that starts playing before timeout is not replaced with a fallback', async (t) => {
  const { bgm, audio, tick } = harness(t);
  bgm.startBgm('thunder'); await flush();
  const el = audio[0]; el.onwaiting(); tick(4000); el.onplaying(); tick(5000);
  assert.equal(el.paused, false);
  assert.equal(audio.length, 1);
});

test('dispose removes recovery listeners and a later mount can register them again', async (t) => {
  const { bgm, audio, doc, win } = harness(t);
  bgm.startBgm('battle'); await flush(); bgm.dispose();
  doc.dispatchEvent(new Event('visibilitychange')); win.dispatchEvent(new Event('pageshow')); await flush();
  assert.equal(audio.length, 1);
  bgm.startBgm('coast'); await flush();
  audio.at(-1).pause(); win.dispatchEvent(new Event('pageshow')); await flush();
  assert.equal(audio.at(-1).paused, false);
});

test('resume requests deduplicate, report rejection honestly, and allow a later gesture to retry', async () => {
  let calls = 0, resolve;
  const ctx = { state: 'suspended', resume: () => { calls++; return new Promise(done => { resolve = done; }); } };
  const first = resumeAudioContext(ctx), second = resumeAudioContext(ctx);
  assert.equal(calls, 1);
  resolve();
  assert.equal(await first, false); assert.equal(await second, false);
  ctx.resume = () => { calls++; ctx.state = 'running'; return Promise.resolve(); };
  assert.equal(await resumeAudioContext(ctx), true); assert.equal(calls, 2);
  assert.equal(await resumeAudioContext({ state: 'suspended', resume: () => Promise.reject(new Error('blocked')) }), false);
  assert.equal(await resumeAudioContext({ state: 'closed', resume: () => { throw new Error('must not resume'); } }), false);
});
