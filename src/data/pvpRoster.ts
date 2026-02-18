import type { BossStarterId, StarterConfig, StarterMoveDef } from '../types/game';
import { STARTERS } from './starters.ts';
import { MONSTERS } from './monsters.ts';

const PVP_BOSS_IDS: readonly BossStarterId[] = [
  'boss',
  'boss_hydra',
  'boss_crazy_dragon',
  'boss_sword_god',
];

const PVP_BOSS_SKILL_SETS: Record<BossStarterId, StarterMoveDef[]> = {
  boss: [
    { name: '闇雷爪擊', icon: '💀', type: 'dark', desc: '暗雷·四則混合', basePower: 12, growth: 6, range: [2, 12], ops: ['mixed4'], color: '#7c3aed', bg: '#faf5ff' },
    { name: '深淵雷暴', icon: '⚡', type: 'electric', desc: '暗雷·乘加混合', basePower: 20, growth: 5, range: [2, 12], ops: ['mixed3'], color: '#a855f7', bg: '#f5f3ff' },
    { name: '黑皇吐息', icon: '💀', type: 'dark', desc: '暗雷·四則進階', basePower: 30, growth: 3, range: [3, 14], ops: ['mixed4'], color: '#6d28d9', bg: '#ede9fe' },
    { name: '滅界天罰', icon: '💥', type: 'dark', type2: 'electric', desc: '王域·終局混合', basePower: 40, growth: 3, range: [3, 14], ops: ['mixed4'], color: '#581c87', bg: '#f3e8ff', risky: true },
  ],
  boss_hydra: [
    { name: '毒牙連噬', icon: '☠️', type: 'dark', desc: '毒霧·加減混合', basePower: 12, growth: 6, range: [2, 16], ops: ['mixed2'], color: '#7c3aed', bg: '#f5f3ff' },
    { name: '深沼毒潮', icon: '☠️', type: 'water', desc: '毒潮·乘除混合', basePower: 20, growth: 5, range: [2, 12], ops: ['×', '÷'], color: '#0ea5e9', bg: '#eff6ff' },
    { name: '九首絞殺', icon: '💀', type: 'dark', desc: '深淵·四則連擊', basePower: 30, growth: 3, range: [3, 14], ops: ['mixed4'], color: '#6d28d9', bg: '#ede9fe' },
    { name: '冥沼終焉', icon: '💥', type: 'dark', type2: 'water', desc: '毒闇·終局混合', basePower: 40, growth: 3, range: [3, 14], ops: ['mixed4'], color: '#4c1d95', bg: '#eef2ff', risky: true },
  ],
  boss_crazy_dragon: [
    { name: '狂焰撕咬', icon: '🔥', type: 'fire', desc: '暗焰·乘法', basePower: 12, growth: 6, range: [2, 9], ops: ['×'], color: '#ef4444', bg: '#fff1f2' },
    { name: '斷翼衝斬', icon: '💀', type: 'dark', desc: '狂怒·四則混合', basePower: 20, growth: 5, range: [2, 12], ops: ['mixed4'], color: '#7f1d1d', bg: '#fef2f2' },
    { name: '黑炎焚天', icon: '🔥', type: 'fire', desc: '暗焰·高壓乘除', basePower: 30, growth: 3, range: [3, 14], ops: ['×', '÷'], color: '#b91c1c', bg: '#fee2e2' },
    { name: '殞翼審判', icon: '💥', type: 'dark', type2: 'fire', desc: '狂龍·終局裁決', basePower: 40, growth: 3, range: [3, 14], ops: ['mixed4'], color: '#450a0a', bg: '#fee2e2', risky: true },
  ],
  boss_sword_god: [
    { name: '天斬一閃', icon: '✨', type: 'light', desc: '神聖·加減求未知', basePower: 12, growth: 6, range: [2, 20], ops: ['unknown1'], color: '#eab308', bg: '#fefce8' },
    { name: '雲劍連華', icon: '⚔️', type: 'electric', desc: '劍意·混合四則', basePower: 20, growth: 5, range: [2, 12], ops: ['mixed4'], color: '#64748b', bg: '#f8fafc' },
    { name: '神罰斷空', icon: '✨', type: 'light', desc: '神聖·高階未知', basePower: 30, growth: 3, range: [3, 16], ops: ['unknown3'], color: '#ca8a04', bg: '#fef9c3' },
    { name: '叢雲終式', icon: '💥', type: 'light', type2: 'electric', desc: '神劍·終局未知', basePower: 40, growth: 3, range: [3, 16], ops: ['unknown4'], color: '#a16207', bg: '#fef3c7', risky: true },
  ],
};

const bossById = new Map(MONSTERS.map((monster) => [monster.id, monster]));

const PVP_BOSS_SELECTABLES: StarterConfig[] = PVP_BOSS_IDS.flatMap((bossId) => {
  const boss = bossById.get(bossId);
  if (!boss) return [];
  return [{
    id: bossId,
    name: boss.name,
    type: boss.mType,
    typeIcon: boss.typeIcon,
    typeName: boss.typeName || boss.mType,
    c1: boss.c1,
    c2: boss.c2,
    stages: [{
      name: boss.name,
      emoji: boss.typeIcon || '💀',
      svgFn: boss.svgFn,
    }],
    moves: PVP_BOSS_SKILL_SETS[bossId],
  }];
});

export const PVP_SELECTABLE_ROSTER: StarterConfig[] = [
  ...STARTERS,
  ...PVP_BOSS_SELECTABLES,
];
