import {
  slimeSVG, fireLizardSVG, ghostSVG, dragonSVG, darkLordSVG,
  slimeEvolvedSVG, fireEvolvedSVG, ghostEvolvedSVG, dragonEvolvedSVG,
} from './sprites';

export const MONSTERS = [
  {id:"slime",name:"史萊姆",hp:40,atk:6,c1:"#4ade80",c2:"#16a34a",svgFn:slimeSVG,evolvedSvgFn:slimeEvolvedSVG,evolvedName:"叢林巨魔",evolveLvl:5,drops:["🍬","🧪"],mType:"grass",typeIcon:"🌿",typeName:"草"},
  {id:"fire",name:"火焰蜥",hp:55,atk:9,c1:"#f87171",c2:"#b91c1c",svgFn:fireLizardSVG,evolvedSvgFn:fireEvolvedSVG,evolvedName:"烈焰巨龍",evolveLvl:5,drops:["🔥","💎"],mType:"fire",typeIcon:"🔥",typeName:"火"},
  {id:"ghost",name:"幽靈魔",hp:50,atk:8,c1:"#c084fc",c2:"#7e22ce",svgFn:ghostSVG,evolvedSvgFn:ghostEvolvedSVG,evolvedName:"冥界死神",evolveLvl:5,drops:["👻","⭐"],mType:"ghost",typeIcon:"👻",typeName:"靈"},
  {id:"dragon",name:"鋼鐵龍",hp:80,atk:12,c1:"#60a5fa",c2:"#1d4ed8",svgFn:dragonSVG,evolvedSvgFn:dragonEvolvedSVG,evolvedName:"鐵甲天龍",evolveLvl:5,drops:["🐉","👑"],mType:"steel",typeIcon:"🛡️",typeName:"鋼"},
  {id:"boss",name:"暗黑魔王",hp:120,atk:15,c1:"#fbbf24",c2:"#b45309",svgFn:darkLordSVG,drops:["👑","🏆"],mType:"dark",typeIcon:"💀",typeName:"暗"},
];

export const TYPE_EFF = {
  fire:    {grass:1.5, fire:0.6, water:0.6, ghost:1.5, steel:0.6, dark:1.0},
  electric:{grass:1.0, fire:1.0, water:1.5, ghost:0.6, steel:1.5, dark:1.0},
  water:   {grass:0.6, fire:1.5, water:0.6, ghost:1.0, steel:1.0, dark:1.5},
  grass:   {grass:0.6, fire:0.6, water:1.5, ghost:1.0, steel:0.6, dark:1.0},
  dark:    {grass:1.0, fire:1.0, water:1.0, ghost:1.5, steel:0.6, dark:0.6},
};

export function getEff(moveType, monType) {
  return (TYPE_EFF[moveType] && TYPE_EFF[moveType][monType]) || 1.0;
}
