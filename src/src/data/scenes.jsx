import { BG_IMGS } from './sprites';

export const SCENES = {
  grass:{
    bgImg:BG_IMGS.grass,
    sky:"linear-gradient(180deg,#87ceeb 0%,#a8d8ea 30%,#b4e4b4 60%,#90d890 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(34,197,94,0.08) 40%,rgba(34,197,94,0.15))",
    platform1:"rgba(34,197,94,0.25)",platform2:"rgba(34,197,94,0.2)",
    deco:()=><>{[...Array(5)].map((_,i)=><div key={`g${i}`} style={{position:"absolute",bottom:`${8+i*3}%`,left:`${5+i*18}%`,fontSize:14+Math.random()*8,opacity:0.25}}>{"🌿🌱🍀🌼🌻"[i]}</div>)}<div style={{position:"absolute",top:"5%",right:"30%",fontSize:16,opacity:0.15}}>☁️</div><div style={{position:"absolute",top:"12%",left:"20%",fontSize:22,opacity:0.1}}>☁️</div></>
  },
  fire:{
    bgImg:BG_IMGS.fire,
    sky:"linear-gradient(180deg,#7c2d12 0%,#c2410c 25%,#ea580c 50%,#92400e 80%,#451a03 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(234,88,12,0.1) 40%,rgba(154,52,18,0.25))",
    platform1:"rgba(234,88,12,0.3)",platform2:"rgba(234,88,12,0.2)",
    deco:()=><>{[...Array(8)].map((_,i)=><div key={`e${i}`} style={{position:"absolute",bottom:`${2+i*3}%`,left:`${6+i*11}%`,width:3+i%3*2,height:3+i%3*2,background:["#f97316","#ef4444","#fbbf24","#dc2626","#fb923c","#f59e0b","#ea580c","#fcd34d"][i],borderRadius:"50%",animation:`emberRise ${2.5+i*0.6}s ease-in ${i*0.35}s infinite`}}/>)}{[...Array(4)].map((_,i)=><div key={`f${i}`} style={{position:"absolute",bottom:`${6+i*5}%`,left:`${8+i*22}%`,fontSize:14+i*2,opacity:0.35,animation:`float ${2.5+i*0.5}s ease-in-out ${i*0.3}s infinite`}}>{"🔥🌋🔥💨"[i]}</div>)}<div style={{position:"absolute",bottom:"0%",left:"8%",width:120,height:35,background:"radial-gradient(ellipse,rgba(234,88,12,0.25),transparent)",borderRadius:"50%",animation:"lavaGlow 3s ease-in-out infinite"}}/><div style={{position:"absolute",bottom:"3%",right:"12%",width:90,height:30,background:"radial-gradient(ellipse,rgba(220,38,38,0.2),transparent)",borderRadius:"50%",animation:"lavaGlow 3.5s ease-in-out 0.8s infinite"}}/><div style={{position:"absolute",top:"0%",left:"0%",width:"100%",height:"25%",background:"linear-gradient(180deg,rgba(251,146,60,0.06),transparent)",animation:"float 5s ease-in-out infinite"}}/></>
  },
  ghost:{
    bgImg:BG_IMGS.ghost,
    sky:"linear-gradient(180deg,#1e1b4b 0%,#312e81 25%,#3730a3 50%,#1e1b4b 80%,#0f0b2e 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(99,102,241,0.05) 40%,rgba(67,56,202,0.12))",
    platform1:"rgba(99,102,241,0.15)",platform2:"rgba(99,102,241,0.1)",
    _ghostR:[...Array(6)].map(()=>({t:10+Math.random()*50,fs:8+Math.random()*6,op:0.08+Math.random()*0.1})),
    deco:function(){return<>{this._ghostR.map((r,i)=><div key={`gh${i}`} style={{position:"absolute",top:`${r.t}%`,left:`${5+i*16}%`,fontSize:r.fs,opacity:r.op,animation:`float ${3+i*0.4}s ease ${i*0.5}s infinite`}}>{"👻✨🌙⭐💫🔮"[i]}</div>)}<div style={{position:"absolute",top:"5%",right:"25%",width:30,height:30,background:"radial-gradient(circle,rgba(250,250,210,0.12),transparent)",borderRadius:"50%"}}/><div style={{position:"absolute",bottom:"20%",left:"8%",width:80,height:30,background:"rgba(139,92,246,0.06)",borderRadius:"50%",filter:"blur(8px)"}}/><div style={{position:"absolute",top:"20%",left:"60%",width:50,height:50,background:"rgba(139,92,246,0.04)",borderRadius:"50%",filter:"blur(12px)"}}/></>}
  },
  steel:{
    bgImg:BG_IMGS.steel,
    sky:"linear-gradient(180deg,#64748b 0%,#94a3b8 20%,#cbd5e1 45%,#94a3b8 70%,#6b7280 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(100,116,139,0.1) 40%,rgba(75,85,99,0.2))",
    platform1:"rgba(100,116,139,0.3)",platform2:"rgba(100,116,139,0.2)",
    deco:()=><><div style={{position:"absolute",bottom:"5%",left:"2%",width:"96%",height:8,background:"linear-gradient(90deg,#6b7280,#9ca3af,#6b7280)",opacity:0.15,borderRadius:2}}/><div style={{position:"absolute",bottom:"5%",left:"10%",width:4,height:"30%",background:"linear-gradient(180deg,transparent,#6b7280)",opacity:0.1}}/><div style={{position:"absolute",bottom:"5%",right:"15%",width:4,height:"25%",background:"linear-gradient(180deg,transparent,#6b7280)",opacity:0.1}}/>{[...Array(3)].map((_,i)=><div key={`s${i}`} style={{position:"absolute",top:`${12+i*15}%`,left:`${20+i*25}%`,fontSize:10,opacity:0.08}}>{"⚙️🔩🛡️"[i]}</div>)}<div style={{position:"absolute",top:"8%",right:"20%",width:80,height:80,border:"2px solid rgba(148,163,184,0.08)",borderRadius:"50%"}}/><div style={{position:"absolute",top:"6%",left:"10%",width:50,height:3,background:"rgba(148,163,184,0.1)",transform:"rotate(-15deg)"}}/></>
  },
  dark:{
    bgImg:BG_IMGS.dark,
    sky:"linear-gradient(180deg,#030712 0%,#0a0415 20%,#1a0a2e 45%,#0f0520 70%,#030712 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(88,28,135,0.06) 40%,rgba(30,10,60,0.2))",
    platform1:"rgba(88,28,135,0.2)",platform2:"rgba(88,28,135,0.15)",
    _darkR:[...Array(8)].map(()=>({t:5+Math.random()*60,l:Math.random()*90,w:2+Math.random()*3,h:2+Math.random()*3,op:0.1+Math.random()*0.2,dur:2+Math.random()*3,del:Math.random()*2})),
    deco:function(){return<>{this._darkR.map((r,i)=><div key={`d${i}`} style={{position:"absolute",top:`${r.t}%`,left:`${r.l}%`,width:r.w,height:r.h,background:"white",borderRadius:"50%",opacity:r.op,animation:`sparkle ${r.dur}s ease ${r.del}s infinite`}}/>)}<div style={{position:"absolute",top:"10%",left:"50%",width:100,height:100,background:"radial-gradient(circle,rgba(168,85,247,0.06),transparent)",borderRadius:"50%"}}/><div style={{position:"absolute",bottom:"25%",left:"5%",width:60,height:60,background:"radial-gradient(circle,rgba(139,92,246,0.04),transparent)",borderRadius:"50%"}}/>{[0,1,2].map(i=><div key={`p${i}`} style={{position:"absolute",bottom:`${10+i*8}%`,left:`${15+i*30}%`,width:30+i*10,height:2,background:`rgba(168,85,247,${0.04+i*0.02})`,filter:"blur(3px)"}}/>)}</>}
  }
};

export const SCENE_NAMES = {
  grass:"🌿 綠意草原",
  fire:"🌋 炎熱火山",
  ghost:"🌙 幽暗墓地",
  steel:"⚙️ 鋼鐵要塞",
  dark:"💀 暗黑深淵"
};
