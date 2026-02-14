import {
  playerfire0SVG, playerfire1SVG, playerfire2SVG,
  playerwater0SVG, playerwater1SVG, playerwater2SVG,
  playergrass0SVG, playergrass1SVG, playergrass2SVG,
} from './sprites';

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
   moves:[
     {name:"火花彈",icon:"🔥",type:"fire",desc:"簡單乘法",basePower:12,growth:6,range:[2,5],ops:["×"],color:"#ef4444",bg:"#fef2f2"},
     {name:"烈焰衝",icon:"🔥",type:"fire",desc:"九九乘法",basePower:20,growth:5,range:[2,9],ops:["×"],color:"#f97316",bg:"#fff7ed"},
     {name:"爆炎轟",icon:"🔥",type:"fire",desc:"大數乘法",basePower:30,growth:3,range:[4,12],ops:["×"],color:"#dc2626",bg:"#fef2f2"},
     {name:"終極爆破",icon:"💥",type:"dark",type2:"fire",desc:"暗火·乘除混合",basePower:40,growth:3,range:[3,12],ops:["×","÷"],color:"#a855f7",bg:"#faf5ff",risky:true},
   ]},
  {id:"water",name:"小水獸",type:"water",typeIcon:"💧",typeName:"水",c1:"#60a5fa",c2:"#1d4ed8",
   stages:[
     {name:"小水獸",emoji:"💧",svgFn:playerwater0SVG},
     {name:"波濤獸",emoji:"💧",svgFn:playerwater1SVG},
     {name:"海龍王",emoji:"💧",svgFn:playerwater2SVG},
   ],
   moves:[
     {name:"水泡攻擊",icon:"💧",type:"water",desc:"簡單除法",basePower:12,growth:6,range:[2,5],ops:["÷"],color:"#3b82f6",bg:"#eff6ff"},
     {name:"水流波",icon:"🌊",type:"water",desc:"進階除法",basePower:20,growth:5,range:[2,9],ops:["÷"],color:"#2563eb",bg:"#eff6ff"},
     {name:"海嘯衝擊",icon:"🌊",type:"water",desc:"大數除法",basePower:30,growth:3,range:[4,12],ops:["÷"],color:"#1d4ed8",bg:"#dbeafe"},
     {name:"終極爆破",icon:"💥",type:"dark",type2:"water",desc:"暗水·乘除混合",basePower:37,growth:3,range:[3,12],ops:["×","÷"],color:"#a855f7",bg:"#faf5ff",risky:true},
   ]},
  {id:"grass",name:"小草獸",type:"grass",typeIcon:"🌿",typeName:"草",c1:"#4ade80",c2:"#16a34a",
   stages:[
     {name:"小草獸",emoji:"🌿",svgFn:playergrass0SVG},
     {name:"花葉獸",emoji:"🌿",svgFn:playergrass1SVG},
     {name:"森林王",emoji:"🌿",svgFn:playergrass2SVG},
   ],
   moves:[
     {name:"葉刃切",icon:"🌿",type:"grass",desc:"簡單加法",basePower:12,growth:6,range:[2,10],ops:["+"],color:"#22c55e",bg:"#f0fdf4"},
     {name:"藤鞭打",icon:"🌿",type:"grass",desc:"基本減法",basePower:20,growth:5,range:[5,30],ops:["-"],color:"#16a34a",bg:"#f0fdf4"},
     {name:"森林風暴",icon:"🌿",type:"grass",desc:"大數加減",basePower:30,growth:3,range:[20,99],ops:["+","-"],color:"#15803d",bg:"#dcfce7"},
     {name:"終極爆破",icon:"💥",type:"dark",type2:"grass",desc:"暗草·乘除混合",basePower:40,growth:3,range:[3,12],ops:["×","÷"],color:"#a855f7",bg:"#faf5ff",risky:true},
   ]},
];
