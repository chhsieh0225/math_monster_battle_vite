export type ImageFactory = () => HTMLImageElement;

export async function decodeImage(src: string, createImage: ImageFactory, validate: (img: HTMLImageElement) => boolean): Promise<boolean> {
  try {
    const img = createImage();
    img.decoding = 'async';
    img.src = src;
    await img.decode();
    return validate(img);
  } catch {
    return false;
  }
}

type PendingImage = {
  src: string;
  visible: boolean;
  started: boolean;
  promise: Promise<boolean>;
  resolve: (ready: boolean) => void;
  image?: HTMLImageElement;
  timer?: ReturnType<typeof setTimeout>;
};

/** Shared priority queue with bounded decoded-image references; failed requests remain retryable. */
export function createImagePreloader({
  createImage = () => new Image(), maxReady = 8, maxConcurrent = 2, timeoutMs = 12000, maxPixels = Infinity,
  validate = (img: HTMLImageElement) => img.naturalWidth > 0 && img.naturalHeight > 0,
}: { createImage?: ImageFactory; maxReady?: number; maxConcurrent?: number; timeoutMs?: number; maxPixels?: number; validate?: (img: HTMLImageElement) => boolean } = {}) {
  const ready = new Map<string, HTMLImageElement>();
  const pending = new Map<string, PendingImage>();
  const listeners = new Map<string, Set<() => void>>();
  let active = 0;
  let updatingPlan = false;
  const capacity = Math.max(1, maxReady);
  const concurrency = Math.max(1, maxConcurrent);
  const decodedPixels = () => [...ready.values()].reduce((sum, img) => sum + img.naturalWidth * img.naturalHeight, 0);

  function finish(task: PendingImage, decoded: boolean, abort = false) {
    if (pending.get(task.src) !== task) return;
    pending.delete(task.src);
    clearTimeout(task.timer);
    if (task.started) active--;
    if (decoded && task.image) {
      ready.delete(task.src);
      ready.set(task.src, task.image);
      while (ready.size > capacity || (ready.size > 1 && decodedPixels() > maxPixels)) {
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
        void decodeImage(task.src, () => img, validate).then((ok) => finish(task, ok));
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
    let resolve!: PendingImage['resolve'];
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
      desired.forEach((src) => {
        // Reordering a selected route should reprioritize queued work without restarting downloads.
        const task = pending.get(src);
        if (task && !task.visible) { pending.delete(src); pending.set(src, task); }
        void load(src, false);
      });
      updatingPlan = false;
      pump();
    },
  };
}
