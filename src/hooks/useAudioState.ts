import { useSyncExternalStore } from 'react';
import { subscribeAudioState, getAudioSnapshot } from '../utils/sfx.ts';
import type { MixerSnapshot } from '../utils/sfx.ts';

/**
 * Subscribe to the audio mixer's authoritative state.
 *
 * Returns a frozen snapshot of `{ sfxMuted, bgmMuted, bgmVolume }`.
 * The component re-renders only when a setter in sfx/mixer.ts
 * actually changes a value — no useState duplication needed.
 */
export function useAudioState(): MixerSnapshot {
  return useSyncExternalStore(subscribeAudioState, getAudioSnapshot);
}
