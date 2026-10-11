import { BG_IMGS, BG_IMGS_LOW, getSpriteProfileKey } from '../data/sprites.ts';
import { getSpriteAnimationAsset } from '../data/spriteAnimationAssets.ts';
import { getEncounterBackground } from '../data/encounterBackgrounds.ts';
import { WORLD_MAP_ART, EXPEDITIONS } from '../data/worldMap.ts';
import { MONSTER_CONFIGS } from '../data/monsterConfigs.ts';
import { nextExpeditionFloor, isSpringOption, type ExpeditionRun } from './expeditionRun.ts';
import { getStarterSpriteSource, getBattleSpriteRequiredSources } from './battleSpritePreload.ts';
import { createImagePreloader } from './imagePreload.ts';
import type { EnemyVm, StarterVm, UseBattleState } from '../types/battle';

const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
export const WORLD_MAP_SRC = `${BASE}${WORLD_MAP_ART.src}`;
// Large backgrounds must not remain decoded indefinitely (8M pixels ~32 MiB).
export const scenePreloader = createImagePreloader({ maxReady: 16, maxPixels: 8 * 1024 * 1024 });

export function shouldConserveNetwork(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = Reflect.get(navigator, 'connection') as { saveData?: boolean; effectiveType?: string } | undefined;
  return Boolean(connection?.saveData || /[23]g/.test(connection?.effectiveType || ''));
}

/** Match the rendered background exactly; network quality never changes art quality. */
export function getBattleBackground(enemy: Pick<EnemyVm, 'id' | 'mType' | 'sceneMType'> | null | undefined, lowPerfMode = false): string {
  const override = getEncounterBackground(enemy?.id);
  const scene = enemy?.sceneMType || enemy?.mType || 'grass';
  const key = (scene === 'light' ? 'heaven' : scene) as keyof typeof BG_IMGS;
  return override ?? (lowPerfMode ? BG_IMGS_LOW[key] : BG_IMGS[key]) ?? BG_IMGS.grass;
}

export function getEnemyPortrait(enemy: EnemyVm | null | undefined): string | null {
  const key = enemy?.activeSpriteKey || enemy?.spriteKey || getSpriteProfileKey(enemy?.svgFn);
  return getSpriteAnimationAsset(key)?.portrait ?? null;
}

export function getEvolutionPortrait(starter: StarterVm | null, stage: number): string | null {
  return getSpriteAnimationAsset(getSpriteProfileKey(starter?.stages[stage]?.svgFn))?.portrait ?? null;
}

/** The handoff key ignores HP, attacks and boss transformations within an existing encounter. */
export function getSceneKey(state: UseBattleState): string {
  if (state.screen === 'battle') return `battle:${state.battleMode}:${state.round}:${state.enemy?.id}:${state.enemySub?.id}`;
  if (state.screen === 'evolve') return `evolve:${state.starter?.id}:${state.pStg}`;
  return state.screen;
}

export function getRequiredSceneArt(state: UseBattleState, lowPerfMode = false): { images: string[]; sprites: string[] } {
  if (state.screen === 'worldmap') return { images: getWorldMapImages(state.expeditionRun, state.starter, state.pStg), sprites: [] };
  if (state.screen === 'evolve') {
    const portrait = getEvolutionPortrait(state.starter, state.pStg);
    return { images: portrait ? [portrait] : [], sprites: [] };
  }
  // Returning from settings must never hold an already-running question or attack.
  if (state.screen === 'battle' && (state.phase === 'text' || state.phase === 'bossIntro')) {
    const portraits = state.phase === 'bossIntro' ? [getEnemyPortrait(state.enemy), getEnemyPortrait(state.enemySub)] : [];
    return { images: [getBattleBackground(state.enemy, lowPerfMode), ...portraits.filter((src): src is string => Boolean(src))],
      sprites: getBattleSpriteRequiredSources(state) };
  }
  return { images: [], sprites: [] };
}

export function getWorldMapImages(run: ExpeditionRun | null = null, starter: StarterVm | null = null, stage = 0): string[] {
  const images = new Set([WORLD_MAP_SRC]);
  for (const expedition of EXPEDITIONS) {
    const key = MONSTER_CONFIGS.find((entry) => entry.id === expedition.bossId)?.spriteKey;
    const portrait = getSpriteAnimationAsset(key)?.portrait;
    if (portrait) images.add(portrait);
  }
  const own = getSpriteAnimationAsset(getSpriteProfileKey(starter?.stages[stage]?.svgFn))?.portrait;
  if (own) images.add(own);
  if (run?.atMap) {
    const floor = nextExpeditionFloor(run);
    for (let lane = 0; lane < (run.plan.floors[floor]?.options.length ?? 0); lane++) {
      const portrait = getEnemyPortrait(run.lanes[lane]?.[floor] ?? run.lanes[0]?.[floor]);
      if (portrait) images.add(portrait);
    }
  }
  return [...images];
}

/** Only offered routes, selected lane first. Never speculate on the rest of the expedition. */
export function getRoutePreloadPlan(run: ExpeditionRun | null, starter: StarterVm | null, stage: number,
  selectedLane: number, lowPerfMode = false, conserve = false) {
  const sprites = new Set<string>();
  const images = new Set<string>();
  const own = getStarterSpriteSource(starter, stage);
  if (own) sprites.add(own);
  if (run?.atMap) {
    const floor = nextExpeditionFloor(run);
    const options = run.plan.floors[floor]?.options ?? [];
    const selected = options[selectedLane] ? selectedLane : 0;
    const lanes = conserve ? [selected] : [selected, ...options.map((_, lane) => lane).filter((lane) => lane !== selected)];
    for (const lane of lanes) {
      if (!options[lane] || isSpringOption(options[lane])) continue;
      const enemy = run.lanes[lane]?.[floor] ?? run.lanes[0]?.[floor];
      if (!enemy) continue;
      images.add(getBattleBackground(enemy, lowPerfMode));
      const portrait = getEnemyPortrait(enemy);
      if (portrait) images.add(portrait);
      const key = enemy.activeSpriteKey || enemy.spriteKey || getSpriteProfileKey(enemy.svgFn);
      const asset = getSpriteAnimationAsset(key);
      if (asset) sprites.add(asset.src);
      if (enemy.id === 'boss') {
        const phase2 = getSpriteAnimationAsset('bossDarkPhase2SVG');
        if (phase2) sprites.add(phase2.src);
      }
    }
  }
  return { images: [...images], sprites: [...sprites] };
}
