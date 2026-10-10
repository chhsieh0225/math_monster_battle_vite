import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP_ZOOM_MAX, MAP_ZOOM_MIN, anchoredScroll, clampZoom } from './useMapZoom.ts';

test('zoom stays between fit-to-height and 3x', () => {
  assert.equal(clampZoom(0.2), MAP_ZOOM_MIN);
  assert.equal(clampZoom(9), MAP_ZOOM_MAX);
  assert.equal(clampZoom(Number.NaN), MAP_ZOOM_MIN);
  assert.equal(clampZoom(1.456), 1.46);
});

test('the point under the fingers stays put while zooming', () => {
  // Viewport 400 px wide; map 600 px at 1x, centre of view on map x = 300 (half way).
  const anchor = { fracX: 0.5, fracY: 0.25, viewX: 200, viewY: 100 };
  const after = anchoredScroll(anchor, { left: 0, top: 0, width: 1200, height: 800 });
  assert.equal(after.left, 400, 'map x 600 of 1200 sits 200 px into the view');
  assert.equal(after.top, 100);
  assert.deepEqual(anchoredScroll({ fracX: 0, fracY: 0, viewX: 200, viewY: 200 }, { left: 0, top: 0, width: 800, height: 600 }),
    { left: 0, top: 0 }, 'never scrolls before the start');
});
