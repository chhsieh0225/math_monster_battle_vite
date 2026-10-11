import { createImagePreloader, decodeImage, type ImageFactory } from './imagePreload.ts';
import { getSpriteAnimationAsset } from '../data/spriteAnimationAssets.ts';
import { getSpriteProfileKey } from '../data/sprites.ts';
import { computeBossPhase } from './turnFlow.ts';
import type { EnemyVm, StarterVm, UseBattleState } from '../types/battle';

export function getStarterSpriteSource(starter: StarterVm | null, stage = starter?.selectedStageIdx ?? 0): string | null {
  const pose = starter?.stages[stage] || starter?.stages[0];
  return getSpriteAnimationAsset(pose && getSpriteProfileKey(pose.svgFn))?.src ?? null;
}

type PreloadState = Pick<UseBattleState, 'screen' | 'battleMode' | 'starter' | 'pStg' | 'allySub'
  | 'enemy' | 'enemySub' | 'enemies' | 'round' | 'bossPhase' | 'eHp' | 'eHpSub'>;

/** Only actors visible on arrival. Future evolutions and boss forms must not delay entry. */
export function getBattleSpriteRequiredSources(state: PreloadState): string[] {
  const sources = new Set<string>();
  const add = (src: string | null | undefined) => { if (src) sources.add(src); };
  const enemy = (unit: EnemyVm | null | undefined, hp: number, phase = 1) => {
    if (!unit) return;
    const transformed = unit.id === 'boss' && state.battleMode !== 'pvp'
      && (phase >= 2 || computeBossPhase(hp, unit.maxHp) >= 2);
    const key = transformed ? 'bossDarkPhase2SVG' : unit.activeSpriteKey || unit.spriteKey || getSpriteProfileKey(unit.svgFn);
    add(getSpriteAnimationAsset(key)?.src);
  };
  add(getStarterSpriteSource(state.starter, state.pStg));
  enemy(state.enemy, state.eHp, state.bossPhase);
  if (state.battleMode === 'coop' || state.battleMode === 'double') {
    add(getStarterSpriteSource(state.allySub));
    enemy(state.enemySub, state.eHpSub);
  }
  return [...sources];
}

/** A rolling window, not the full roster. Identity follows physical slots and active variants. */
export function getBattleSpritePreloadSources(state: PreloadState, conserveNetwork = false): string[] {
  if (state.screen !== 'battle' && state.screen !== 'evolve') return [];
  const sources = new Set<string>();
  const transformations = new Set<string>();
  const add = (src: string | null | undefined) => { if (src) sources.add(src); };
  const team = state.battleMode === 'coop' || state.battleMode === 'double';
  const enemy = (unit: EnemyVm | null | undefined, hp = unit?.maxHp, phase = 1) => {
    if (!unit) return;
    const key = unit.activeSpriteKey || unit.spriteKey || getSpriteProfileKey(unit.svgFn);
    const base = getSpriteAnimationAsset(key)?.src;
    const second = unit.id === 'boss' && state.battleMode !== 'pvp'
      ? getSpriteAnimationAsset('bossDarkPhase2SVG')?.src : undefined;
    if (second && (phase >= 2 || computeBossPhase(hp ?? unit.maxHp, unit.maxHp) >= 2)) add(second);
    add(base);
    if (second) transformations.add(second);
  };
  add(getStarterSpriteSource(state.starter, state.pStg));
  enemy(state.enemy, state.eHp, state.bossPhase);
  if (team) {
    add(getStarterSpriteSource(state.allySub));
    enemy(state.enemySub, state.eHpSub);
  }
  transformations.forEach(add);
  if (!conserveNetwork && state.battleMode !== 'pvp') {
    const next = state.round + (team && state.enemySub ? 2 : 1);
    enemy(state.enemies[next]);
    if (team) enemy(state.enemies[next + 1]);
    transformations.forEach(add);
    if (state.starter?.stages[state.pStg + 1]) add(getStarterSpriteSource(state.starter, state.pStg + 1));
    const subStage = (state.allySub?.selectedStageIdx ?? 0) + 1;
    if (team && state.allySub?.stages[subStage]) add(getStarterSpriteSource(state.allySub, subStage));
  }
  return [...sources].slice(0, 8);
}

const isAtlas = (img: HTMLImageElement) => img.naturalWidth === 2048 && img.naturalHeight === 768;

export function decodeBattleSprite(src: string, createImage: ImageFactory = () => new Image()): Promise<boolean> {
  return decodeImage(src, createImage, isAtlas);
}

/** Eight decoded RGBA atlases retain at most 48 MiB. */
export function createBattleSpritePreloader(options: Parameters<typeof createImagePreloader>[0] = {}) {
  return createImagePreloader({ ...options, validate: isAtlas });
}

export const battleSpritePreloader = createBattleSpritePreloader();
