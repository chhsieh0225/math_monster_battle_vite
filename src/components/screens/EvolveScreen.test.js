import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { STARTERS } from '../../data/starters.ts';
import { getSpriteProfileKey } from '../../data/sprites.ts';
import { getSpriteAnimationAsset } from '../../data/spriteAnimationAssets.ts';
import { scenePreloader } from '../../utils/scenePreload.ts';
import { I18nProvider } from '../../i18n/index.tsx';

// Node renders the markup; the browser verifies the real stylesheet and layout.
const cssHook = registerHooks({
  load(url, context, nextLoad) {
    return url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context);
  },
});
const { default: EvolveScreen } = await import('./EvolveScreen.tsx');
cssHook.deregister();
const render = (starter, stageIdx) => renderToStaticMarkup(createElement(I18nProvider, null,
  createElement(EvolveScreen, { starter, stageIdx, onContinue() {} })));

test('evolution reveal waits for the displayed portrait, not just the battle atlas', () => {
  const html = render(STARTERS[0], 1);
  assert.match(html, /<progress value="0" max="1"/);
  assert.doesNotMatch(html, /class="evolve-flash"/);
});

for (const starter of STARTERS) {
  for (const stageIdx of [1, 2]) {
    test(`${starter.id} stage ${stageIdx} shares a stage between portrait and all evolution effects`, async () => {
      const stage = starter.stages[stageIdx];
      const asset = getSpriteAnimationAsset(getSpriteProfileKey(stage.svgFn));
      assert.ok(asset, 'evolved artwork is registered');
      const original = globalThis.Image;
      globalThis.Image = class {
        naturalWidth = 512;
        naturalHeight = 384;
        async decode() {}
      };
      try {
        assert.equal(await scenePreloader.load(asset.portrait), true);
        const html = render(starter, stageIdx);
        const stageStart = html.indexOf('class="evolve-stage"');
        const nameStart = html.indexOf('class="evolve-name"');
        assert.ok(stageStart > 0 && nameStart > stageStart);
        const stageHtml = html.slice(stageStart, nameStart);
        assert.equal((stageHtml.match(/class="evolve-burst /g) || []).length, 3);
        assert.equal((stageHtml.match(/class="evolve-orbit"/g) || []).length, 12);
        assert.match(stageHtml, /class="evolve-sprite-wrap"/);
        assert.ok(stageHtml.includes(`aria-label="${stage.name}"`));
        assert.ok(stageHtml.includes(asset.portrait));
        assert.doesNotMatch(html, /<progress/);
      } finally {
        globalThis.Image = original;
      }
    });
  }
}

test('missing evolution data and legacy SVG forms retain a usable continue button', () => {
  for (const [starter, stage] of [[null, 1], [STARTERS[0], 99]]) {
    assert.match(render(starter, stage), /class="evolve-screen-fallback"/);
    assert.match(render(starter, stage), /<button/);
  }
  const legacy = { ...STARTERS[0], stages: [{ name: 'Legacy', emoji: '', svgFn: () => '<circle cx="60" cy="50" r="30" />' }] };
  const html = render(legacy, 0);
  assert.match(html, /class="evolve-sprite-glow"><svg/);
  assert.doesNotMatch(html, /<progress/);
});

test('evolution layout centers block portraits and anchors effects to the stage', () => {
  const css = readFileSync(new URL('./EvolveScreen.css', import.meta.url), 'utf8');
  const rule = (selector) => css.slice(css.indexOf(`${selector} {`)).split('}')[0];
  assert.match(rule('.evolve-stage'), /position: relative/);
  assert.match(rule('.evolve-stage'), /place-items: center/);
  assert.match(rule('.evolve-sprite-wrap'), /display: grid/);
  assert.match(rule('.evolve-sprite-wrap'), /transform-origin: center/);
  for (const selector of ['.evolve-burst', '.evolve-orbit']) {
    assert.match(rule(selector), /left: 50%/);
    assert.match(rule(selector), /top: 50%/);
  }
  assert.match(rule('.evolve-screen'), /overflow-y: auto/);
  assert.match(rule('.evolve-front'), /flex-shrink: 0/);
  assert.match(rule('.evolve-front'), /margin-block: auto/);
});
