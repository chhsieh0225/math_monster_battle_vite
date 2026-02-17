import { memo, type CSSProperties } from 'react';
import { BG_IMGS } from './sprites.js';

type CssVarStyle = CSSProperties & Record<`--${string}`, string | number>;

function withVars(style: CssVarStyle): CSSProperties {
  return style;
}

/* ─── Pre-computed random seeds (avoid Math.random() in render) ─── */
const LEAF_R = Array.from({ length: 10 }, (_, i) => ({
  left: 3 + i * 9,
  bottom: 3 + (i % 5) * 6,
  w: 5 + (i % 3) * 2,
  h: 3 + (i % 2) * 2,
  color: ["#86efac","#4ade80","#fef9c3","#bbf7d0","#a3e635","#d9f99d","#4ade80","#fef08a","#86efac","#d9f99d"][i],
  ldx: 25 + (i % 4) * 18,
  ldy: -(35 + (i % 3) * 20),
  dur: 3 + i * 0.5,
  del: i * 0.4,
}));

const FIREFLY_R = Array.from({ length: 12 }, (_, i) => ({
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

const SPARK_R = Array.from({ length: 4 }, (_, i) => ({
  top: 15 + ((i * 17) % 45),
  left: 10 + ((i * 20) % 70),
  w: 2 + (i % 2),
  color: ["#fbbf24","#f8fafc","#94a3b8","#e2e8f0"][i],
  dur: 1.8 + i * 0.7,
  del: i * 0.6,
}));

const SMOKE_R = Array.from({ length: 6 }, (_, i) => ({
  bottom: 2 + ((i * 9) % 50),
  left: -5 + ((i * 16) % 80),
  w: 80 + (i % 3) * 40,
  h: 30 + (i % 2) * 20,
  dx: 30 + (i % 3) * 15,
  dy: -(10 + (i % 4) * 6),
  sc: 0.8 + (i % 3) * 0.3,
  op: 0.4 + (i % 3) * 0.1,
  dur: 6 + i * 1.2,
  del: i * 0.8,
}));

const DARK_R = Array.from({ length: 8 }, (_, i)=>({
  t:5+((i*11)%60),l:((i*13)%90),w:2+(i%3),h:2+(i%2)+1,
  op:0.1+(i%4)*0.05,dur:2+i*0.4,del:i*0.3
}));

export const SCENES = {
  /* ═══ Grass — wind-blown leaf particles ═══ */
  grass:{
    bgImg:BG_IMGS.grass,
    sky:"linear-gradient(180deg,#87ceeb 0%,#a8d8ea 30%,#b4e4b4 60%,#90d890 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(34,197,94,0.08) 40%,rgba(34,197,94,0.15))",
    platform1:"rgba(34,197,94,0.25)",platform2:"rgba(34,197,94,0.2)",
    Deco:memo(()=><>
      {/* Drifting leaf particles with glow */}
      {LEAF_R.map((r,i)=><div key={`lf${i}`} style={withVars({
        position:"absolute",bottom:`${r.bottom}%`,left:`${r.left}%`,
        width:r.w,height:r.h,background:r.color,borderRadius:"50% 0 50% 0",
        boxShadow:`0 0 ${r.w*2}px ${r.color}`,
        opacity:0,
        "--ldx":`${r.ldx}px`,"--ldy":`${r.ldy}px`,
        animation:`leafDrift ${r.dur}s ease-in-out ${r.del}s infinite`
      })}/>)}
      {/* Soft wind streaks */}
      <div style={{position:"absolute",top:"30%",left:0,width:"100%",height:1.5,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)",animation:"windSweep 6s ease-in-out infinite"}}/>
      <div style={{position:"absolute",top:"55%",left:0,width:"100%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)",animation:"windSweep 8s ease-in-out 2s infinite"}}/>
    </>)
  },

  /* ═══ Fire — ember dot particles + lava glow (emoji removed) ═══ */
  fire:{
    bgImg:BG_IMGS.fire,
    sky:"linear-gradient(180deg,#7c2d12 0%,#c2410c 25%,#ea580c 50%,#92400e 80%,#451a03 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(234,88,12,0.1) 40%,rgba(154,52,18,0.25))",
    platform1:"rgba(234,88,12,0.3)",platform2:"rgba(234,88,12,0.2)",
    Deco:memo(()=><>
      {/* Rising ember dots */}
      {Array.from({ length: 8 }, (_, i) => i).map((i)=><div key={`e${i}`} style={{
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
    </>)
  },

  /* ═══ Ghost — firefly glow particles ═══ */
  ghost:{
    bgImg:BG_IMGS.ghost,
    sky:"linear-gradient(180deg,#1e1b4b 0%,#312e81 25%,#3730a3 50%,#1e1b4b 80%,#0f0b2e 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(99,102,241,0.05) 40%,rgba(67,56,202,0.12))",
    platform1:"rgba(99,102,241,0.15)",platform2:"rgba(99,102,241,0.1)",
    Deco:memo(()=><>
      {/* Firefly particles */}
      {FIREFLY_R.map((r,i)=><div key={`ff${i}`} style={withVars({
        position:"absolute",top:`${r.top}%`,left:`${r.left}%`,
        width:r.w,height:r.w,background:r.color,borderRadius:"50%",
        boxShadow:`0 0 ${r.w*3}px ${r.w}px ${r.color}`,
        "--fx":`${r.fx}px`,"--fy":`${r.fy}px`,"--ff-op":`${r.op}`,
        animation:`fireflyGlow ${r.dur}s ease ${r.del}s infinite`
      })}/>)}
      {/* Ambient mist patches */}
      <div style={{position:"absolute",bottom:"18%",left:"5%",width:100,height:35,background:"rgba(139,92,246,0.06)",borderRadius:"50%",filter:"blur(10px)"}}/>
      <div style={{position:"absolute",top:"22%",left:"55%",width:70,height:50,background:"rgba(139,92,246,0.04)",borderRadius:"50%",filter:"blur(14px)"}}/>
      {/* Faint moonlight glow */}
      <div style={{position:"absolute",top:"3%",right:"22%",width:40,height:40,background:"radial-gradient(circle,rgba(250,250,210,0.10),transparent)",borderRadius:"50%"}}/>
    </>)
  },

  /* ═══ Steel — smoke wisps + industrial lights + faint sparks ═══ */
  steel:{
    bgImg:BG_IMGS.steel,
    sky:"linear-gradient(180deg,#64748b 0%,#94a3b8 20%,#cbd5e1 45%,#94a3b8 70%,#6b7280 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(100,116,139,0.1) 40%,rgba(75,85,99,0.2))",
    platform1:"rgba(100,116,139,0.3)",platform2:"rgba(100,116,139,0.2)",
    Deco:memo(()=><>
      {/* Drifting smoke wisps */}
      {SMOKE_R.map((r,i)=><div key={`sm${i}`} style={withVars({
        position:"absolute",bottom:`${r.bottom}%`,left:`${r.left}%`,
        width:r.w,height:r.h,
        background:"radial-gradient(ellipse,rgba(203,213,225,0.85),rgba(148,163,184,0.45),transparent)",
        borderRadius:"50%",filter:`blur(${5+i}px)`,
        "--sm-dx":`${r.dx}px`,"--sm-dy":`${r.dy}px`,
        "--sm-s":`${r.sc}`,"--sm-op":`${r.op}`,
        animation:`smokeDrift ${r.dur}s ease-in-out ${r.del}s infinite`
      })}/>)}
      {/* Overhead industrial light cones */}
      <div style={withVars({position:"absolute",top:"0%",left:"18%",width:90,height:"50%",
        background:"linear-gradient(180deg,rgba(251,191,36,0.4),rgba(251,191,36,0.12) 60%,transparent)",
        clipPath:"polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
        "--lp-lo":"0.6","--lp-hi":"1",
        animation:"lightPulse 4s ease-in-out infinite"})}/>
      <div style={withVars({position:"absolute",top:"0%",right:"22%",width:80,height:"45%",
        background:"linear-gradient(180deg,rgba(248,250,252,0.35),rgba(203,213,225,0.1) 60%,transparent)",
        clipPath:"polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
        "--lp-lo":"0.5","--lp-hi":"1",
        animation:"lightPulse 5s ease-in-out 1.5s infinite"})}/>
      {/* Light source dots at ceiling */}
      <div style={{position:"absolute",top:"1%",left:"22%",width:14,height:6,background:"rgba(251,191,36,0.6)",borderRadius:"50%",boxShadow:"0 0 20px 6px rgba(251,191,36,0.35)"}}/>
      <div style={{position:"absolute",top:"1%",right:"26%",width:12,height:5,background:"rgba(248,250,252,0.5)",borderRadius:"50%",boxShadow:"0 0 18px 5px rgba(248,250,252,0.3)"}}/>
      {/* Sparks */}
      {SPARK_R.map((r,i)=><div key={`sp${i}`} style={{
        position:"absolute",top:`${r.top}%`,left:`${r.left}%`,
        width:r.w+1,height:r.w+1,background:r.color,borderRadius:"50%",
        boxShadow:`0 0 ${r.w*3}px ${r.w}px ${r.color}`,
        animation:`steelSpark ${r.dur}s ease ${r.del}s infinite`
      }}/>)}
      {/* Structural beam (subtle) */}
      <div style={{position:"absolute",bottom:"5%",left:"2%",width:"96%",height:6,background:"linear-gradient(90deg,#6b7280,#9ca3af,#6b7280)",opacity:0.1,borderRadius:2}}/>
    </>)
  },

  /* ═══ Rock — dust particles + falling pebbles + canyon haze ═══ */
  rock:{
    bgImg:BG_IMGS.rock,
    sky:"linear-gradient(180deg,#d4a574 0%,#c2956a 20%,#b8860b 45%,#a0522d 70%,#6b3a2a 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(139,90,43,0.1) 40%,rgba(101,67,33,0.22))",
    platform1:"rgba(139,90,43,0.3)",platform2:"rgba(139,90,43,0.22)",
    Deco:memo(()=><>
      {/* Dust particles drifting */}
      {Array.from({length:8},(_,i)=>i).map(i=><div key={`dust${i}`} style={{
        position:"absolute",
        top:`${10+((i*11)%60)}%`,left:`${((i*13)%85)}%`,
        width:3+(i%3),height:3+(i%3),
        background:["#d4a574","#c2956a","#deb887","#cdaa7d","#c4a882","#b8860b","#d2b48c","#deb887"][i],
        borderRadius:"50%",opacity:0.3+(i%3)*0.1,
        animation:`smokeDrift ${5+i*0.8}s ease-in-out ${i*0.5}s infinite`
      }}/>)}
      {/* Falling pebbles */}
      {Array.from({length:4},(_,i)=>i).map(i=><div key={`peb${i}`} style={{
        position:"absolute",top:`${5+i*8}%`,left:`${15+i*20}%`,
        width:4+(i%2)*2,height:4+(i%2)*2,
        background:["#8B7355","#A0522D","#6B4226","#8B6914"][i],
        borderRadius:"30%",
        animation:`emberRise ${3+i*0.7}s ease-in ${i*0.4}s infinite reverse`
      }}/>)}
      {/* Canyon haze */}
      <div style={{position:"absolute",bottom:"0%",left:"5%",width:130,height:40,background:"radial-gradient(ellipse,rgba(210,180,140,0.2),transparent)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",bottom:"5%",right:"10%",width:100,height:35,background:"radial-gradient(ellipse,rgba(184,134,11,0.15),transparent)",borderRadius:"50%"}}/>
      {/* Heat shimmer */}
      <div style={{position:"absolute",top:"0%",left:"0%",width:"100%",height:"20%",background:"linear-gradient(180deg,rgba(210,180,140,0.08),transparent)",animation:"float 6s ease-in-out infinite"}}/>
    </>)
  },

  /* ═══ Dark — white sparkle dots + purple glows (already clean) ═══ */
  dark:{
    bgImg:BG_IMGS.dark,
    sky:"linear-gradient(180deg,#030712 0%,#0a0415 20%,#1a0a2e 45%,#0f0520 70%,#030712 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(88,28,135,0.06) 40%,rgba(30,10,60,0.2))",
    platform1:"rgba(88,28,135,0.2)",platform2:"rgba(88,28,135,0.15)",
    Deco:memo(()=><>
      {DARK_R.map((r,i)=><div key={`d${i}`} style={{
        position:"absolute",top:`${r.t}%`,left:`${r.l}%`,
        width:r.w,height:r.h,background:"white",borderRadius:"50%",
        opacity:r.op,animation:`sparkle ${r.dur}s ease ${r.del}s infinite`
      }}/>)}
      <div style={{position:"absolute",top:"10%",left:"50%",width:100,height:100,background:"radial-gradient(circle,rgba(168,85,247,0.06),transparent)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",bottom:"25%",left:"5%",width:60,height:60,background:"radial-gradient(circle,rgba(139,92,246,0.04),transparent)",borderRadius:"50%"}}/>
      {[0,1,2].map(i=><div key={`p${i}`} style={{position:"absolute",bottom:`${10+i*8}%`,left:`${15+i*30}%`,width:30+i*10,height:2,background:`rgba(168,85,247,${0.04+i*0.02})`,filter:"blur(3px)"}}/>)}
    </>)
  }
};

export const SCENE_NAMES = {
  grass:"🌿 綠意草原",
  fire:"🌋 炎熱火山",
  water:"💧 湛藍水域",
  electric:"⚡ 雷電荒原",
  ghost:"🌙 幽暗墓地",
  steel:"⚙️ 鋼鐵要塞",
  dark:"💀 暗黑深淵",
  rock:"🪨 岩石峽谷"
};
