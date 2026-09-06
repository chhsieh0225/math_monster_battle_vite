import type { BgmTrack } from './sfx/bgm.ts';

type MusicEnemy = { id?: string; sceneMType?: string; mType?: string };
type MusicState = {
  screen: string;
  battleMode: string;
  enemy?: MusicEnemy | null;
  enemySub?: MusicEnemy | null;
  starter?: { id?: string } | null;
  pvpStarter2?: { id?: string } | null;
};

export function getBossMusic(id?: string): BgmTrack | null {
  if (id === 'boss') return 'boss_dark_king';
  if (id === 'boss_hydra' || id === 'boss_crazy_dragon' || id === 'boss_sword_god') return id;
  return null;
}

export function getEncounterMusic(enemy?: MusicEnemy | null, sub?: MusicEnemy | null): BgmTrack {
  const boss = getBossMusic(enemy?.id) || getBossMusic(sub?.id);
  if (boss) return boss;
  const scene = enemy?.sceneMType || enemy?.mType;
  const tracks: Record<string, BgmTrack> = {
    fire: 'volcano', water: 'coast', electric: 'thunder', steel: 'ironclad', ghost: 'graveyard', rock: 'canyon',
  };
  return (scene && tracks[scene]) || 'battle';
}

/** Device quality affects preloading, never the selected encounter's musical identity. */
export function getScreenMusic(state: MusicState): BgmTrack | null {
  if (['title', 'selection', 'daily_challenge', 'howto'].includes(state.screen)) return 'menu';
  if (state.screen !== 'battle') return null;
  if (state.battleMode === 'pvp') {
    return getBossMusic(state.starter?.id) || getBossMusic(state.pvpStarter2?.id) || getEncounterMusic(state.enemy);
  }
  const team = state.battleMode === 'coop' || state.battleMode === 'double';
  return getEncounterMusic(state.enemy, team ? state.enemySub : null);
}
