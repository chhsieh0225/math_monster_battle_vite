/**
 * sfx.ts — Sound effects using native Web Audio API.
 * SFX are generated programmatically; BGM can use uploaded music files.
 * Replaces Tone.js (~300KB) with zero-dependency Web Audio (~3KB).
 *
 * Call sfx.init() once after user gesture to unlock AudioContext.
 * Then call sfx.play("hit") etc. anywhere.
 */
import { randomFloat } from './prng.ts';
import { createMixerState, initMixerBus } from './sfx/mixer.ts';
import { createSeDebounce, resolveMoveSoundName } from './sfx/se.ts';
import { createBgmController, type BgmPreloadMode, type BgmTrack } from './sfx/bgm.ts';

let ctx: AudioContext | null = null;
let ready = false;
let sfxDest: AudioNode | null = null;     // SFX master bus → dry+wet
let reverbConvolver: ConvolverNode | null = null;
const pendingSfx = new Set<string>();             // deferred plays waiting for AudioContext resume
const mixer = createMixerState();
const canPlaySe = createSeDebounce(30);

// ── Note → frequency lookup (pre-computed, avoids runtime Math) ──
const NOTE_FREQ: Record<string, number> = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98,
  A2: 110, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Ab3: 207.65, G3: 196,
  A3: 220, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392,
  A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.26, 'F#5': 739.99, G5: 783.99,
  A5: 880, B5: 987.77,
  C6: 1046.5, E6: 1318.51,
};

// ── Duration name → seconds (at ~120bpm) ──
const DUR: Record<string, number> = { '32n': 0.03, '16n': 0.06, '8n': 0.13, '4n': 0.25, '2n': 0.5 };

type PlayNoteOptions = {
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  decay?: number;
  release?: number;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterQ?: number;
  sweepToFreq?: number;
  sweepDur?: number;
};

/** Play a pitched tone (triangle or sine oscillator with envelope). */
function playNote(freq: number, dur: number, {
  type = 'triangle',
  vol = 0.35,
  attack = 0.01,
  decay = 0.15,
  release = 0.12,
  filterType = 'lowpass',
  filterFreq = 0,
  filterQ = 0.7,
  sweepToFreq = 0,
  sweepDur = 0.08,
}: PlayNoteOptions = {}): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = filterFreq > 0 ? ctx.createBiquadFilter() : null;
  osc.type = type;
  osc.frequency.value = freq;
  if (sweepToFreq > 0 && sweepToFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepToFreq), t + Math.max(0.02, sweepDur));
  }
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.01, vol * 0.65), t + attack + decay);
  gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay + dur + release);
  if (filter) {
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.Q.setValueAtTime(filterQ, t);
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }
  gain.connect(sfxDest || ctx.destination);
  osc.start(t);
  osc.stop(t + attack + decay + dur + release + 0.05);
}

/** Play a melodic note by name. */
function melodic(note: string, dur: string): void {
  const f = NOTE_FREQ[note];
  if (f) playNote(f, DUR[dur] || 0.13, { type: 'triangle', vol: 0.3 });
}

/** Play a bass note by name. */
function bass(note: string, dur: string): void {
  const f = NOTE_FREQ[note];
  if (f) playNote(f, DUR[dur] || 0.25, { type: 'sine', vol: 0.45, decay: 0.3 });
}

type NoiseBurstOptions = {
  dur?: number;
  vol?: number;
  hp?: number;
  lp?: number;
  lpSweepTo?: number;
};

/** Play filtered white-noise burst (for hit/impact SFX). */
function noiseBurst({
  dur = 0.08,
  vol = 0.12,
  hp = 200,
  lp = 9000,
  lpSweepTo = 2200,
}: NoiseBurstOptions = {}): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  const bufSize = Math.floor(ctx.sampleRate * Math.max(dur + 0.1, 0.15));
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i += 1) {
    // Very short decay in noise source gives a punchier transient.
    const n = randomFloat(-1, 1);
    const env = 1 - (i / bufSize) * 0.7;
    data[i] = n * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hpFilter = ctx.createBiquadFilter();
  hpFilter.type = 'highpass';
  hpFilter.frequency.setValueAtTime(hp, t);
  hpFilter.Q.setValueAtTime(0.7, t);
  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.setValueAtTime(lp, t);
  lpFilter.Q.setValueAtTime(0.9, t);
  lpFilter.frequency.exponentialRampToValueAtTime(Math.max(200, lpSweepTo), t + dur + 0.03);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
  src.connect(hpFilter);
  hpFilter.connect(lpFilter);
  lpFilter.connect(gain);
  gain.connect(sfxDest || ctx.destination);
  src.start(t);
  src.stop(t + dur + 0.1);
}

let cachedNoise: AudioBuffer | null = null;
let cachedNoiseRate = 0;

function getCachedNoiseBuffer(): AudioBuffer | null {
  if (!ctx) return null;
  if (!cachedNoise || cachedNoiseRate !== ctx.sampleRate) {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = randomFloat(-1, 1);
    cachedNoise = buf;
    cachedNoiseRate = ctx.sampleRate;
  }
  return cachedNoise;
}

type EnvelopeShape = 'flame' | 'wave' | 'whoosh' | 'impact';

const ENVELOPES: Record<EnvelopeShape, Array<[number, number]>> = {
  flame: [
    [0, 0.05],
    [0.12, 0.9],
    [0.26, 0.7],
    [0.4, 1],
    [0.58, 0.64],
    [0.76, 0.42],
    [1, 0],
  ],
  wave: [
    [0, 0],
    [0.25, 0.65],
    [0.48, 1],
    [0.66, 0.82],
    [0.86, 0.35],
    [1, 0],
  ],
  whoosh: [
    [0, 0],
    [0.1, 1],
    [0.26, 0.72],
    [0.56, 0.4],
    [1, 0],
  ],
  impact: [
    [0, 0],
    [0.04, 1],
    [0.18, 0.6],
    [0.42, 0.38],
    [1, 0],
  ],
};

function applyEnvelope(
  gain: GainNode,
  start: number,
  dur: number,
  vol: number,
  shape: EnvelopeShape,
): void {
  const points = ENVELOPES[shape] || ENVELOPES.impact;
  gain.gain.setValueAtTime(0.0001, start);
  for (let i = 0; i < points.length; i += 1) {
    const [pos, amp] = points[i];
    const at = start + dur * pos;
    const value = Math.max(0.0001, amp * vol);
    if (i === 0) {
      gain.gain.setValueAtTime(value, at);
    } else {
      gain.gain.linearRampToValueAtTime(value, at);
    }
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.04);
}

type ShapedNoiseOptions = {
  dur?: number;
  vol?: number;
  hp?: number;
  lp?: number;
  bp?: number;
  q?: number;
  lpSweepTo?: number;
  bpSweepTo?: number;
  shape?: EnvelopeShape;
  startMs?: number;
};

function shapedNoise({
  dur = 0.2,
  vol = 0.12,
  hp = 80,
  lp = 6000,
  bp = 0,
  q = 1.2,
  lpSweepTo = 0,
  bpSweepTo = 0,
  shape = 'impact',
  startMs = 0,
}: ShapedNoiseOptions = {}): void {
  if (!ctx) return;
  const buf = getCachedNoiseBuffer();
  if (!buf) return;
  const t = ctx.currentTime + Math.max(0, startMs) / 1000;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  let node: AudioNode = src;

  if (hp > 20) {
    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(hp, t);
    hpFilter.Q.setValueAtTime(0.7, t);
    node.connect(hpFilter);
    node = hpFilter;
  }
  if (bp > 20) {
    const bpFilter = ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.setValueAtTime(bp, t);
    bpFilter.Q.setValueAtTime(Math.max(0.3, q), t);
    if (bpSweepTo > 0 && bpSweepTo !== bp) {
      bpFilter.frequency.exponentialRampToValueAtTime(Math.max(30, bpSweepTo), t + dur);
    }
    node.connect(bpFilter);
    node = bpFilter;
  }
  if (lp > 30) {
    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(lp, t);
    lpFilter.Q.setValueAtTime(0.75, t);
    if (lpSweepTo > 0 && lpSweepTo !== lp) {
      lpFilter.frequency.exponentialRampToValueAtTime(Math.max(40, lpSweepTo), t + dur);
    }
    node.connect(lpFilter);
    node = lpFilter;
  }
  const gain = ctx.createGain();
  applyEnvelope(gain, t, Math.max(0.05, dur), vol, shape);
  node.connect(gain);
  gain.connect(sfxDest || ctx.destination);
  src.start(t, randomFloat(0, 0.35));
  src.stop(t + dur + 0.08);
}

/** Quick pitch sweep tone for crit/effect accents. */
function sweepTone({
  from,
  to,
  dur = 0.12,
  type = 'sawtooth',
  vol = 0.12,
  filterFrom = 1200,
  filterTo = 3800,
}: {
  from: number;
  to: number;
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  filterFrom?: number;
  filterTo?: number;
}): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterFrom, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo), t + dur);
  filter.Q.setValueAtTime(1.8, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.06);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(sfxDest || ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.08);
}

/** Play metallic ping (high-freq modulated tone). */
function metalPing(dur = 0.1): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const gain = ctx.createGain();
  mod.frequency.value = 1400;
  modGain.gain.value = 800;
  mod.connect(modGain);
  modGain.connect(osc.frequency);
  osc.frequency.value = 200;
  osc.type = 'square';
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
  osc.connect(gain);
  gain.connect(sfxDest || ctx.destination);
  osc.start(t);
  mod.start(t);
  osc.stop(t + dur + 0.1);
  mod.stop(t + dur + 0.1);
}

function scheduleSeries(
  count: number,
  baseDelayMs: number,
  jitterMs: number,
  cb: (i: number) => void,
): void {
  for (let i = 0; i < count; i += 1) {
    const delay = Math.max(0, Math.round(i * baseDelayMs + randomFloat(0, jitterMs)));
    setTimeout(() => cb(i), delay);
  }
}

function crackleSeries({
  count = 5,
  baseDelayMs = 18,
  jitterMs = 28,
  dur = 0.012,
  vol = 0.028,
  hp = 1700,
  lp = 5200,
  startMs = 0,
}: {
  count?: number;
  baseDelayMs?: number;
  jitterMs?: number;
  dur?: number;
  vol?: number;
  hp?: number;
  lp?: number;
  startMs?: number;
} = {}): void {
  const fire = () => {
    scheduleSeries(count, baseDelayMs, jitterMs, () => {
      noiseBurst({
        dur: Math.max(0.008, dur + randomFloat(-0.004, 0.006)),
        vol: Math.max(0.01, vol * randomFloat(0.85, 1.2)),
        hp: Math.max(900, hp * randomFloat(0.88, 1.15)),
        lp: Math.max(2200, lp * randomFloat(0.9, 1.1)),
        lpSweepTo: Math.max(900, lp * 0.55),
      });
    });
  };
  if (startMs > 0) setTimeout(fire, startMs);
  else fire();
}

function rustleSeries({
  count = 8,
  baseDelayMs = 12,
  jitterMs = 20,
  startMs = 0,
}: {
  count?: number;
  baseDelayMs?: number;
  jitterMs?: number;
  startMs?: number;
} = {}): void {
  const fire = () => {
    scheduleSeries(count, baseDelayMs, jitterMs, () => {
      noiseBurst({
        dur: randomFloat(0.01, 0.024),
        vol: randomFloat(0.03, 0.06),
        hp: randomFloat(3000, 4600),
        lp: randomFloat(7800, 12000),
        lpSweepTo: randomFloat(3400, 6200),
      });
    });
  };
  if (startMs > 0) setTimeout(fire, startMs);
  else fire();
}

function arcZapSeries({
  count = 4,
  baseDelayMs = 42,
  jitterMs = 18,
  startMs = 0,
}: {
  count?: number;
  baseDelayMs?: number;
  jitterMs?: number;
  startMs?: number;
} = {}): void {
  const fire = () => {
    const runPulse = (i: number) => {
      shapedNoise({
        dur: randomFloat(0.03, 0.06),
        vol: randomFloat(0.045, 0.085),
        hp: randomFloat(700, 1500),
        lp: randomFloat(6000, 9800),
        bp: randomFloat(1800, 3600),
        q: randomFloat(1.5, 2.6),
        bpSweepTo: randomFloat(1400, 2600),
        shape: 'impact',
      });
      if (i % 2 === 0) metalPing(randomFloat(0.02, 0.05));
      if (i + 1 >= count) return;
      const delay = Math.round(Math.max(18, randomFloat(baseDelayMs - jitterMs, baseDelayMs + jitterMs)));
      setTimeout(() => runPulse(i + 1), delay);
    };
    runPulse(0);
  };
  if (startMs > 0) setTimeout(fire, startMs);
  else fire();
}

function lightResonanceTail(
  note: number,
  startMs: number,
  {
    vol = 0.034,
    release = 0.5,
    filterFreq = 3200,
  }: {
    vol?: number;
    release?: number;
    filterFreq?: number;
  } = {},
): void {
  setTimeout(() => {
    playNote(note, DUR['8n'], {
      type: 'sine',
      vol,
      attack: 0.01,
      decay: 0.12,
      release,
      filterType: 'lowpass',
      filterFreq,
      filterQ: 0.7,
    });
  }, Math.max(0, startMs));
}

function sparkleSeries({
  count = 6,
  baseDelayMs = 20,
  jitterMs = 22,
  startMs = 0,
}: {
  count?: number;
  baseDelayMs?: number;
  jitterMs?: number;
  startMs?: number;
} = {}): void {
  const fire = () => {
    scheduleSeries(count, baseDelayMs, jitterMs, () => {
      noiseBurst({
        dur: randomFloat(0.012, 0.03),
        vol: randomFloat(0.022, 0.052),
        hp: randomFloat(2600, 4200),
        lp: randomFloat(7600, 12000),
        lpSweepTo: randomFloat(4200, 7600),
      });
      if (randomFloat(0, 1) > 0.45) {
        const note = randomFloat(0, 1) > 0.5 ? NOTE_FREQ.C6 : NOTE_FREQ.E6;
        playNote(note, DUR['32n'], {
          type: 'triangle',
          vol: randomFloat(0.04, 0.08),
          attack: 0.002,
          decay: 0.04,
          release: 0.03,
          filterType: 'lowpass',
          filterFreq: randomFloat(5200, 7600),
        });
      }
    });
  };
  if (startMs > 0) setTimeout(fire, startMs);
  else fire();
}

function playFire0(): void {
  shapedNoise({ dur: 0.2, vol: 0.11, hp: 180, lp: 880, bp: 420, q: 1.3, bpSweepTo: 560, shape: 'flame' });
  setTimeout(() => sweepTone({ from: 760, to: 430, dur: 0.12, type: 'triangle', vol: 0.05, filterFrom: 900, filterTo: 460 }), 16);
  crackleSeries({ count: 5, baseDelayMs: 22, jitterMs: 26, vol: 0.026, hp: 1900, lp: 5200, startMs: 20 });
}

function playFire1(): void {
  shapedNoise({ dur: 0.22, vol: 0.13, hp: 200, lp: 980, bp: 560, q: 1.45, bpSweepTo: 820, shape: 'whoosh' });
  setTimeout(() => shapedNoise({ dur: 0.13, vol: 0.09, hp: 220, lp: 1200, bp: 640, q: 1.6, bpSweepTo: 440, shape: 'flame' }), 72);
  setTimeout(() => sweepTone({ from: 320, to: 960, dur: 0.1, type: 'sawtooth', vol: 0.075, filterFrom: 560, filterTo: 2200 }), 28);
  crackleSeries({ count: 6, baseDelayMs: 16, jitterMs: 20, vol: 0.024, hp: 1800, lp: 5000, startMs: 30 });
}

function playFire2(): void {
  shapedNoise({ dur: 0.32, vol: 0.18, hp: 120, lp: 1700, bp: 360, q: 1.05, bpSweepTo: 260, shape: 'impact' });
  playNote(NOTE_FREQ.E2, DUR['4n'], { type: 'sine', vol: 0.34, attack: 0.002, decay: 0.14, release: 0.18, sweepToFreq: NOTE_FREQ.C2, sweepDur: 0.22, filterType: 'lowpass', filterFreq: 920 });
  setTimeout(() => shapedNoise({ dur: 0.26, vol: 0.11, hp: 160, lp: 1200, bp: 440, q: 1.3, bpSweepTo: 560, shape: 'flame' }), 74);
  crackleSeries({ count: 8, baseDelayMs: 14, jitterMs: 18, vol: 0.028, hp: 2000, lp: 5600, startMs: 54 });
}

function playFire3(): void {
  shapedNoise({ dur: 0.24, vol: 0.09, hp: 220, lp: 960, bp: 640, q: 1.55, bpSweepTo: 280, shape: 'whoosh' });
  sweepTone({ from: 980, to: 110, dur: 0.25, type: 'triangle', vol: 0.09, filterFrom: 1800, filterTo: 260 });
  setTimeout(() => {
    playNote(NOTE_FREQ.C2, DUR['2n'], { type: 'sawtooth', vol: 0.22, attack: 0.002, decay: 0.14, release: 0.2, sweepToFreq: NOTE_FREQ.E2 * 0.8, sweepDur: 0.18, filterType: 'lowpass', filterFreq: 820 });
    shapedNoise({ dur: 0.46, vol: 0.24, hp: 90, lp: 1500, bp: 300, q: 1, bpSweepTo: 220, shape: 'impact' });
  }, 140);
  crackleSeries({ count: 10, baseDelayMs: 12, jitterMs: 18, vol: 0.031, hp: 2100, lp: 5800, startMs: 126 });
}

function playWater0(): void {
  shapedNoise({ dur: 0.2, vol: 0.088, hp: 70, lp: 1900, bp: 760, q: 1.2, bpSweepTo: 980, shape: 'wave' });
  setTimeout(() => playNote(NOTE_FREQ.E5, DUR['32n'], { type: 'sine', vol: 0.14, attack: 0.003, decay: 0.05, release: 0.06, filterType: 'lowpass', filterFreq: 3600 }), 20);
  setTimeout(() => noiseBurst({ dur: 0.03, vol: 0.052, hp: 1100, lp: 5200, lpSweepTo: 1800 }), 14);
}

function playWater1(): void {
  shapedNoise({ dur: 0.24, vol: 0.11, hp: 120, lp: 2200, bp: 900, q: 1.45, bpSweepTo: 580, shape: 'whoosh' });
  setTimeout(() => sweepTone({ from: 930, to: 360, dur: 0.12, type: 'triangle', vol: 0.065, filterFrom: 1700, filterTo: 620 }), 10);
  setTimeout(() => noiseBurst({ dur: 0.05, vol: 0.056, hp: 1700, lp: 6200, lpSweepTo: 1900 }), 86);
}

function playWater2(): void {
  shapedNoise({ dur: 0.5, vol: 0.17, hp: 40, lp: 1500, bp: 420, q: 0.95, bpSweepTo: 300, shape: 'wave' });
  setTimeout(() => shapedNoise({ dur: 0.32, vol: 0.1, hp: 60, lp: 1900, bp: 520, q: 1.05, bpSweepTo: 360, shape: 'wave' }), 58);
  setTimeout(() => playNote(NOTE_FREQ.A3, DUR['8n'], { type: 'triangle', vol: 0.12, attack: 0.003, decay: 0.1, release: 0.12, filterType: 'lowpass', filterFreq: 1300 }), 92);
}

function playWater3(): void {
  shapedNoise({ dur: 0.28, vol: 0.11, hp: 90, lp: 2100, bp: 620, q: 1.2, bpSweepTo: 330, shape: 'wave' });
  setTimeout(() => sweepTone({ from: 560, to: 170, dur: 0.18, type: 'sine', vol: 0.06, filterFrom: 980, filterTo: 250 }), 26);
  setTimeout(() => {
    playNote(NOTE_FREQ.E2, DUR['4n'], { type: 'sine', vol: 0.24, attack: 0.002, decay: 0.13, release: 0.18, sweepToFreq: NOTE_FREQ.C2, sweepDur: 0.16, filterType: 'lowpass', filterFreq: 840 });
    shapedNoise({ dur: 0.56, vol: 0.2, hp: 30, lp: 1200, bp: 320, q: 0.9, bpSweepTo: 240, shape: 'impact' });
  }, 164);
}

function playElectric0(): void {
  shapedNoise({ dur: 0.1, vol: 0.085, hp: 850, lp: 9000, bp: 2800, q: 2.2, bpSweepTo: 1900, shape: 'impact' });
  setTimeout(() => sweepTone({ from: 1720, to: 620, dur: 0.08, type: 'square', vol: 0.055, filterFrom: 3200, filterTo: 1000 }), 8);
  arcZapSeries({ count: 2, baseDelayMs: 40, jitterMs: 10, startMs: 12 });
}

function playElectric1(): void {
  shapedNoise({ dur: 0.16, vol: 0.105, hp: 780, lp: 9800, bp: 3000, q: 2.4, bpSweepTo: 2100, shape: 'whoosh' });
  setTimeout(() => sweepTone({ from: 1300, to: 420, dur: 0.08, type: 'square', vol: 0.06, filterFrom: 2600, filterTo: 900 }), 18);
  arcZapSeries({ count: 4, baseDelayMs: 44, jitterMs: 14, startMs: 16 });
}

function playElectric2(): void {
  shapedNoise({ dur: 0.23, vol: 0.14, hp: 420, lp: 7600, bp: 1800, q: 1.9, bpSweepTo: 1300, shape: 'impact' });
  sweepTone({ from: 220, to: 1600, dur: 0.14, type: 'sawtooth', vol: 0.09, filterFrom: 1100, filterTo: 4200 });
  setTimeout(() => playNote(NOTE_FREQ.C2, DUR['16n'], { type: 'sine', vol: 0.15, attack: 0.002, decay: 0.08, release: 0.08, sweepToFreq: NOTE_FREQ.B2, sweepDur: 0.1, filterType: 'lowpass', filterFreq: 720 }), 60);
  arcZapSeries({ count: 5, baseDelayMs: 42, jitterMs: 16, startMs: 52 });
}

function playElectric3(): void {
  sweepTone({ from: 180, to: 1580, dur: 0.17, type: 'triangle', vol: 0.082, filterFrom: 700, filterTo: 3900 });
  shapedNoise({ dur: 0.18, vol: 0.08, hp: 880, lp: 9800, bp: 2600, q: 2.1, bpSweepTo: 1500, shape: 'whoosh' });
  setTimeout(() => {
    shapedNoise({ dur: 0.38, vol: 0.2, hp: 300, lp: 7000, bp: 1500, q: 1.4, bpSweepTo: 900, shape: 'impact' });
    shapedNoise({ dur: 0.42, vol: 0.11, hp: 30, lp: 200, shape: 'impact' });
    playNote(NOTE_FREQ.C3, DUR['16n'], { type: 'square', vol: 0.15, attack: 0.002, decay: 0.08, release: 0.1, filterType: 'bandpass', filterFreq: 900, filterQ: 1.3 });
  }, 120);
  arcZapSeries({ count: 8, baseDelayMs: 46, jitterMs: 20, startMs: 110 });
  setTimeout(() => metalPing(0.12), 210);
}

function playGrass0(): void {
  rustleSeries({ count: 6, baseDelayMs: 11, jitterMs: 18 });
  setTimeout(() => playNote(NOTE_FREQ.G5, DUR['32n'], { type: 'triangle', vol: 0.09, attack: 0.002, decay: 0.05, release: 0.04, filterType: 'lowpass', filterFreq: 4200 }), 34);
}

function playGrass1(): void {
  rustleSeries({ count: 8, baseDelayMs: 10, jitterMs: 15 });
  sweepTone({ from: 280, to: 900, dur: 0.13, type: 'sawtooth', vol: 0.065, filterFrom: 1200, filterTo: 3200 });
}

function playGrass2(): void {
  rustleSeries({ count: 12, baseDelayMs: 8, jitterMs: 18 });
  scheduleSeries(10, 10, 18, (i) => {
    noiseBurst({ dur: 0.014, vol: 0.042, hp: 3400, lp: 12000, lpSweepTo: 6400 });
    if (i % 2 === 0) playNote(NOTE_FREQ.E6, DUR['32n'], { type: 'triangle', vol: 0.06, attack: 0.002, decay: 0.04, release: 0.03, filterType: 'lowpass', filterFreq: 5800 });
  });
}

function playGrass3(): void {
  shapedNoise({ dur: 0.24, vol: 0.1, hp: 260, lp: 1800, bp: 480, q: 1.2, bpSweepTo: 300, shape: 'impact' });
  rustleSeries({ count: 14, baseDelayMs: 9, jitterMs: 16 });
  setTimeout(() => bass('D2', '8n'), 120);
}

function playDark0(): void {
  shapedNoise({ dur: 0.14, vol: 0.1, hp: 50, lp: 1300, bp: 240, q: 1.1, bpSweepTo: 180, shape: 'flame' });
  setTimeout(() => bass('D2', '16n'), 18);
}

function playDark1(): void {
  shapedNoise({ dur: 0.19, vol: 0.11, hp: 60, lp: 1500, bp: 300, q: 1.2, bpSweepTo: 460, shape: 'whoosh' });
  sweepTone({ from: 180, to: 620, dur: 0.12, type: 'sawtooth', vol: 0.066, filterFrom: 760, filterTo: 1900 });
  setTimeout(() => shapedNoise({ dur: 0.12, vol: 0.08, hp: 80, lp: 1200, bp: 220, q: 1.15, bpSweepTo: 180, shape: 'impact' }), 56);
}

function playDark2(): void {
  shapedNoise({ dur: 0.28, vol: 0.15, hp: 40, lp: 1700, bp: 280, q: 1.1, bpSweepTo: 200, shape: 'impact' });
  setTimeout(() => bass('C2', '8n'), 46);
  setTimeout(() => shapedNoise({ dur: 0.16, vol: 0.085, hp: 60, lp: 1400, bp: 240, q: 1.2, bpSweepTo: 360, shape: 'flame' }), 96);
  setTimeout(() => metalPing(0.08), 152);
}

function playDark3(): void {
  sweepTone({ from: 720, to: 96, dur: 0.25, type: 'triangle', vol: 0.088, filterFrom: 1600, filterTo: 230 });
  shapedNoise({ dur: 0.2, vol: 0.09, hp: 90, lp: 1700, bp: 420, q: 1.35, bpSweepTo: 180, shape: 'whoosh' });
  setTimeout(() => {
    shapedNoise({ dur: 0.42, vol: 0.2, hp: 30, lp: 1200, bp: 190, q: 0.95, bpSweepTo: 130, shape: 'impact' });
    bass('C2', '4n');
  }, 136);
}

function playLight0(): void {
  shapedNoise({ dur: 0.14, vol: 0.07, hp: 1300, lp: 11000, bp: 3600, q: 1.15, bpSweepTo: 4600, shape: 'wave' });
  playNote(NOTE_FREQ.C6, DUR['32n'], { type: 'triangle', vol: 0.11, attack: 0.002, decay: 0.05, release: 0.04, filterType: 'lowpass', filterFreq: 6200 });
  setTimeout(() => playNote(NOTE_FREQ.G5, DUR['32n'], { type: 'triangle', vol: 0.09, attack: 0.002, decay: 0.05, release: 0.04, filterType: 'lowpass', filterFreq: 5600 }), 22);
  sparkleSeries({ count: 3, baseDelayMs: 20, jitterMs: 16, startMs: 8 });
  lightResonanceTail(NOTE_FREQ.C6, 30, { vol: 0.028, release: 0.46, filterFreq: 3400 });
}

function playLight1(): void {
  shapedNoise({ dur: 0.2, vol: 0.082, hp: 1400, lp: 12000, bp: 4200, q: 1.35, bpSweepTo: 5800, shape: 'whoosh' });
  sweepTone({ from: 380, to: 1180, dur: 0.11, type: 'triangle', vol: 0.06, filterFrom: 1600, filterTo: 4200 });
  setTimeout(() => melodic('E6', '16n'), 24);
  setTimeout(() => melodic('C6', '16n'), 78);
  sparkleSeries({ count: 4, baseDelayMs: 18, jitterMs: 16, startMs: 12 });
  lightResonanceTail(NOTE_FREQ.E6, 86, { vol: 0.03, release: 0.52, filterFreq: 3600 });
}

function playLight2(): void {
  shapedNoise({ dur: 0.2, vol: 0.1, hp: 1200, lp: 11000, bp: 3400, q: 1.2, bpSweepTo: 2200, shape: 'impact' });
  playNote(NOTE_FREQ.C6, DUR['16n'], { type: 'triangle', vol: 0.15, attack: 0.003, decay: 0.08, release: 0.07, filterType: 'lowpass', filterFreq: 6200 });
  setTimeout(() => playNote(NOTE_FREQ.E6, DUR['16n'], { type: 'triangle', vol: 0.12, attack: 0.003, decay: 0.08, release: 0.08, filterType: 'lowpass', filterFreq: 5800 }), 40);
  sparkleSeries({ count: 6, baseDelayMs: 14, jitterMs: 14, startMs: 18 });
  lightResonanceTail(NOTE_FREQ.C6, 68, { vol: 0.033, release: 0.56, filterFreq: 3400 });
  lightResonanceTail(NOTE_FREQ.E6, 94, { vol: 0.026, release: 0.48, filterFreq: 3200 });
}

function playLight3(): void {
  shapedNoise({ dur: 0.22, vol: 0.09, hp: 1500, lp: 12000, bp: 3800, q: 1.45, bpSweepTo: 2200, shape: 'whoosh' });
  sweepTone({ from: 640, to: 210, dur: 0.19, type: 'triangle', vol: 0.065, filterFrom: 2200, filterTo: 400 });
  setTimeout(() => {
    playNote(NOTE_FREQ.C5, DUR['8n'], { type: 'triangle', vol: 0.14, attack: 0.003, decay: 0.08, release: 0.08, filterType: 'lowpass', filterFreq: 4200 });
    shapedNoise({ dur: 0.34, vol: 0.14, hp: 900, lp: 11000, bp: 2400, q: 1.1, bpSweepTo: 1400, shape: 'impact' });
  }, 120);
  sparkleSeries({ count: 8, baseDelayMs: 12, jitterMs: 16, startMs: 100 });
  setTimeout(() => playNote(NOTE_FREQ.C5, DUR['16n'], { type: 'triangle', vol: 0.08, attack: 0.003, decay: 0.07, release: 0.18, filterType: 'lowpass', filterFreq: 5000 }), 184);
  setTimeout(() => playNote(NOTE_FREQ.E5, DUR['16n'], { type: 'triangle', vol: 0.068, attack: 0.003, decay: 0.07, release: 0.2, filterType: 'lowpass', filterFreq: 5400 }), 236);
  setTimeout(() => playNote(NOTE_FREQ.G5, DUR['16n'], { type: 'triangle', vol: 0.056, attack: 0.003, decay: 0.07, release: 0.22, filterType: 'lowpass', filterFreq: 5800 }), 286);
  setTimeout(() => playNote(NOTE_FREQ.C6, DUR['16n'], { type: 'triangle', vol: 0.046, attack: 0.003, decay: 0.08, release: 0.26, filterType: 'lowpass', filterFreq: 6200 }), 338);
  lightResonanceTail(NOTE_FREQ.C6, 356, { vol: 0.029, release: 0.6, filterFreq: 3600 });
}

const SOUNDS = {
  hit: () => {
    noiseBurst({ dur: 0.045, vol: 0.09, hp: 700, lp: 7600, lpSweepTo: 2600 });
    playNote(NOTE_FREQ.C4, DUR['32n'], { type: 'sine', vol: 0.22, attack: 0.002, decay: 0.04, release: 0.05, sweepToFreq: NOTE_FREQ.G3 });
    setTimeout(() => playNote(NOTE_FREQ.E5, DUR['32n'], { type: 'triangle', vol: 0.14, attack: 0.003, decay: 0.06, release: 0.04, filterFreq: 4800, filterType: 'lowpass' }), 22);
  },
  wrong: () => {
    playNote(NOTE_FREQ.E3, DUR['8n'], { type: 'square', vol: 0.2, attack: 0.003, decay: 0.1, release: 0.08, filterType: 'lowpass', filterFreq: 1800, filterQ: 1.1 });
    setTimeout(() => playNote(NOTE_FREQ.Eb3, DUR['8n'], { type: 'square', vol: 0.16, attack: 0.002, decay: 0.09, release: 0.09, filterType: 'lowpass', filterFreq: 1300, filterQ: 1.1 }), 110);
  },
  crit: () => {
    noiseBurst({ dur: 0.07, vol: 0.13, hp: 900, lp: 9800, lpSweepTo: 3600 });
    sweepTone({ from: 420, to: 1420, dur: 0.12, type: 'sawtooth', vol: 0.11, filterFrom: 1000, filterTo: 4200 });
    playNote(NOTE_FREQ.C5, DUR['16n'], { type: 'triangle', vol: 0.2, attack: 0.003, decay: 0.08, release: 0.08, filterType: 'bandpass', filterFreq: 2000, filterQ: 1.2 });
    setTimeout(() => playNote(NOTE_FREQ.G5, DUR['16n'], { type: 'triangle', vol: 0.19, attack: 0.003, decay: 0.08, release: 0.08, filterType: 'bandpass', filterFreq: 2400, filterQ: 1.1 }), 44);
    setTimeout(() => playNote(NOTE_FREQ.C6, DUR['8n'], { type: 'sawtooth', vol: 0.16, attack: 0.004, decay: 0.12, release: 0.1, filterType: 'lowpass', filterFreq: 3600 }), 94);
  },
  playerHit: () => {
    noiseBurst({ dur: 0.065, vol: 0.14, hp: 240, lp: 4600, lpSweepTo: 1600 });
    playNote(NOTE_FREQ.C2, DUR['8n'], { type: 'sine', vol: 0.34, attack: 0.002, decay: 0.1, release: 0.1, sweepToFreq: NOTE_FREQ.E2 * 0.75, sweepDur: 0.1 });
  },
  victory: () => {
    ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => setTimeout(() => melodic(n, '8n'), i * 100));
  },
  ko: () => {
    noiseBurst({ dur: 0.15, vol: 0.16, hp: 120, lp: 4200, lpSweepTo: 700 });
    sweepTone({ from: 240, to: 70, dur: 0.22, type: 'sawtooth', vol: 0.09, filterFrom: 1300, filterTo: 320 });
    ['C4', 'B3', 'Bb3', 'A3'].forEach((n, i) => setTimeout(() => playNote(NOTE_FREQ[n], DUR['4n'], { type: 'triangle', vol: 0.16, attack: 0.004, decay: 0.14, release: 0.1, filterType: 'lowpass', filterFreq: 2200 - i * 350 }), i * 160));
  },
  levelUp: () => {
    ['E5', 'G5', 'B5', 'E6'].forEach((n, i) => setTimeout(() => melodic(n, '8n'), i * 80));
  },
  evolve: () => {
    // ── Phase 0 ms: Flash — deep bass rumble + metallic impact ──
    bass('C2', '4n');
    noiseBurst({ dur: 0.18, vol: 0.14, hp: 80, lp: 2200, lpSweepTo: 600 });
    metalPing(0.15);

    // ── Phase 100–350 ms: Burst rings — ascending sparkle wave ──
    sparkleSeries({ count: 8, baseDelayMs: 28, jitterMs: 18, startMs: 100 });
    setTimeout(() => sweepTone({ from: 220, to: 880, dur: 0.2, type: 'triangle', vol: 0.08, filterFrom: 800, filterTo: 3200 }), 120);

    // ── Phase 400 ms: Sprite grow-in — warm rising chord (C–E–G) ──
    setTimeout(() => {
      playNote(NOTE_FREQ.C4, DUR['4n'], { type: 'triangle', vol: 0.2, attack: 0.01, decay: 0.15, release: 0.2, filterType: 'lowpass', filterFreq: 3200 });
    }, 400);
    setTimeout(() => {
      playNote(NOTE_FREQ.E4, DUR['4n'], { type: 'triangle', vol: 0.18, attack: 0.01, decay: 0.15, release: 0.2, filterType: 'lowpass', filterFreq: 3600 });
    }, 480);
    setTimeout(() => {
      playNote(NOTE_FREQ.G4, DUR['4n'], { type: 'triangle', vol: 0.16, attack: 0.01, decay: 0.15, release: 0.2, filterType: 'lowpass', filterFreq: 4000 });
    }, 560);

    // ── Phase 800 ms: Title reveal — bright octave leap ──
    setTimeout(() => {
      melodic('C5', '8n');
      sparkleSeries({ count: 4, baseDelayMs: 22, jitterMs: 14 });
    }, 800);
    setTimeout(() => melodic('E5', '8n'), 900);

    // ── Phase 1000 ms: Emoji pop — fanfare stab ──
    setTimeout(() => {
      playNote(NOTE_FREQ.G5, DUR['8n'], { type: 'sawtooth', vol: 0.14, attack: 0.003, decay: 0.1, release: 0.12, filterType: 'lowpass', filterFreq: 4800 });
      noiseBurst({ dur: 0.04, vol: 0.06, hp: 2000, lp: 9000, lpSweepTo: 4000 });
    }, 1000);

    // ── Phase 1300 ms: Name reveal — triumphant C major resolution ──
    setTimeout(() => {
      playNote(NOTE_FREQ.C6, DUR['4n'], { type: 'triangle', vol: 0.18, attack: 0.005, decay: 0.2, release: 0.35, filterType: 'lowpass', filterFreq: 5600 });
      playNote(NOTE_FREQ.E5, DUR['4n'], { type: 'sine', vol: 0.1, attack: 0.01, decay: 0.2, release: 0.3 });
      playNote(NOTE_FREQ.G5, DUR['4n'], { type: 'sine', vol: 0.08, attack: 0.01, decay: 0.2, release: 0.3 });
    }, 1300);
    // Resonance tail
    lightResonanceTail(NOTE_FREQ.C6, 1500, { vol: 0.032, release: 0.6, filterFreq: 3800 });
    lightResonanceTail(NOTE_FREQ.E6, 1600, { vol: 0.024, release: 0.5, filterFreq: 3400 });

    // ── Phase 1900 ms: Button appear — soft closing chime ──
    setTimeout(() => {
      playNote(NOTE_FREQ.G5, DUR['16n'], { type: 'triangle', vol: 0.06, attack: 0.003, decay: 0.06, release: 0.15, filterType: 'lowpass', filterFreq: 4200 });
      playNote(NOTE_FREQ.C6, DUR['16n'], { type: 'triangle', vol: 0.05, attack: 0.003, decay: 0.06, release: 0.18, filterType: 'lowpass', filterFreq: 4600 });
    }, 1900);
  },
  bossVictory: () => {
    // ── 0 ms: Massive impact — bass slam + noise burst + metal ──
    bass('C2', '2n');
    noiseBurst({ dur: 0.25, vol: 0.2, hp: 60, lp: 3600, lpSweepTo: 600 });
    metalPing(0.2);
    shapedNoise({ dur: 0.3, vol: 0.15, hp: 40, lp: 1800, bp: 300, q: 1.1, bpSweepTo: 180, shape: 'impact' });

    // ── 200 ms: Shatter crackles ──
    crackleSeries({ count: 12, baseDelayMs: 16, jitterMs: 22, vol: 0.035, hp: 1800, lp: 6000, startMs: 200 });
    arcZapSeries({ count: 6, baseDelayMs: 38, jitterMs: 16, startMs: 250 });

    // ── 500 ms: Rising sweep — tension to triumph ──
    setTimeout(() => sweepTone({ from: 120, to: 980, dur: 0.3, type: 'sawtooth', vol: 0.1, filterFrom: 400, filterTo: 3600 }), 500);
    setTimeout(() => bass('E2', '4n'), 600);

    // ── 800 ms: Fanfare — heroic brass-like stabs ──
    setTimeout(() => {
      playNote(NOTE_FREQ.C5, DUR['8n'], { type: 'sawtooth', vol: 0.16, attack: 0.005, decay: 0.12, release: 0.1, filterType: 'lowpass', filterFreq: 3200 });
    }, 800);
    setTimeout(() => {
      playNote(NOTE_FREQ.E5, DUR['8n'], { type: 'sawtooth', vol: 0.14, attack: 0.005, decay: 0.12, release: 0.1, filterType: 'lowpass', filterFreq: 3600 });
    }, 920);
    setTimeout(() => {
      playNote(NOTE_FREQ.G5, DUR['8n'], { type: 'sawtooth', vol: 0.13, attack: 0.005, decay: 0.12, release: 0.1, filterType: 'lowpass', filterFreq: 4000 });
    }, 1040);

    // ── 1200 ms: Victory chord — full major triad held ──
    setTimeout(() => {
      playNote(NOTE_FREQ.C6, DUR['2n'], { type: 'triangle', vol: 0.2, attack: 0.008, decay: 0.25, release: 0.4, filterType: 'lowpass', filterFreq: 5200 });
      playNote(NOTE_FREQ.E5, DUR['2n'], { type: 'sine', vol: 0.12, attack: 0.01, decay: 0.2, release: 0.35 });
      playNote(NOTE_FREQ.G5, DUR['2n'], { type: 'sine', vol: 0.1, attack: 0.01, decay: 0.2, release: 0.35 });
      sparkleSeries({ count: 10, baseDelayMs: 18, jitterMs: 20 });
    }, 1200);

    // ── 1600 ms: Resonance tail — ethereal decay ──
    lightResonanceTail(NOTE_FREQ.C6, 1600, { vol: 0.035, release: 0.7, filterFreq: 3600 });
    lightResonanceTail(NOTE_FREQ.E6, 1750, { vol: 0.025, release: 0.6, filterFreq: 3200 });
    lightResonanceTail(NOTE_FREQ.G5, 1900, { vol: 0.02, release: 0.5, filterFreq: 3000 });
  },
  select: () => { melodic('E5', '32n'); },
  fire0: playFire0,
  fire1: playFire1,
  fire2: playFire2,
  fire3: playFire3,
  water0: playWater0,
  water1: playWater1,
  water2: playWater2,
  water3: playWater3,
  electric0: playElectric0,
  electric1: playElectric1,
  electric2: playElectric2,
  electric3: playElectric3,
  grass0: playGrass0,
  grass1: playGrass1,
  grass2: playGrass2,
  grass3: playGrass3,
  dark0: playDark0,
  dark1: playDark1,
  dark2: playDark2,
  dark3: playDark3,
  light0: playLight0,
  light1: playLight1,
  light2: playLight2,
  light3: playLight3,
  fire: playFire1,
  water: playWater1,
  electric: playElectric1,
  grass: playGrass1,
  dark: playDark1,
  light: playLight1,
  bossCharge: () => {
    bass('E2', '4n');
    setTimeout(() => bass('F2', '4n'), 300);
  },
  bossBoom: () => {
    bass('C2', '2n');
    setTimeout(() => noiseBurst({ dur: 0.25, vol: 0.18, hp: 160, lp: 5200, lpSweepTo: 900 }), 100);
    setTimeout(() => metalPing(0.25), 150);
  },
  seal: () => {
    melodic('Bb3', '8n');
    setTimeout(() => melodic('E3', '8n'), 150);
  },
  specDef: () => {
    metalPing(0.06);
    setTimeout(() => melodic('A5', '8n'), 50);
    setTimeout(() => melodic('C6', '8n'), 130);
  },
  staticDischarge: () => {
    metalPing(0.06);
    setTimeout(() => metalPing(0.06), 40);
    setTimeout(() => metalPing(0.06), 80);
  },
  freeze: () => {
    melodic('B5', '16n');
    setTimeout(() => melodic('F#5', '8n'), 80);
  },
  effective: () => {
    sweepTone({ from: 640, to: 1220, dur: 0.09, type: 'triangle', vol: 0.08, filterFrom: 1600, filterTo: 3600 });
    setTimeout(() => playNote(NOTE_FREQ.E6, DUR['32n'], { type: 'triangle', vol: 0.12, attack: 0.002, decay: 0.05, release: 0.05, filterFreq: 4200 }), 26);
  },
  resist: () => {
    playNote(NOTE_FREQ.Bb3, DUR['16n'], { type: 'square', vol: 0.09, attack: 0.003, decay: 0.08, release: 0.06, filterType: 'lowpass', filterFreq: 1400 });
    setTimeout(() => playNote(NOTE_FREQ.F3, DUR['16n'], { type: 'square', vol: 0.08, attack: 0.003, decay: 0.09, release: 0.08, filterType: 'lowpass', filterFreq: 1200 }), 50);
  },
  heal: () => {
    melodic('C5', '16n');
    setTimeout(() => melodic('E5', '16n'), 100);
    setTimeout(() => melodic('G5', '16n'), 200);
  },
  tick: () => { metalPing(0.03); },
  timeout: () => {
    melodic('F3', '8n');
    setTimeout(() => melodic('C3', '4n'), 150);
  },
} as const;

type SoundName = keyof typeof SOUNDS;

function isSoundName(name: string): name is SoundName {
  return Object.prototype.hasOwnProperty.call(SOUNDS, name);
}

type AudioCtor = {
  new (): AudioContext;
};

function isAudioCtor(value: unknown): value is AudioCtor {
  return typeof value === 'function';
}

declare global {
  interface Window {
    webkitAudioContext?: AudioCtor;
  }
}

let resumePromise: Promise<void> | null = null;

function resumeAudioIfNeeded(onReady?: () => void): void {
  if (!ctx) return;
  const runReady = () => {
    if (onReady) {
      try { onReady(); } catch { /* best-effort */ }
    }
  };
  if (ctx.state === 'running') {
    runReady();
    return;
  }
  if (resumePromise) {
    if (onReady) resumePromise.then(runReady).catch(() => {});
    return;
  }
  resumePromise = ctx
    .resume()
    .then(() => {
      resumePromise = null;
    })
    .catch(() => {
      resumePromise = null;
    });
  if (onReady) resumePromise.then(runReady).catch(() => {});
}

const bgm = createBgmController({
  getCtx: () => ctx,
  getReady: () => ready,
  getBgmMuted: () => mixer.getBgmMuted(),
  getBgmVolume: () => mixer.getBgmVolume(),
  getReverbConvolver: () => reverbConvolver,
  getCachedNoiseBuffer,
});
const sfx = {
  async init(): Promise<void> {
    if (ready || typeof window === 'undefined') return;
    try {
      const webkitCtor = window.webkitAudioContext;
      const Ctor = window.AudioContext || (isAudioCtor(webkitCtor) ? webkitCtor : null);
      if (!Ctor) return;
      ctx = new Ctor();
      if (ctx.state === 'suspended') await ctx.resume();
      const bus = initMixerBus(ctx, randomFloat);
      sfxDest = bus.sfxDest;
      reverbConvolver = bus.reverbConvolver;
      ready = true;
    } catch {
      // audio not available
    }
  },
  play(name: string): void {
    if (!ready || mixer.getSfxMuted()) return;
    if (ctx && ctx.state !== 'running') {
      // Only queue ONE deferred play per name to prevent overlap stacking
      if (!pendingSfx.has(name)) {
        pendingSfx.add(name);
        resumeAudioIfNeeded(() => {
          pendingSfx.delete(name);
          sfx.play(name);
        });
      }
      return;
    }
    if (!canPlaySe(name, performance.now())) return;
    try {
      const fn = isSoundName(name) ? SOUNDS[name] : null;
      if (fn) fn();
    } catch {
      // best-effort SFX
    }
  },
  playMove(type: string, idx = 0): void {
    const resolved = resolveMoveSoundName(type, idx, isSoundName);
    sfx.play(resolved);
  },
  /** Set SFX mute (does NOT affect BGM). */
  setSfxMuted(next: boolean): boolean {
    return mixer.setSfxMuted(next);
  },
  /** Set BGM mute (does NOT affect SFX). */
  setBgmMuted(next: boolean): boolean {
    const wasMuted = mixer.getBgmMuted();
    const muted = mixer.setBgmMuted(next);
    bgm.onMutedChanged(wasMuted, muted);
    return muted;
  },
  /** Set BGM master volume (0..0.55). */
  setBgmVolume(next: number): number {
    const volume = mixer.setBgmVolume(next);
    bgm.onVolumeChanged();
    return volume;
  },
  /** Legacy: mute both SFX + BGM together. */
  setMuted(next: boolean): boolean {
    sfx.setSfxMuted(next);
    sfx.setBgmMuted(next);
    return next;
  },
  toggleMute(): boolean {
    const next = !mixer.getSfxMuted();
    return sfx.setMuted(next);
  },
  get sfxMuted(): boolean {
    return mixer.getSfxMuted();
  },
  get bgmMuted(): boolean {
    return mixer.getBgmMuted();
  },
  get bgmVolume(): number {
    return mixer.getBgmVolume();
  },
  /** Legacy alias — true if BOTH are muted. */
  get muted(): boolean {
    return mixer.isMuted();
  },
  get ready(): boolean {
    return ready;
  },
  startBgm(track: BgmTrack): void {
    bgm.startBgm(track);
  },
  prefetchBgm(
    tracks: ReadonlyArray<BgmTrack>,
    mode: BgmPreloadMode = 'metadata',
  ): void {
    bgm.prefetchBgm(tracks, mode);
  },
  stopBgm(immediate = false): void {
    bgm.stopBgm(immediate);
  },
  get bgmTrack(): string | null {
    return bgm.getTrack();
  },
  /** Release all audio resources (BGM cache, AudioContext). */
  dispose(): void {
    bgm.dispose();
    pendingSfx.clear();
    if (ctx) {
      try { void ctx.close(); } catch { /* best-effort */ }
      ctx = null;
    }
    sfxDest = null;
    reverbConvolver = null;
    ready = false;
  },
};

export default sfx;

// ── React useSyncExternalStore bridge ──
export const subscribeAudioState = mixer.subscribe;
export const getAudioSnapshot = mixer.getSnapshot;
export type { MixerSnapshot } from './sfx/mixer.ts';
