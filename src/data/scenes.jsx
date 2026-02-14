import { BG_IMGS } from './sprites';

/* ─── Pre-computed random seeds (avoid Math.random() in render) ─── */
const LEAF_R = [...Array(8)].map((_,i) => ({
  left: 5 + i * 11,
  bottom: 4 + (i % 4) * 7,
  w: 2 + (i % 2),
  h: 2 + (i % 2),
  color: ["#4ade80","#86efac","#22c55e","#a3e635","#4ade80","#86efac","#22c55e","#65a30d"][i],
  ldx: 15 + (i % 4) * 12,
  ldy: -(20 + (i % 3) * 18),
  dur: 3.5 + i * 0.6,
  del: i * 0.5,
}));

const FIREFLY_R = [...Array(12)].map((_,i) => ({
  top: 8 + ((i * 7) % 55),
  left: 3 + ((i * 8) % 85),
  w: 3 + (i % 3) * 2,
  color: ["#fde68a","#a5f3fc","#c4b5fd","#fde68a","#bef264","#a5f3fc",
          "#fde68a","#c4b5fd","#a5f3fc","#fde68a","#bef264","#c4b5fd"][i],
  fx: -15 + (i % 5) * 10,
  fy: -10 + (i % 4) * 8,
  op: 0.25 + (i % 4) * 0.12,
  dur: 3.5 + i * 0.45,
  del: i * 0.35,
}));

const SPARK_R = [...Array(6)].map((_,i) => ({
  top: 10 + ((i * 13) % 50),
  left: 8 + ((i * 15) % 75),
  w: 2 + (i % 2),
  color: ["#fbbf24","#f8fafc","#94a3b8","#fbbf24","#e2e8f0","#f59e0b"][i],
  dur: 1.5 + i * 0.6,
  del: i * 0.5,
}));

export const SCENES = {
  /* ═══ Grass — wind-blown leaf particles ═══ */
  grass:{
    bgImg:BG_IMGS.grass,
    sky:"linear-gradient(180deg,#87ceeb 0%,#a8d8ea 30%,#b4e4b4 60%,#90d890 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(34,197,94,0.08) 40%,rgba(34,197,94,0.15))",
    platform1:"rgba(34,197,94,0.25)",platform2:"rgba(34,197,94,0.2)",
    deco:()=><>
      {/* Drifting leaf particles — small, subtle */}
      {LEAF_R.map((r,i)=><div key={`lf${i}`} style={{
        position:"absolute",bottom:`${r.bottom}%`,left:`${r.left}%`,
        width:r.w,height:r.h,background:r.color,borderRadius:"50% 0 50% 0",
        opacity:0,
        "--ldx":`${r.ldx}px`,"--ldy":`${r.ldy}px`,
        animation:`leafDrift ${r.dur}s ease-in-out ${r.del}s infinite`
      }}/>)}
      {/* Soft wind streaks — barely visible */}
      <div style={{position:"absolute",top:"30%",left:0,width:"100%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)",animation:"windSweep 6s ease-in-out infinite"}}/>
      <div style={{position:"absolute",top:"55%",left:0,width:"100%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.02),transparent)",animation:"windSweep 8s ease-in-out 2s infinite"}}/>
    </>
  },

  /* ═══ Fire — ember dot particles + lava glow (emoji removed) ═══ */
  fire:{
    bgImg:BG_IMGS.fire,
    sky:"linear-gradient(180deg,#7c2d12 0%,#c2410c 25%,#ea580c 50%,#92400e 80%,#451a03 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(234,88,12,0.1) 40%,rgba(154,52,18,0.25))",
    platform1:"rgba(234,88,12,0.3)",platform2:"rgba(234,88,12,0.2)",
    deco:()=><>
      {/* Rising ember dots */}
      {[...Array(8)].map((_,i)=><div key={`e${i}`} style={{
        position:"absolute",bottom:`${2+i*3}%`,left:`${6+i*11}%`,
        width:3+i%3*2,height:3+i%3*2,
        background:["#f97316","#ef4444","#fbbf24","#dc2626","#fb923c","#f59e0b","#ea580c","#fcd34d"][i],
        borderRadius:"50%",animation:`emberRise ${2.5+i*0.6}s ease-in ${i*0.35}s infinite`
      }}/>)}
      {/* Lava glow pools */}
      <div style={{position:"absolute",bottom:"0%",left:"8%",width:120,height:35,background:"radial-gradient(ellipse,rgba(234,88,12,0.25),transparent)",borderRadius:"50%",animation:"lavaGlow 3s ease-in-out infinite"}}/>
      <div style={{position:"absolute",bottom:"3%",right:"12%",width:90,height:30,background:"radial-gradient(ellipse,rgba(220,38,38,0.2),transparent)",borderRadius:"50%",animation:"lavaGlow 3.5s ease-in-out 0.8s infinite"}}/>
      {/* Heat haze overlay */}
      <div style={{position:"absolute",top:"0%",left:"0%",width:"100%",height:"25%",background:"linear-gradient(180deg,rgba(251,146,60,0.06),transparent)",animation:"float 5s ease-in-out infinite"}}/>
    </>
  },

  /* ═══ Ghost — firefly glow particles ═══ */
  ghost:{
    bgImg:BG_IMGS.ghost,
    sky:"linear-gradient(180deg,#1e1b4b 0%,#312e81 25%,#3730a3 50%,#1e1b4b 80%,#0f0b2e 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(99,102,241,0.05) 40%,rgba(67,56,202,0.12))",
    platform1:"rgba(99,102,241,0.15)",platform2:"rgba(99,102,241,0.1)",
    deco:()=><>
      {/* Firefly particles */}
      {FIREFLY_R.map((r,i)=><div key={`ff${i}`} style={{
        position:"absolute",top:`${r.top}%`,left:`${r.left}%`,
        width:r.w,height:r.w,background:r.color,borderRadius:"50%",
        boxShadow:`0 0 ${r.w*3}px ${r.w}px ${r.color}`,
        "--fx":`${r.fx}px`,"--fy":`${r.fy}px`,"--ff-op":`${r.op}`,
        animation:`fireflyGlow ${r.dur}s ease ${r.del}s infinite`
      }}/>)}
      {/* Ambient mist patches */}
      <div style={{position:"absolute",bottom:"18%",left:"5%",width:100,height:35,background:"rgba(139,92,246,0.06)",borderRadius:"50%",filter:"blur(10px)"}}/>
      <div style={{position:"absolute",top:"22%",left:"55%",width:70,height:50,background:"rgba(139,92,246,0.04)",borderRadius:"50%",filter:"blur(14px)"}}/>
      {/* Faint moonlight glow */}
      <div style={{position:"absolute",top:"3%",right:"22%",width:40,height:40,background:"radial-gradient(circle,rgba(250,250,210,0.10),transparent)",borderRadius:"50%"}}/>
    </>
  },

  /* ═══ Steel — spark particles + structural lines (emoji removed) ═══ */
  steel:{
    bgImg:BG_IMGS.steel,
    sky:"linear-gradient(180deg,#64748b 0%,#94a3b8 20%,#cbd5e1 45%,#94a3b8 70%,#6b7280 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(100,116,139,0.1) 40%,rgba(75,85,99,0.2))",
    platform1:"rgba(100,116,139,0.3)",platform2:"rgba(100,116,139,0.2)",
    deco:()=><>
      {/* Steel sparks */}
      {SPARK_R.map((r,i)=><div key={`sp${i}`} style={{
        position:"absolute",top:`${r.top}%`,left:`${r.left}%`,
        width:r.w,height:r.w,background:r.color,borderRadius:"50%",
        boxShadow:`0 0 ${r.w*2}px ${r.color}`,
        animation:`steelSpark ${r.dur}s ease ${r.del}s infinite`
      }}/>)}
      {/* Structural beams */}
      <div style={{position:"absolute",bottom:"5%",left:"2%",width:"96%",height:8,background:"linear-gradient(90deg,#6b7280,#9ca3af,#6b7280)",opacity:0.15,borderRadius:2}}/>
      <div style={{position:"absolute",bottom:"5%",left:"10%",width:4,height:"30%",background:"linear-gradient(180deg,transparent,#6b7280)",opacity:0.1}}/>
      <div style={{position:"absolute",bottom:"5%",right:"15%",width:4,height:"25%",background:"linear-gradient(180deg,transparent,#6b7280)",opacity:0.1}}/>
      {/* Faint arc circle */}
      <div style={{position:"absolute",top:"8%",right:"20%",width:80,height:80,border:"2px solid rgba(148,163,184,0.08)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",top:"6%",left:"10%",width:50,height:3,background:"rgba(148,163,184,0.1)",transform:"rotate(-15deg)"}}/>
    </>
  },

  /* ═══ Dark — white sparkle dots + purple glows (already clean) ═══ */
  dark:{
    bgImg:BG_IMGS.dark,
    sky:"linear-gradient(180deg,#030712 0%,#0a0415 20%,#1a0a2e 45%,#0f0520 70%,#030712 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(88,28,135,0.06) 40%,rgba(30,10,60,0.2))",
    platform1:"rgba(88,28,135,0.2)",platform2:"rgba(88,28,135,0.15)",
    _darkR:[...Array(8)].map((_,i)=>({
      t:5+((i*11)%60),l:((i*13)%90),w:2+(i%3),h:2+(i%2)+1,
      op:0.1+(i%4)*0.05,dur:2+i*0.4,del:i*0.3
    })),
    deco:function(){return<>
      {this._darkR.map((r,i)=><div key={`d${i}`} style={{
        position:"absolute",top:`${r.t}%`,left:`${r.l}%`,
        width:r.w,height:r.h,background:"white",borderRadius:"50%",
        opacity:r.op,animation:`sparkle ${r.dur}s ease ${r.del}s infinite`
      }}/>)}
      <div style={{position:"absolute",top:"10%",left:"50%",width:100,height:100,background:"radial-gradient(circle,rgba(168,85,247,0.06),transparent)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",bottom:"25%",left:"5%",width:60,height:60,background:"radial-gradient(circle,rgba(139,92,246,0.04),transparent)",borderRadius:"50%"}}/>
      {[0,1,2].map(i=><div key={`p${i}`} style={{position:"absolute",bottom:`${10+i*8}%`,left:`${15+i*30}%`,width:30+i*10,height:2,background:`rgba(168,85,247,${0.04+i*0.02})`,filter:"blur(3px)"}}/>)}
    </>}
  }
};

export const SCENE_NAMES = {
  grass:"🌿 綠意草原",
  fire:"🌋 炎熱火山",
  ghost:"🌙 幽暗墓地",
  steel:"⚙️ 鋼鐵要塞",
  dark:"💀 暗黑深淵"
};
