import { readText, writeText } from '../storage.ts';

const SFX_MUTED_KEY = 'mathMonsterBattle_sfxMuted';
const BGM_MUTED_KEY = 'mathMonsterBattle_bgmMuted';
const BGM_VOLUME_KEY = 'mathMonsterBattle_bgmVolume';
const DEFAULT_BGM_VOLUME = 0.5;
const MIN_BGM_VOLUME = 0;
const MAX_BGM_VOLUME = 1.0;

const REVERB_DECAY_SEC = 1.4;
const REVERB_WET_SFX = 0.22;
export const REVERB_WET_BGM = 0.10;
const REVERB_DRY = 1.0;
const SFX_MASTER_GAIN = 1.8;

export type MixerState = {
  getSfxMuted: () => boolean;
  getBgmMuted: () => boolean;
  getBgmVolume: () => number;
  setSfxMuted: (next: boolean) => boolean;
  setBgmMuted: (next: boolean) => boolean;
  setBgmVolume: (next: number) => number;
  setMuted: (next: boolean) => boolean;
  isMuted: () => boolean;
};

export type MixerBus = {
  sfxDest: AudioNode;
  reverbConvolver: ConvolverNode | null;
};

function clampBgmVolume(next: number): number {
  if (!Number.isFinite(next)) return DEFAULT_BGM_VOLUME;
  return Math.max(MIN_BGM_VOLUME, Math.min(MAX_BGM_VOLUME, next));
}

export function createMixerState(): MixerState {
  let sfxMuted = readText(SFX_MUTED_KEY, '0') === '1';
  let bgmMuted = readText(BGM_MUTED_KEY, '0') === '1';
  let bgmVolume = clampBgmVolume(Number.parseFloat(readText(BGM_VOLUME_KEY, String(DEFAULT_BGM_VOLUME))));

  return {
    getSfxMuted: () => sfxMuted,
    getBgmMuted: () => bgmMuted,
    getBgmVolume: () => bgmVolume,
    setSfxMuted(next: boolean): boolean {
      sfxMuted = !!next;
      writeText(SFX_MUTED_KEY, sfxMuted ? '1' : '0');
      return sfxMuted;
    },
    setBgmMuted(next: boolean): boolean {
      bgmMuted = !!next;
      writeText(BGM_MUTED_KEY, bgmMuted ? '1' : '0');
      return bgmMuted;
    },
    setBgmVolume(next: number): number {
      bgmVolume = clampBgmVolume(next);
      writeText(BGM_VOLUME_KEY, bgmVolume.toFixed(3));
      return bgmVolume;
    },
    setMuted(next: boolean): boolean {
      sfxMuted = !!next;
      bgmMuted = !!next;
      writeText(SFX_MUTED_KEY, sfxMuted ? '1' : '0');
      writeText(BGM_MUTED_KEY, bgmMuted ? '1' : '0');
      return next;
    },
    isMuted: () => sfxMuted && bgmMuted,
  };
}

function buildReverbIR(
  audioCtx: AudioContext,
  decay: number,
  randomFloat: (min: number, max: number) => number,
): AudioBuffer {
  const rate = audioCtx.sampleRate;
  const length = Math.floor(rate * Math.max(0.3, decay));
  const buf = audioCtx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      data[i] = randomFloat(-1, 1) * Math.exp(-3.5 * i / length);
    }
  }
  return buf;
}

export function initMixerBus(
  audioCtx: AudioContext,
  randomFloat: (min: number, max: number) => number,
): MixerBus {
  try {
    const reverbConvolver = audioCtx.createConvolver();
    reverbConvolver.buffer = buildReverbIR(audioCtx, REVERB_DECAY_SEC, randomFloat);

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

    return {
      sfxDest: bus,
      reverbConvolver,
    };
  } catch {
    return {
      sfxDest: audioCtx.destination,
      reverbConvolver: null,
    };
  }
}
