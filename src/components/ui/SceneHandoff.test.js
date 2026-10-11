import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SceneHandoff from './SceneHandoff.tsx';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const deferredCode = () => {
  let resolve, reject, loaded = false;
  const promise = new Promise((yes, no) => { resolve = () => { loaded = true; yes(); }; reject = no; });
  return { load: () => promise, isReady: () => loaded, resolve, reject };
};
function fixture(extra = {}) {
  const music = [];
  const props = { sceneKey: 'map', images: [], sprites: [], music: 'menu',
    onPresented: (value) => music.push(value), onCancel() {}, t: (_, fallback) => fallback,
    children: createElement('button', null, 'Old map'), ...extra };
  const handoff = new SceneHandoff(props);
  const update = () => {
    handoff.state = { ...handoff.state, ...SceneHandoff.getDerivedStateFromProps(handoff.props, handoff.state) };
    handoff.componentDidUpdate();
  };
  // Exercise React's class lifecycle contract; browser QA also runs this with ReactDOM.
  handoff.updater = { enqueueSetState(instance, payload) {
    instance.state = { ...instance.state, ...(typeof payload === 'function' ? payload(instance.state) : payload) };
    update();
  } };
  handoff.componentDidMount();
  return { handoff, music, change: (patch) => { handoff.props = { ...handoff.props, ...patch }; update(); },
    html: () => renderToStaticMarkup(handoff.render()), stop: () => handoff.componentWillUnmount() };
}

test('cold destination retains a single inert outgoing scene and its music until ready', async () => {
  const code = deferredCode();
  const f = fixture();
  try {
    f.change({ sceneKey: 'battle:1', code, music: 'battle', children: createElement('div', null, 'Boss cinematic') });
    assert.match(f.html(), /Old map/);
    assert.match(f.html(), /inert=""/);
    assert.doesNotMatch(f.html(), /Boss cinematic|Loading|progress/);
    assert.deepEqual(f.music, ['menu']);
    code.resolve(); await tick();
    assert.match(f.html(), /Boss cinematic/);
    assert.doesNotMatch(f.html(), /Old map|inert=""/);
    assert.deepEqual(f.music, ['menu', 'battle']);
  } finally { f.stop(); }
});

test('already warmed destination commits synchronously without a fallback frame', () => {
  const f = fixture();
  try {
    f.change({ sceneKey: 'battle:2', code: { isReady: () => true, load: () => { throw Error('should not load'); } },
      children: 'Ready battle' });
    assert.match(f.html(), /Ready battle/);
    assert.doesNotMatch(f.html(), /Old map|inert=""/);
  } finally { f.stop(); }
});

test('stale completions cannot replace a newer destination or change its music', async () => {
  const first = deferredCode(), second = deferredCode();
  const f = fixture();
  try {
    f.change({ sceneKey: 'battle:1', code: first, music: 'battle', children: 'Stale battle' });
    f.change({ sceneKey: 'evolve', code: second, music: null, children: 'New evolution' });
    first.resolve(); await tick();
    assert.match(f.html(), /Old map/);
    assert.deepEqual(f.music, ['menu']);
    second.resolve(); await tick();
    assert.match(f.html(), /New evolution/);
    assert.deepEqual(f.music, ['menu', null]);
  } finally { f.stop(); }
});

test('completion uses the latest state rather than an old cinematic snapshot', async () => {
  const code = deferredCode(), f = fixture();
  try {
    f.change({ sceneKey: 'battle:3', code, children: 'Old text' });
    f.change({ children: 'Latest text' });
    code.resolve(); await tick();
    assert.match(f.html(), /Latest text/);
    assert.doesNotMatch(f.html(), /Old text/);
  } finally { f.stop(); }
});

test('failed imports preserve the old scene, expose recovery, and can retry', async () => {
  const code = deferredCode(), f = fixture();
  try {
    f.change({ sceneKey: 'broken', code, children: 'Recovered' });
    code.reject(Error('offline')); await tick();
    assert.match(f.html(), /Old map/);
    assert.match(f.html(), /role="alert"/);
    assert.match(f.html(), /Retry|Return to Title|Reload/);
    const retryCode = deferredCode();
    f.handoff.props = { ...f.handoff.props, code: retryCode };
    f.handoff.retry();
    assert.doesNotMatch(f.html(), /role="alert"/);
    retryCode.resolve(); await tick();
    assert.match(f.html(), /Recovered/);
    assert.doesNotMatch(f.html(), /role="alert"/);
  } finally { f.stop(); }
});

test('returning to the visible scene cancels a pending handoff', async () => {
  const code = deferredCode(), f = fixture();
  try {
    f.change({ sceneKey: 'battle:4', code, music: 'battle', children: 'Cancelled' });
    f.change({ sceneKey: 'map', code: undefined, music: 'menu', children: 'Still map' });
    code.resolve(); await tick();
    assert.match(f.html(), /Still map/);
    assert.deepEqual(f.music, ['menu']);
  } finally { f.stop(); }
});

test('unmount invalidates an in-flight completion', async () => {
  const code = deferredCode(), f = fixture();
  f.change({ sceneKey: 'battle:5', code, children: 'Unmounted destination' });
  f.stop(); code.resolve(); await tick();
  assert.equal(f.handoff.state.shown.sceneKey, 'map');
});

test('slow portrait decode prevents mounting evolution even when its code is ready', async () => {
  const OriginalImage = globalThis.Image, originalWindow = globalThis.window;
  let decode;
  globalThis.Image = class {
    naturalWidth = 512; naturalHeight = 384;
    decode() { return new Promise((done) => { decode = done; }); }
  };
  globalThis.window = { dispatchEvent() {} };
  const f = fixture();
  try {
    f.change({ sceneKey: 'evolve:slow', images: ['/handoff-evolve-slow'], children: 'Evolution reveal' });
    assert.match(f.html(), /Old map/);
    decode(); await tick();
    assert.match(f.html(), /Evolution reveal/);
    // Once mounted, cache misses or health ticks must not interrupt this scene.
    f.change({ images: ['/handoff-not-cached'], children: 'Battle HP updated' });
    assert.match(f.html(), /Battle HP updated/);
    assert.doesNotMatch(f.html(), /inert=""/);
  } finally { f.stop(); globalThis.Image = OriginalImage; globalThis.window = originalWindow; }
});

test('StrictMode remount restarts pending preparation instead of leaving the scene stuck', async () => {
  const code = deferredCode();
  const f = fixture({ sceneKey: 'cold', code, children: 'Remounted screen' });
  try {
    f.handoff.componentWillUnmount();
    f.handoff.componentDidMount();
    code.resolve(); await tick();
    assert.match(f.html(), /Remounted screen/);
    assert.doesNotMatch(f.html(), /inert=""/);
  } finally { f.stop(); }
});

test('a stalled preparation eventually exposes recovery over the outgoing scene', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture();
  try {
    f.change({ sceneKey: 'stalled', code: deferredCode(), children: 'Not ready' });
    context.mock.timers.tick(15001);
    assert.match(f.html(), /Old map/);
    assert.match(f.html(), /role="alert"/);
  } finally { f.stop(); }
});

test('new encounters notify presentation even when the BGM stays the same', async () => {
  const calls = [], f = fixture({ onPresented: (music, key) => calls.push([music, key]) });
  try {
    f.change({ sceneKey: 'battle:1', music: 'battle', children: 'First battle' });
    const code = deferredCode();
    f.change({ sceneKey: 'battle:2', code, children: 'Second battle' });
    assert.equal(calls.length, 2);
    code.resolve(); await tick();
    assert.deepEqual(calls, [['menu', 'map'], ['battle', 'battle:1'], ['battle', 'battle:2']]);
    f.change({ children: 'HP tick' });
    assert.equal(calls.length, 3, 'HP updates must not replay the slide-in');
  } finally { f.stop(); }
});
