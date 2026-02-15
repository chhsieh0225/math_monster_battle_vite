import {
  playerfire0SVG, playerfire1SVG, playerfire2SVG,
  playerwater0SVG, playerwater1SVG, playerwater2SVG,
  playergrass0SVG, playergrass1SVG, playergrass2SVG,
  playerelectric0SVG, playerelectric1SVG, playerelectric2SVG,
  playerlion0SVG, playerlion1SVG, playerlion2SVG,
} from './sprites';
import { SKILL_SETS } from './skillSets';

// growth = 每升一級增加的威力
// 簡單招 growth 高（勤練就強），困難招 growth 低（起手就強）
// 所有招式 Lv.6 時威力趨近：42 / 45 / 45 / 55

export const STARTERS = [
  {id:"fire",name:"小火獸",type:"fire",typeIcon:"🔥",typeName:"火",c1:"#f87171",c2:"#b91c1c",
   stages:[
     {name:"小火獸",emoji:"🔥",svgFn:playerfire0SVG},
     {name:"烈焰獸",emoji:"🔥",svgFn:playerfire1SVG},
     {name:"炎龍王",emoji:"🔥",svgFn:playerfire2SVG},
   ],
   moves: SKILL_SETS.fire},
  {id:"water",name:"小水獸",type:"water",typeIcon:"💧",typeName:"水",c1:"#60a5fa",c2:"#1d4ed8",
   stages:[
     {name:"小水獸",emoji:"💧",svgFn:playerwater0SVG},
     {name:"波濤獸",emoji:"💧",svgFn:playerwater1SVG},
     {name:"海龍王",emoji:"💧",svgFn:playerwater2SVG},
   ],
   moves: SKILL_SETS.water},
  {id:"grass",name:"小草獸",type:"grass",typeIcon:"🌿",typeName:"草",c1:"#4ade80",c2:"#16a34a",
   stages:[
     {name:"小草獸",emoji:"🌿",svgFn:playergrass0SVG},
     {name:"花葉獸",emoji:"🌿",svgFn:playergrass1SVG},
     {name:"森林王",emoji:"🌿",svgFn:playergrass2SVG},
   ],
   moves: SKILL_SETS.grass},
  {id:"electric",name:"小雷獸",type:"electric",typeIcon:"⚡",typeName:"雷",c1:"#facc15",c2:"#ca8a04",
   stages:[
     {name:"小雷獸",emoji:"⚡",svgFn:playerelectric0SVG},
     {name:"雷電獸",emoji:"⚡",svgFn:playerelectric1SVG},
     {name:"雷龍王",emoji:"⚡",svgFn:playerelectric2SVG},
   ],
   moves: SKILL_SETS.electric},
  {id:"lion",name:"小獅獸",type:"light",typeIcon:"✨",typeName:"光",c1:"#f59e0b",c2:"#92400e",
   stages:[
     {name:"小獅獸",emoji:"✨",svgFn:playerlion0SVG},
     {name:"獅鬃獸",emoji:"✨",svgFn:playerlion1SVG},
     {name:"獅焰王",emoji:"✨",svgFn:playerlion2SVG},
   ],
   moves: SKILL_SETS.lion},
];
