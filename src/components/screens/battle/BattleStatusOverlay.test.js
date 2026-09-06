import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BattleStatusOverlay } from './BattleStatusOverlay.tsx';
import { BattleEnemyInfoPanel } from './BattleInfoPanels.tsx';
import TextBox from '../../ui/TextBox.tsx';
import { I18nProvider } from '../../../i18n/index.tsx';
import zhTW from '../../../i18n/locales/zh-TW.ts';
import enUS from '../../../i18n/locales/en-US.ts';
import { BALANCE_CONFIG } from '../../../data/balanceConfig.ts';

const translate = (dict) => (key, fallback, params = {}) =>
  (dict[key] ?? fallback).replace(/\{(\w+)\}/g, (_match, key) => String(params[key] ?? ''));

for (const [locale, dict] of [['zh-TW', zhTW], ['en-US', enUS]]) {
  const t = translate(dict);
  test(`${locale}: boss attack badges match the damage configuration`, () => {
    for (const bossPhase of [2, 3]) {
      const multiplier = bossPhase === 3
        ? BALANCE_CONFIG.traits.boss.phase3AttackMultiplier : BALANCE_CONFIG.traits.boss.phase2AttackMultiplier;
      const html = renderToStaticMarkup(createElement(BattleEnemyInfoPanel, {
        t, enemy: { maxHp: 100, name: 'Boss', lvl: 1 }, enemyHp: 30,
        showEnemySub: false, battleMode: 'single', bossPhase, bossCharging: false,
      }));
      assert.ok(html.includes(t(bossPhase === 3 ? 'battle.status.bossAwaken' : 'battle.status.bossRage', '', { multiplier })));
      assert.ok(!html.includes('{multiplier}'));
    }
  });

  test(`${locale}: charge hint explains retaliation and last stand uses configured power`, () => {
    const props = { t, bossCharging: true, bossPhase: 3, diffLevel: 2, chargeDisplay: 0 };
    const html = renderToStaticMarkup(createElement(BattleStatusOverlay, props));
    assert.ok(html.includes(dict['battle.bossCounterHint']));
    assert.ok(html.includes(t('battle.lastStand', '', { multiplier: BALANCE_CONFIG.traits.player.bossPhase3DamageScale })));
    assert.match(html, /class="battle-boss-hint" role="status"/);
    const noCharge = renderToStaticMarkup(createElement(BattleStatusOverlay, { ...props, bossCharging: false }));
    assert.ok(!noCharge.includes(dict['battle.bossCounterHint']));
  });
}

test('battle narration only advertises an action when advancement is available', () => {
  const render = (onClick) => renderToStaticMarkup(createElement(I18nProvider, null,
    createElement(TextBox, { text: 'Battle narration', onClick })));
  const locked = render(undefined);
  assert.match(locked, /role="status"/);
  assert.ok(!locked.includes('tabindex='));
  assert.ok(!locked.includes('role="button"'));
  const ready = render(() => {});
  assert.match(ready, /role="button"/);
  assert.match(ready, /tabindex="0"/);
});
