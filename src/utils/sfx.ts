/**
 * sfx.ts — Sound effects using native Web Audio API.
 * SFX are generated programmatically; BGM can use uploaded music files.
 * Replaces Tone.js (~300KB) with zero-dependency Web Audio (~3KB).
 *
 * Call sfx.init() once after user gesture to unlock AudioContext.
 * Then call sfx.play("hit") etc. anywhere.
 */
import { readText, writeText } from './storage.ts';
import { randomFloat } from './prng.ts';

const PUBLIC_BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';

let ctx: AudioContext | null = null;
let ready = false;
const SFX_MUTED_KEY = 'mathMonsterBattle_sfxMuted';
const BGM_MUTED_KEY = 'mathMonsterBattle_bgmMuted';
const BGM_VOLUME_KEY = 'mathMonsterBattle_bgmVolume';
const DEFAULT_BGM_VOLUME = 0.5;
const MIN_BGM_VOLUME = 0;
const MAX_BGM_VOLUME = 1.0;
let sfxMuted = readText(SFX_MUTED_KEY, '0') === '1';
let bgmMuted = readText(BGM_MUTED_KEY, '0') === '1';
function clampBgmVolume(next: number): number {
  if (!Number.isFinite(next)) return DEFAULT_BGM_VOLUME;
  return Math.max(MIN_BGM_VOLUME, Math.min(MAX_BGM_VOLUME, next));
}
let bgmVolume = clampBgmVolume(Number.parseFloat(readText(BGM_VOLUME_KEY, String(DEFAULT_BGM_VOLUME))));

// ── Reverb send bus ──────────────────────────────────────────────
const REVERB_DECAY_SEC = 1.4;     // IR length — short plate-style tail
const REVERB_WET_SFX = 0.22;     // subtle wet for SFX
const REVERB_WET_BGM = 0.10;     // even subtler for BGM (already a full mix)
const REVERB_DRY = 1.0;          // full dry signal — no attenuation
const SFX_MASTER_GAIN = 1.8;     // global SFX volume boost (individual vols were too conservative)
let sfxDest: AudioNode | null = null;     // SFX master bus → dry+wet
let reverbConvolver: ConvolverNode | null = null;
const pendingSfx = new Set<string>();             // deferred plays waiting for AudioContext resume
const lastPlayTime = new Map<string, number>();   // debounce: last fire time per sound name

/** Generate a stereo impulse response buffer (exponential decay white noise). */
function buildReverbIR(audioCtx: AudioContext, decay: number): AudioBuffer {
  const rate = audioCtx.sampleRate;
  const length = Math.floor(rate * Math.max(0.3, decay));
  const buf = audioCtx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // Exponential decay × white noise; slight stereo decorrelation via independent noise
      data[i] = randomFloat(-1, 1) * Math.exp(-3.5 * i / length);
    }
  }
  return buf;
}

/** Build the reverb send bus: sfxDest → dry + wet→convolver → destination. */
function initReverbBus(audioCtx: AudioContext): void {
  try {
    reverbConvolver = audioCtx.createConvolver();
    reverbConvolver.buffer = buildReverbIR(audioCtx, REVERB_DECAY_SEC);

    const dryGain = audioCtx.createGain();
    dryGain.gain.value = REVERB_DRY;

    const wetGain = audioCtx.createGain();
    wetGain.gain.value = REVERB_WET_SFX;

    const bus = audioCtx.createGain();
    bus.gain.value = SFX_MASTER_GAIN;
    bus.connect(dryGain);
    bus.connect(wetGain);
    dryGain.connect(audioCtx.destination);
    wetGain.connect(reverbConvolver);
    reverbConvolver.connect(audioCtx.destination);

    sfxDest = bus;
  } catch {
    // Fallback: no reverb, direct to destination
    sfxDest = audioCtx.destination;
    reverbConvolver = null;
  }
}

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
    ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'].forEach((n, i) => setTimeout(() => melodic(n, '8n'), i * 100));
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
type MoveType = 'fire' | 'water' | 'electric' | 'grass' | 'dark' | 'light';

function isSoundName(name: string): name is SoundName {
  return Object.prototype.hasOwnProperty.call(SOUNDS, name);
}

function normalizeMoveType(type: string): MoveType | null {
  const raw = String(type || '').toLowerCase();
  if (raw === 'lion') return 'light';
  if (raw === 'fire' || raw === 'water' || raw === 'electric' || raw === 'grass' || raw === 'dark' || raw === 'light') {
    return raw;
  }
  return null;
}

function resolveMoveSoundName(type: string, idx: number): string {
  const moveType = normalizeMoveType(type);
  if (!moveType) return type;
  const slot = Math.max(0, Math.min(3, Number.isFinite(idx) ? Math.floor(idx) : 0));
  const key = `${moveType}${slot}`;
  if (Object.prototype.hasOwnProperty.call(SOUNDS, key)) return key;
  return moveType;
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

// ── BGM (procedural chiptune loops + file tracks) ────────────────
type BgmTrack =
  | 'menu'
  | 'battle'
  | 'volcano'
  | 'ironclad'
  | 'graveyard'
  | 'boss'
  | 'boss_hydra'
  | 'boss_crazy_dragon'
  | 'boss_sword_god'
  | 'boss_dark_king';
type SynthBgmTrack = 'menu' | 'battle' | 'boss';
const BGM_FILE_BY_TRACK: Partial<Record<BgmTrack, string>> = {
  menu: `${PUBLIC_BASE_URL}musics/Chronicles_of_the_Verdant_Peak.mp3`,
  battle: `${PUBLIC_BASE_URL}musics/Titan_s_Fury.mp3`,
  volcano: `${PUBLIC_BASE_URL}musics/Inferno_s_Fury.mp3`,
  ironclad: `${PUBLIC_BASE_URL}musics/Ironclad_Dominion.mp3`,
  graveyard: `${PUBLIC_BASE_URL}musics/Spectral_Dirge.mp3`,
  boss_hydra: `${PUBLIC_BASE_URL}musics/Hydra_s_Unholy_Dominion.mp3`,
  boss_crazy_dragon: `${PUBLIC_BASE_URL}musics/Wrath_of_the_Azure_Wyrm.mp3`,
  boss_sword_god: `${PUBLIC_BASE_URL}musics/Wrath_of_the_Celestial_Blade.mp3`,
  boss_dark_king: `${PUBLIC_BASE_URL}musics/Wrath_of_the_Crimson_Emperor.mp3`,
};
const SYNTH_FALLBACK_BY_TRACK: Record<BgmTrack, SynthBgmTrack> = {
  menu: 'menu',
  battle: 'battle',
  volcano: 'battle',
  ironclad: 'battle',
  graveyard: 'battle',
  boss: 'boss',
  boss_hydra: 'boss',
  boss_crazy_dragon: 'boss',
  boss_sword_god: 'boss',
  boss_dark_king: 'boss',
};
let bgmGain: GainNode | null = null;
let bgmInterval: ReturnType<typeof setInterval> | null = null;
let bgmCurrent: BgmTrack | null = null;
let bgmNextLoopTime = 0;
let bgmFormIndex = 0;
let bgmMediaEl: HTMLAudioElement | null = null;
let bgmMediaToken = 0;
let pendingBgmTrack: BgmTrack | null = null;
let lastBgmTrack: BgmTrack | null = null;   // remember track for mute→unmute resume
let resumePromise: Promise<void> | null = null;
const BGM_SCHEDULE_INTERVAL_MS = 50;
const BGM_LOOKAHEAD_SEC = 0.12;
const BGM_FADE_IN_MS = 900;
const BGM_MEDIA_STOP_FADE_MS = 650;
const BGM_MEDIA_LOOP_CROSSFADE_SEC = 1.25;
const BGM_MEDIA_LOOP_START_SEC = 0.05;
const BGM_MEDIA_LOOP_END_PAD_SEC = 0.08;
const BGM_MEDIA_LOOP_POLL_MS = 90;
const bgmMediaRampTimers = new Set<ReturnType<typeof setInterval>>();
const bgmMediaElements = new Set<HTMLAudioElement>();
let bgmMediaLoopTimer: ReturnType<typeof setInterval> | null = null;
let bgmMediaLoopRestarting = false;

type BgmNote = [string, string, number, number?]; // [noteName, durKey, offsetMs, velocity]
type BgmDrumKind = 'kick' | 'snare' | 'hat' | 'rim';
type BgmSectionKey = 'A' | 'B' | 'C';
type BgmLane = {
  wave: OscillatorType | 'noise';
  vol: number;
  attack: number;
  release: number;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterQ?: number;
  pan?: number;
  detune?: number;
  jitterMs?: number;
  swingMs?: number;
  notes: BgmNote[];
};

type BgmSection = {
  lengthMs: number;
  lanes: BgmLane[];
};

type BgmPattern = {
  form: BgmSectionKey[];
  sections: Record<BgmSectionKey, BgmSection | undefined>;
};

const BGM_PATTERNS: Record<SynthBgmTrack, BgmPattern> = {
  menu: {
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: {
        lengthMs: 3200,
        lanes: [
          {
            wave: 'triangle',
            vol: 0.2,
            attack: 0.01,
            release: 0.12,
            filterType: 'lowpass',
            filterFreq: 3600,
            filterQ: 0.8,
            pan: 0.12,
            jitterMs: 5,
            swingMs: 10,
            notes: [
              ['C4', '8n', 0], ['E4', '8n', 320], ['G4', '8n', 640], ['E4', '8n', 960],
              ['A3', '8n', 1280], ['C4', '8n', 1600], ['E4', '8n', 1920], ['G4', '8n', 2240],
              ['F4', '8n', 2560], ['E4', '8n', 2880],
            ],
          },
          {
            wave: 'sine',
            vol: 0.11,
            attack: 0.03,
            release: 0.3,
            filterType: 'lowpass',
            filterFreq: 1700,
            filterQ: 0.7,
            pan: -0.22,
            notes: [['C3', '4n', 0, 0.95], ['A2', '4n', 800, 0.9], ['F2', '4n', 1600, 0.95], ['G2', '4n', 2400, 1]],
          },
          {
            wave: 'square',
            vol: 0.085,
            attack: 0.004,
            release: 0.11,
            filterType: 'lowpass',
            filterFreq: 840,
            filterQ: 0.9,
            pan: -0.05,
            jitterMs: 4,
            notes: [
              ['C2', '8n', 0], ['C2', '8n', 320], ['G2', '8n', 640], ['C2', '8n', 960],
              ['A2', '8n', 1280], ['A2', '8n', 1600], ['E2', '8n', 1920], ['A2', '8n', 2240],
              ['F2', '8n', 2560], ['G2', '8n', 2880],
            ],
          },
          {
            wave: 'noise',
            vol: 0.072,
            attack: 0.001,
            release: 0.055,
            pan: 0,
            jitterMs: 6,
            notes: [
              ['kick', '16n', 0, 0.72], ['hat', '32n', 160, 0.44], ['hat', '32n', 320, 0.48], ['snare', '16n', 640, 0.58],
              ['hat', '32n', 960, 0.42], ['kick', '16n', 1280, 0.68], ['hat', '32n', 1440, 0.46], ['hat', '32n', 1600, 0.5],
              ['snare', '16n', 1920, 0.56], ['rim', '32n', 2240, 0.45], ['kick', '16n', 2560, 0.72], ['hat', '32n', 2880, 0.5],
            ],
          },
        ],
      },
      B: {
        lengthMs: 3200,
        lanes: [
          {
            wave: 'triangle',
            vol: 0.2,
            attack: 0.01,
            release: 0.12,
            filterType: 'lowpass',
            filterFreq: 3600,
            filterQ: 0.8,
            pan: 0.14,
            jitterMs: 5,
            swingMs: 12,
            notes: [
              ['E4', '8n', 0], ['G4', '8n', 320], ['B4', '8n', 640], ['G4', '8n', 960],
              ['A4', '8n', 1280], ['C5', '8n', 1600], ['B4', '8n', 1920], ['A4', '8n', 2240],
              ['G4', '8n', 2560], ['D5', '8n', 2880],
            ],
          },
          {
            wave: 'sine',
            vol: 0.12,
            attack: 0.03,
            release: 0.32,
            filterType: 'lowpass',
            filterFreq: 1800,
            filterQ: 0.7,
            pan: -0.2,
            notes: [['A2', '4n', 0, 0.92], ['F2', '4n', 800, 0.88], ['D2', '4n', 1600, 0.94], ['G2', '4n', 2400, 1]],
          },
          {
            wave: 'square',
            vol: 0.082,
            attack: 0.004,
            release: 0.11,
            filterType: 'lowpass',
            filterFreq: 900,
            filterQ: 0.9,
            pan: -0.02,
            jitterMs: 4,
            notes: [
              ['A2', '8n', 0], ['A2', '8n', 320], ['E2', '8n', 640], ['A2', '8n', 960],
              ['F2', '8n', 1280], ['F2', '8n', 1600], ['C2', '8n', 1920], ['F2', '8n', 2240],
              ['D2', '8n', 2560], ['G2', '8n', 2880],
            ],
          },
          {
            wave: 'noise',
            vol: 0.075,
            attack: 0.001,
            release: 0.058,
            pan: 0.02,
            jitterMs: 6,
            notes: [
              ['kick', '16n', 0, 0.74], ['hat', '32n', 160, 0.46], ['snare', '16n', 480, 0.6], ['hat', '32n', 800, 0.44],
              ['kick', '16n', 1120, 0.7], ['hat', '32n', 1440, 0.5], ['snare', '16n', 1760, 0.58], ['hat', '32n', 2080, 0.42],
              ['rim', '32n', 2240, 0.46], ['kick', '16n', 2560, 0.76], ['snare', '16n', 2880, 0.62], ['hat', '32n', 3040, 0.44],
            ],
          },
        ],
      },
      C: undefined,
    },
  },
  battle: {
    form: ['A', 'B'],
    sections: {
      A: {
        lengthMs: 3840,
        lanes: [
          {
            wave: 'sawtooth',
            vol: 0.165,
            attack: 0.005,
            release: 0.1,
            filterType: 'bandpass',
            filterFreq: 2000,
            filterQ: 1.25,
            pan: 0.1,
            jitterMs: 4,
            swingMs: 8,
            notes: [
              ['E4', '16n', 0], ['G4', '16n', 240], ['A4', '16n', 480], ['E5', '16n', 720],
              ['D5', '16n', 960], ['C5', '16n', 1200], ['A4', '16n', 1440], ['G4', '16n', 1680],
              ['E4', '16n', 1920], ['G4', '16n', 2160], ['A4', '16n', 2400], ['C5', '16n', 2640],
              ['B4', '16n', 2880], ['A4', '16n', 3120], ['G4', '16n', 3360], ['E4', '16n', 3600],
            ],
          },
          {
            wave: 'square',
            vol: 0.12,
            attack: 0.003,
            release: 0.1,
            filterType: 'lowpass',
            filterFreq: 760,
            filterQ: 0.9,
            pan: -0.18,
            notes: [
              ['E2', '8n', 0], ['E2', '8n', 480], ['D2', '8n', 960], ['C2', '8n', 1440],
              ['A2', '8n', 1920], ['A2', '8n', 2400], ['G2', '8n', 2880], ['B2', '8n', 3360],
            ],
          },
          {
            wave: 'triangle',
            vol: 0.082,
            attack: 0.004,
            release: 0.085,
            filterType: 'highpass',
            filterFreq: 980,
            filterQ: 0.8,
            pan: 0.24,
            jitterMs: 3,
            notes: [
              ['E5', '32n', 120], ['G5', '32n', 360], ['A5', '32n', 600], ['G5', '32n', 840],
              ['E5', '32n', 1080], ['G5', '32n', 1320], ['A5', '32n', 1560], ['G5', '32n', 1800],
              ['E5', '32n', 2040], ['G5', '32n', 2280], ['A5', '32n', 2520], ['C6', '32n', 2760],
              ['B5', '32n', 3000], ['A5', '32n', 3240], ['G5', '32n', 3480], ['E5', '32n', 3720],
            ],
          },
          {
            wave: 'noise',
            vol: 0.105,
            attack: 0.001,
            release: 0.07,
            pan: 0.02,
            jitterMs: 4,
            notes: [
              ['kick', '16n', 0, 1], ['hat', '32n', 240, 0.45], ['hat', '32n', 480, 0.62], ['snare', '16n', 720, 0.88],
              ['kick', '16n', 960, 0.93], ['hat', '32n', 1200, 0.44], ['hat', '32n', 1440, 0.62], ['snare', '16n', 1680, 0.84],
              ['kick', '16n', 1920, 1], ['hat', '32n', 2160, 0.45], ['kick', '16n', 2400, 0.76], ['hat', '32n', 2640, 0.56],
              ['rim', '32n', 2760, 0.6], ['snare', '16n', 2880, 0.9], ['hat', '32n', 3120, 0.44], ['kick', '16n', 3360, 0.94],
              ['hat', '32n', 3600, 0.52], ['rim', '32n', 3720, 0.58],
            ],
          },
        ],
      },
      B: {
        lengthMs: 3840,
        lanes: [
          {
            wave: 'sawtooth',
            vol: 0.17,
            attack: 0.005,
            release: 0.1,
            filterType: 'bandpass',
            filterFreq: 2100,
            filterQ: 1.3,
            pan: 0.12,
            jitterMs: 4,
            swingMs: 10,
            notes: [
              ['E4', '16n', 0], ['F4', '16n', 240], ['G4', '16n', 480], ['B4', '16n', 720],
              ['A4', '16n', 960], ['G4', '16n', 1200], ['F4', '16n', 1440], ['E4', '16n', 1680],
              ['D4', '16n', 1920], ['F4', '16n', 2160], ['A4', '16n', 2400], ['B4', '16n', 2640],
              ['A4', '16n', 2880], ['G4', '16n', 3120], ['F4', '16n', 3360], ['E4', '16n', 3600],
            ],
          },
          {
            wave: 'square',
            vol: 0.124,
            attack: 0.003,
            release: 0.1,
            filterType: 'lowpass',
            filterFreq: 790,
            filterQ: 0.9,
            pan: -0.2,
            notes: [
              ['E2', '8n', 0], ['D2', '8n', 480], ['C2', '8n', 960], ['B2', '8n', 1440],
              ['A2', '8n', 1920], ['G2', '8n', 2400], ['F2', '8n', 2880], ['E2', '8n', 3360],
            ],
          },
          {
            wave: 'triangle',
            vol: 0.086,
            attack: 0.003,
            release: 0.08,
            filterType: 'highpass',
            filterFreq: 1100,
            filterQ: 0.9,
            pan: 0.26,
            jitterMs: 3,
            notes: [
              ['G5', '32n', 120], ['A5', '32n', 360], ['B5', '32n', 600], ['A5', '32n', 840],
              ['G5', '32n', 1080], ['A5', '32n', 1320], ['C6', '32n', 1560], ['A5', '32n', 1800],
              ['G5', '32n', 2040], ['A5', '32n', 2280], ['B5', '32n', 2520], ['A5', '32n', 2760],
              ['G5', '32n', 3000], ['F#5', '32n', 3240], ['E5', '32n', 3480], ['D5', '32n', 3720],
            ],
          },
          {
            wave: 'noise',
            vol: 0.11,
            attack: 0.001,
            release: 0.072,
            pan: 0.02,
            jitterMs: 4,
            notes: [
              ['kick', '16n', 0, 1], ['hat', '32n', 120, 0.46], ['hat', '32n', 240, 0.64], ['snare', '16n', 600, 0.9],
              ['kick', '16n', 960, 0.95], ['hat', '32n', 1080, 0.48], ['hat', '32n', 1200, 0.62], ['snare', '16n', 1560, 0.88],
              ['kick', '16n', 1920, 1], ['hat', '32n', 2040, 0.48], ['kick', '16n', 2400, 0.82], ['hat', '32n', 2520, 0.58],
              ['rim', '32n', 2640, 0.64], ['snare', '16n', 3000, 0.92], ['hat', '32n', 3120, 0.46], ['kick', '16n', 3360, 0.95],
              ['hat', '32n', 3480, 0.56], ['rim', '32n', 3720, 0.62],
            ],
          },
        ],
      },
      C: undefined,
    },
  },
  /* ───────────────────────────────────────────────────────
   * BOSS — "Elden Dread" (Cm)
   * Form A-B-A-C: march → rising fury → march → climax
   * 6 lanes: saw melody, square brass, sine sub-bass,
   *          triangle pad, saw reinforcement, war drums
   * ─────────────────────────────────────────────────────── */
  boss: {
    form: ['A', 'B', 'A', 'C'],
    sections: {
      A: {
        lengthMs: 4000,
        lanes: [
          // L1 – Sawtooth lead: aggressive Cm march riff
          {
            wave: 'sawtooth',
            vol: 0.20,
            attack: 0.003,
            release: 0.10,
            filterType: 'lowpass',
            filterFreq: 2800,
            filterQ: 1.2,
            pan: 0.18,
            detune: 14,
            jitterMs: 3,
            notes: [
              ['C4', '8n', 0, 1], ['Eb4', '8n', 250, 0.9], ['G4', '8n', 500, 1],
              ['F4', '8n', 1000, 0.95], ['Eb4', '8n', 1250, 0.85], ['C4', '8n', 1500, 0.9],
              ['G3', '8n', 2000, 1], ['Bb3', '8n', 2250, 0.9], ['C4', '8n', 2500, 0.95], ['Eb4', '8n', 2750, 0.85],
              ['F4', '8n', 3000, 0.95], ['Eb4', '8n', 3250, 0.9], ['D4', '4n', 3500, 1],
            ],
          },
          // L2 – Square brass: power stabs on each beat
          {
            wave: 'square',
            vol: 0.12,
            attack: 0.005,
            release: 0.15,
            filterType: 'lowpass',
            filterFreq: 1600,
            filterQ: 1.1,
            pan: -0.22,
            detune: -8,
            notes: [
              ['C3', '4n', 0, 1], ['Eb3', '4n', 1000, 0.9],
              ['F3', '4n', 2000, 0.95], ['G3', '4n', 3000, 1],
            ],
          },
          // L3 – Sine sub-bass: earth-shaking double-hits
          {
            wave: 'sine',
            vol: 0.22,
            attack: 0.004,
            release: 0.20,
            filterType: 'lowpass',
            filterFreq: 220,
            filterQ: 0.7,
            pan: 0,
            notes: [
              ['C2', '8n', 0, 1], ['C2', '8n', 250, 0.8],
              ['G2', '8n', 1000, 0.9], ['F2', '8n', 1500, 0.85], ['F2', '8n', 1750, 0.7],
              ['C2', '8n', 2000, 1], ['C2', '8n', 2250, 0.8],
              ['Bb2', '8n', 2500, 0.9], ['G2', '8n', 3000, 0.95], ['F2', '8n', 3500, 0.85],
            ],
          },
          // L4 – Triangle pad: sustained choir feel
          {
            wave: 'triangle',
            vol: 0.08,
            attack: 0.04,
            release: 0.40,
            filterType: 'lowpass',
            filterFreq: 1400,
            filterQ: 0.8,
            pan: -0.30,
            detune: -6,
            notes: [['C4', '2n', 0, 0.8], ['Eb4', '2n', 2000, 0.75]],
          },
          // L5 – Sawtooth reinforcement: octave-below melody, detuned
          {
            wave: 'sawtooth',
            vol: 0.10,
            attack: 0.004,
            release: 0.12,
            filterType: 'lowpass',
            filterFreq: 1800,
            filterQ: 0.9,
            pan: -0.10,
            detune: -14,
            jitterMs: 4,
            notes: [
              ['C3', '8n', 0, 0.9], ['Eb3', '8n', 250, 0.8], ['G3', '8n', 500, 0.9],
              ['F3', '8n', 1000, 0.85], ['Eb3', '8n', 1250, 0.8], ['C3', '8n', 1500, 0.85],
              ['G3', '4n', 2000, 0.9],
              ['F3', '8n', 3000, 0.85], ['Eb3', '8n', 3250, 0.8], ['D3', '4n', 3500, 0.9],
            ],
          },
          // L6 – War drums: double-kick march
          {
            wave: 'noise',
            vol: 0.15,
            attack: 0.001,
            release: 0.09,
            pan: 0.02,
            jitterMs: 3,
            notes: [
              ['kick', '16n', 0, 1], ['kick', '16n', 125, 0.85], ['hat', '32n', 250, 0.5],
              ['snare', '16n', 500, 0.95], ['hat', '32n', 625, 0.4], ['kick', '16n', 750, 0.9],
              ['kick', '16n', 1000, 1], ['hat', '32n', 1125, 0.45], ['kick', '16n', 1250, 0.85],
              ['snare', '16n', 1500, 0.98], ['hat', '32n', 1625, 0.42], ['rim', '32n', 1750, 0.6],
              ['kick', '16n', 2000, 1], ['kick', '16n', 2125, 0.88], ['hat', '32n', 2250, 0.5],
              ['snare', '16n', 2500, 0.95], ['hat', '32n', 2625, 0.4], ['kick', '16n', 2750, 0.92],
              ['kick', '16n', 3000, 1], ['hat', '32n', 3125, 0.45], ['kick', '16n', 3250, 0.88],
              ['snare', '16n', 3500, 1], ['rim', '32n', 3625, 0.6], ['hat', '32n', 3750, 0.48],
              ['kick', '16n', 3875, 0.85],
            ],
          },
        ],
      },
      B: {
        lengthMs: 4000,
        lanes: [
          // L1 – Sawtooth lead: ascending fury, wider filter
          {
            wave: 'sawtooth',
            vol: 0.22,
            attack: 0.003,
            release: 0.10,
            filterType: 'lowpass',
            filterFreq: 3000,
            filterQ: 1.3,
            pan: 0.20,
            detune: 16,
            jitterMs: 3,
            notes: [
              ['Eb4', '8n', 0, 1], ['F4', '8n', 250, 0.9], ['G4', '8n', 500, 1],
              ['C5', '16n', 750, 0.95],
              ['Bb3', '8n', 1000, 0.9], ['C4', '8n', 1250, 0.85], ['Eb4', '8n', 1500, 0.95],
              ['G4', '4n', 1750, 1],
              ['F4', '8n', 2500, 0.95], ['G4', '8n', 2750, 0.9],
              ['C5', '8n', 3000, 1], ['Bb3', '8n', 3250, 0.85], ['G4', '4n', 3500, 1],
            ],
          },
          // L2 – Square brass: bVI→bVII→i power movement
          {
            wave: 'square',
            vol: 0.13,
            attack: 0.005,
            release: 0.14,
            filterType: 'lowpass',
            filterFreq: 1700,
            filterQ: 1.1,
            pan: -0.24,
            detune: -8,
            notes: [
              ['Ab3', '4n', 0, 0.95], ['Bb3', '4n', 1000, 1],
              ['C4', '4n', 2000, 1], ['G3', '4n', 3000, 0.9],
            ],
          },
          // L3 – Sine sub-bass: chromatic movement
          {
            wave: 'sine',
            vol: 0.23,
            attack: 0.004,
            release: 0.22,
            filterType: 'lowpass',
            filterFreq: 240,
            filterQ: 0.7,
            pan: 0,
            notes: [
              ['A2', '8n', 0, 0.9], ['A2', '8n', 250, 0.7],
              ['Bb2', '8n', 500, 0.85], ['Bb2', '8n', 750, 0.7],
              ['C2', '8n', 1000, 1], ['C2', '8n', 1250, 0.8],
              ['G2', '8n', 1500, 0.9], ['G2', '8n', 1750, 0.7],
              ['F2', '8n', 2000, 0.95], ['G2', '8n', 2500, 0.9], ['Bb2', '8n', 2750, 0.8],
              ['C2', '8n', 3000, 1], ['C2', '8n', 3250, 0.8], ['G2', '8n', 3500, 0.9],
            ],
          },
          // L4 – Triangle pad: Ab pedal → G resolution
          {
            wave: 'triangle',
            vol: 0.09,
            attack: 0.035,
            release: 0.42,
            filterType: 'lowpass',
            filterFreq: 1500,
            filterQ: 0.8,
            pan: -0.28,
            detune: -6,
            notes: [['Ab3', '2n', 0, 0.8], ['G3', '2n', 2000, 0.85]],
          },
          // L5 – Sawtooth reinforcement: thickens B melody
          {
            wave: 'sawtooth',
            vol: 0.11,
            attack: 0.004,
            release: 0.12,
            filterType: 'lowpass',
            filterFreq: 1900,
            filterQ: 0.9,
            pan: -0.12,
            detune: -14,
            jitterMs: 4,
            notes: [
              ['Eb3', '8n', 0, 0.85], ['F3', '8n', 250, 0.8], ['G3', '8n', 500, 0.9],
              ['Bb3', '8n', 1000, 0.85], ['C3', '8n', 1250, 0.8], ['Eb3', '8n', 1500, 0.9],
              ['F3', '4n', 2000, 0.85], ['G3', '8n', 2750, 0.8],
              ['Eb3', '8n', 3000, 0.9], ['D3', '8n', 3250, 0.8], ['C3', '4n', 3500, 0.85],
            ],
          },
          // L6 – Drums: aggressive double-kick fills
          {
            wave: 'noise',
            vol: 0.16,
            attack: 0.001,
            release: 0.09,
            pan: 0.02,
            jitterMs: 3,
            notes: [
              ['kick', '16n', 0, 1], ['kick', '16n', 125, 0.9], ['hat', '32n', 250, 0.55],
              ['kick', '16n', 375, 0.8], ['snare', '16n', 500, 1], ['hat', '32n', 625, 0.45],
              ['kick', '16n', 750, 0.92], ['hat', '32n', 875, 0.42],
              ['kick', '16n', 1000, 1], ['kick', '16n', 1125, 0.88], ['snare', '16n', 1250, 0.9],
              ['hat', '32n', 1375, 0.5], ['kick', '16n', 1500, 0.95], ['hat', '32n', 1625, 0.45],
              ['snare', '16n', 1750, 0.98], ['kick', '16n', 1875, 0.82],
              ['kick', '16n', 2000, 1], ['kick', '16n', 2125, 0.9], ['hat', '32n', 2250, 0.52],
              ['snare', '16n', 2500, 1], ['kick', '16n', 2625, 0.85], ['hat', '32n', 2750, 0.48],
              ['kick', '16n', 2875, 0.88],
              ['kick', '16n', 3000, 1], ['snare', '16n', 3125, 0.85], ['kick', '16n', 3250, 0.92],
              ['snare', '16n', 3375, 0.9], ['kick', '16n', 3500, 1], ['snare', '16n', 3625, 0.95],
              ['kick', '16n', 3750, 0.98], ['snare', '16n', 3875, 1],
            ],
          },
        ],
      },
      C: {
        lengthMs: 4000,
        lanes: [
          // L1 – Sawtooth lead: climactic peak, C5 territory
          {
            wave: 'sawtooth',
            vol: 0.24,
            attack: 0.003,
            release: 0.08,
            filterType: 'lowpass',
            filterFreq: 3200,
            filterQ: 1.4,
            pan: 0.15,
            detune: 18,
            jitterMs: 2,
            notes: [
              ['C5', '8n', 0, 1], ['G4', '8n', 250, 0.9], ['Eb4', '8n', 500, 0.85],
              ['C5', '16n', 750, 0.95],
              ['Bb3', '8n', 1000, 0.9], ['F4', '8n', 1250, 1], ['G4', '4n', 1500, 1],
              ['C5', '8n', 2000, 1], ['Eb4', '8n', 2250, 0.9],
              ['G4', '8n', 2500, 1], ['F4', '8n', 2750, 0.9],
              ['Eb4', '8n', 3000, 0.95], ['D4', '8n', 3250, 0.9], ['C4', '4n', 3500, 1],
            ],
          },
          // L2 – Square brass: dramatic i→bVII→bVI→V descent
          {
            wave: 'square',
            vol: 0.14,
            attack: 0.004,
            release: 0.16,
            filterType: 'lowpass',
            filterFreq: 1800,
            filterQ: 1.2,
            pan: -0.20,
            detune: -10,
            notes: [
              ['C4', '4n', 0, 1], ['Bb3', '4n', 1000, 0.95],
              ['Ab3', '4n', 2000, 0.9], ['G3', '4n', 3000, 1],
            ],
          },
          // L3 – Sine sub-bass: relentless climactic drive
          {
            wave: 'sine',
            vol: 0.24,
            attack: 0.003,
            release: 0.20,
            filterType: 'lowpass',
            filterFreq: 260,
            filterQ: 0.8,
            pan: 0,
            notes: [
              ['C2', '8n', 0, 1], ['C2', '16n', 250, 0.85],
              ['G2', '8n', 500, 0.9], ['C2', '8n', 1000, 1],
              ['Bb2', '8n', 1500, 0.9], ['Bb2', '16n', 1750, 0.7],
              ['A2', '8n', 2000, 0.95], ['G2', '8n', 2500, 0.9], ['G2', '16n', 2750, 0.75],
              ['C2', '8n', 3000, 1], ['C2', '16n', 3250, 0.8], ['G2', '4n', 3500, 0.95],
            ],
          },
          // L4 – Triangle pad: dramatic sustain, Eb→C
          {
            wave: 'triangle',
            vol: 0.10,
            attack: 0.03,
            release: 0.45,
            filterType: 'lowpass',
            filterFreq: 1600,
            filterQ: 0.9,
            pan: -0.25,
            detune: -8,
            notes: [['Eb4', '2n', 0, 0.85], ['C4', '2n', 2000, 0.9]],
          },
          // L5 – Sawtooth reinforcement: maximum thickness
          {
            wave: 'sawtooth',
            vol: 0.12,
            attack: 0.003,
            release: 0.10,
            filterType: 'lowpass',
            filterFreq: 2000,
            filterQ: 1.0,
            pan: -0.08,
            detune: -16,
            jitterMs: 3,
            notes: [
              ['C3', '8n', 0, 0.95], ['G3', '8n', 250, 0.85],
              ['Eb3', '8n', 500, 0.9], ['C3', '8n', 750, 0.8],
              ['Bb3', '8n', 1000, 0.9], ['F3', '8n', 1250, 0.85], ['G3', '4n', 1500, 0.95],
              ['C3', '8n', 2000, 1], ['Eb3', '8n', 2250, 0.85],
              ['G3', '8n', 2500, 0.9], ['F3', '8n', 2750, 0.85],
              ['Eb3', '8n', 3000, 0.9], ['D3', '8n', 3250, 0.85], ['C3', '4n', 3500, 1],
            ],
          },
          // L6 – Drums: full fury, blast-beat fills
          {
            wave: 'noise',
            vol: 0.17,
            attack: 0.001,
            release: 0.10,
            pan: 0,
            jitterMs: 2,
            notes: [
              ['kick', '16n', 0, 1], ['kick', '16n', 125, 0.92], ['snare', '16n', 250, 0.9],
              ['kick', '16n', 375, 0.85], ['kick', '16n', 500, 1], ['hat', '32n', 625, 0.55],
              ['snare', '16n', 750, 1], ['kick', '16n', 875, 0.88],
              ['kick', '16n', 1000, 1], ['kick', '16n', 1125, 0.9], ['hat', '32n', 1250, 0.5],
              ['snare', '16n', 1375, 0.95], ['kick', '16n', 1500, 1], ['rim', '32n', 1625, 0.65],
              ['snare', '16n', 1750, 1], ['kick', '16n', 1875, 0.9],
              ['kick', '16n', 2000, 1], ['kick', '16n', 2125, 0.92], ['snare', '16n', 2250, 0.9],
              ['hat', '32n', 2375, 0.5], ['kick', '16n', 2500, 1], ['kick', '16n', 2625, 0.85],
              ['snare', '16n', 2750, 1], ['hat', '32n', 2875, 0.48],
              ['kick', '16n', 3000, 1], ['snare', '16n', 3125, 0.9], ['kick', '16n', 3250, 0.95],
              ['snare', '16n', 3375, 0.92], ['kick', '16n', 3500, 1], ['snare', '16n', 3625, 1],
              ['kick', '16n', 3750, 1], ['snare', '16n', 3875, 1],
            ],
          },
        ],
      },
    },
  },
};

function connectBgmLaneOutput(node: AudioNode, lane: BgmLane, at: number): void {
  if (!ctx || !bgmGain) return;
  if (lane.pan && Math.abs(lane.pan) > 0.001 && typeof ctx.createStereoPanner === 'function') {
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, lane.pan)), at);
    node.connect(pan);
    pan.connect(bgmGain);
    return;
  }
  node.connect(bgmGain);
}

function isBgmDrumKind(noteName: string): noteName is BgmDrumKind {
  return noteName === 'kick' || noteName === 'snare' || noteName === 'hat' || noteName === 'rim';
}

function playBgmNoiseLaneNote(
  drum: BgmDrumKind,
  t0: number,
  dur: number,
  lane: BgmLane,
  velocity = 1,
): void {
  if (!ctx || !bgmGain) return;
  const noise = getCachedNoiseBuffer();
  if (!noise) return;

  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const gain = ctx.createGain();

  const peak = Math.max(0.001, lane.vol * velocity);
  const attack = Math.max(0.001, lane.attack);
  const release = Math.max(0.03, lane.release);
  const hitDur = drum === 'hat'
    ? Math.max(0.03, Math.min(0.06, dur * 0.45))
    : drum === 'kick'
      ? Math.max(0.09, dur * 0.9)
      : Math.max(0.07, dur * 0.72);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + hitDur + release);

  let node: AudioNode = src;
  if (drum === 'kick') {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(24, t0);
    hp.Q.setValueAtTime(0.8, t0);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(170, t0);
    lp.Q.setValueAtTime(0.9, t0);
    node.connect(hp);
    hp.connect(lp);
    node = lp;
  } else if (drum === 'snare') {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(160, t0);
    hp.Q.setValueAtTime(0.8, t0);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450, t0);
    bp.Q.setValueAtTime(1.35, t0);
    node.connect(hp);
    hp.connect(bp);
    node = bp;
  } else if (drum === 'hat') {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(4800, t0);
    hp.Q.setValueAtTime(0.7, t0);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(9000, t0);
    bp.Q.setValueAtTime(0.95, t0);
    node.connect(hp);
    hp.connect(bp);
    node = bp;
  } else {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2200, t0);
    hp.Q.setValueAtTime(1.1, t0);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2800, t0);
    bp.Q.setValueAtTime(2.4, t0);
    node.connect(hp);
    hp.connect(bp);
    node = bp;
  }
  node.connect(gain);
  connectBgmLaneOutput(gain, lane, t0);

  // Kick needs a tonal body for low-end weight.
  if (drum === 'kick') {
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(132, t0);
    body.frequency.exponentialRampToValueAtTime(48, t0 + 0.12);
    bodyGain.gain.setValueAtTime(Math.max(0.0001, peak * 0.95), t0);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
    body.connect(bodyGain);
    connectBgmLaneOutput(bodyGain, lane, t0);
    body.start(t0);
    body.stop(t0 + 0.18);
  }

  src.start(t0, randomFloat(0, 0.25));
  src.stop(t0 + hitDur + release + 0.05);
}

function playBgmLaneNote(
  freq: number,
  t0: number,
  dur: number,
  lane: BgmLane,
  velocity = 1,
): void {
  if (!ctx || !bgmGain || lane.wave === 'noise') return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = lane.wave;
  osc.frequency.setValueAtTime(freq, t0);
  if (lane.detune) osc.detune.setValueAtTime(lane.detune, t0);

  let inNode: AudioNode = osc;
  if (lane.filterFreq && lane.filterFreq > 0) {
    const filter = ctx.createBiquadFilter();
    filter.type = lane.filterType || 'lowpass';
    filter.frequency.setValueAtTime(lane.filterFreq, t0);
    filter.Q.setValueAtTime(lane.filterQ ?? 0.8, t0);
    inNode.connect(filter);
    inNode = filter;
  }

  const attack = Math.max(0.002, lane.attack);
  const release = Math.max(0.04, lane.release);
  const peak = Math.max(0.001, lane.vol * velocity);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);

  inNode.connect(gain);
  connectBgmLaneOutput(gain, lane, t0);

  osc.start(t0);
  osc.stop(t0 + dur + release + 0.03);
}

function scheduleBgmLanes(now: number, lanes: BgmLane[]): void {
  for (const lane of lanes) {
    const jitter = Math.max(0, lane.jitterMs ?? 0);
    const swing = lane.swingMs ?? 0;
    for (let i = 0; i < lane.notes.length; i += 1) {
      const [noteName, durKey, offsetMs, velocity = 1] = lane.notes[i];
      const dur = DUR[durKey] || 0.13;
      const jitterOffset = jitter > 0 ? randomFloat(-jitter, jitter) : 0;
      const swingOffset = swing > 0 && i % 2 === 1 ? swing : 0;
      const t0 = now + Math.max(0, offsetMs + jitterOffset + swingOffset) / 1000;

      if (lane.wave === 'noise') {
        if (!isBgmDrumKind(noteName)) continue;
        playBgmNoiseLaneNote(noteName, t0, dur, lane, velocity);
        continue;
      }

      const freq = NOTE_FREQ[noteName];
      if (!freq) continue;
      playBgmLaneNote(freq, t0, dur, lane, velocity);
    }
  }
}

function resolveBgmSection(pattern: BgmPattern, formIndex: number): BgmSection | null {
  if (!pattern.form.length) return pattern.sections.A || pattern.sections.B || pattern.sections.C || null;
  const key = pattern.form[formIndex % pattern.form.length];
  return pattern.sections[key] || pattern.sections.A || pattern.sections.B || pattern.sections.C || null;
}

function scheduleBgmLookAhead(track: BgmTrack, pattern: BgmPattern): void {
  if (!ctx || !bgmGain || bgmCurrent !== track) return;
  const firstSection = resolveBgmSection(pattern, bgmFormIndex);
  if (!firstSection || firstSection.lengthMs <= 0) return;
  const fallbackSectionSec = firstSection.lengthMs / 1000;

  // If timers stalled for too long, resync to "now" instead of backfilling many old loops.
  if (bgmNextLoopTime < ctx.currentTime - fallbackSectionSec * 2) {
    bgmNextLoopTime = ctx.currentTime + 0.01;
  }

  const horizon = ctx.currentTime + BGM_LOOKAHEAD_SEC;
  while (bgmNextLoopTime <= horizon) {
    const section = resolveBgmSection(pattern, bgmFormIndex);
    if (!section || section.lengthMs <= 0) break;
    scheduleBgmLanes(bgmNextLoopTime, section.lanes);
    bgmNextLoopTime += section.lengthMs / 1000;
    bgmFormIndex += 1;
  }
}

function clearBgmMediaLoopTimer(): void {
  if (bgmMediaLoopTimer) {
    clearInterval(bgmMediaLoopTimer);
    bgmMediaLoopTimer = null;
  }
  bgmMediaLoopRestarting = false;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clearBgmMediaRampTimers(): void {
  for (const timer of bgmMediaRampTimers) clearInterval(timer);
  bgmMediaRampTimers.clear();
}

function stopAndResetMediaElement(el: HTMLAudioElement): void {
  try {
    el.pause();
    el.currentTime = 0;
    el.volume = clampUnit(bgmVolume);
  } catch {
    // best-effort reset
  } finally {
    bgmMediaElements.delete(el);
  }
}

function rampMediaVolume(
  el: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
  onDone?: () => void,
): void {
  const start = Date.now();
  const startVol = clampUnit(from);
  const endVol = clampUnit(to);
  try { el.volume = startVol; } catch { /* best-effort */ }
  const safeDur = Math.max(1, Math.floor(durationMs));
  const timer = setInterval(() => {
    const progress = Math.min(1, (Date.now() - start) / safeDur);
    const vol = startVol + (endVol - startVol) * progress;
    try { el.volume = clampUnit(vol); } catch { /* best-effort */ }
    if (progress >= 1) {
      clearInterval(timer);
      bgmMediaRampTimers.delete(timer);
      if (onDone) {
        try { onDone(); } catch { /* best-effort */ }
      }
    }
  }, 16);
  bgmMediaRampTimers.add(timer);
}

function tuneLoopStartOffset(el: HTMLAudioElement): void {
  try {
    const dur = Number.isFinite(el.duration) ? el.duration : 0;
    if (dur > BGM_MEDIA_LOOP_START_SEC + 0.2) {
      el.currentTime = BGM_MEDIA_LOOP_START_SEC;
    }
  } catch {
    // best-effort offset seek
  }
}

function startBgmMediaLoopMonitor(el: HTMLAudioElement, token: number, track: BgmTrack): void {
  clearBgmMediaLoopTimer();
  const src = BGM_FILE_BY_TRACK[track];
  if (!src) return;
  bgmMediaLoopTimer = setInterval(() => {
    if (bgmMediaToken !== token || bgmMediaEl !== el || bgmMuted) return;
    const dur = Number.isFinite(el.duration) ? el.duration : 0;
    if (!dur) return;
    const loopEnd = Math.max(BGM_MEDIA_LOOP_START_SEC + 0.2, dur - BGM_MEDIA_LOOP_END_PAD_SEC);
    const remain = loopEnd - el.currentTime;
    if (remain > BGM_MEDIA_LOOP_CROSSFADE_SEC || bgmMediaLoopRestarting) return;
    bgmMediaLoopRestarting = true;
    const nextEl = new Audio(src);
    bgmMediaElements.add(nextEl);
    nextEl.loop = false;
    nextEl.preload = 'auto';
    nextEl.volume = 0;
    const crossfadeMs = Math.round(BGM_MEDIA_LOOP_CROSSFADE_SEC * 1000);
    const beginCrossfade = () => {
      if (bgmMediaToken !== token || bgmMediaEl !== el || bgmMuted) {
        stopAndResetMediaElement(nextEl);
        bgmMediaLoopRestarting = false;
        return;
      }
      const from = Number.isFinite(el.volume) ? el.volume : clampUnit(bgmVolume);
      bgmMediaEl = nextEl;
      rampMediaVolume(el, from, 0, crossfadeMs, () => {
        stopAndResetMediaElement(el);
      });
      rampMediaVolume(nextEl, 0, bgmVolume, crossfadeMs, () => {
        bgmMediaLoopRestarting = false;
      });
      startBgmMediaLoopMonitor(nextEl, token, track);
    };
    nextEl.addEventListener('loadedmetadata', () => {
      tuneLoopStartOffset(nextEl);
    }, { once: true });
    const playPromise = nextEl.play();
    playPromise.then(beginCrossfade).catch(() => {
      stopAndResetMediaElement(nextEl);
      bgmMediaLoopRestarting = false;
    });
  }, BGM_MEDIA_LOOP_POLL_MS);
}

function stopBgmMedia(immediate = false): void {
  clearBgmMediaLoopTimer();
  clearBgmMediaRampTimers();
  const elements = [...bgmMediaElements];
  bgmMediaEl = null;
  if (!elements.length) return;
  if (immediate) {
    for (const el of elements) stopAndResetMediaElement(el);
    return;
  }
  for (const el of elements) {
    const startVol = Number.isFinite(el.volume) ? el.volume : clampUnit(bgmVolume);
    rampMediaVolume(el, startVol, 0, BGM_MEDIA_STOP_FADE_MS, () => {
      stopAndResetMediaElement(el);
    });
  }
}

function startSynthBgmLoop(track: BgmTrack): void {
  if (!ctx || bgmMuted) return;
  const synthTrack = SYNTH_FALLBACK_BY_TRACK[track];
  bgmGain = ctx.createGain();
  bgmGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  bgmGain.gain.linearRampToValueAtTime(bgmVolume, ctx.currentTime + 0.5);
  bgmGain.connect(ctx.destination);
  // Light reverb send for BGM (subtler than SFX)
  if (reverbConvolver) {
    try {
      const bgmWet = ctx.createGain();
      bgmWet.gain.value = REVERB_WET_BGM;
      bgmGain.connect(bgmWet);
      bgmWet.connect(reverbConvolver);
    } catch { /* reverb unavailable — fine */ }
  }

  const pattern = BGM_PATTERNS[synthTrack];
  bgmCurrent = track;
  bgmNextLoopTime = ctx.currentTime + 0.01;
  bgmFormIndex = 0;
  scheduleBgmLookAhead(track, pattern);
  bgmInterval = setInterval(() => {
    scheduleBgmLookAhead(track, pattern);
  }, BGM_SCHEDULE_INTERVAL_MS);
}

function startBgmMedia(track: BgmTrack): boolean {
  const src = BGM_FILE_BY_TRACK[track];
  if (!src || typeof Audio === 'undefined') return false;
  const el = new Audio(src);
  bgmMediaElements.add(el);
  el.loop = false;
  el.preload = 'auto';
  el.volume = 0;
  const token = ++bgmMediaToken;
  bgmMediaEl = el;
  bgmCurrent = track;
  const playPromise = el.play();
  const onReady = () => {
    if (bgmMediaToken !== token || bgmMediaEl !== el || bgmMuted) return;
    rampMediaVolume(el, 0, bgmVolume, BGM_FADE_IN_MS);
    startBgmMediaLoopMonitor(el, token, track);
  };
  playPromise.then(onReady).catch(() => {
    // If autoplay policy blocks the file playback, fallback to synth.
    if (bgmMediaToken !== token) return;
    stopBgmMedia(true);
    startSynthBgmLoop(track);
  });
  return true;
}

function startBgmLoop(track: BgmTrack): void {
  stopBgmLoop(false);
  if (startBgmMedia(track)) return;
  startSynthBgmLoop(track);
}

function stopBgmLoop(immediate = false): void {
  bgmMediaToken += 1;
  stopBgmMedia(immediate);
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
  if (bgmGain && ctx) {
    try {
      const g = bgmGain;
      // Cancel any pending automation (e.g. fade-in ramp) before stopping.
      g.gain.cancelScheduledValues(ctx.currentTime);
      if (immediate) {
        // Settings mute should hard-stop BGM right away.
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        try { g.disconnect(); } catch { /* ok */ }
      } else {
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        setTimeout(() => { try { g.disconnect(); } catch { /* ok */ } }, 350);
      }
    } catch { /* ok */ }
  }
  bgmGain = null;
  bgmCurrent = null;
  bgmNextLoopTime = 0;
  bgmFormIndex = 0;
}

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

const sfx = {
  async init(): Promise<void> {
    if (ready || typeof window === 'undefined') return;
    try {
      const webkitCtor = window.webkitAudioContext;
      const Ctor = window.AudioContext || (isAudioCtor(webkitCtor) ? webkitCtor : null);
      if (!Ctor) return;
      ctx = new Ctor();
      if (ctx.state === 'suspended') await ctx.resume();
      initReverbBus(ctx);
      ready = true;
    } catch {
      // audio not available
    }
  },
  play(name: string): void {
    if (!ready || sfxMuted) return;
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
    // Debounce: skip if the same sound fired within 30ms
    const now = performance.now();
    const last = lastPlayTime.get(name) || 0;
    if (now - last < 30) return;
    lastPlayTime.set(name, now);
    try {
      const fn = isSoundName(name) ? SOUNDS[name] : null;
      if (fn) fn();
    } catch {
      // best-effort SFX
    }
  },
  playMove(type: string, idx = 0): void {
    const resolved = resolveMoveSoundName(type, idx);
    sfx.play(resolved);
  },
  /** Set SFX mute (does NOT affect BGM). */
  setSfxMuted(next: boolean): boolean {
    sfxMuted = !!next;
    writeText(SFX_MUTED_KEY, sfxMuted ? '1' : '0');
    return sfxMuted;
  },
  /** Set BGM mute (does NOT affect SFX). */
  setBgmMuted(next: boolean): boolean {
    const wasMuted = bgmMuted;
    bgmMuted = !!next;
    writeText(BGM_MUTED_KEY, bgmMuted ? '1' : '0');
    if (bgmMuted) {
      // Remember which track was playing so we can resume later
      if (bgmCurrent) lastBgmTrack = bgmCurrent;
      pendingBgmTrack = null;
      stopBgmLoop(true);
    } else if (wasMuted && !bgmMuted) {
      // Unmuting: restart the last track immediately
      const track = lastBgmTrack || pendingBgmTrack;
      if (track && ready) {
        try { startBgmLoop(track); } catch { /* best-effort */ }
      }
    }
    return bgmMuted;
  },
  /** Set BGM master volume (0..0.55). */
  setBgmVolume(next: number): number {
    bgmVolume = clampBgmVolume(next);
    writeText(BGM_VOLUME_KEY, bgmVolume.toFixed(3));
    if (!bgmMuted && bgmMediaElements.size > 0) {
      for (const el of bgmMediaElements) {
        try {
          el.volume = clampUnit(bgmVolume);
        } catch {
          // best-effort media element volume update
        }
      }
    }
    if (bgmGain && ctx && !bgmMuted) {
      try {
        bgmGain.gain.cancelScheduledValues(ctx.currentTime);
        bgmGain.gain.setValueAtTime(Math.max(0.0001, bgmGain.gain.value), ctx.currentTime);
        bgmGain.gain.linearRampToValueAtTime(Math.max(0.0001, bgmVolume), ctx.currentTime + 0.12);
      } catch {
        // best-effort gain update
      }
    }
    return bgmVolume;
  },
  /** Legacy: mute both SFX + BGM together. */
  setMuted(next: boolean): boolean {
    sfx.setSfxMuted(next);
    sfx.setBgmMuted(next);
    return next;
  },
  toggleMute(): boolean {
    const next = !sfxMuted;
    return sfx.setMuted(next);
  },
  get sfxMuted(): boolean {
    return sfxMuted;
  },
  get bgmMuted(): boolean {
    return bgmMuted;
  },
  get bgmVolume(): number {
    return bgmVolume;
  },
  /** Legacy alias — true if BOTH are muted. */
  get muted(): boolean {
    return sfxMuted && bgmMuted;
  },
  get ready(): boolean {
    return ready;
  },
  startBgm(track: BgmTrack): void {
    lastBgmTrack = track;  // always remember intent for mute→unmute
    if (!ready || bgmMuted) return;
    if (bgmCurrent === track) return;
    pendingBgmTrack = track;
    const boot = () => {
      if (!ready || bgmMuted || pendingBgmTrack !== track) return;
      try { startBgmLoop(track); } catch { /* best-effort */ }
      if (bgmCurrent === track) pendingBgmTrack = null;
    };
    if (ctx && ctx.state !== 'running') {
      resumeAudioIfNeeded(boot);
      return;
    }
    boot();
  },
  stopBgm(immediate = false): void {
    pendingBgmTrack = null;
    try { stopBgmLoop(immediate); } catch { /* ok */ }
  },
  get bgmTrack(): string | null {
    return bgmCurrent;
  },
};

export default sfx;
