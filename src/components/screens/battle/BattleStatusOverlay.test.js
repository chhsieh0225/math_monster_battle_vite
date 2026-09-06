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
import { BattleMoveMenu } from './BattleMoveMenu.tsx';
import { BattleQuestionPanel } from './BattleQuestionPanel.tsx';
import { STARTERS } from '../../../data/starters.ts';
import { getBossTacticProfile } from '../../../utils/turnFlow.ts';

const translate = (dict) => (key, fallback, params = {}) =>
  (dict[key] ?? fallback).replace(/\{(\w+)\}/g, (_match, key) => String(params[key] ?? ''));

for (const [locale, dict] of [['zh-TW', zhTW], ['en-US', enUS]]) {
  const t = translate(dict);
  const menuProps = {
    t, activeStarter: STARTERS[0], battleMode: 'single', inventory: {}, moveRuntime: [],
    onSelectMove: () => {},
  };

  test(`${locale}: forecast labels cover every intent and only charging offers tactics`, () => {
    for (const event of ['attack', 'start_charge', 'release', 'seal_move', 'frozen']) {
      const html = renderToStaticMarkup(createElement(BattleMoveMenu, {
        ...menuProps, bossIntent: { event, charging: false },
      }));
      assert.ok(html.includes(dict[`battle.intent.${event}`]));
      assert.ok(html.includes(dict['battle.intent.conditional']));
      assert.ok(!html.includes('aria-pressed'));
    }
    const ordinary = renderToStaticMarkup(createElement(BattleMoveMenu, menuProps));
    assert.ok(!ordinary.includes('battle-intent'));
  });

  test(`${locale}: charge choices explain their tradeoff and default to guarded`, () => {
    const html = renderToStaticMarkup(createElement(BattleMoveMenu, {
      ...menuProps, bossIntent: { event: 'release', charging: true },
    }));
    assert.ok(html.includes(dict['battle.tactic.rule']));
    assert.match(html, /aria-pressed="true"><strong>/);
    assert.match(html, /aria-pressed="false"><strong>/);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
    for (const tactic of ['guarded', 'force']) {
      const { damageScale, counterRatio } = getBossTacticProfile(tactic);
      assert.ok(html.includes(t(`battle.tactic.${tactic}Detail`, '', {
        power: Math.round(damageScale * 100), counter: Math.round(counterRatio * 100),
      })));
    }
    assert.ok(!html.includes('{power}') && !html.includes('{counter}'));
  });

  test(`${locale}: the question shows the captured tactic and ordinary questions do not`, () => {
    for (const bossTactic of ['guarded', 'force', undefined]) {
      const html = renderToStaticMarkup(createElement(BattleQuestionPanel, {
        t, activeStarter: STARTERS[0], selectedMove: STARTERS[0].moves[0],
        question: { display: '5+5', choices: [9, 10], answer: 10, bossTactic },
        hintSteps: [], hintsRevealed: 0,
      }));
      assert.equal(html.includes('battle-question-tactic'), !!bossTactic);
      if (bossTactic) assert.ok(html.includes(dict[`battle.tactic.${bossTactic}`]));
    }
  });

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
