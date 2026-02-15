import {
  slimeSVG, fireLizardSVG, ghostSVG, dragonSVG, darkLordSVG,
  slimeEvolvedSVG, slimeElectricEvolvedSVG, slimeFireEvolvedSVG,
  fireEvolvedSVG, ghostEvolvedSVG, dragonEvolvedSVG,
  slimeRedSVG, slimeBlueSVG, slimeYellowSVG, slimeDarkSVG, slimeSteelSVG,
} from './sprites';

/**
 * Slime colour variants — randomly picked each encounter (non-evolved only).
 * Each variant overrides: name, svgFn, c1, c2, mType, typeIcon, typeName, drops.
 */
/**
 * Slime variant traits:
 *   trait      — unique trait id for battle logic
 *   traitName  — display label
 *   traitDesc  — short description shown in encyclopedia
 *   hpMult     — multiplier applied to base HP
 *   atkMult    — multiplier applied to base ATK
 *
 * Special effects (handled in useBattle):
 *   normal   — no special effect
 *   berserk  — 30% chance to deal 1.5x critical damage
 *   tenacity — heals 15% maxHP when attacking
 *   swift    — 25% chance to attack twice in one turn
 *   curse    — 35% chance to weaken player's next attack (0.6x)
 *   fortress — takes 30% less damage from all attacks
 */
export const SLIME_VARIANTS = [
  { id:"slime",       name:"綠史萊姆", svgFn:slimeSVG,       c1:"#4ade80",c2:"#16a34a", mType:"grass",    typeIcon:"🌿", typeName:"草", drops:["🍬","🧪"],  trait:"normal",   traitName:"普通",  traitDesc:"最基本的史萊姆，沒有特殊能力。",                          hpMult:1.0, atkMult:1.0 },
  { id:"slime_red",   name:"紅史萊姆", svgFn:slimeRedSVG,     c1:"#f87171",c2:"#b91c1c", mType:"fire",     typeIcon:"🔥", typeName:"火", drops:["🔥","🍬"],  trait:"berserk",  traitName:"狂暴",  traitDesc:"血量較低但攻擊兇猛，有機率發動暴擊造成1.5倍傷害！",      hpMult:0.8, atkMult:1.4 },
  { id:"slime_blue",  name:"藍史萊姆", svgFn:slimeBlueSVG,    c1:"#60a5fa",c2:"#1d4ed8", mType:"water",    typeIcon:"💧", typeName:"水", drops:["💧","🍬"],  trait:"tenacity", traitName:"堅韌",  traitDesc:"攻擊力較低但非常耐打，攻擊時還能回復自身生命值。",        hpMult:1.3, atkMult:0.8 },
  { id:"slime_yellow",name:"黃史萊姆", svgFn:slimeYellowSVG,  c1:"#facc15",c2:"#ca8a04", mType:"electric", typeIcon:"⚡", typeName:"電", drops:["⚡","🍬"],  trait:"swift",    traitName:"迅捷",  traitDesc:"行動速度極快，有機率在一回合內連續攻擊兩次！",            hpMult:0.9, atkMult:1.1 },
  { id:"slime_dark",  name:"黑史萊姆", svgFn:slimeDarkSVG,    c1:"#a1a1aa",c2:"#3f3f46", mType:"dark",     typeIcon:"💀", typeName:"暗", drops:["💀","🍬"],  trait:"curse",    traitName:"詛咒",  traitDesc:"散發不祥氣息，攻擊時有機率弱化對手的下一次攻擊。",      hpMult:1.0, atkMult:1.0 },
  { id:"slime_steel", name:"鋼史萊姆", svgFn:slimeSteelSVG,   c1:"#94a3b8",c2:"#475569", mType:"steel",    typeIcon:"🛡️", typeName:"鋼", drops:["🛡️","🍬"],  trait:"fortress", traitName:"鐵壁",  traitDesc:"全身覆蓋金屬外殼，攻擊力低但受到的傷害減少30%。",      hpMult:1.5, atkMult:0.7 },
];

/**
 * Evolved slime variants — randomly picked when a slime encounter is evolved.
 * Each shares the same base stats as the original 叢林巨魔 but has different
 * appearance, type, and drops. Appears on the same stage (草原).
 */
export const EVOLVED_SLIME_VARIANTS = [
  { id:"slimeEvolved",          name:"叢林巨魔",   svgFn:slimeEvolvedSVG,          c1:"#4ade80",c2:"#16a34a", mType:"grass",    typeIcon:"🌿", typeName:"草", drops:["🍬","🧪"] },
  { id:"slimeElectricEvolved",  name:"雷霆巨魔",   svgFn:slimeElectricEvolvedSVG,  c1:"#facc15",c2:"#ca8a04", mType:"electric", typeIcon:"⚡", typeName:"電", drops:["⚡","🧪"] },
  { id:"slimeFireEvolved",     name:"烈焰巨魔",   svgFn:slimeFireEvolvedSVG,     c1:"#f87171",c2:"#b91c1c", mType:"fire",     typeIcon:"🔥", typeName:"火", drops:["🔥","🧪"] },
];

export const MONSTERS = [
  {id:"slime",name:"史萊姆",hp:40,atk:6,c1:"#4ade80",c2:"#16a34a",svgFn:slimeSVG,evolvedSvgFn:slimeEvolvedSVG,evolvedName:"叢林巨魔",evolveLvl:5,drops:["🍬","🧪"],mType:"grass",typeIcon:"🌿",typeName:"草"},
  {id:"fire",name:"火焰蜥",hp:55,atk:9,c1:"#f87171",c2:"#b91c1c",svgFn:fireLizardSVG,evolvedSvgFn:fireEvolvedSVG,evolvedName:"烈焰巨龍",evolveLvl:5,drops:["🔥","💎"],mType:"fire",typeIcon:"🔥",typeName:"火"},
  {id:"ghost",name:"幽靈魔",hp:50,atk:8,c1:"#c084fc",c2:"#7e22ce",svgFn:ghostSVG,evolvedSvgFn:ghostEvolvedSVG,evolvedName:"冥界死神",evolveLvl:5,drops:["👻","⭐"],mType:"ghost",typeIcon:"👻",typeName:"靈"},
  {id:"dragon",name:"鋼鐵龍",hp:80,atk:12,c1:"#60a5fa",c2:"#1d4ed8",svgFn:dragonSVG,evolvedSvgFn:dragonEvolvedSVG,evolvedName:"鐵甲天龍",evolveLvl:9,drops:["🐉","👑"],mType:"steel",typeIcon:"🛡️",typeName:"鋼"},
  {id:"boss",name:"暗黑龍王",hp:120,atk:15,c1:"#fbbf24",c2:"#b45309",svgFn:darkLordSVG,drops:["👑","🏆"],mType:"dark",typeIcon:"💀",typeName:"暗"},
];

export const TYPE_EFF = {
  fire:    {grass:1.5, fire:0.6, water:0.6, electric:1.0, ghost:1.5, steel:0.6, dark:1.0},
  electric:{grass:1.0, fire:1.0, water:1.5, electric:0.6, ghost:0.6, steel:1.5, dark:1.0},
  water:   {grass:0.6, fire:1.5, water:0.6, electric:0.6, ghost:1.0, steel:1.0, dark:1.5},
  grass:   {grass:0.6, fire:0.6, water:1.5, electric:1.5, ghost:1.0, steel:0.6, dark:1.0},
  dark:    {grass:1.0, fire:1.0, water:1.0, electric:1.0, ghost:1.5, steel:0.6, dark:0.6},
};

export function getEff(moveType, monType) {
  return (TYPE_EFF[moveType] && TYPE_EFF[moveType][monType]) || 1.0;
}
