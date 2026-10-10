import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BattleMoveMenu } from './BattleMoveMenu.tsx';
import { STARTERS } from '../../../data/starters.ts';
import { getShadowWard } from '../../../utils/combatTactics.ts';
import zh from '../../../i18n/locales/zh-TW.ts';
import en from '../../../i18n/locales/en-US.ts';
import { readFileSync } from 'node:fs';

test('battle UI literal translation keys exist in both dictionaries without inline duplicates', () => {
  for (const path of ['./BattleMoveMenu.tsx', '../BattleScreen.tsx']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    for (const [, key] of source.matchAll(/\bt\(['"]([^'"]+)['"]/g)) {
      assert.ok(zh[key], `Missing zh-TW: ${key}`);
      assert.ok(en[key], `Missing en-US: ${key}`);
    }
  }
});

function renderMenu(overrides = {}, strings = zh) {
  const starter = overrides.activeStarter ?? STARTERS.find(s => s.id === 'fire');
  const noop = () => {};
  return renderToStaticMarkup(createElement(BattleMoveMenu, {
    activeStarter: starter, battleMode: 'single', isCoopBattle: false,
    coopUsingSub: false, coopCanSwitch: false, pvpTurn: 'p1', pvpActiveCharge: 0,
    pvpActiveCombo: 0, pvpActiveSpecDefReady: false, pvpComboTrigger: 3,
    chargeReadyDisplay: true, chargeReady: true, sealedTurns: 0,
    inventory: { potion: 0, candy: 0, shield: 0 },
    moveRuntime: starter.moves.map((m, i) => ({ m, i, sealed: false, locked: false,
      lv: 1, pw: m.basePower, atCap: false, eff: 1, moveProgressPct: 0 })),
    t: (key, fallback, params = {}) => (strings[key] ?? fallback).replace(/\{(\w+)\}/g, (_, p) => String(params[p])),
    onSelectMove: noop, onUseItem: noop, onToggleCoopActive: noop,
    onTogglePause: noop, onOpenSettings: noop, onQuitGame: noop,
    ...overrides,
  }));
}

test('fire menu describes the actual stacked burst and shared opening in both languages', () => {
  const options = { burnStack: 3, enemyExposed: true };
  const chinese = renderMenu(options);
  assert.match(chinese, /燃燒 3\/5/);
  assert.match(chinese, /下次作答攻擊 \+20%/);
  assert.match(chinese, /引爆威力 \+18/);
  assert.match(chinese, /終結威力 \+27/);
  const english = renderMenu(options, en);
  assert.match(english, /Burn 3\/5/);
  assert.match(english, /Burst power \+18/);
  assert.doesNotMatch(chinese + english, /undefined|NaN/);
});

test('ward counters and the post-break bonus match the shared combat rules', () => {
  for (const layers of [3, 2, 1, 0]) {
    const html = renderMenu({ bossIntent: { charging: false, event: 'attack' },
      shadowWard: getShadowWard('boss', 'single', layers, 50, 100) });
    if (layers) assert.ok(html.includes(`剩 ${layers} 層`));
    else assert.match(html, /護盾已破：下次作答攻擊 \+35%/);
  }
});

test('PvP hides PvE tactics and other starters keep their mastery descriptions', () => {
  const pvp = renderMenu({ battleMode: 'pvp', burnStack: 3, enemyExposed: true });
  assert.doesNotMatch(pvp, /燃燒 3\/5|引爆威力|battle-tactic-state/);
  const wolf = renderMenu({ activeStarter: STARTERS.find(s => s.id === 'wolf') });
  assert.match(wolf, /move-mastery/);
  assert.doesNotMatch(wolf, /引爆威力/);
});

test('water previews distinguish fast build, burst and full-tide control in both locales', () => {
  const activeStarter = STARTERS.find(s => s.id === 'water');
  const full = renderMenu({ activeStarter, tideStack: 3 });
  assert.match(full, /潮汐 3\/3/);
  assert.match(full, /潮汐 \+2 · 直接傷害 85%/);
  assert.match(full, /耗 3 潮汐 · 威力 \+24 · 破兩層盾/);
  assert.match(full, /耗 3 潮汐 · 威力 \+15 · 必定冰凍/);
  const empty = renderMenu({ activeStarter }, en);
  assert.match(empty, /Tide 0\/3/);
  assert.match(empty, /Full tide: guaranteed freeze/);
  assert.doesNotMatch(empty + full, /undefined|NaN/);
});

test('electric previews predict auto-discharge versus spending and stay hidden in PvP', () => {
  const activeStarter = STARTERS.find(s => s.id === 'electric');
  const full = renderMenu({ activeStarter, staticStack: 2 });
  assert.match(full, /電荷 2\/3/);
  assert.match(full, /精準釋電威力 \+10/);
  assert.match(full, /獄鏈威力 \+24 · 破兩層盾/);
  assert.match(full, /放電威力 \+12/);
  assert.match(renderMenu({ activeStarter, staticStack: 2 }, en), /Pulse power \+10/);
  for (const id of ['water', 'electric']) {
    const html = renderMenu({ activeStarter: STARTERS.find(s => s.id === id), battleMode: 'pvp', tideStack: 3, staticStack: 2 });
    assert.doesNotMatch(html, /battle-tactic-state|class="move-tactic"/);
  }
});

test('nature previews share mastery healing, frost readiness and PvP exclusions in both locales', () => {
  for (const strings of [zh, en]) {
    const starter = STARTERS.find(s => s.id === 'grass');
    const grass = renderMenu({ activeStarter: starter, enemyExposed: true,
      moveRuntime: starter.moves.map((m, i) => ({ m, i, lv: 3, pw: m.basePower, eff: 1, moveProgressPct: 0 })) }, strings);
    for (const heal of [12, 6, 18, 24]) assert.ok(grass.includes(`${heal} HP`));
    assert.match(grass, /85%/);
    assert.match(grass, /data-ready="true"/);
    const tiger = STARTERS.find(s => s.id === 'tiger');
    const frosted = renderMenu({ activeStarter: tiger, shattered: true }, strings);
    assert.equal((frosted.match(/data-ready="true"/g) || []).length, 3);
    assert.match(frosted, /\+50%/);
    assert.doesNotMatch(grass + frosted, /undefined|NaN/);
    const empty = renderMenu({ activeStarter: tiger }, strings);
    assert.doesNotMatch(empty, /data-ready="true"/);
    for (const activeStarter of [starter, tiger]) {
      const pvp = renderMenu({ activeStarter, battleMode: 'pvp', shattered: true, enemyExposed: true }, strings);
      assert.doesNotMatch(pvp, /battle-tactic-state|class="move-tactic"/);
    }
  }
});

test('ordinary skill telegraphs and counter buttons use the actual prepared action in both languages', () => {
  const context = { enemy: { id: 'ghost', mType: 'dark' }, state: { turn: 1, disrupted: false } };
  const chinese = renderMenu({ enemySkillContext: context });
  const english = renderMenu({ enemySkillContext: context }, en);
  assert.match(chinese, /下一招：幽魂汲取/);
  assert.match(chinese, /傷害 ×0.85/);
  assert.match(english, /Next: Soul Siphon/);
  assert.equal((chinese.match(/可打亂技能/g) || []).length, 1);
  assert.doesNotMatch(chinese + english, /undefined|NaN|\{power\}/);
  const disrupted = renderMenu({ enemySkillContext: { ...context, state: { turn: 1, disrupted: true } } });
  assert.match(disrupted, /已打亂：技能減傷 35%/);
  assert.doesNotMatch(disrupted, /可打亂技能/);
  assert.doesNotMatch(renderMenu({ enemySkillContext: context, battleMode: 'pvp' }), /battle-enemy-skill-intent|可打亂技能/);
});
