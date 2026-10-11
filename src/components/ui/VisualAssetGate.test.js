import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VisualAssetGate from './VisualAssetGate.tsx';
import { I18nProvider } from '../../i18n/index.tsx';
import { scenePreloader } from '../../utils/scenePreload.ts';
import { battleSpritePreloader } from '../../utils/battleSpritePreload.ts';

const render = (props) => renderToStaticMarkup(createElement(I18nProvider, null,
  createElement(VisualAssetGate, props, createElement('div', null, 'Battle cinematic'))));

test('controls and cinematic children do not mount before essential images decode', () => {
  const html = render({ images: ['/gate-unloaded', '/gate-unloaded', ''] });
  assert.match(html, /<progress value="0" max="1"/);
  assert.doesNotMatch(html, /Battle cinematic/);
});

test('already running questions never wait for visual downloads when returning from settings', () => {
  assert.match(render({ images: ['/gate-unloaded'], wait: false }), /Battle cinematic/);
});

test('warmup cache exposes a fully prepared screen without a second loading flash', async () => {
  const original = globalThis.Image;
  globalThis.Image = class {
    naturalWidth = 2048;
    naturalHeight = 768;
    async decode() {}
  };
  try {
    await scenePreloader.load('/gate-ready-scene');
    await battleSpritePreloader.load('/gate-ready-sprite');
    const html = render({ images: ['/gate-ready-scene'], sprites: ['/gate-ready-sprite'] });
    assert.match(html, /Battle cinematic/);
    assert.doesNotMatch(html, /<progress/);
  } finally {
    globalThis.Image = original;
  }
});
