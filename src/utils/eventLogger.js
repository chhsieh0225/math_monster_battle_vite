import { readJson, removeKey, writeJson } from './storage.js';

const EVENTS_KEY = "mathMonsterBattle_events";
export const EVENT_LOG_LIMIT = 1000;
const EVENT_SCHEMA_VERSION = 1;

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

export function loadEvents() {
  return readJson(EVENTS_KEY, []);
}

export function clearEvents() {
  removeKey(EVENTS_KEY);
}

export function appendEvent(name, payload = {}, { sessionId = null, ts = Date.now() } = {}) {
  if (!name) return null;
  const all = loadEvents();
  const event = {
    id: createId(ts),
    v: EVENT_SCHEMA_VERSION,
    name,
    sessionId,
    ts,
    isoTime: new Date(ts).toISOString(),
    payload: normalizePayload(payload),
  };
  all.push(event);
  if (all.length > EVENT_LOG_LIMIT) all.splice(0, all.length - EVENT_LOG_LIMIT);
  writeJson(EVENTS_KEY, all);
  return event;
}
