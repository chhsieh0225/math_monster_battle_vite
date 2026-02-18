import test from 'node:test';
import assert from 'node:assert/strict';

import {
  localizeEnemy,
  localizeEncyclopediaEnemyEntries,
  localizeEncyclopediaStarterEntries,
  localizeStarterDisplayName,
  localizeStarterList,
} from './contentLocalization.js';

const EN = "en-US";
const ZH = "zh-TW";
const CJK_RE = /[\u3400-\u9fff]/;

function hasCjk(text) {
  return CJK_RE.test(String(text || ""));
}

test('localizeEnemy maps evolved base-id monsters to evolved English names', () => {
  const evolvedFire = localizeEnemy({
    id: "fire",
    isEvolved: true,
    name: "烈焰巨龍",
    mType: "fire",
    typeName: "火",
  }, EN);

  assert.equal(evolvedFire.name, "Inferno Dragon");
  assert.equal(evolvedFire.typeName, "Fire");
});

test('localizeEnemy maps new monster variants to English names', () => {
  const lantern = localizeEnemy({
    id: "ghost_lantern",
    name: "提燈幽魂",
    mType: "ghost",
    typeName: "靈",
  }, EN);
  assert.equal(lantern.name, "Lantern Wraith");
  assert.equal(lantern.typeName, "Ghost");
});

test('localizeEnemy localizes dual-type labels and evolved lantern name', () => {
  const hydra = localizeEnemy({
    id: "boss_hydra",
    name: "深淵九頭蛇",
    mType: "poison",
    typeName: "毒",
    mType2: "dark",
    typeName2: "暗",
    trait: "venom",
    traitName: "毒霧",
    traitDesc: "散發致命毒霧。",
  }, EN);

  assert.equal(hydra.name, "Abyss Hydra");
  assert.equal(hydra.typeName, "Poison");
  assert.equal(hydra.typeName2, "Dark");
  assert.equal(hydra.traitName, "Venom Fog");
  assert.ok(!hasCjk(hydra.traitDesc));

  const evolvedLantern = localizeEnemy({
    id: "ghost_lantern",
    isEvolved: true,
    name: "冥燈死神",
    mType: "ghost",
    typeName: "靈",
  }, EN);
  assert.equal(evolvedLantern.name, "Lantern Reaper");
});

test('localizeStarterList maps starter and move names to English', () => {
  const starters = localizeStarterList([{
    id: "fire",
    name: "小火獸",
    type: "fire",
    typeName: "火",
    selectedStageIdx: 2,
    stages: [
      { name: "小火獸", emoji: "🔥", svgFn: () => "" },
      { name: "烈焰獸", emoji: "🔥", svgFn: () => "" },
      { name: "炎龍王", emoji: "🔥", svgFn: () => "" },
    ],
    moves: [
      { icon: "🔥", name: "火花彈", desc: "簡單乘法" },
      { icon: "🔥", name: "烈焰衝", desc: "九九乘法" },
      { icon: "🔥", name: "爆炎轟", desc: "大數乘法" },
      { icon: "💥", name: "暗火隕爆", desc: "暗火·乘除混合" },
    ],
  }], EN);
  assert.equal(starters.length, 1);

  for (const starter of starters) {
    assert.ok(!hasCjk(starter.name), `starter name still contains CJK: ${starter.name}`);
    assert.ok(!hasCjk(starter.typeName), `starter type still contains CJK: ${starter.typeName}`);
    for (const stage of starter.stages || []) {
      assert.ok(!hasCjk(stage.name), `starter stage name still contains CJK: ${stage.name}`);
    }
    for (const move of starter.moves || []) {
      assert.ok(!hasCjk(move.name), `move name still contains CJK: ${move.name}`);
    }
  }
});

test('localizeEncyclopediaEnemyEntries maps names and descriptions to English', () => {
  const enemies = localizeEncyclopediaEnemyEntries([{
    key: "fireEvolved",
    id: "fire",
    name: "烈焰巨龍",
    mType: "fire",
    typeName: "火",
    mType2: "dark",
    typeName2: "暗",
    weakAgainst: ["水"],
    resistAgainst: ["草"],
    desc: "火焰蜥的最終進化。",
    habitat: "🌋 炎熱火山",
    trait: "blaze",
    traitName: "烈焰",
    traitDesc: "HP低於50%時攻擊提升。",
  }], EN);
  assert.equal(enemies.length, 1);

  for (const entry of enemies) {
    assert.ok(!hasCjk(entry.name), `encyclopedia enemy name still contains CJK: ${entry.name}`);
    assert.ok(!hasCjk(entry.typeName), `encyclopedia enemy type still contains CJK: ${entry.typeName}`);
    if (entry.typeName2) {
      assert.ok(!hasCjk(entry.typeName2), `encyclopedia enemy type2 still contains CJK: ${entry.typeName2}`);
    }
    if (entry.desc) {
      assert.ok(!hasCjk(entry.desc), `encyclopedia enemy desc still contains CJK: ${entry.key}`);
    }
  }
});

test('localizeEncyclopediaStarterEntries maps starter entries and moves to English', () => {
  const starters = localizeEncyclopediaStarterEntries([{
    key: "starter_fire_2",
    starterId: "fire",
    stageIdx: 2,
    name: "炎龍王",
    mType: "fire",
    typeIcon: "🔥",
    typeName: "火",
    desc: "烈焰獸覺醒後的最終型態。",
    stageLabel: "三階",
    moves: [
      { icon: "🔥", name: "火花彈", desc: "簡單乘法", color: "#ef4444" },
      { icon: "🔥", name: "烈焰衝", desc: "九九乘法", color: "#f97316" },
      { icon: "🔥", name: "爆炎轟", desc: "大數乘法", color: "#dc2626" },
      { icon: "💥", name: "暗火隕爆", desc: "暗火·乘除混合", color: "#a855f7" },
    ],
  }], EN);
  assert.equal(starters.length, 1);

  for (const entry of starters) {
    assert.ok(!hasCjk(entry.name), `encyclopedia starter name still contains CJK: ${entry.name}`);
    assert.ok(!hasCjk(entry.typeName), `encyclopedia starter type still contains CJK: ${entry.typeName}`);
    assert.ok(!hasCjk(entry.stageLabel), `encyclopedia starter stage label still contains CJK: ${entry.stageLabel}`);
    if (entry.desc) {
      assert.ok(!hasCjk(entry.desc), `encyclopedia starter desc still contains CJK: ${entry.key}`);
    }
    for (const move of entry.moves || []) {
      assert.ok(!hasCjk(move.name), `encyclopedia starter move still contains CJK: ${move.name}`);
    }
  }
});

test('localizeStarterDisplayName maps stored Chinese names to English in en-US', () => {
  assert.equal(
    localizeStarterDisplayName("烈焰獸", "fire", EN),
    "Blazebeast",
  );
  assert.equal(
    localizeStarterDisplayName("", "water", EN),
    "Aquabub",
  );
  assert.equal(
    localizeStarterDisplayName("Voltkit", "electric", EN),
    "Voltkit",
  );
  assert.equal(
    localizeStarterDisplayName("x", "lion", EN, 2),
    "Solar King",
  );
});

test('localizeStarterDisplayName maps stored English names back to Chinese in zh-TW', () => {
  assert.equal(
    localizeStarterDisplayName("Blazebeast", "fire", ZH),
    "烈焰獸",
  );
  assert.equal(
    localizeStarterDisplayName("", "water", ZH),
    "小水獸",
  );
  assert.equal(
    localizeStarterDisplayName("小雷獸", "electric", ZH),
    "小雷獸",
  );
  assert.equal(
    localizeStarterDisplayName("x", "fire", ZH, 1),
    "烈焰獸",
  );
});
