import { readJson, removeKey, writeJson } from './storage.js';

const EVENTS_KEY = "mathMonsterBattle_events";
export const EVENT_LOG_LIMIT = 1000;
const EVENT_SCHEMA_VERSION = 1;
const FLUSH_DELAY_MS = 450;
const FORCE_FLUSH_COUNT = 32;

let pendingEvents = [];
let flushTimerId = null;
let idleCallbackId = null;
let storageRef = null;
let exitFlushBound = false;

function createId(ts = Date.now()) {
  return `${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePayload(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) return payload;
  if (payload == null) return {};
  return { value: payload };
}

export function createEventSessionId() {
  return `sess-${createId()}`;
}

function getStorageRef() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function trimEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return [];
  if (events.length <= EVENT_LOG_LIMIT) return events;
  return events.slice(events.length - EVENT_LOG_LIMIT);
}

function mergeEvents(base, tail) {
  if (!tail.length) return trimEvents(Array.isArray(base) ? [...base] : []);
  return trimEvents([...(Array.isArray(base) ? base : []), ...tail]);
}

function cancelScheduledFlush() {
  if (flushTimerId != null) {
    clearTimeout(flushTimerId);
    flushTimerId = null;
  }
  if (idleCallbackId != null) {
    if (typeof globalThis.cancelIdleCallback === "function") globalThis.cancelIdleCallback(idleCallbackId);
    idleCallbackId = null;
  }
}

function ensureRuntimeState() {
  const currentStorage = getStorageRef();
  if (currentStorage === storageRef) return;
  storageRef = currentStorage;
  pendingEvents = [];
  cancelScheduledFlush();
}

function flushPendingEvents() {
  ensureRuntimeState();
  if (!pendingEvents.length) return false;
  cancelScheduledFlush();

  const persisted = readJson(EVENTS_KEY, []);
  const merged = mergeEvents(persisted, pendingEvents);
  const ok = writeJson(EVENTS_KEY, merged);
  if (ok) pendingEvents = [];
  return ok;
}

function scheduleFlush() {
  if (!pendingEvents.length) return;

  if (pendingEvents.length >= FORCE_FLUSH_COUNT) {
    flushPendingEvents();
    return;
  }

  // In non-browser runtimes (tests), do not create timers.
  if (typeof window === "undefined") return;

  if (typeof globalThis.requestIdleCallback === "function" && idleCallbackId == null) {
    idleCallbackId = globalThis.requestIdleCallback(() => {
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

const onExitFlush = () => { flushPendingEvents(); };
const onVisibilityFlush = () => {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") flushPendingEvents();
};

function ensureExitFlushBound() {
  if (exitFlushBound || typeof window === "undefined") return;
  window.addEventListener("pagehide", onExitFlush);
  window.addEventListener("beforeunload", onExitFlush);
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibilityFlush);
  exitFlushBound = true;
}

export function loadEvents() {
  ensureRuntimeState();
  return mergeEvents(readJson(EVENTS_KEY, []), pendingEvents);
}

export function clearEvents() {
  ensureRuntimeState();
  pendingEvents = [];
  cancelScheduledFlush();
  removeKey(EVENTS_KEY);
}

export function appendEvent(name, payload = {}, { sessionId = null, ts = Date.now() } = {}) {
  if (!name) return null;
  ensureRuntimeState();
  ensureExitFlushBound();

  const event = {
    id: createId(ts),
    v: EVENT_SCHEMA_VERSION,
    name,
    sessionId,
    ts,
    isoTime: new Date(ts).toISOString(),
    payload: normalizePayload(payload),
  };

  pendingEvents.push(event);
  if (pendingEvents.length > EVENT_LOG_LIMIT) pendingEvents = pendingEvents.slice(pendingEvents.length - EVENT_LOG_LIMIT);
  scheduleFlush();

  return event;
}
