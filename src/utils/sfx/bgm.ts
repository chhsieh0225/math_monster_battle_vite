import { randomFloat } from '../prng.ts';
import { DUR, NOTE_FREQ } from './musicTables.ts';
import { REVERB_WET_BGM } from './mixer.ts';

const PUBLIC_BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';

export type BgmTrack =
  | 'menu'
  | 'battle'
  | 'volcano'
  | 'coast'
  | 'thunder'
  | 'ironclad'
  | 'graveyard'
  | 'canyon'
  | 'boss'
  | 'boss_hydra'
  | 'boss_crazy_dragon'
  | 'boss_sword_god'
  | 'boss_dark_king';

export type BgmPreloadMode = 'metadata' | 'auto';

export type BgmControllerDeps = {
  getCtx: () => AudioContext | null;
  getReady: () => boolean;
  getBgmMuted: () => boolean;
  getBgmVolume: () => number;
  getReverbConvolver: () => ConvolverNode | null;
  getCachedNoiseBuffer: () => AudioBuffer | null;
};

export type BgmController = {
  startBgm: (track: BgmTrack) => void;
  stopBgm: (immediate?: boolean) => void;
  prefetchBgm: (tracks: ReadonlyArray<BgmTrack>, mode?: BgmPreloadMode) => void;
  onMutedChanged: (wasMuted: boolean, nextMuted: boolean) => void;
  onVolumeChanged: () => void;
  getTrack: () => string | null;
  dispose: () => void;
};

let depsRef: BgmControllerDeps | null = null;
let ctx: AudioContext | null = null;
let ready = false;
let bgmMuted = false;
let bgmVolume = 0.5;
let reverbConvolver: ConvolverNode | null = null;

function syncDepsState(): void {
  if (!depsRef) return;
  ctx = depsRef.getCtx();
  ready = depsRef.getReady();
  bgmMuted = depsRef.getBgmMuted();
  bgmVolume = depsRef.getBgmVolume();
  reverbConvolver = depsRef.getReverbConvolver();
}

function getCachedNoiseBuffer(): AudioBuffer | null {
  if (!depsRef) return null;
  return depsRef.getCachedNoiseBuffer();
}

type SynthBgmTrack = 'menu' | 'battle' | 'boss';
const BGM_FILE_BY_TRACK: Partial<Record<BgmTrack, string>> = {
  menu: `${PUBLIC_BASE_URL}musics/Chronicles_of_the_Verdant_Peak.mp3`,
  battle: `${PUBLIC_BASE_URL}musics/Titan_s_Fury.mp3`,
  volcano: `${PUBLIC_BASE_URL}musics/Inferno_s_Fury.mp3`,
  coast: `${PUBLIC_BASE_URL}musics/Leviathan_s_Fury.mp3`,
  thunder: `${PUBLIC_BASE_URL}musics/Thunderclap_Dynasty.mp3`,
  ironclad: `${PUBLIC_BASE_URL}musics/Ironclad_Dominion.mp3`,
  graveyard: `${PUBLIC_BASE_URL}musics/Spectral_Dirge.mp3`,
  canyon: `${PUBLIC_BASE_URL}musics/Canyon_of_Titans.mp3`,
  boss_hydra: `${PUBLIC_BASE_URL}musics/Hydra_s_Unholy_Dominion.mp3`,
  boss_crazy_dragon: `${PUBLIC_BASE_URL}musics/Wrath_of_the_Azure_Wyrm.mp3`,
  boss_sword_god: `${PUBLIC_BASE_URL}musics/Wrath_of_the_Celestial_Blade.mp3`,
  boss_dark_king: `${PUBLIC_BASE_URL}musics/Wrath_of_the_Crimson_Emperor.mp3`,
};
const SYNTH_FALLBACK_BY_TRACK: Record<BgmTrack, SynthBgmTrack> = {
  menu: 'menu',
  battle: 'battle',
  volcano: 'battle',
  coast: 'battle',
  thunder: 'battle',
  ironclad: 'battle',
  graveyard: 'battle',
  canyon: 'battle',
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
let bgmUnlockRetryArmed = false;
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
const bgmWarmupCache = new Map<string, HTMLAudioElement>();
const BGM_WARMUP_CACHE_LIMIT = 6;

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

function isBgmTrack(value: unknown): value is BgmTrack {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SYNTH_FALLBACK_BY_TRACK, value);
}

function trimBgmWarmupCache(): void {
  while (bgmWarmupCache.size > BGM_WARMUP_CACHE_LIMIT) {
    const first = bgmWarmupCache.entries().next().value;
    if (!first) break;
    const [src, el] = first;
    bgmWarmupCache.delete(src);
    try {
      el.pause();
      el.src = '';
    } catch {
      // best-effort cleanup
    }
  }
}

function prefetchBgmTrack(track: BgmTrack, mode: BgmPreloadMode = 'metadata'): void {
  const src = BGM_FILE_BY_TRACK[track];
  if (!src || typeof Audio === 'undefined') return;
  const existing = bgmWarmupCache.get(src);
  if (existing) {
    // "auto" can upgrade a previously metadata-only warmup request.
    if (mode === 'auto' && existing.preload !== 'auto') {
      existing.preload = 'auto';
      try { existing.load(); } catch { /* best-effort */ }
    }
    bgmWarmupCache.delete(src);
    bgmWarmupCache.set(src, existing);
    return;
  }
  const el = new Audio(src);
  el.loop = false;
  el.preload = mode;
  el.volume = 0;
  el.muted = true;
  el.setAttribute('playsinline', 'true');
  try { el.load(); } catch { /* best-effort */ }
  bgmWarmupCache.set(src, el);
  trimBgmWarmupCache();
}

function createBgmMediaElement(src: string, preload: BgmPreloadMode = 'auto'): HTMLAudioElement {
  const warm = bgmWarmupCache.get(src);
  if (warm) {
    bgmWarmupCache.delete(src);
    try {
      warm.onended = null;
      warm.pause();
      warm.currentTime = 0;
    } catch {
      // best-effort reset
    }
    warm.loop = false;
    warm.preload = preload;
    warm.muted = false;
    warm.volume = 0;
    return warm;
  }
  const el = new Audio(src);
  el.loop = false;
  el.preload = preload;
  el.volume = 0;
  el.setAttribute('playsinline', 'true');
  return el;
}

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
    el.onended = null;
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
    const nextEl = createBgmMediaElement(src, 'auto');
    bgmMediaElements.add(nextEl);
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

function disarmBgmUnlockRetry(): void {
  if (!bgmUnlockRetryArmed || typeof document === 'undefined') return;
  bgmUnlockRetryArmed = false;
  document.removeEventListener('click', onBgmUnlockRetryGesture, true);
  document.removeEventListener('touchstart', onBgmUnlockRetryGesture, true);
  document.removeEventListener('keydown', onBgmUnlockRetryGesture, true);
}

function armBgmUnlockRetry(track: BgmTrack): void {
  pendingBgmTrack = track;
  if (bgmUnlockRetryArmed || typeof document === 'undefined') return;
  bgmUnlockRetryArmed = true;
  document.addEventListener('click', onBgmUnlockRetryGesture, true);
  document.addEventListener('touchstart', onBgmUnlockRetryGesture, true);
  document.addEventListener('keydown', onBgmUnlockRetryGesture, true);
}

function onBgmUnlockRetryGesture(): void {
  if (!pendingBgmTrack || bgmMuted) {
    disarmBgmUnlockRetry();
    return;
  }
  const track = pendingBgmTrack;
  const hasMediaTrack = Boolean(BGM_FILE_BY_TRACK[track]);
  if (!ready && !hasMediaTrack) return;
  disarmBgmUnlockRetry();
  const retry = () => {
    if (bgmMuted || pendingBgmTrack !== track) return;
    try { startBgmLoop(track); } catch { /* best-effort */ }
  };
  if (ctx && ctx.state !== 'running') {
    resumeAudioIfNeeded(retry);
    return;
  }
  retry();
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
  disarmBgmUnlockRetry();
  const el = createBgmMediaElement(src, 'auto');
  bgmMediaElements.add(el);
  el.volume = 0;
  const token = ++bgmMediaToken;
  bgmMediaEl = el;
  bgmCurrent = track;
  // Fallback loop guard: if interval/crossfade misses (e.g. throttled tab), keep looping.
  el.onended = () => {
    if (bgmMediaToken !== token || bgmMediaEl !== el || bgmMuted) return;
    try {
      tuneLoopStartOffset(el);
      const retry = el.play();
      retry.catch(() => {
        armBgmUnlockRetry(track);
      });
    } catch {
      armBgmUnlockRetry(track);
    }
  };
  const playPromise = el.play();
  const onReady = () => {
    if (bgmMediaToken !== token || bgmMediaEl !== el || bgmMuted) return;
    disarmBgmUnlockRetry();
    rampMediaVolume(el, 0, bgmVolume, BGM_FADE_IN_MS);
    startBgmMediaLoopMonitor(el, token, track);
  };
  playPromise.then(onReady).catch(() => {
    // Mobile autoplay blocks can happen; queue a retry on next user gesture.
    if (bgmMediaToken !== token) return;
    stopBgmMedia(true);
    armBgmUnlockRetry(track);
    if (ctx && ctx.state !== 'running') {
      resumeAudioIfNeeded(() => {
        if (!bgmMuted && pendingBgmTrack === track) {
          try { startSynthBgmLoop(track); } catch { /* best-effort */ }
        }
      });
    } else {
      try { startSynthBgmLoop(track); } catch { /* best-effort */ }
    }
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
  disarmBgmUnlockRetry();
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

function applyMutedChange(wasMuted: boolean, nextMuted: boolean): void {
  syncDepsState();
  bgmMuted = nextMuted;
  if (nextMuted) {
    if (bgmCurrent) lastBgmTrack = bgmCurrent;
    pendingBgmTrack = null;
    stopBgmLoop(true);
  } else if (wasMuted && !nextMuted) {
    const track = lastBgmTrack || pendingBgmTrack;
    if (track && (ready || Boolean(BGM_FILE_BY_TRACK[track]))) {
      try { startBgmLoop(track); } catch { /* best-effort */ }
    }
  }
}

function applyVolumeChange(): void {
  syncDepsState();
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
}

function apiStartBgm(track: BgmTrack): void {
  syncDepsState();
  lastBgmTrack = track;
  if (bgmMuted) return;
  const hasMediaTrack = Boolean(BGM_FILE_BY_TRACK[track]);
  if (!ready && !hasMediaTrack) return;
  if (bgmCurrent === track) return;
  pendingBgmTrack = track;
  const boot = () => {
    const canStartMedia = Boolean(BGM_FILE_BY_TRACK[track]);
    if ((!ready && !canStartMedia) || bgmMuted || pendingBgmTrack !== track) return;
    try { startBgmLoop(track); } catch { /* best-effort */ }
    if (bgmCurrent === track) pendingBgmTrack = null;
  };
  if (ctx && ctx.state !== 'running') {
    resumeAudioIfNeeded(boot);
    return;
  }
  boot();
}

function apiPrefetchBgm(
  tracks: ReadonlyArray<BgmTrack>,
  mode: BgmPreloadMode = 'metadata',
): void {
  if (!Array.isArray(tracks) || tracks.length <= 0) return;
  const preloadMode: BgmPreloadMode = mode === 'auto' ? 'auto' : 'metadata';
  const uniqueTracks = new Set<BgmTrack>();
  for (const track of tracks) {
    if (!isBgmTrack(track) || uniqueTracks.has(track)) continue;
    uniqueTracks.add(track);
    prefetchBgmTrack(track, preloadMode);
  }
}

function apiStopBgm(immediate = false): void {
  syncDepsState();
  pendingBgmTrack = null;
  try { stopBgmLoop(immediate); } catch { /* ok */ }
}

function disposeBgm(): void {
  try { stopBgmLoop(true); } catch { /* ok */ }
  // Flush warmup cache
  for (const [_Src, el] of bgmWarmupCache) {
    try { el.pause(); el.src = ''; } catch { /* ok */ }
  }
  bgmWarmupCache.clear();
}

export function createBgmController(deps: BgmControllerDeps): BgmController {
  depsRef = deps;
  syncDepsState();
  return {
    startBgm: apiStartBgm,
    stopBgm: apiStopBgm,
    prefetchBgm: apiPrefetchBgm,
    onMutedChanged: applyMutedChange,
    onVolumeChanged: applyVolumeChange,
    getTrack: () => bgmCurrent,
    dispose: disposeBgm,
  };
}
