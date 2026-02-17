/**
 * sfx.ts — Sound effects using native Web Audio API.
 * All sounds are generated programmatically, no audio files.
 * Replaces Tone.js (~300KB) with zero-dependency Web Audio (~3KB).
 *
 * Call sfx.init() once after user gesture to unlock AudioContext.
 * Then call sfx.play("hit") etc. anywhere.
 */
import { readText, writeText } from './storage.ts';
import { randomFloat } from './prng.ts';

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

function playFire0(): void {
  noiseBurst({ dur: 0.05, vol: 0.095, hp: 650, lp: 6200, lpSweepTo: 2100 });
  setTimeout(() => playNote(NOTE_FREQ.G3, DUR['32n'], { type: 'triangle', vol: 0.14, attack: 0.002, decay: 0.04, release: 0.04, filterType: 'bandpass', filterFreq: 780, filterQ: 1.4 }), 18);
}

function playFire1(): void {
  noiseBurst({ dur: 0.16, vol: 0.125, hp: 220, lp: 820, lpSweepTo: 420 });
  setTimeout(() => sweepTone({ from: 320, to: 780, dur: 0.14, type: 'sawtooth', vol: 0.085, filterFrom: 520, filterTo: 2100 }), 24);
  setTimeout(() => noiseBurst({ dur: 0.09, vol: 0.08, hp: 420, lp: 1400, lpSweepTo: 520 }), 86);
}

function playFire2(): void {
  noiseBurst({ dur: 0.26, vol: 0.165, hp: 140, lp: 3600, lpSweepTo: 820 });
  playNote(NOTE_FREQ.E2, DUR['4n'], { type: 'sine', vol: 0.32, attack: 0.002, decay: 0.14, release: 0.16, sweepToFreq: NOTE_FREQ.C2, sweepDur: 0.2, filterType: 'lowpass', filterFreq: 900 });
  setTimeout(() => noiseBurst({ dur: 0.18, vol: 0.105, hp: 260, lp: 2800, lpSweepTo: 740 }), 76);
}

function playFire3(): void {
  sweepTone({ from: 920, to: 120, dur: 0.24, type: 'triangle', vol: 0.1, filterFrom: 1700, filterTo: 260 });
  setTimeout(() => {
    playNote(NOTE_FREQ.C2, DUR['2n'], { type: 'sawtooth', vol: 0.22, attack: 0.002, decay: 0.14, release: 0.2, sweepToFreq: NOTE_FREQ.E2 * 0.8, sweepDur: 0.18, filterType: 'lowpass', filterFreq: 820 });
    noiseBurst({ dur: 0.32, vol: 0.2, hp: 90, lp: 3000, lpSweepTo: 560 });
  }, 140);
}

function playWater0(): void {
  playNote(NOTE_FREQ.E5, DUR['32n'], { type: 'sine', vol: 0.18, attack: 0.003, decay: 0.04, release: 0.05, filterType: 'lowpass', filterFreq: 5200 });
  setTimeout(() => playNote(NOTE_FREQ.A5, DUR['32n'], { type: 'sine', vol: 0.13, attack: 0.002, decay: 0.04, release: 0.04, filterType: 'lowpass', filterFreq: 6000 }), 24);
  setTimeout(() => noiseBurst({ dur: 0.04, vol: 0.07, hp: 850, lp: 6200, lpSweepTo: 1800 }), 14);
}

function playWater1(): void {
  noiseBurst({ dur: 0.1, vol: 0.1, hp: 1300, lp: 9800, lpSweepTo: 2600 });
  setTimeout(() => sweepTone({ from: 980, to: 420, dur: 0.12, type: 'triangle', vol: 0.07, filterFrom: 1600, filterTo: 700 }), 10);
  setTimeout(() => noiseBurst({ dur: 0.06, vol: 0.065, hp: 2100, lp: 8600, lpSweepTo: 2400 }), 70);
}

function playWater2(): void {
  noiseBurst({ dur: 0.44, vol: 0.16, hp: 80, lp: 1800, lpSweepTo: 520 });
  setTimeout(() => noiseBurst({ dur: 0.28, vol: 0.09, hp: 140, lp: 2200, lpSweepTo: 700 }), 60);
  setTimeout(() => playNote(NOTE_FREQ.A3, DUR['8n'], { type: 'triangle', vol: 0.12, attack: 0.003, decay: 0.1, release: 0.12, filterType: 'lowpass', filterFreq: 1200 }), 86);
}

function playWater3(): void {
  noiseBurst({ dur: 0.24, vol: 0.12, hp: 150, lp: 2100, lpSweepTo: 700 });
  setTimeout(() => sweepTone({ from: 560, to: 180, dur: 0.18, type: 'sine', vol: 0.06, filterFrom: 1000, filterTo: 260 }), 26);
  setTimeout(() => {
    playNote(NOTE_FREQ.E2, DUR['4n'], { type: 'sine', vol: 0.24, attack: 0.002, decay: 0.13, release: 0.18, sweepToFreq: NOTE_FREQ.C2, sweepDur: 0.16, filterType: 'lowpass', filterFreq: 840 });
    noiseBurst({ dur: 0.34, vol: 0.175, hp: 65, lp: 1400, lpSweepTo: 460 });
  }, 164);
}

function playElectric0(): void {
  metalPing(0.025);
  setTimeout(() => metalPing(0.04), 36);
}

function playElectric1(): void {
  metalPing(0.035);
  setTimeout(() => metalPing(0.045), 30);
  setTimeout(() => metalPing(0.055), 66);
  setTimeout(() => sweepTone({ from: 1300, to: 420, dur: 0.08, type: 'square', vol: 0.06, filterFrom: 2600, filterTo: 900 }), 18);
}

function playElectric2(): void {
  noiseBurst({ dur: 0.12, vol: 0.09, hp: 1200, lp: 9800, lpSweepTo: 3800 });
  sweepTone({ from: 220, to: 1600, dur: 0.14, type: 'sawtooth', vol: 0.09, filterFrom: 1100, filterTo: 4200 });
  setTimeout(() => metalPing(0.09), 90);
  setTimeout(() => metalPing(0.07), 130);
}

function playElectric3(): void {
  sweepTone({ from: 170, to: 1450, dur: 0.16, type: 'triangle', vol: 0.08, filterFrom: 700, filterTo: 3800 });
  setTimeout(() => {
    noiseBurst({ dur: 0.2, vol: 0.14, hp: 900, lp: 9200, lpSweepTo: 2600 });
    playNote(NOTE_FREQ.C3, DUR['16n'], { type: 'square', vol: 0.14, attack: 0.002, decay: 0.08, release: 0.1, filterType: 'bandpass', filterFreq: 900, filterQ: 1.3 });
  }, 120);
  setTimeout(() => metalPing(0.13), 190);
}

function playGrass0(): void {
  scheduleSeries(5, 14, 18, () => noiseBurst({ dur: 0.02, vol: 0.05, hp: 3000, lp: 12000, lpSweepTo: 5200 }));
  setTimeout(() => playNote(NOTE_FREQ.G5, DUR['32n'], { type: 'triangle', vol: 0.09, attack: 0.002, decay: 0.05, release: 0.04, filterType: 'lowpass', filterFreq: 4200 }), 34);
}

function playGrass1(): void {
  scheduleSeries(6, 12, 16, () => noiseBurst({ dur: 0.02, vol: 0.055, hp: 2800, lp: 11800, lpSweepTo: 5200 }));
  sweepTone({ from: 280, to: 900, dur: 0.13, type: 'sawtooth', vol: 0.065, filterFrom: 1200, filterTo: 3200 });
}

function playGrass2(): void {
  scheduleSeries(8, 12, 22, (i) => {
    noiseBurst({ dur: 0.018, vol: 0.045, hp: 3000, lp: 12000, lpSweepTo: 6200 });
    if (i % 2 === 0) playNote(NOTE_FREQ.E6, DUR['32n'], { type: 'triangle', vol: 0.06, attack: 0.002, decay: 0.04, release: 0.03, filterType: 'lowpass', filterFreq: 5800 });
  });
}

function playGrass3(): void {
  noiseBurst({ dur: 0.2, vol: 0.1, hp: 320, lp: 2600, lpSweepTo: 680 });
  scheduleSeries(9, 11, 19, () => noiseBurst({ dur: 0.02, vol: 0.05, hp: 3000, lp: 11800, lpSweepTo: 5200 }));
  setTimeout(() => bass('D2', '8n'), 120);
}

function playDark0(): void {
  bass('D2', '16n');
  setTimeout(() => noiseBurst({ dur: 0.08, vol: 0.08, hp: 220, lp: 1600, lpSweepTo: 520 }), 30);
}

function playDark1(): void {
  sweepTone({ from: 200, to: 680, dur: 0.11, type: 'sawtooth', vol: 0.07, filterFrom: 800, filterTo: 2200 });
  setTimeout(() => noiseBurst({ dur: 0.09, vol: 0.075, hp: 600, lp: 2400, lpSweepTo: 700 }), 42);
}

function playDark2(): void {
  noiseBurst({ dur: 0.2, vol: 0.13, hp: 180, lp: 2400, lpSweepTo: 620 });
  setTimeout(() => bass('C2', '8n'), 50);
  setTimeout(() => metalPing(0.11), 130);
}

function playDark3(): void {
  sweepTone({ from: 760, to: 110, dur: 0.23, type: 'triangle', vol: 0.09, filterFrom: 1800, filterTo: 260 });
  setTimeout(() => {
    noiseBurst({ dur: 0.28, vol: 0.17, hp: 90, lp: 1800, lpSweepTo: 420 });
    bass('C2', '4n');
  }, 136);
}

function playLight0(): void {
  playNote(NOTE_FREQ.C6, DUR['32n'], { type: 'triangle', vol: 0.12, attack: 0.002, decay: 0.05, release: 0.04, filterType: 'lowpass', filterFreq: 6000 });
  setTimeout(() => playNote(NOTE_FREQ.G5, DUR['32n'], { type: 'triangle', vol: 0.1, attack: 0.002, decay: 0.05, release: 0.04, filterType: 'lowpass', filterFreq: 5200 }), 22);
}

function playLight1(): void {
  sweepTone({ from: 380, to: 1180, dur: 0.11, type: 'triangle', vol: 0.06, filterFrom: 1600, filterTo: 4200 });
  setTimeout(() => melodic('E6', '16n'), 24);
  setTimeout(() => melodic('C6', '16n'), 78);
}

function playLight2(): void {
  noiseBurst({ dur: 0.11, vol: 0.07, hp: 900, lp: 9800, lpSweepTo: 2600 });
  playNote(NOTE_FREQ.C6, DUR['16n'], { type: 'triangle', vol: 0.15, attack: 0.003, decay: 0.08, release: 0.07, filterType: 'lowpass', filterFreq: 6200 });
  setTimeout(() => playNote(NOTE_FREQ.E6, DUR['16n'], { type: 'triangle', vol: 0.12, attack: 0.003, decay: 0.08, release: 0.08, filterType: 'lowpass', filterFreq: 5800 }), 40);
}

function playLight3(): void {
  sweepTone({ from: 640, to: 210, dur: 0.19, type: 'triangle', vol: 0.065, filterFrom: 2200, filterTo: 400 });
  setTimeout(() => {
    playNote(NOTE_FREQ.C5, DUR['8n'], { type: 'triangle', vol: 0.14, attack: 0.003, decay: 0.08, release: 0.08, filterType: 'lowpass', filterFreq: 4200 });
    noiseBurst({ dur: 0.17, vol: 0.1, hp: 520, lp: 6400, lpSweepTo: 1800 });
  }, 120);
  setTimeout(() => bass('A2', '8n'), 184);
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
  playMove(type: string, idx = 0): void {
    const resolved = resolveMoveSoundName(type, idx);
    sfx.play(resolved);
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
