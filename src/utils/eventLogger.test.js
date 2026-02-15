import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendEvent,
  clearEvents,
  createEventSessionId,
  EVENT_LOG_LIMIT,
  loadEvents,
} from './eventLogger.js';

function withMockStorage(fn) {
  const prev = globalThis.localStorage;
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
  try {
    return fn();
  } finally {
    if (prev === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prev;
  }
}

test('appendEvent stores session-scoped structured event', () => {
  withMockStorage(() => {
    const sessionId = createEventSessionId();
    const fixedTs = 1_700_000_000_000;
    const event = appendEvent("starter_selected", { starterId: "fire" }, { sessionId, ts: fixedTs });

    assert.ok(event?.id);
    assert.equal(event?.sessionId, sessionId);
    assert.equal(event?.name, "starter_selected");
    assert.equal(event?.ts, fixedTs);
    assert.equal(event?.isoTime, new Date(fixedTs).toISOString());

    const events = loadEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].payload.starterId, "fire");
  });
});

test('appendEvent enforces FIFO retention limit', () => {
  withMockStorage(() => {
    for (let i = 0; i < EVENT_LOG_LIMIT + 3; i++) {
      appendEvent("tick", { i }, { ts: 1_700_000_000_000 + i });
    }
    const events = loadEvents();
    assert.equal(events.length, EVENT_LOG_LIMIT);
    assert.equal(events[0].payload.i, 3);
  });
});

test('clearEvents removes persisted log entries', () => {
  withMockStorage(() => {
    appendEvent("battle_result", { result: "win" });
    assert.equal(loadEvents().length, 1);
    clearEvents();
    assert.equal(loadEvents().length, 0);
  });
});

