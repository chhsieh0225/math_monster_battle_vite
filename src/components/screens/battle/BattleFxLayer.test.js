import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BattleFxLayer } from './BattleFxLayer.tsx';
import DamagePopup from '../../ui/DamagePopup.tsx';
import { useAttackImpactPhase } from './useAttackImpactPhase.ts';
import { createAttackImpact } from '../../../utils/effectTiming.ts';
import { noop } from '../../../hooks/battle/__testStubs.js';

function render(effect, phase, heavy = true) {
  return renderToStaticMarkup(createElement(BattleFxLayer, {
    t: (_key, fallback) => fallback, showHeavyFx: heavy, lowPerfMode: !heavy,
    impactPhase: phase, atkEffect: effect, sceneType: 'grass',
    effectTarget: { top: '100px', right: '50px', flyTop: 20, flyRight: 20, cx: 200, cy: 100 },
    dmgs: [], parts: [], battleMode: 'single', moveLevelUpIdx: null,
    starter: { moves: [] }, moveLvls: [], getPow: () => 10,
    achPopup: null, collectionPopup: null, phase: 'playerAtk', defAnim: null, effMsg: null,
    onRemoveDamage: noop, onRemoveParticle: noop, onDismissAchievement: noop, onDismissCollectionPopup: noop,
  }));
}

function Probe(props) {
  return createElement('span', null, useAttackImpactPhase(props));
}

test('launch alone never creates a contact burst or ultimate hit flash', () => {
  const html = render({ type: 'fire', idx: 3, lvl: 1 }, 'charge');
  assert.ok(!html.includes('battle-impact-contact'));
  assert.ok(!html.includes('battle-ult-sync-flash'));
});

test('contact uses the measured target and bounded markup independent of move level', () => {
  for (const lvl of [1, 12, 100]) {
    const html = render({ type: 'fire', idx: 3, lvl, impact: createAttackImpact('critical', 0) }, 'freeze');
    assert.match(html, /--impact-top:100px;--impact-right:50px/);
    assert.equal((html.match(/class="battle-impact-contact/g) || []).length, 3);
    assert.ok(html.includes('battle-ult-sync-flash'));
  }
});

test('miss, reduced FX, and finished reactions have no contact burst', () => {
  const hit = { type: 'fire', idx: 0, lvl: 1, impact: createAttackImpact('hit', 0) };
  assert.ok(!render(hit, 'idle').includes('battle-impact-contact'));
  assert.ok(!render(hit, 'freeze', false).includes('battle-impact-contact'));
  assert.ok(!render({ ...hit, impact: createAttackImpact('miss', 0) }, 'idle').includes('battle-impact-contact'));
});

test('impact hook starts from the actual outcome, not a launch countdown', () => {
  const effect = { type: 'fire', idx: 0, lvl: 1 };
  const phase = (atkEffect, enabled = true) => renderToStaticMarkup(createElement(Probe, { atkEffect, enabled }));
  assert.equal(phase(null), '<span>idle</span>');
  assert.equal(phase(effect), '<span>charge</span>');
  assert.equal(phase({ ...effect, impact: createAttackImpact('hit', 0) }), '<span>freeze</span>');
  assert.equal(phase({ ...effect, impact: createAttackImpact('blocked', 0) }), '<span>settle</span>');
  assert.equal(phase({ ...effect, impact: createAttackImpact('miss', 0) }), '<span>idle</span>');
  assert.equal(phase({ ...effect, impact: createAttackImpact('critical', 0) }, false), '<span>idle</span>');
});

test('damage is centered on its target and remains above the attack effect layer', () => {
  const html = renderToStaticMarkup(createElement(DamagePopup, {
    id: 1, value: '-123', x: 310, y: 200, color: '#ef4444', onDone: noop,
  }));
  assert.match(html, /left:310px/);
  assert.match(html, /translate:-50% 0/);
  assert.match(html, /z-index:160/);
  assert.match(html, /aria-label="Damage -123"/);
});
