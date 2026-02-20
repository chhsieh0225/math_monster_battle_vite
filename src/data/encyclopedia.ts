/**
 * Encyclopedia entries — derived from MONSTERS (enemies) and STARTERS (player).
 * Includes evolved forms as separate entries.
 * The `key` field is what we store in localStorage.
 *
 * Two exported arrays:
 *   ENC_ENTRIES       — enemy monsters (used for "collect all" achievement)
 *   STARTER_ENTRIES   — player starters × 3 stages (always visible, no unlock)
 */
import { MONSTERS, SLIME_VARIANTS, EVOLVED_SLIME_VARIANTS, TYPE_EFF } from './monsters.ts';
import { getDualEff } from './typeEffectiveness.ts';
import { STARTERS } from './starters.ts';
import type { EncyclopediaEnemyEntry, EncyclopediaStarterEntry } from '../types/game';

function weaknesses(mType: string, mType2?: string): string[] {
  const weak: string[] = [];
  for (const atkType of Object.keys(TYPE_EFF)) {
    const eff = getDualEff(atkType, mType, mType2);
    if (eff > 1) weak.push(atkType);
  }
  return weak;
}

function resistances(mType: string, mType2?: string): string[] {
  const res: string[] = [];
  for (const atkType of Object.keys(TYPE_EFF)) {
    const eff = getDualEff(atkType, mType, mType2);
    if (eff < 1) res.push(atkType);
  }
  return res;
}

/**
 * weakAgainst / resistAgainst now store raw type IDs (e.g. "fire", "water").
 * Translation to display labels is deferred to the render layer via
 * contentLocalization.localizeTypeName() or i18n TYPE_LABEL lookups.
 * This keeps data locale-agnostic.
 */

// ── Monster descriptions ──
const DESCS: Record<string, string> = {
  slime: '草原上最常見的怪獸。身體柔軟Q彈，看似無害卻意外地頑強。據說不同環境下會產生屬性突變。',
  slime_red: '在火山地帶附近突變的史萊姆。體溫極高，觸碰時會感到灼熱。性格比綠色同類更加暴躁。',
  slime_blue: '長期棲息在水域邊的史萊姆變種。身體含有大量水分，能在雨天快速移動。',
  slime_yellow: '在雷暴頻繁的荒原中進化的史萊姆。體內蓄積靜電，毛髮會不自覺地豎起。',
  slime_dark: '在黑暗深淵中誕生的神秘史萊姆。幾乎不反射光線，總是默默地潛伏在陰影中。',
  slime_steel: '吞食了大量金屬礦石後硬化的史萊姆。外殼堅硬如鋼，但內部依然柔軟。',
  slimeEvolved: '史萊姆的最終進化型態。在叢林深處吸收了大量自然能量後，體型暴增數倍，成為令人畏懼的巨魔。',
  slimeElectricEvolved: '黃史萊姆吸收了無數次雷擊後的終極進化。全身電弧環繞，一聲怒吼就能引發雷暴。與叢林巨魔齊名的草原霸主。',
  slimeFireEvolved: '紅史萊姆在熔岩中浴火重生的終極型態。體表不斷噴發火焰，所到之處寸草不生。據說連火焰蜥都敬畏三分。',
  slimeWaterEvolved: '藍史萊姆沉入深海後吸收海溝壓力的終極型態。能操控強大的水壓，一擊就能粉碎岩石。深海中的絕對霸主。',
  slimeSteelEvolved: '鋼史萊姆吞噬了隕鐵核心後的終極型態。全身鍍上了一層不可摧毀的合金，連鋼鐵龍看到都要退避三舍。',
  slimeDarkEvolved: '黑史萊姆墮入深淵最底層後的終極型態。周身環繞著吞噬一切的暗黑漩渦，據說連光線都無法逃脫。',
  fire: '棲息在火山口附近的蜥蜴型怪獸。背部的鱗片能聚集熱能，在戰鬥中噴射灼熱火焰。',
  fireEvolved: '火焰蜥的最終進化。吸收了火山核心的能量後化身為巨龍，翅膀上的火焰永不熄滅。',
  ghost: '出沒於古老墓地的靈體怪獸。能穿越牆壁，用幽冥之力操控敵人的心智。白天幾乎看不到它的身影。',
  ghost_lantern: '手提冥燈的幽魂變體。燈火會引導迷失者走向陰影，並在戰鬥中干擾對手判斷。據說牠出現時，周圍溫度會瞬間下降。',
  mushroom: '盤踞毒沼邊緣的孢子怪獸。會釋放昏沉菌霧干擾判斷，趁機用毒性菌絲纏住獵物。潮濕地帶越濃密時，牠的行動越活躍。',
  ghostEvolved: '幽靈魔突破生死界限後的終極型態。手持冥界死神鐮刀，據說能看穿一切防禦。',
  dragon: '由古代機械文明創造的龍型機甲。全身覆蓋鈦合金裝甲，防禦力極高，但行動略顯笨重。',
  dragonEvolved: '鋼鐵龍裝載了傳說中的天空引擎後的形態。速度與防禦兼備，被稱為空中要塞。',
  boss: '傳說中的暗黑龍王。統治著暗黑深淵的最終BOSS。擁有壓倒性的力量，只有最強的訓練師才能擊敗它。',
  boss_hydra: '棲息於毒沼深淵的三頭毒蛇。全身散發致命毒霧，被牠纏上的獵物會在不知不覺中被毒素侵蝕。每顆頭都能噴出不同劇毒，是最令冒險者恐懼的存在。',
  boss_crazy_dragon: '傳說中失去一翼的古龍。斷翼之痛讓牠陷入永恆的狂怒，全身燃燒著暗黑火焰。雖然無法飛行，但地面上的爆發力遠超一般龍族，是三大Boss中攻擊力最強的存在。',
  boss_sword_god: '鎮守天界聖域的劍神。以神聖威壓與凌厲劍意裁決來者，出手如雷霆斬落。據說牠的每一次蓄力都能斷開戰場節奏，是最講究精準應對的終局Boss。',
  golumn: '棲息在荒涼峽谷深處的岩石巨人。全身由千年沉積的花崗岩構成，移動時地面都會震動。雖然行動遲緩，但防禦力驚人，普通攻擊幾乎無法穿透牠的岩石外殼。',
  golumn_mud: '泥岩層孕育出的高崙亞種。外層看似鬆散，實則能吸收衝擊並重新凝固。每一步都會留下沉重泥痕，難以被正面突破。',
};

const HABITATS: Record<string, string> = {
  slime: '🌿 綠意草原',
  slime_red: '🌿 綠意草原',
  slime_blue: '🌿 綠意草原',
  slime_yellow: '🌿 綠意草原',
  slime_dark: '🌿 綠意草原',
  slime_steel: '🌿 綠意草原',
  slimeEvolved: '🌿 綠意草原',
  slimeElectricEvolved: '🌿 綠意草原',
  slimeFireEvolved: '🌿 綠意草原',
  slimeWaterEvolved: '🌿 綠意草原',
  slimeSteelEvolved: '🌿 綠意草原',
  slimeDarkEvolved: '🌿 綠意草原',
  fire: '🌋 炎熱火山',
  fireEvolved: '🌋 炎熱火山',
  ghost: '🌙 幽暗墓地',
  ghost_lantern: '🌙 幽暗墓地',
  mushroom: '☠️ 毒沼深淵',
  ghostEvolved: '🌙 幽暗墓地',
  dragon: '⚙️ 鋼鐵要塞',
  dragonEvolved: '⚙️ 鋼鐵要塞',
  boss: '💀 暗黑深淵',
  boss_hydra: '☠️ 毒沼深淵',
  boss_crazy_dragon: '🔥 焦灼荒原',
  boss_sword_god: '☁️ 天界聖域',
  golumn: '🪨 岩石峽谷',
  golumn_mud: '🪨 岩石峽谷',
};

const RARITY: Record<string, string> = {
  slime: '★',
  slime_red: '★',
  slime_blue: '★',
  slime_yellow: '★',
  slime_dark: '★★',
  slime_steel: '★★',
  slimeEvolved: '★★★',
  slimeElectricEvolved: '★★★',
  slimeFireEvolved: '★★★',
  slimeWaterEvolved: '★★★',
  slimeSteelEvolved: '★★★',
  slimeDarkEvolved: '★★★',
  fire: '★★',
  fireEvolved: '★★★',
  ghost: '★★',
  ghost_lantern: '★★',
  mushroom: '★★',
  ghostEvolved: '★★★',
  dragon: '★★★',
  dragonEvolved: '★★★★',
  boss: '★★★★★',
  boss_hydra: '★★★★★',
  boss_crazy_dragon: '★★★★★',
  boss_sword_god: '★★★★★',
  golumn: '★★',
  golumn_mud: '★★',
};

export const ENC_ENTRIES: EncyclopediaEnemyEntry[] = [];

for (const m of MONSTERS) {
  if (m.id === 'slime') {
    // Slime variants — each gets its own encyclopedia entry
    for (const v of SLIME_VARIANTS) {
      ENC_ENTRIES.push({
        key: v.id,
        name: v.name,
        mType: v.mType,
        typeIcon: v.typeIcon,
        typeName: v.typeName,
        hp: Math.round(m.hp * (v.hpMult || 1)),
        atk: Math.round(m.atk * (v.atkMult || 1)),
        svgFn: v.svgFn,
        c1: v.c1,
        c2: v.c2,
        weakAgainst: weaknesses(v.mType),
        resistAgainst: resistances(v.mType),
        isEvolved: false,
        desc: DESCS[v.id] || '',
        habitat: HABITATS[v.id] || '',
        rarity: RARITY[v.id] || '★',
        drops: v.drops,
        trait: v.trait || null,
        traitName: v.traitName || null,
        traitDesc: v.traitDesc || null,
      });
    }

    // Evolved slime variants (叢林巨魔 / 雷霆巨魔 / ...)
    for (const ev of EVOLVED_SLIME_VARIANTS) {
      ENC_ENTRIES.push({
        key: ev.id,
        name: ev.name,
        mType: ev.mType,
        typeIcon: ev.typeIcon,
        typeName: ev.typeName,
        hp: Math.round(m.hp * (ev.hpMult || 1)),
        atk: Math.round(m.atk * (ev.atkMult || 1)),
        svgFn: ev.svgFn,
        c1: ev.c1,
        c2: ev.c2,
        weakAgainst: weaknesses(ev.mType),
        resistAgainst: resistances(ev.mType),
        isEvolved: true,
        desc: DESCS[ev.id] || '',
        habitat: HABITATS[ev.id] || '',
        rarity: RARITY[ev.id] || '★',
        drops: ev.drops,
        trait: ev.trait || null,
        traitName: ev.traitName || null,
        traitDesc: ev.traitDesc || null,
      });
    }
    continue;
  }

  // Base form
  ENC_ENTRIES.push({
    key: m.id,
    name: m.name,
    mType: m.mType,
    mType2: m.mType2,
    typeIcon: m.typeIcon,
    typeIcon2: m.typeIcon2,
    typeName: m.typeName,
    typeName2: m.typeName2,
    hp: m.hp,
    atk: m.atk,
    svgFn: m.svgFn,
    c1: m.c1,
    c2: m.c2,
    weakAgainst: weaknesses(m.mType, m.mType2),
    resistAgainst: resistances(m.mType, m.mType2),
    isEvolved: false,
    desc: DESCS[m.id] || '',
    habitat: HABITATS[m.id] || '',
    rarity: RARITY[m.id] || '★',
    drops: m.drops,
    trait: m.trait || null,
    traitName: m.traitName || null,
    traitDesc: m.traitDesc || null,
  });

  // Evolved form (boss has none)
  if (m.evolvedSvgFn) {
    const ek = `${m.id}Evolved`;
    ENC_ENTRIES.push({
      key: ek,
      name: m.evolvedName || m.name,
      mType: m.mType,
      mType2: m.mType2,
      typeIcon: m.typeIcon,
      typeIcon2: m.typeIcon2,
      typeName: m.typeName,
      typeName2: m.typeName2,
      hp: m.hp,
      atk: m.atk,
      svgFn: m.evolvedSvgFn,
      c1: m.c1,
      c2: m.c2,
      weakAgainst: weaknesses(m.mType, m.mType2),
      resistAgainst: resistances(m.mType, m.mType2),
      isEvolved: true,
      desc: DESCS[ek] || '',
      habitat: HABITATS[ek] || '',
      rarity: RARITY[ek] || '★',
      drops: m.drops,
      trait: m.trait || null,
      traitName: m.traitName || null,
      traitDesc: m.traitDesc || null,
    });
  }
}

// ── Build-time integrity checks ──
// Ensure every encyclopedia entry has desc, habitat, and rarity defined.
// Catches missing data when new monsters are added to monsterConfigs
// but not to the DESCS/HABITATS/RARITY maps above.
for (const e of ENC_ENTRIES) {
  if (!e.desc) throw new Error(`[encyclopedia] missing DESCS entry for key="${e.key}"`);
  if (!e.habitat) throw new Error(`[encyclopedia] missing HABITATS entry for key="${e.key}"`);
  if (!e.rarity) throw new Error(`[encyclopedia] missing RARITY entry for key="${e.key}"`);
}

// Total count for "collect all" achievement (enemy monsters only)
export const ENC_TOTAL = ENC_ENTRIES.length;

// ═══════════════════════════════════════════════════════════════
//  Player starter entries (always visible — no unlock required)
// ═══════════════════════════════════════════════════════════════

const STARTER_DESCS: Record<string, string> = {
  // ── Fire ──
  fire_0: '從火山蛋中孵化的幼獸。尾巴上的小火苗是生命力的象徵，開心時火焰會變大。擅長用簡單乘法快速發射火花彈。',
  fire_1: '小火獸成長後的形態。背部長出了堅硬的鱗甲，能發出更猛烈的火焰。九九乘法對牠來說已經是小菜一碟。',
  fire_2: '烈焰獸覺醒後的最終型態。展開雙翼翱翔天際，口吐熊熊烈焰。傳說中只有精通大數乘法的訓練師才能駕馭牠。',
  // ── Water ──
  water_0: '在清澈溪流中誕生的可愛水獸。能吐出小水泡進行攻擊。需要練習簡單除法來控制水流的力量。',
  water_1: '小水獸歷經風浪後進化而成。能操控強勁的水流波，攻擊範圍擴大。除法運算越精確，水壓越強。',
  water_2: '波濤獸稱霸深海後的終極型態。一聲怒吼便能掀起海嘯。只有駕馭大數除法的訓練師才能喚醒牠的全部力量。',
  // ── Grass ──
  grass_0: '誕生於陽光森林的幼苗精靈。以光合作用維生，性格溫順。用簡單加法累積自然能量進行攻擊。',
  grass_1: '小草獸吸收大量日光後綻放花朵。藤蔓變得又長又結實，可以猛烈抽打。減法運算讓牠學會如何精準削弱敵人。',
  grass_2: '花葉獸融合了整座森林的力量後成為森林王。一步一草木，大數加減在牠面前如同呼吸般自然。',
  // ── Electric ──
  electric_0: '在雷雨天誕生的電氣幼獸。毛茸茸的身體會蓄積靜電。學習加減混合運算來精確控制放電頻率。',
  electric_1: '小雷獸掌握了雷電之力後的進化。全身電弧環繞，速度大幅提升。乘加混合運算讓攻擊變化多端。',
  electric_2: '雷電獸引發天雷後的終極覺醒。據說一道閃電就能劈開山脈。四則運算的全方位掌握就是牠的無限電力。',
  // ── Lion ──
  lion_0: '在金色草原上誕生的幼獅。雖然年幼但眼神銳利，天生擁有追蹤未知數的直覺。擅長用加減法找出隱藏的答案。',
  lion_1: '小獅獸歷經磨練後長出了威風的鬃毛。牠的獵爪更加鋒利，能破解乘除法中的未知謎題。草原上的掠食者都敬畏三分。',
  lion_2: '獅鬃獸覺醒獅焰之力後的終極型態。全身環繞神聖金焰，任何未知數都無所遁形。傳說中只有最勇敢的訓練師才能駕馭這頭萬獸之王。',
  // ── Wolf (Steel / Fractions) ──
  wolf_0: '從鋼鐵要塞誕生的幼狼。前爪覆有金屬護片，擅長以分數比大小判斷最佳攻擊時機。',
  wolf_1: '小鋼狼進化後化為鋼刃狼。牠能精準處理同分母與異分母運算，劍般利爪會沿著最短計算路徑出擊。',
  wolf_2: '鋼刃狼最終覺醒成蒼鋼狼王。掌握分數乘除與高壓連段，出招時如齒輪咬合般精準無誤。',
  // ── Tiger (Ice / Decimals) ──
  tiger_0: '誕生於極地冰谷的幼虎。每一步都像在刻度線上移動，擅長一位小數加減，出招節奏精準穩定。',
  tiger_1: '霜牙虎進化後掌握霜鏡演算，能在小數與分數之間快速互換，常以冷靜反擊瓦解對手節奏。',
  tiger_2: '冰晶虎王覺醒永凍之力後，能駕馭高壓小數乘除。牠的每一次撲擊都像精密計算後的絕對零度裁決。',
};

const STARTER_SKILLS: Record<string, string> = {
  fire: '🔥 火屬性·乘法系',
  water: '💧 水屬性·除法系',
  grass: '🌿 草屬性·加減法系',
  electric: '⚡ 雷屬性·四則運算系',
  tiger: '❄️ 冰屬性·小數運算系',
  lion: '✨ 光屬性·求未知數系',
  wolf: '⚙️ 鋼屬性·分數運算系',
};

const STAGE_LABELS = ['一階', '二階', '三階'] as const;

export const STARTER_ENTRIES: EncyclopediaStarterEntry[] = [];

for (const st of STARTERS) {
  for (const [idx, stage] of st.stages.entries()) {
    STARTER_ENTRIES.push({
      key: `starter_${st.id}_${idx}`,
      starterId: st.id,
      stageIdx: idx,
      name: stage.name,
      emoji: stage.emoji,
      mType: st.type,
      typeIcon: st.typeIcon,
      typeName: st.typeName,
      svgFn: stage.svgFn,
      c1: st.c1,
      c2: st.c2,
      desc: STARTER_DESCS[`${st.id}_${idx}`] || '',
      skill: STARTER_SKILLS[st.id] || '',
      stageLabel: STAGE_LABELS[idx] || `${idx + 1}階`,
      moves: st.moves,
    });
  }
}
