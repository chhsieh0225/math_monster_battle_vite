import { BOSS_IDS } from './monsterConfigs.ts';
import { getGuardianSkill } from './guardianEncounters.ts';

export type EnemySkillActor = { id?: string; mType?: string; lvl?: number; isEvolved?: boolean };
export type EnemySkillSlot = { turn: number; disrupted: boolean };
export type EnemySkillState = { main: EnemySkillSlot; sub: EnemySkillSlot };
export const createEnemySkillState = (): EnemySkillState => ({
  main: { turn: 0, disrupted: false }, sub: { turn: 0, disrupted: false },
});

export type EnemySkill = {
  skillId: string;
  name: string;
  nameEn: string;
  kind: 'basic' | 'heavy' | 'drain' | 'mend';
  power: number;
  idx: number;
};
const skill = (skillId: string, name: string, nameEn: string, kind: EnemySkill['kind'] = 'heavy', idx = 0): EnemySkill => ({
  skillId, name, nameEn, kind, idx, power: kind === 'basic' ? 1 : kind === 'heavy' ? (idx ? 1.2 : 1.1) : .85,
});

// Stable IDs bind the announcement, telegraph, choreography and damage plan.
export const ENEMY_SKILLS: Record<string, readonly [EnemySkill, EnemySkill]> = {
  venom_mantis: [skill('monster:venom_scythe', '碧毒雙鐮', 'Jade Venom Scythes'), skill('monster:venom_cross', '螳影交錯', 'Mantis Crosscut', 'heavy', 1)],
  mire_toad: [skill('monster:lotus_breath', '沼燈蓮息', 'Lantern Lotus Breath', 'mend'), skill('monster:mire_tide', '毒蓮翻潮', 'Toxic Lotus Tide', 'heavy', 1)],
  night_bat: [skill('monster:moon_siphon', '蝕月汲取', 'Eclipse Siphon', 'drain'), skill('monster:eclipse_wings', '月蝠連翼', 'Moonbat Wingfall', 'heavy', 1)],
  chain_wraith: [skill('monster:shackle_lash', '鎖魂鏈擊', 'Soulshackle Lash'), skill('monster:prison_seal', '幽獄封印', 'Spectral Prison', 'heavy', 1)],
  thunder_raptor: [skill('monster:thunder_dive', '霆羽俯衝', 'Thundercrest Dive'), skill('monster:storm_feathers', '天雷落羽', 'Thunderfeather Rain', 'heavy', 1)],
  crystal_crab: [skill('monster:crystal_clamp', '晶鉗重擊', 'Crystal Clamp'), skill('monster:crystal_bastion', '晶盾崩陣', 'Crystal Bastion', 'heavy', 1)],
  dream_weaver: [skill('monster:dream_silk', '夢絲織補', 'Dreamsilk Weave', 'mend'), skill('monster:star_shuttle', '星梭穿夢', 'Starshuttle Pierce', 'heavy', 1)],
  slime_grass: [skill('monster:slime', '黏液彈', 'Goo Shot'), skill('monster:slime_canopy', '巨木震波', 'Canopy Quake', 'heavy', 1)],
  slime_fire: [skill('monster:slime_flare', '熔漿彈', 'Magma Glob'), skill('monster:slime_eruption', '熔核噴發', 'Core Eruption', 'heavy', 1)],
  slime_water: [skill('monster:slime_bubble', '汲水泡', 'Siphon Bubble', 'drain'), skill('monster:slime_pressure', '深海重壓', 'Abyss Pressure', 'heavy', 1)],
  slime_electric: [skill('monster:slime_spark', '蓄電球', 'Static Orb'), skill('monster:slime_thunder', '雷霆震落', 'Thunder Crash', 'heavy', 1)],
  slime_steel: [skill('monster:slime_shard', '鐵屑彈', 'Iron Shards'), skill('monster:slime_forge', '隕鐵重砸', 'Meteor Iron Slam', 'heavy', 1)],
  slime_dark: [skill('monster:slime_void', '暗渦汲取', 'Void Siphon', 'drain'), skill('monster:slime_abyss', '深淵崩落', 'Abyss Collapse', 'heavy', 1)],
  fire: [skill('monster:fire', '熾熱吐息', 'Searing Breath'), skill('monster:fire_rain', '熔火隕雨', 'Molten Rain', 'heavy', 1)],
  ghost: [skill('monster:ghost', '幽魂汲取', 'Soul Siphon', 'drain'), skill('monster:ghost_reap', '冥鐮收割', 'Reaper Scythe', 'heavy', 1)],
  ghost_lantern: [skill('monster:ghost_lantern', '冥燈吸魂', 'Lantern Siphon', 'drain'), skill('monster:ghost_reap', '冥鐮收割', 'Reaper Scythe', 'heavy', 1)],
  mushroom: [skill('monster:mushroom', '寄生孢子', 'Parasitic Spores', 'drain'), skill('monster:mushroom_bloom', '菌叢爆發', 'Spore Bloom', 'heavy', 1)],
  dragon: [skill('monster:dragon', '鈦爪裂斬', 'Titanium Claw'), skill('monster:dragon_cannon', '天空引擎砲', 'Sky Engine Cannon', 'heavy', 1)],
  golumn: [skill('monster:golumn', '岩柱震擊', 'Stone Pillar'), skill('monster:golumn_crash', '山岳崩拳', 'Mountain Crusher', 'heavy', 1)],
  golumn_mud: [skill('monster:golumn_mud', '泥岩汲流', 'Mudflow Siphon', 'drain'), skill('monster:mud_crash', '泥瀑壓頂', 'Mudfall Crush', 'heavy', 1)],
  candy_knight: [skill('monster:candy_knight', '糖晶劍斬', 'Sugar Crystal Slash'), skill('monster:candy_rain', '糖晶劍雨', 'Crystal Swordfall', 'heavy', 1)],
  candy_monster: [skill('monster:candy_monster', '甜夢回彈', 'Sweet Rebound', 'mend'), skill('monster:candy_rain', '糖晶劍雨', 'Crystal Swordfall', 'heavy', 1)],
  colorful_butterfly: [skill('monster:colorful_butterfly', '虹鱗旋舞', 'Prismatic Waltz'), skill('monster:butterfly_storm', '虹翼風暴', 'Prismatic Storm', 'heavy', 1)],
};

export const BOSS_SKILLS: Record<string, readonly [EnemySkill, EnemySkill]> = {
  boss: [skill('boss:2', '黑皇吐息', 'Black Emperor Breath', 'heavy', 2), skill('boss:3', '滅界天罰', 'Worldfall Judgment', 'heavy', 3)],
  boss_hydra: [skill('boss_hydra:2', '九首絞殺', 'Ninefold Constriction', 'heavy', 2), skill('boss_hydra:3', '冥沼終焉', 'Nethermarsh Finale', 'heavy', 3)],
  boss_crazy_dragon: [skill('boss_crazy_dragon:2', '黑炎焚天', 'Blackflame Skyburn', 'heavy', 2), skill('boss_crazy_dragon:3', '殞翼審判', 'Fallen Wing Judgment', 'heavy', 3)],
  boss_sword_god: [skill('boss_sword_god:2', '神罰斷空', 'Heavenly Rift', 'heavy', 2), skill('boss_sword_god:3', '叢雲終式', 'Heavencloud Finale', 'heavy', 3)],
};

const WILD_SKILLS: Record<string, readonly [EnemySkill, EnemySkill]> = {
  fire: [skill('fire:0', '火花彈', 'Spark Shot'), skill('fire:1', '烈焰衝', 'Flame Rush', 'heavy', 1)],
  water: [skill('water:0', '水泡攻擊', 'Bubble Attack'), skill('water:1', '水流波', 'Water Wave', 'heavy', 1)],
  grass: [skill('grass:0', '葉刃切', 'Leaf Blade'), skill('grass:1', '藤鞭打', 'Vine Lash', 'heavy', 1)],
  electric: [skill('electric:0', '電光彈', 'Spark Orb'), skill('electric:1', '雷電擊', 'Lightning Strike', 'heavy', 1)],
  lion: [skill('lion:0', '獵爪撲', 'Pouncing Claw'), skill('lion:1', '獅吼破', 'Lion Roar', 'heavy', 1)],
  wolf: [skill('wolf:0', '分數判勢', 'Fraction Feint'), skill('wolf:1', '同分斬', 'Common Slash', 'heavy', 1)],
  tiger: [skill('tiger:0', '冰晶彈', 'Ice Crystal'), skill('tiger:1', '霜鏡轉換', 'Frost Mirror', 'heavy', 1)],
};
const ELITES = new Set(['dragon', 'golumn', 'golumn_mud', 'candy_knight']);
const TRAINED_WILDLIFE = new Set(['venom_mantis', 'mire_toad', 'night_bat', 'chain_wraith', 'thunder_raptor', 'crystal_crab', 'dream_weaver']);
const BASIC = skill('enemy:basic', '基本攻擊', 'Basic Attack', 'basic');
export const ENEMY_SKILL_DISRUPT_SCALE = .65;

export function enemySkillNameKey(action: EnemySkill): string {
  return `${getGuardianSkill(action.skillId.split(':')[0]) ? 'guardian.skill' : 'enemy.skill.name'}.${action.skillId}`;
}

export function getEnemySkill(enemy: EnemySkillActor, turn = 0, ultimate = false): EnemySkill {
  const id = enemy.id ?? '';
  if (BOSS_IDS.has(id)) return BOSS_SKILLS[id][ultimate ? 1 : 0];
  const tick = Number.isFinite(turn) ? Math.max(0, Math.floor(turn)) : 0;
  const guardian = getGuardianSkill(id, enemy.lvl, tick);
  if (guardian) return { ...skill(guardian.skillId, guardian.name, guardian.nameEn, 'heavy', guardian.slot), power: 1 };
  if (tick % 2 === 0) return BASIC;
  const family = id.startsWith('slime') ? `slime_${enemy.mType || 'grass'}` : id.replace(/Evolved$/, '');
  const repertoire = id.startsWith('wild_starter_') ? WILD_SKILLS[id.slice(13)] : ENEMY_SKILLS[family];
  if (!repertoire) return BASIC;
  const expanded = enemy.isEvolved || id.endsWith('Evolved') || ELITES.has(id)
    || (TRAINED_WILDLIFE.has(id) && (enemy.lvl ?? 1) >= 5);
  return repertoire[expanded && tick % 4 === 3 ? 1 : 0];
}

/** Only a landed selected hit can disrupt a prepared skill; never support/DoT/PvP. */
export function canDisruptEnemySkill(enemy: EnemySkillActor, state: EnemySkillSlot, moveIndex: number, effectiveness: number, battleMode?: string): boolean {
  return battleMode !== 'pvp' && !BOSS_IDS.has(enemy.id ?? '') && !state.disrupted
    && getEnemySkill(enemy, state.turn).kind !== 'basic' && (moveIndex === 0 || effectiveness > 1);
}

export function resolveEnemySkillImpact(action: EnemySkill, disrupted: boolean, baseDamage: number, targetHp: number, hp: number, maxHp: number) {
  const damage = Math.max(0, Math.round(baseDamage * action.power * (disrupted ? ENEMY_SKILL_DISRUPT_SCALE : 1)));
  const dealt = Math.max(0, Math.min(targetHp, damage));
  const recovery = disrupted || dealt === 0 || hp <= 0 ? 0 : action.kind === 'drain'
    ? Math.min(Math.round(dealt * .35), Math.round(maxHp * .04)) : action.kind === 'mend' ? Math.round(maxHp * .04) : 0;
  return { damage, heal: Math.max(0, Math.min(recovery, maxHp - hp)) };
}

export const ENEMY_SKILL_NAMES = [BASIC, ...Object.values(ENEMY_SKILLS).flat(), ...Object.values(BOSS_SKILLS).flat(), ...Object.values(WILD_SKILLS).flat()];
