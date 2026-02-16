/**
 * sfx.ts — Sound effects using native Web Audio API.
 * All sounds are generated programmatically, no audio files.
 * Replaces Tone.js (~300KB) with zero-dependency Web Audio (~3KB).
 *
 * Call sfx.init() once after user gesture to unlock AudioContext.
 * Then call sfx.play("hit") etc. anywhere.
 */
import { readText, writeText } from './storage.ts';

let ctx: AudioContext | null = null;
let ready = false;
const SFX_MUTED_KEY = 'mathMonsterBattle_sfxMuted';
let muted = readText(SFX_MUTED_KEY, '0') === '1';

// ── Note → frequency lookup (pre-computed, avoids runtime Math) ──
const NOTE_FREQ: Record<string, number> = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98,
  A2: 110, Bb2: 116.54, B2: 123.47,
  C3: 130.81, Eb3: 155.56, E3: 164.81, F3: 174.61,
  A3: 220, Bb3: 233.08, B3: 246.94,
  C4: 261.63, E4: 329.63, G4: 392,
  A4: 440,
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
  gain.connect(ctx.destination);
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
    const n = Math.random() * 2 - 1;
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
  gain.connect(ctx.destination);
  src.start(t);
  src.stop(t + dur + 0.1);
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
  gain.connect(ctx.destination);
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
  gain.connect(ctx.destination);
  osc.start(t);
  mod.start(t);
  osc.stop(t + dur + 0.1);
  mod.stop(t + dur + 0.1);
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
  fire: () => {
    noiseBurst({ dur: 0.13, vol: 0.14, hp: 360, lp: 8200, lpSweepTo: 2000 });
    setTimeout(() => playNote(NOTE_FREQ.G2, DUR['8n'], { type: 'sine', vol: 0.28, attack: 0.002, decay: 0.1, release: 0.12, sweepToFreq: NOTE_FREQ.C2 }), 44);
  },
  water: () => {
    playNote(NOTE_FREQ.A4, DUR['16n'], { type: 'sine', vol: 0.2, attack: 0.004, decay: 0.08, release: 0.08, filterType: 'lowpass', filterFreq: 2800 });
    setTimeout(() => playNote(NOTE_FREQ.E5, DUR['16n'], { type: 'triangle', vol: 0.16, attack: 0.005, decay: 0.1, release: 0.08, filterType: 'lowpass', filterFreq: 3200 }), 70);
    setTimeout(() => noiseBurst({ dur: 0.055, vol: 0.08, hp: 500, lp: 5400, lpSweepTo: 1400 }), 30);
  },
  electric: () => {
    metalPing(0.03);
    setTimeout(() => metalPing(0.06), 60);
  },
  grass: () => {
    melodic('G5', '32n');
    setTimeout(() => melodic('D5', '32n'), 50);
  },
  dark: () => {
    bass('D2', '4n');
    setTimeout(() => metalPing(0.13), 100);
  },
  light: () => {
    melodic('C6', '16n');
    setTimeout(() => melodic('E6', '16n'), 80);
    setTimeout(() => melodic('G5', '16n'), 160);
  },
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

type AudioCtor = {
  new (): AudioContext;
};

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: AudioCtor;
};

const sfx = {
  async init(): Promise<void> {
    if (ready || typeof window === 'undefined') return;
    try {
      const w = window as WindowWithWebkitAudio;
      const Ctor: AudioCtor | undefined = window.AudioContext || w.webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      if (ctx.state === 'suspended') await ctx.resume();
      ready = true;
    } catch {
      // audio not available
    }
  },
  play(name: string): void {
    if (!ready || muted) return;
    try {
      const fn = SOUNDS[name as SoundName];
      if (fn) fn();
    } catch {
      // best-effort SFX
    }
  },
  setMuted(next: boolean): boolean {
    muted = !!next;
    writeText(SFX_MUTED_KEY, muted ? '1' : '0');
    return muted;
  },
  toggleMute(): boolean {
    return sfx.setMuted(!muted);
  },
  get muted(): boolean {
    return muted;
  },
  get ready(): boolean {
    return ready;
  },
};

export default sfx;
