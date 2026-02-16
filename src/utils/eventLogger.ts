import { readJson, removeKey, writeJson } from './storage.ts';

const EVENTS_KEY = 'mathMonsterBattle_events';
export const EVENT_LOG_LIMIT = 1000;
const EVENT_SCHEMA_VERSION = 1;
const FLUSH_DELAY_MS = 450;
const FORCE_FLUSH_COUNT = 32;

type EventPayload = Record<string, unknown>;

type EventRecord = {
  id: string;
  v: number;
  name: string;
  sessionId: string | null;
  ts: number;
  isoTime: string;
  payload: EventPayload;
};

type AppendEventOptions = {
  sessionId?: string | null;
  ts?: number;
};

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleRequestOptionsLike = {
  timeout?: number;
};

type GlobalIdleApi = {
  requestIdleCallback?: (callback: (deadline: IdleDeadlineLike) => void, options?: IdleRequestOptionsLike) => number;
  cancelIdleCallback?: (handle: number) => void;
};

let pendingEvents: EventRecord[] = [];
let flushTimerId: ReturnType<typeof setTimeout> | null = null;
let idleCallbackId: number | null = null;
let storageRef: StorageLike | null = null;
let exitFlushBound = false;

function createId(ts = Date.now()): string {
  return `${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePayload(payload: unknown): EventPayload {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload as EventPayload;
  if (payload == null) return {};
  return { value: payload };
}

export function createEventSessionId(): string {
  return `sess-${createId()}`;
}

function getStorageRef(): StorageLike | null {
  try {
    const candidate = (globalThis as typeof globalThis & { localStorage?: StorageLike }).localStorage;
    return candidate || null;
  } catch {
    return null;
  }
}

function trimEvents(events: EventRecord[]): EventRecord[] {
  if (!Array.isArray(events) || events.length === 0) return [];
  if (events.length <= EVENT_LOG_LIMIT) return events;
  return events.slice(events.length - EVENT_LOG_LIMIT);
}

function mergeEvents(base: EventRecord[] | null | undefined, tail: EventRecord[]): EventRecord[] {
  if (!tail.length) return trimEvents(Array.isArray(base) ? [...base] : []);
  return trimEvents([...(Array.isArray(base) ? base : []), ...tail]);
}

function cancelScheduledFlush(): void {
  if (flushTimerId != null) {
    clearTimeout(flushTimerId);
    flushTimerId = null;
  }
  if (idleCallbackId != null) {
    const g = globalThis as typeof globalThis & GlobalIdleApi;
    if (typeof g.cancelIdleCallback === 'function') g.cancelIdleCallback(idleCallbackId);
    idleCallbackId = null;
  }
}

function ensureRuntimeState(): void {
  const currentStorage = getStorageRef();
  if (currentStorage === storageRef) return;
  storageRef = currentStorage;
  pendingEvents = [];
  cancelScheduledFlush();
}

function flushPendingEvents(): boolean {
  ensureRuntimeState();
  if (!pendingEvents.length) return false;
  cancelScheduledFlush();

  const persisted = readJson<EventRecord[]>(EVENTS_KEY, []);
  const merged = mergeEvents(persisted, pendingEvents);
  const ok = writeJson(EVENTS_KEY, merged);
  if (ok) pendingEvents = [];
  return ok;
}

function scheduleFlush(): void {
  if (!pendingEvents.length) return;

  if (pendingEvents.length >= FORCE_FLUSH_COUNT) {
    flushPendingEvents();
    return;
  }

  // In non-browser runtimes (tests), do not create timers.
  if (typeof window === 'undefined') return;

  const g = globalThis as typeof globalThis & GlobalIdleApi;
  if (typeof g.requestIdleCallback === 'function' && idleCallbackId == null) {
    idleCallbackId = g.requestIdleCallback(() => {
      idleCallbackId = null;
      flushPendingEvents();
    }, { timeout: FLUSH_DELAY_MS });
  }

  if (flushTimerId == null) {
    flushTimerId = setTimeout(() => {
      flushTimerId = null;
      flushPendingEvents();
    }, FLUSH_DELAY_MS);
  }
}

const onExitFlush = (): void => {
  flushPendingEvents();
};

const onVisibilityFlush = (): void => {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flushPendingEvents();
};

function ensureExitFlushBound(): void {
  if (exitFlushBound || typeof window === 'undefined') return;
  window.addEventListener('pagehide', onExitFlush);
  window.addEventListener('beforeunload', onExitFlush);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityFlush);
  exitFlushBound = true;
}

export function loadEvents(): EventRecord[] {
  ensureRuntimeState();
  return mergeEvents(readJson<EventRecord[]>(EVENTS_KEY, []), pendingEvents);
}

export function clearEvents(): void {
  ensureRuntimeState();
  pendingEvents = [];
  cancelScheduledFlush();
  removeKey(EVENTS_KEY);
}

export function appendEvent(
  name: string,
  payload: unknown = {},
  { sessionId = null, ts = Date.now() }: AppendEventOptions = {},
): EventRecord | null {
  if (!name) return null;
  ensureRuntimeState();
  ensureExitFlushBound();

  const event: EventRecord = {
    id: createId(ts),
    v: EVENT_SCHEMA_VERSION,
    name,
    sessionId,
    ts,
    isoTime: new Date(ts).toISOString(),
    payload: normalizePayload(payload),
  };

  pendingEvents.push(event);
  if (pendingEvents.length > EVENT_LOG_LIMIT) {
    pendingEvents = pendingEvents.slice(pendingEvents.length - EVENT_LOG_LIMIT);
  }
  scheduleFlush();

  return event;
}
