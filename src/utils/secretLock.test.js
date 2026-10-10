import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { MAP_ZOOM_STEP } from '../components/screens/useMapZoom.ts';
import { SECRET_REVEAL_ZOOM, SECRET_TAP_RADIUS_PX, WORLD_SECRETS, SECRET_IDS, findSecretNear } from '../data/worldSecrets.ts';
import { WORLD_REGIONS } from '../data/worldMap.ts';
import { GRADE_OPERAND_CAPS } from '../data/gradeCurriculum.ts';
import { createSecretQuestion } from './secretLock.ts';
import { createWorldProgress, isSecretFound, loadWorldProgress, normalizeWorldProgress, recordSecretFound, saveWorldProgress } from './worldProgress.ts';

let previousStorage;
beforeEach(() => {
  previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
});
afterEach(() => { globalThis.localStorage = previousStorage; });

test('hidden spots sit on the map, away from region markers, each with a reward', () => {
  assert.equal(new Set(SECRET_IDS).size, WORLD_SECRETS.length);
  for (const secret of WORLD_SECRETS) {
    assert.ok(secret.x > 0 && secret.x < 100 && secret.y > 0 && secret.y < 100, secret.id);
    assert.ok(Object.values(secret.reward).some((n) => n > 0), secret.id);
    for (const region of Object.values(WORLD_REGIONS)) {
      assert.ok(Math.hypot(secret.x - region.x, secret.y - region.y) >= 5, `${secret.id} too close to ${region.id}`);
    }
  }
});

test('the lock asks a question the child has learned', () => {
  let seed = 1;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let grade = 1; grade <= 6; grade += 1) {
    for (let i = 0; i < 30; i += 1) {
      const q = createSecretQuestion(grade, rand);
      assert.ok(Object.hasOwn(GRADE_OPERAND_CAPS[grade], q.op), `${q.op} at grade ${grade}`);
      assert.ok(q.choices.includes(q.answer));
    }
  }
  assert.ok(createSecretQuestion(null, rand).choices.length === 4);
});

test('found spots are remembered once and survive older saves', () => {
  let progress = createWorldProgress();
  assert.deepEqual(progress.secrets, []);
  progress = recordSecretFound(progress, 'mist_temple');
  assert.equal(recordSecretFound(progress, 'mist_temple'), progress);
  assert.equal(isSecretFound(progress, 'mist_temple'), true);
  saveWorldProgress(progress);
  assert.deepEqual(loadWorldProgress().secrets, ['mist_temple']);
  assert.deepEqual(normalizeWorldProgress({ version: 1, regions: {}, expeditions: {} }).secrets, [], 'older saves');
  assert.deepEqual(normalizeWorldProgress({ version: 1, secrets: ['mist_temple', 'moon_base', 3] }).secrets, ['mist_temple']);
});

test('one zoom-in press is enough to reveal hidden spots', () => {
  assert.ok(MAP_ZOOM_STEP >= SECRET_REVEAL_ZOOM);
});

test('a tap near a spot opens it; the nearest spot wins; far taps miss', () => {
  const map = { width: 1500, height: 1000 };
  const [a] = WORLD_SECRETS;
  const nudge = (px) => ({ x: a.x + (px / map.width) * 100, y: a.y });
  assert.equal(findSecretNear({ x: a.x, y: a.y }, map, WORLD_SECRETS)?.id, a.id);
  assert.equal(findSecretNear(nudge(SECRET_TAP_RADIUS_PX - 2), map, [a])?.id, a.id);
  assert.equal(findSecretNear(nudge(SECRET_TAP_RADIUS_PX + 2), map, [a]), null);
  assert.equal(findSecretNear({ x: a.x, y: a.y }, map, []), null);
  const twin = { ...a, id: 'storm_eye', x: a.x + 2 };
  assert.equal(findSecretNear({ x: a.x + 1.5, y: a.y }, map, [a, twin])?.id, 'storm_eye');
});
