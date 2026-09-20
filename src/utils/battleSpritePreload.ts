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

type ImageFactory = () => HTMLImageElement;

export async function decodeBattleSprite(src: string, createImage: ImageFactory = () => new Image()): Promise<boolean> {
  try {
    const img = createImage();
    img.decoding = 'async';
    img.src = src;
    await img.decode();
    return img.naturalWidth === 2048 && img.naturalHeight === 768;
  } catch {
    return false;
  }
}

type PendingSprite = {
  src: string;
  visible: boolean;
  started: boolean;
  promise: Promise<boolean>;
  resolve: (ready: boolean) => void;
  image?: HTMLImageElement;
  timer?: ReturnType<typeof setTimeout>;
};

/** Shared download/decode queue and bounded strong image references (8 RGBA atlases ~48 MiB). */
export function createBattleSpritePreloader({
  createImage = () => new Image(), maxReady = 8, maxConcurrent = 2, timeoutMs = 12000,
}: { createImage?: ImageFactory; maxReady?: number; maxConcurrent?: number; timeoutMs?: number } = {}) {
  const ready = new Map<string, HTMLImageElement>();
  const pending = new Map<string, PendingSprite>();
  const listeners = new Map<string, Set<() => void>>();
  let active = 0;
  let updatingPlan = false;
  const capacity = Math.max(1, maxReady);
  const concurrency = Math.max(1, maxConcurrent);

  function finish(task: PendingSprite, decoded: boolean, abort = false) {
    if (pending.get(task.src) !== task) return;
    pending.delete(task.src);
    clearTimeout(task.timer);
    if (task.started) active--;
    if (decoded && task.image) {
      ready.delete(task.src);
      ready.set(task.src, task.image);
      while (ready.size > capacity) {
        const oldest = [...ready.keys()].find((src) => !listeners.has(src)) ?? ready.keys().next().value!;
        ready.delete(oldest);
      }
      listeners.get(task.src)?.forEach((notify) => notify());
    }
    if (abort && task.image) task.image.src = '';
    task.image = undefined;
    task.resolve(decoded);
    pump();
  }

  function pump() {
    if (updatingPlan) return;
    while (active < concurrency) {
      const queued = [...pending.values()].filter((task) => !task.started);
      const task = queued.find((entry) => entry.visible) || queued[0];
      if (!task) return;
      task.started = true;
      active++;
      try {
        const img = createImage();
        task.image = img;
        img.fetchPriority = task.visible ? 'high' : 'low';
        task.timer = setTimeout(() => finish(task, false, true), timeoutMs);
        void decodeBattleSprite(task.src, () => img).then((ok) => finish(task, ok));
      } catch {
        finish(task, false);
      }
    }
  }

  function load(src: string, visible = true): Promise<boolean> {
    if (!src) return Promise.resolve(false);
    const cached = ready.get(src);
    if (cached) {
      ready.delete(src);
      ready.set(src, cached);
      return Promise.resolve(true);
    }
    const existing = pending.get(src);
    if (existing) {
      existing.visible ||= visible;
      if (visible && existing.image) existing.image.fetchPriority = 'high';
      return existing.promise;
    }
    let resolve!: PendingSprite['resolve'];
    const promise = new Promise<boolean>((done) => { resolve = done; });
    pending.set(src, { src, visible, started: false, promise, resolve });
    pump();
    return promise;
  }

  return {
    load,
    isReady: (src: string) => ready.has(src),
    subscribe(src: string, notify: () => void) {
      const callbacks = listeners.get(src) || new Set<() => void>();
      callbacks.add(notify);
      listeners.set(src, callbacks);
      return () => { callbacks.delete(notify); if (!callbacks.size) listeners.delete(src); };
    },
    preload(sources: readonly string[]) {
      const desired = new Set([...new Set(sources.filter(Boolean))].slice(0, capacity));
      updatingPlan = true;
      // Cancel obsolete speculation, but never a request already needed by a mounted actor.
      for (const task of pending.values()) {
        if (!task.visible && !desired.has(task.src)) finish(task, false, true);
      }
      desired.forEach((src) => { void load(src, false); });
      updatingPlan = false;
      pump();
    },
  };
}

export const battleSpritePreloader = createBattleSpritePreloader();
