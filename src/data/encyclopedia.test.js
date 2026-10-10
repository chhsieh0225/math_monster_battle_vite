import test from 'node:test';
import assert from 'node:assert/strict';
import { ENC_ENTRIES, ENC_TOTAL, ENC_RANK_ORDER, getEncyclopediaRank, groupEncyclopediaEntries } from './encyclopedia.ts';
import { BOSS_IDS } from './monsterConfigs.ts';
import { localizeEncyclopediaEnemyEntries } from '../utils/contentLocalization.ts';
import en from '../i18n/locales/en-US.ts';
import zh from '../i18n/locales/zh-TW.ts';

test('encyclopedia groups rise from normal to boss without changing collection keys or source order', () => {
  const sourceOrder = ENC_ENTRIES.map(e => e.key);
  const groups = groupEncyclopediaEntries(Object.freeze([...ENC_ENTRIES]));
  assert.deepEqual(groups.map(g => g.rank), ['normal', 'evolved', 'elite', 'miniboss', 'boss']);
  const flattened = groups.flatMap(g => g.entries);
  assert.equal(flattened.length, ENC_TOTAL);
  assert.equal(new Set(flattened.map(e => e.key)).size, ENC_TOTAL);
  assert.deepEqual(flattened.map(e => e.key).sort(), [...sourceOrder].sort());
  assert.deepEqual(ENC_ENTRIES.map(e => e.key), sourceOrder);
  for (const group of groups) {
    assert.deepEqual(group.entries, ENC_ENTRIES.filter(e => getEncyclopediaRank(e) === group.rank));
  }
  assert.deepEqual(new Set(groups.at(-1).entries.map(e => e.key)), BOSS_IDS);
});

test('encyclopedia ranks distinguish evolved forms, elites, regional guardians and actual bosses', () => {
  const rank = key => getEncyclopediaRank(ENC_ENTRIES.find(e => e.key === key));
  for (const key of ['slime', 'slime_dark', 'fire', 'ghost_lantern', 'blue_butterfly']) assert.equal(rank(key), 'normal');
  for (const entry of ENC_ENTRIES.filter(e => e.isEvolved)) assert.equal(rank(entry.key), 'evolved');
  for (const key of ['dragon', 'golumn', 'golumn_mud', 'candy_knight']) assert.equal(rank(key), 'elite');
  for (const key of ['limit_knight', 'topology_knight', 'algebra_knight']) {
    assert.equal(rank(key), 'miniboss');
    assert.equal(BOSS_IDS.has(key), false, 'display rank must not enable boss mechanics');
  }
  for (const key of BOSS_IDS) assert.equal(getEncyclopediaRank({ key, isEvolved: true }), 'boss');
  assert.equal(getEncyclopediaRank({ key: 'future_monster', isEvolved: false }), 'normal');
  assert.equal(getEncyclopediaRank({ key: 'future_monster', isEvolved: true }), 'evolved');
});

test('empty groups are omitted and localization preserves rank membership and ordering', () => {
  assert.deepEqual(groupEncyclopediaEntries([]), []);
  const boss = ENC_ENTRIES.find(e => BOSS_IDS.has(e.key));
  assert.deepEqual(groupEncyclopediaEntries([boss]), [{ rank: 'boss', entries: [boss] }]);
  const keys = entries => groupEncyclopediaEntries(entries).map(g => [g.rank, g.entries.map(e => e.key)]);
  for (const locale of ['en-US', 'zh-TW']) assert.deepEqual(keys(localizeEncyclopediaEnemyEntries(ENC_ENTRIES, locale)), keys(ENC_ENTRIES));
  for (const rank of ENC_RANK_ORDER) {
    assert.ok(zh[`encyclopedia.rank.${rank}`]);
    assert.ok(en[`encyclopedia.rank.${rank}`]);
  }
});
